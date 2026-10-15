// Watch Party server: one Node process serving the app and the real-time room engine.
// The server is the single source of truth for playback. Clients send intents,
// the server orders them with a version number and broadcasts the result.

import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { CATALOG, worldFor, deckFromVibes, VIBES, VERDICTS } from '../shared/catalog.js';
import { expectedPosition, percentile } from '../shared/sync.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const GRACE_MS = 30_000;          // seat held this long after a disconnect
const ROOM_TTL_MS = 30 * 60_000;  // empty rooms are removed after this
const TEASE_COOLDOWN_MS = Number(process.env.TEASE_COOLDOWN_MS || 60_000);
const SONGS_FILE = path.join(__dirname, '..', 'data', 'songs.json');

const now = () => Date.now();
const COLORS = ['#F2B35B', '#8EC5E8', '#E8A0B4', '#9FD8B4', '#C3B3EE', '#F59E7B', '#7FD6D0', '#E6C76A', '#B8B0FF', '#FF9FC6', '#A6E07A', '#9CC3FF'];

function loadSongs() {
  try { return JSON.parse(fs.readFileSync(SONGS_FILE, 'utf8')); } catch { return []; }
}
function saveSongs(list) {
  try { fs.mkdirSync(path.dirname(SONGS_FILE), { recursive: true }); fs.writeFileSync(SONGS_FILE, JSON.stringify(list, null, 2)); } catch {}
}
let SONGS = loadSongs();

const rooms = new Map();

function code() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 6; i++) c += a[crypto.randomInt(a.length)];
  return rooms.has(c) ? code() : c;
}
const id = () => crypto.randomBytes(6).toString('hex');

const SNACK_COLORS = { popcorn: '#FFD23F', samosa: '#FFB547', cola: '#3DB7FF', nachos: '#5BE3A6' };

function makeRoom(name, world) {
  const r = {
    code: code(),
    name: (name || 'Movie night').slice(0, 40),
    createdAt: now(),
    members: new Map(),       // memberId -> member
    hostId: null,
    controlMode: 'host',      // 'host' | 'everyone'
    teasing: true,
    playback: { item: null, playing: false, position: 0, rate: 1, updatedAt: now(), version: 0, by: null },
    playlist: [],
    chat: [],
    reactions: [],            // { id, by, kind, pos, at }
    polls: [],
    swipe: null,
    vibe: null,               // VibeMatch phase before a swipe
    verdict: null,            // post-movie verdict round
    never: [],                // movie ids (or item titles) the room banned forever
    world: ['fog', 'space', 'rain', 'stage'].includes(world) ? world : null, // null = follow the film's genre
    likedGenres: {},
    stats: new Map(),         // memberId -> latest client report
    lastTease: new Map(),     // memberId -> time
    emptySince: null,
  };
  rooms.set(r.code, r);
  return r;
}

// ---------- helpers ----------
function publicMember(m) {
  return { id: m.id, name: m.name, color: m.color, snack: m.snack || null, connected: m.connected, joinedAt: m.joinedAt, isHost: false };
}
function memberList(r) {
  return [...r.members.values()].map((m) => ({ ...publicMember(m), isHost: m.id === r.hostId }));
}
function snapshot(r) {
  return {
    code: r.code, name: r.name, hostId: r.hostId, controlMode: r.controlMode, teasing: r.teasing,
    members: memberList(r), playback: r.playback, playlist: r.playlist,
    chat: r.chat.slice(-100), reactions: r.reactions.slice(-300), polls: r.polls.slice(-10),
    swipe: swipeView(r), songs: SONGS, serverTime: now(),
    vibe: r.vibe, verdict: verdictView(r), never: r.never, world: r.world,
  };
}
function send(ws, msg) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
}
function broadcast(r, msg, except) {
  msg.s = now();
  const data = JSON.stringify(msg);
  for (const m of r.members.values()) {
    if (m.ws && m.ws !== except && m.ws.readyState === 1) m.ws.send(data);
  }
}
function canControl(r, m) {
  return r.controlMode === 'everyone' || m.id === r.hostId;
}
function pickNewHost(r) {
  const candidates = [...r.members.values()].filter((m) => m.connected).sort((a, b) => a.joinedAt - b.joinedAt);
  r.hostId = candidates[0]?.id || null;
}
function sysChat(r, text) {
  const msg = { id: id(), by: null, name: null, text, sys: true, at: now() };
  r.chat.push(msg);
  if (r.chat.length > 300) r.chat.shift();
  broadcast(r, { t: 'chat', msg });
}

// ---------- playback ----------
function setPlayback(r, m, patch) {
  const pb = r.playback;
  const t = now();
  // Freeze the current position before changing anything.
  const pos = expectedPosition(pb, t);
  const next = { ...pb, position: pos, updatedAt: t, version: pb.version + 1, by: m ? m.id : null };
  Object.assign(next, patch);
  if (next.position < 0) next.position = 0;
  r.playback = next;
  return next;
}

function loadItem(r, m, item, autoplay = false) {
  setPlayback(r, m, { item, position: 0, playing: autoplay });
  for (const g of item.genres || []) r.likedGenres[g] = (r.likedGenres[g] || 0) + 1;
}

function handleControl(r, m, msg) {
  if (!canControl(r, m)) return send(m.ws, { t: 'ctl_rejected', reason: 'host_only', playback: r.playback });
  // Concurrency rule: an action must be based on the latest version the sender saw.
  // If someone else changed playback first, the stale action is dropped and the
  // sender is told what actually happened. This keeps every client on one timeline.
  if (typeof msg.base === 'number' && msg.base !== r.playback.version) {
    return send(m.ws, { t: 'ctl_rejected', reason: 'stale', playback: r.playback, s: now() });
  }
  const a = msg.action;
  if (a === 'play') setPlayback(r, m, { playing: true, ...(typeof msg.pos === 'number' ? { position: msg.pos } : {}) });
  else if (a === 'pause') setPlayback(r, m, { playing: false, ...(typeof msg.pos === 'number' ? { position: msg.pos } : {}) });
  else if (a === 'seek') setPlayback(r, m, { position: Math.max(0, Number(msg.pos) || 0) });
  else return;
  broadcast(r, { t: 'playback', playback: r.playback, action: a, by: m.id, sentAt: msg.sentAt });
}

// ---------- group swipe (NoMoreScrolling) ----------
function swipeView(r) {
  if (!r.swipe) return null;
  const sw = r.swipe;
  return {
    active: sw.active, deck: sw.deck, startedAt: sw.startedAt, startedBy: sw.startedBy, vibes: sw.vibes || null,
    progress: Object.fromEntries(Object.entries(sw.votes).map(([k, v]) => [k, Object.keys(v).length])),
    matches: sw.active ? null : sw.matches, near: sw.active ? null : sw.near,
  };
}
function finishSwipe(r) {
  const sw = r.swipe;
  if (!sw || !sw.active) return;
  sw.active = false;
  const voters = Object.keys(sw.votes).filter((k) => Object.keys(sw.votes[k]).length > 0);
  const results = sw.deck.map((movieId) => {
    let yes = 0, sup = 0;
    for (const v of voters) {
      const vote = sw.votes[v][movieId];
      if (vote === 'yes' || vote === 'super') yes++;
      if (vote === 'super') sup++;
    }
    return { movieId, yes, super: sup, of: voters.length };
  });
  sw.matches = results.filter((x) => x.of > 0 && x.yes === x.of).sort((a, b) => b.super - a.super);
  sw.near = results.filter((x) => x.of > 1 && x.yes === x.of - 1).sort((a, b) => b.super - a.super).slice(0, 4);
  broadcast(r, { t: 'swipe', swipe: swipeView(r) });
  // Turn the matches into a group poll so the room can pick one.
  const pool = (sw.matches.length ? sw.matches : sw.near).slice(0, 4);
  if (pool.length >= 2) {
    createPoll(r, null, 'Final vote: what are we watching?', pool.map((p) => CATALOG.find((c) => c.id === p.movieId)?.title || p.movieId), pool.map((p) => p.movieId));
  }
}

// ---------- polls ----------
function createPoll(r, m, question, options, movieIds) {
  const poll = {
    id: id(), question: String(question).slice(0, 120),
    options: options.slice(0, 6).map((o, i) => ({ id: String(i), text: String(o).slice(0, 80), movieId: movieIds ? movieIds[i] : null })),
    votes: {}, open: true, by: m ? m.id : null, at: now(),
  };
  r.polls.push(poll);
  broadcast(r, { t: 'poll', poll });
  return poll;
}

// ---------- connection handling ----------
function join(ws, msg) {
  const roomCode = String(msg.room || '').toUpperCase();
  const r = rooms.get(roomCode);
  if (!r) return send(ws, { t: 'error', code: 'no_room', message: 'That room does not exist or has ended.' });

  let m = msg.session && [...r.members.values()].find((x) => x.session === msg.session);
  const rejoin = !!m;
  if (m) {
    if (m.ws && m.ws !== ws) { try { m.ws.close(4000, 'replaced'); } catch {} }
    clearTimeout(m.graceTimer);
    m.ws = ws; m.connected = true;
    if (msg.name) m.name = String(msg.name).slice(0, 24);
    if (SNACK_COLORS[msg.snack]) { m.snack = msg.snack; m.color = SNACK_COLORS[msg.snack]; }
  } else {
    const connected = [...r.members.values()].filter((x) => x.connected).length;
    if (connected >= 50) return send(ws, { t: 'error', code: 'full', message: 'This room is full.' });
    m = {
      id: id(), session: msg.session || id(), name: String(msg.name || 'Guest').slice(0, 24),
      snack: SNACK_COLORS[msg.snack] ? msg.snack : null,
      color: SNACK_COLORS[msg.snack] && ![...r.members.values()].some((x) => x.color === SNACK_COLORS[msg.snack]) ? SNACK_COLORS[msg.snack] : COLORS[r.members.size % COLORS.length], ws, connected: true, joinedAt: now(),
    };
    r.members.set(m.id, m);
    if (!r.hostId) r.hostId = m.id;
  }
  r.emptySince = null;
  ws._room = r; ws._member = m;
  send(ws, { t: 'welcome', you: { id: m.id, session: m.session }, room: snapshot(r), s: now() });
  broadcast(r, { t: 'members', members: memberList(r), hostId: r.hostId }, ws);
  if (!rejoin) sysChat(r, `${m.name} joined`);
}

function leave(ws) {
  const r = ws._room, m = ws._member;
  if (!r || !m || m.ws !== ws) return;
  m.connected = false; m.ws = null;
  broadcast(r, { t: 'members', members: memberList(r), hostId: r.hostId });
  m.graceTimer = setTimeout(() => {
    if (m.connected) return;
    const wasHost = r.hostId === m.id;
    if (wasHost) {
      pickNewHost(r);
      const h = r.members.get(r.hostId);
      if (h) sysChat(r, `${m.name} left. ${h.name} is now the host.`);
    } else sysChat(r, `${m.name} left`);
    broadcast(r, { t: 'members', members: memberList(r), hostId: r.hostId });
    if (![...r.members.values()].some((x) => x.connected)) r.emptySince = now();
  }, GRACE_MS);
}

function handle(ws, raw) {
  let msg;
  try { msg = JSON.parse(raw); } catch { return; }
  if (msg.t === 'ping') return send(ws, { t: 'pong', c: msg.c, s: now() });
  if (msg.t === 'join') return join(ws, msg);
  const r = ws._room, m = ws._member;
  if (!r || !m) return;
  const isHost = r.hostId === m.id;

  switch (msg.t) {
    case 'ctl': return handleControl(r, m, msg);

    case 'load': {
      if (!canControl(r, m)) return send(ws, { t: 'ctl_rejected', reason: 'host_only', playback: r.playback });
      const item = r.playlist.find((p) => p.id === msg.itemId);
      if (!item) return;
      loadItem(r, m, item, !!msg.autoplay);
      broadcast(r, { t: 'playback', playback: r.playback, action: 'load', by: m.id, sentAt: msg.sentAt });
      return;
    }

    case 'chat': {
      const text = String(msg.text || '').trim().slice(0, 500);
      if (!text) return;
      const c = { id: id(), by: m.id, name: m.name, color: m.color, text, spoiler: !!msg.spoiler, at: now() };
      r.chat.push(c);
      if (r.chat.length > 300) r.chat.shift();
      broadcast(r, { t: 'chat', msg: c, sentAt: msg.sentAt });
      return;
    }

    case 'react': {
      const kinds = ['laugh', 'scream', 'nope', 'cry', 'wow', 'save'];
      if (!kinds.includes(msg.kind)) return;
      const re = { id: id(), by: m.id, kind: msg.kind, pos: expectedPosition(r.playback, now()), at: now(), itemId: r.playback.item?.id || null };
      r.reactions.push(re);
      if (r.reactions.length > 2000) r.reactions.shift();
      broadcast(r, { t: 'react', reaction: re, sentAt: msg.sentAt });
      return;
    }

    case 'playlist_add': {
      const it = msg.item || {};
      let item = null;
      if (it.movieId) {
        const mv = CATALOG.find((c) => c.id === it.movieId);
        if (!mv) return;
        item = { id: id(), title: mv.title, movieId: mv.id, genres: mv.genres, src: it.src || mv.src || null, addedBy: m.id, world: worldFor(mv.genres) };
      } else if (it.src && it.src.type && (it.src.id || it.src.url)) {
        const src = it.src.type === 'youtube' ? { type: 'youtube', id: String(it.src.id).slice(0, 20) } : { type: 'mp4', url: String(it.src.url).slice(0, 500) };
        item = { id: id(), title: String(it.title || 'Video').slice(0, 80), movieId: null, genres: it.genres || [], src, addedBy: m.id, world: worldFor(it.genres || []) };
      }
      if (!item) return;
      if (r.playlist.length >= 50) return;
      if (item.src?.type === 'mp4' && /^(Video|Video file)$/i.test(item.title)) {
        const file = decodeURIComponent(item.src.url.split('?')[0].split('/').pop() || '').replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim();
        if (file) item.title = file.slice(0, 80);
      }
      r.playlist.push(item);
      broadcast(r, { t: 'playlist', playlist: r.playlist });
      if (item.src?.type === 'youtube' && /^YouTube video$/i.test(item.title)) fetchYouTubeTitle(r, item);
      // First thing added to an empty room is loaded automatically.
      if (!r.playback.item && item.src) {
        loadItem(r, m, item, false);
        broadcast(r, { t: 'playback', playback: r.playback, action: 'load', by: m.id });
      }
      return;
    }
    case 'playlist_src': {
      const item = r.playlist.find((p) => p.id === msg.itemId);
      if (!item || !msg.src) return;
      item.src = msg.src.type === 'youtube' ? { type: 'youtube', id: String(msg.src.id).slice(0, 20) } : { type: 'mp4', url: String(msg.src.url).slice(0, 500) };
      broadcast(r, { t: 'playlist', playlist: r.playlist });
      return;
    }
    case 'playlist_remove': {
      const i = r.playlist.findIndex((p) => p.id === msg.itemId);
      if (i < 0) return;
      if (!isHost && r.playlist[i].addedBy !== m.id) return;
      r.playlist.splice(i, 1);
      broadcast(r, { t: 'playlist', playlist: r.playlist });
      return;
    }
    case 'playlist_move': {
      if (!isHost) return;
      const i = r.playlist.findIndex((p) => p.id === msg.itemId);
      const j = i + (msg.dir === 'up' ? -1 : 1);
      if (i < 0 || j < 0 || j >= r.playlist.length) return;
      [r.playlist[i], r.playlist[j]] = [r.playlist[j], r.playlist[i]];
      broadcast(r, { t: 'playlist', playlist: r.playlist });
      return;
    }

    case 'poll_create': {
      const opts = (Array.isArray(msg.options) ? msg.options : []).map((o) => String(o).trim()).filter(Boolean);
      if (!msg.question || opts.length < 2) return;
      createPoll(r, m, msg.question, opts);
      return;
    }
    case 'poll_vote': {
      const p = r.polls.find((x) => x.id === msg.pollId);
      if (!p || !p.open || !p.options.some((o) => o.id === msg.option)) return;
      p.votes[m.id] = msg.option;
      broadcast(r, { t: 'poll', poll: p });
      return;
    }
    case 'poll_close': {
      const p = r.polls.find((x) => x.id === msg.pollId);
      if (!p || !(isHost || p.by === m.id)) return;
      p.open = false;
      broadcast(r, { t: 'poll', poll: p });
      // A closed movie poll adds the winner to the playlist.
      const tally = p.options.map((o) => ({ o, n: Object.values(p.votes).filter((v) => v === o.id).length })).sort((a, b) => b.n - a.n);
      const win = tally[0];
      // Nobody voted? The first option (best match, most must-watch stars) wins.
      if (win && win.o.movieId) {
        const mv = CATALOG.find((c) => c.id === win.o.movieId);
        let item = r.playlist.find((p2) => p2.movieId === win.o.movieId);
        if (!item && mv) {
          item = { id: id(), title: mv.title, movieId: mv.id, genres: mv.genres, src: mv.src || null, addedBy: m.id, world: worldFor(mv.genres) };
          r.playlist.push(item);
          broadcast(r, { t: 'playlist', playlist: r.playlist });
        }
        if (item && item.src) {
          loadItem(r, m, item, true);
          broadcast(r, { t: 'playback', playback: r.playback, action: 'load', by: m.id });
          sysChat(r, `The room picked ${win.o.text}. Lights off!`);
        } else {
          sysChat(r, `The room picked ${win.o.text}. Add a YouTube or video link for it in the Queue to start.`);
        }
      }
      return;
    }

    case 'host_transfer': {
      if (!isHost) return;
      const to = r.members.get(msg.to);
      if (!to || !to.connected) return;
      r.hostId = to.id;
      broadcast(r, { t: 'members', members: memberList(r), hostId: r.hostId });
      sysChat(r, `${m.name} made ${to.name} the host`);
      return;
    }
    case 'settings': {
      if (!isHost) return;
      if (msg.controlMode === 'host' || msg.controlMode === 'everyone') r.controlMode = msg.controlMode;
      if (typeof msg.teasing === 'boolean') r.teasing = msg.teasing;
      if (typeof msg.name === 'string' && msg.name.trim()) r.name = msg.name.trim().slice(0, 40);
      if (msg.world === null || ['fog', 'space', 'rain', 'stage', 'calm'].includes(msg.world)) r.world = msg.world;
      broadcast(r, { t: 'settings', controlMode: r.controlMode, teasing: r.teasing, name: r.name, world: r.world });
      return;
    }

    case 'swipe_start': {
      if (r.swipe && r.swipe.active) return;
      const ids = (Array.isArray(msg.deck) ? msg.deck : []).filter((x) => CATALOG.some((c) => c.id === x) && !r.never.includes(x)).slice(0, 20);
      if (ids.length < 3) return;
      r.swipe = { active: true, deck: ids, votes: {}, startedAt: now(), startedBy: m.id, matches: [], near: [] };
      broadcast(r, { t: 'swipe', swipe: swipeView(r) });
      sysChat(r, `${m.name} started a group swipe. Pick your movies!`);
      return;
    }
    case 'swipe_vote': {
      const sw = r.swipe;
      if (!sw || !sw.active || !sw.deck.includes(msg.movieId)) return;
      if (!['yes', 'no', 'super'].includes(msg.vote)) return;
      (sw.votes[m.id] ||= {})[msg.movieId] = msg.vote;
      broadcast(r, { t: 'swipe', swipe: swipeView(r) });
      // When every connected person has finished the deck, reveal.
      const connected = [...r.members.values()].filter((x) => x.connected).map((x) => x.id);
      const done = connected.every((cid) => Object.keys(sw.votes[cid] || {}).length >= sw.deck.length);
      if (done) finishSwipe(r);
      return;
    }
    case 'swipe_end': {
      if (!r.swipe || !r.swipe.active) return;
      if (!(isHost || r.swipe.startedBy === m.id)) return;
      finishSwipe(r);
      return;
    }
    case 'swipe_dismiss': {
      if (!isHost) return;
      r.swipe = null;
      broadcast(r, { t: 'swipe', swipe: null });
      return;
    }

    // ---------- VibeMatch ----------
    case 'vibe_start': {
      if ((r.swipe && r.swipe.active) || (r.vibe && r.vibe.active)) return;
      r.vibe = { active: true, picks: {}, startedBy: m.id, at: now() };
      broadcast(r, { t: 'vibe', vibe: r.vibe });
      sysChat(r, `${m.name} started a vibe check. What are you in the mood for?`);
      return;
    }
    case 'vibe_pick': {
      if (!r.vibe || !r.vibe.active || !VIBES.some((v) => v.id === msg.vibe)) return;
      r.vibe.picks[m.id] = msg.vibe;
      broadcast(r, { t: 'vibe', vibe: r.vibe });
      const connected = [...r.members.values()].filter((x) => x.connected).map((x) => x.id);
      if (connected.every((cid) => r.vibe.picks[cid])) startSwipeFromVibes(r);
      return;
    }
    case 'vibe_go': {
      if (!r.vibe || !r.vibe.active || !(isHost || r.vibe.startedBy === m.id)) return;
      startSwipeFromVibes(r);
      return;
    }
    case 'vibe_cancel': {
      if (!r.vibe || !(isHost || r.vibe.startedBy === m.id)) return;
      r.vibe = null;
      broadcast(r, { t: 'vibe', vibe: null });
      return;
    }

    // ---------- Mood Check roll call ----------
    case 'moodcheck': {
      if (!isHost) return;
      const list = (Array.isArray(msg.list) ? msg.list : []).slice(0, 12).map((x) => ({
        id: String(x.id), name: String(x.name || '').slice(0, 24), color: String(x.color || ''),
        mood: String(x.mood || '').slice(0, 20), label: String(x.label || '').slice(0, 40), why: String(x.why || '').slice(0, 80),
        song: SONGS.find((s) => s.id === x.songId) || null,
      }));
      if (!list.length) return;
      // Pause the film for the roll call so nobody misses anything.
      if (r.playback.playing) {
        setPlayback(r, m, { playing: false });
        broadcast(r, { t: 'playback', playback: r.playback, action: 'pause', by: m.id });
      }
      broadcast(r, { t: 'moodcheck', list, startAt: now() + 900, step: 6500 });
      return;
    }
    case 'moodcheck_end': {
      if (!isHost) return;
      broadcast(r, { t: 'moodcheck', list: null });
      return;
    }

    // ---------- Verdict + Never Again ----------
    case 'verdict_start': {
      if (!isHost || (r.verdict && r.verdict.active)) return;
      const item = r.playback.item;
      if (!item) return;
      r.verdict = { active: true, itemId: item.id, title: item.title, movieId: item.movieId, picks: {}, roasts: {}, at: now(), result: null };
      if (r.playback.playing) {
        setPlayback(r, m, { playing: false });
        broadcast(r, { t: 'playback', playback: r.playback, action: 'pause', by: m.id });
      }
      broadcast(r, { t: 'verdict', verdict: verdictView(r) });
      return;
    }
    case 'verdict_pick': {
      const v = r.verdict;
      if (!v || !v.active || !VERDICTS.some((x) => x.id === msg.verdict)) return;
      v.picks[m.id] = msg.verdict;
      if (typeof msg.roast === 'string') v.roasts[m.id] = msg.roast.trim().slice(0, 80);
      const connected = [...r.members.values()].filter((x) => x.connected).map((x) => x.id);
      if (connected.every((cid) => v.picks[cid])) revealVerdict(r);
      else broadcast(r, { t: 'verdict', verdict: verdictView(r) });
      return;
    }
    case 'verdict_reveal': {
      if (!isHost || !r.verdict || !r.verdict.active) return;
      revealVerdict(r);
      return;
    }
    case 'verdict_close': {
      if (!isHost) return;
      r.verdict = null;
      broadcast(r, { t: 'verdict', verdict: null });
      return;
    }
    case 'never_remove': {
      if (!isHost) return;
      r.never = r.never.filter((x) => x !== msg.id);
      broadcast(r, { t: 'never', never: r.never });
      return;
    }

    case 'song_add': {
      const s = msg.song || {};
      if (!s.youtubeId || !s.title) return;
      const song = {
        id: id(), title: String(s.title).slice(0, 60), youtubeId: String(s.youtubeId).slice(0, 20),
        start: Math.max(0, Number(s.start) || 0), duration: Math.min(12, Math.max(3, Number(s.duration) || 7)),
        mood: String(s.mood || 'savage').toLowerCase().slice(0, 20),
      };
      SONGS.push(song);
      saveSongs(SONGS);
      for (const room of rooms.values()) broadcast(room, { t: 'songs', songs: SONGS });
      return;
    }
    case 'dedicate': {
      if (!r.teasing) return send(ws, { t: 'notice', text: 'The host turned song dedications off.' });
      const to = r.members.get(msg.to);
      const song = SONGS.find((x) => x.id === msg.songId);
      if (!to || !song || to.id === m.id) return;
      const last = r.lastTease.get(m.id) || 0;
      const wait = TEASE_COOLDOWN_MS - (now() - last);
      if (wait > 0) return send(ws, { t: 'notice', text: `Easy! Next dedication in ${Math.ceil(wait / 1000)} s.` });
      r.lastTease.set(m.id, now());
      // Everyone starts the hook at the same server time, 600 ms from now,
      // so it lands together for the whole room.
      broadcast(r, { t: 'dedication', from: m.id, fromName: m.name, to: to.id, toName: to.name, song, line: String(msg.line || '').slice(0, 80), startAt: now() + 600 });
      return;
    }

    case 'stats': {
      r.stats.set(m.id, { ...msg.stats, at: now(), name: m.name });
      return;
    }
    case 'stats_get': {
      return send(ws, { t: 'stats_room', stats: roomStats(r) });
    }
  }
}

// Look up a pasted YouTube video's real title (public oEmbed endpoint, no key needed).
async function fetchYouTubeTitle(r, item) {
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 4000);
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v=' + item.src.id)}`, { signal: ctl.signal });
    clearTimeout(timer);
    if (!res.ok) return;
    const data = await res.json();
    if (!data.title) return;
    item.title = String(data.title).slice(0, 80);
    if (r.playback.item && r.playback.item.id === item.id) r.playback = { ...r.playback, item: { ...r.playback.item, title: item.title } };
    broadcast(r, { t: 'playlist', playlist: r.playlist });
  } catch {}
}

function startSwipeFromVibes(r) {
  const v = r.vibe;
  if (!v || !v.active) return;
  const picks = Object.values(v.picks);
  const deck = deckFromVibes(picks.length ? picks : ['laugh', 'scared'], r.never);
  r.vibe = null;
  broadcast(r, { t: 'vibe', vibe: null });
  r.swipe = { active: true, deck, votes: {}, startedAt: now(), startedBy: v.startedBy, matches: [], near: [], vibes: picks };
  broadcast(r, { t: 'swipe', swipe: swipeView(r) });
}

function verdictView(r) {
  const v = r.verdict;
  if (!v) return null;
  return {
    active: v.active, itemId: v.itemId, title: v.title, movieId: v.movieId, at: v.at,
    done: Object.keys(v.picks),
    picks: v.active ? null : v.picks, roasts: v.active ? null : v.roasts, result: v.result,
  };
}

function revealVerdict(r) {
  const v = r.verdict;
  v.active = false;
  const counts = {};
  for (const p of Object.values(v.picks)) counts[p] = (counts[p] || 0) + 1;
  const total = Object.keys(v.picks).length;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const neverVotes = counts.never || 0;
  const banned = total > 0 && neverVotes / total >= 0.5;
  v.result = { counts, total, top: top ? top[0] : null, neverVotes, banned };
  if (banned) {
    const key = v.movieId || v.title;
    if (!r.never.includes(key)) r.never.push(key);
    broadcast(r, { t: 'never', never: r.never });
    sysChat(r, `${neverVotes} of ${total} voted ${v.title} out. It's on the Never Again wall.`);
  }
  broadcast(r, { t: 'verdict', verdict: verdictView(r) });
}

function roomStats(r) {
  const out = [];
  for (const [mid, st] of r.stats) {
    const mem = r.members.get(mid);
    if (!mem) continue;
    out.push({ id: mid, name: mem.name, connected: mem.connected, ...st });
  }
  const all = out.flatMap((x) => x.latencies || []);
  const drifts = out.flatMap((x) => x.drifts || []);
  return {
    members: out,
    summary: {
      latencyP50: percentile(all, 50), latencyP95: percentile(all, 95), latencySamples: all.length,
      driftP50: percentile(drifts.map(Math.abs), 50), driftP95: percentile(drifts.map(Math.abs), 95), driftSamples: drifts.length,
    },
  };
}

// ---------- HTTP ----------
const app = express();
app.use(express.json({ limit: '32kb' }));

app.post('/api/rooms', (req, res) => {
  const r = makeRoom(req.body?.name, req.body?.world);
  res.json({ code: r.code });
});
app.get('/api/rooms/:code', (req, res) => {
  const r = rooms.get(String(req.params.code).toUpperCase());
  if (!r) return res.status(404).json({ error: 'not_found' });
  res.json({ code: r.code, name: r.name, members: [...r.members.values()].filter((m) => m.connected).length });
});
app.get('/api/rooms/:code/stats', (req, res) => {
  const r = rooms.get(String(req.params.code).toUpperCase());
  if (!r) return res.status(404).json({ error: 'not_found' });
  res.json(roomStats(r));
});
app.get('/api/health', (req, res) => res.json({ ok: true, rooms: rooms.size, time: now() }));

const dist = path.join(__dirname, '..', 'dist');
app.use(express.static(dist, { index: false, maxAge: '1h' }));
app.get(/^\/(?!api|ws).*/, (req, res) => {
  const index = path.join(dist, 'index.html');
  if (fs.existsSync(index)) res.sendFile(index);
  else res.status(503).send('Run "npm run build" first.');
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws', perMessageDeflate: false });

wss.on('connection', (ws) => {
  ws._alive = true;
  ws.on('pong', () => { ws._alive = true; });
  ws.on('message', (data) => {
    // One malformed message must never take the whole server down.
    try { handle(ws, data.toString()); } catch (e) { console.error('message error:', e.message); }
  });
  ws.on('close', () => leave(ws));
  ws.on('error', () => {});
});

// Detect dead connections (phone locked, Wi-Fi dropped) and free their seats.
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws._alive) { ws.terminate(); continue; }
    ws._alive = false;
    try { ws.ping(); } catch {}
  }
  const t = now();
  for (const [c, r] of rooms) if (r.emptySince && t - r.emptySince > ROOM_TTL_MS) rooms.delete(c);
}, 10_000);

server.listen(PORT, '0.0.0.0', () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
  console.log(`\n  Watch Party is running\n`);
  console.log(`  On this computer:   http://localhost:${PORT}`);
  for (const ip of ips) console.log(`  On your Wi-Fi:      http://${ip}:${PORT}`);
  console.log('');
});

export { rooms, makeRoom };
