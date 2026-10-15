import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Conn, safeGet, safeSet } from './net.js';
import Player, { loadYouTube } from './Player.jsx';
import { expectedPosition, correction, percentile } from '../../shared/sync.js';
import { worldFor } from '../../shared/catalog.js';
import World from './ui/World.jsx';
import Panel from './ui/Panel.jsx';
import Discover from './ui/Discover.jsx';
import Swipe from './ui/Swipe.jsx';
import Dedicate from './ui/Dedicate.jsx';
import { VibeCheck, MoodCheck, Verdict } from './ui/Party.jsx';
import { SNACKS, SnackIcon } from './ui/snacks.jsx';
import { s } from './ui/s.js';
import { rememberRoom } from './Home.jsx';
import { Avatar, REACTIONS, reactionColor, fmt, moodOf } from './ui/common.jsx';

function reducer(s, m) {
  switch (m.t) {
    case 'welcome': return { ...m.room, me: m.you.id };
    case 'members': return s && { ...s, members: m.members, hostId: m.hostId };
    case 'playback': return s && (m.playback.version >= s.playback.version || m.force ? { ...s, playback: m.playback } : s);
    case 'chat': return s && { ...s, chat: [...s.chat.slice(-200), m.msg] };
    case 'react': return s && { ...s, reactions: [...s.reactions.slice(-500), m.reaction] };
    case 'playlist': return s && { ...s, playlist: m.playlist };
    case 'poll': {
      if (!s) return s;
      const i = s.polls.findIndex((p) => p.id === m.poll.id);
      const polls = i < 0 ? [...s.polls, m.poll] : s.polls.map((p) => (p.id === m.poll.id ? m.poll : p));
      return { ...s, polls };
    }
    case 'swipe': return s && { ...s, swipe: m.swipe };
    case 'settings': return s && { ...s, controlMode: m.controlMode, teasing: m.teasing, name: m.name, world: m.world };
    case 'vibe': return s && { ...s, vibe: m.vibe };
    case 'verdict': return s && { ...s, verdict: m.verdict };
    case 'never': return s && { ...s, never: m.never };
    case 'songs': return s && { ...s, songs: m.songs };
    default: return s;
  }
}

const LOW_END = typeof navigator !== 'undefined' && ((navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4));

export default function Room({ code }) {
  const [name, setName] = useState(() => safeGet('wp:name') || '');
  const [entered, setEntered] = useState(false);
  const [missing, setMissing] = useState(false);
  const [snack, setSnack] = useState(() => safeGet('wp:snack') || 'popcorn');

  useEffect(() => {
    fetch(`/api/rooms/${code}`).then((r) => { if (!r.ok) setMissing(true); }).catch(() => {});
  }, [code]);

  if (missing) return (
    <div className="ms" style={s('min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box')}>
      <div style={s('width: min(460px, 100%); background: #FFF4DC; color: #17112B; border: 3px solid #0E0A1C; border-radius: 24px; box-shadow: 8px 8px 0 #0E0A1C; padding: 26px; display: flex; flex-direction: column; gap: 12px')}>
        <div className="ms-display" style={s('font-size: 36px; line-height: 1')}>This room has ended</div>
        <div style={s('font-weight: 700; color: #4A3F6B')}>The code {code} isn't active anymore. Rooms close when everyone leaves or the server restarts.</div>
        <a href="/" className="ms-press ms-display" style={s('height: 56px; border: 3px solid #0E0A1C; border-radius: 16px; background: #FFD23F; color: #17112B; box-shadow: 4px 4px 0 #0E0A1C; font-size: 19px; display: flex; align-items: center; justify-content: center; text-decoration: none; margin-top: 6px')}>Start a new room</a>
      </div>
    </div>
  );

  if (!entered) return (
    <div className="ms" style={s('min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box')}>
      <form onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; safeSet('wp:name', name.trim()); safeSet('wp:snack', snack); loadYouTube(); setEntered(true); }}
        style={s('width: min(460px, 100%); background: #FFF4DC; color: #17112B; border: 3px solid #0E0A1C; border-radius: 24px; box-shadow: 8px 8px 0 #0E0A1C; padding: 26px; display: flex; flex-direction: column; gap: 14px')}>
        <div style={s('font-weight: 800; font-size: 13px; letter-spacing: 2px; color: #4A3F6B')}>ROOM {code}</div>
        <div className="ms-display" style={s('font-size: 38px; line-height: 1')}>Take your seat</div>
        <label htmlFor="nm" style={s('font-weight: 800; font-size: 15px')}>What should we call you?</label>
        <input id="nm" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={24} autoFocus
          style={s('height: 52px; border: 3px solid #0E0A1C; border-radius: 14px; padding: 0 16px; font-size: 18px; font-weight: 700; background: #FFFFFF; color: #17112B')} />
        <div style={s('font-weight: 800; font-size: 15px')}>Pick your snack</div>
        <div className="ms-snacks">
          {SNACKS.map((x) => {
            const on = snack === x.id;
            return (
              <button key={x.id} type="button" className="ms-press" onClick={() => setSnack(x.id)} aria-pressed={on}
                style={{ ...s('height: 84px; border: 3px solid #0E0A1C; border-radius: 16px; font-weight: 800; font-size: 13px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: #17112B'),
                  background: on ? x.color : '#FFFFFF', boxShadow: on ? '4px 4px 0 #0E0A1C' : 'none' }}>
                <SnackIcon id={x.id} size={34} />{x.label}
              </button>
            );
          })}
        </div>
        <button className="ms-press ms-display" disabled={!name.trim()}
          style={s('height: 58px; border: 3px solid #0E0A1C; border-radius: 16px; background: #FF4F7B; color: #17112B; box-shadow: 5px 5px 0 #0E0A1C; font-size: 21px; margin-top: 4px')}>Enter the room</button>
      </form>
    </div>
  );
  return <Live code={code} name={name.trim()} />;
}

function Live({ code, name }) {
  const [room, dispatch] = useReducer(reducer, null);
  const roomRef = useRef(null); roomRef.current = room;
  const [status, setStatus] = useState('connecting');
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth > 900);
  const [tab, setTab] = useState('chat');
  const [unread, setUnread] = useState(0);
  const [showDiscover, setShowDiscover] = useState(false);
  const [swipeHidden, setSwipeHidden] = useState(false);
  const [sheetFor, setSheetFor] = useState(null);
  const [reactOpen, setReactOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [dedication, setDedication] = useState(null);
  const [sync, setSync] = useState({ drift: null, action: 'waiting' });
  const [ready, setReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [now, setNow] = useState(0);
  const [scrub, setScrub] = useState(null);
  const [pulse, setPulse] = useState(0);
  const [calm, setCalm] = useState(() => safeGet('wp:calm') === '1');
  const [roomStats, setRoomStats] = useState(null);
  const [copied, setCopied] = useState(false);
  const [autoplay, setAutoplayState] = useState('ok'); // 'ok' | 'muted' | 'blocked'
  const autoplayRef = useRef('ok');
  const setAutoplay = useCallback((v) => { autoplayRef.current = v; setAutoplayState(v); }, []);
  const blockedSince = useRef(0);
  const [moodcheck, setMoodcheck] = useState(null);
  const [partyOpen, setPartyOpen] = useState(false);
  const [vibeHidden, setVibeHidden] = useState(false);
  const [verdictHidden, setVerdictHidden] = useState(false);
  const verdictSent = useRef({});

  const conn = useMemo(() => new Conn(code, name), [code, name]);
  const player = useRef(null);
  const lastSeek = useRef(0);
  const seekState = useRef({ itemId: null, seekAt: 0, holdUntil: 0, settledAt: 0, lead: 0.1 });
  const latencies = useRef([]);
  const drifts = useRef([]);
  const allLat = useRef([]);
  const allDrift = useRef([]);
  const duck = useRef(null);
  const tabRef = useRef(tab); tabRef.current = tab;
  const panelRef = useRef(panelOpen); panelRef.current = panelOpen;

  const toast = useCallback((text) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t.slice(-2), { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  // ---------- sync engine ----------
  const tick = useCallback(() => {
    const r = roomRef.current, p = player.current;
    if (!r || !p || !r.playback.item?.src || !p.ready()) return;
    const pb = r.playback;
    const t = performance.now();
    const exp = expectedPosition(pb, conn.serverNow());
    const dur = p.duration();
    setNow(exp);
    if (dur && exp >= dur - 0.25) {
      if (p.isPlaying()) p.pause();
      // Film finished: the host's device opens the verdict round once.
      if (r.hostId === r.me && pb.playing && !verdictSent.current[pb.item.id] && !r.verdict) {
        verdictSent.current[pb.item.id] = true;
        conn.send({ t: 'verdict_start' });
      }
      return;
    }
    const st = seekState.current;
    if (st.itemId !== pb.item.id) Object.assign(st, { itemId: pb.item.id, seekAt: 0, holdUntil: 0, settledAt: 0, lead: p.kind === 'youtube' ? 1.0 : 0.1 });
    if (!pb.playing) {
      blockedSince.current = 0;
      st.holdUntil = 0;
      if (p.isPlaying()) p.pause();
      // Line up the paused frame once per pause or seek, not on every tick.
      if (st.pausedVersion !== pb.version) { st.pausedVersion = pb.version; st.pausedTries = 0; }
      if (Math.abs(p.getTime() - exp) > 0.1 && st.pausedTries < 3 && !p.isBuffering()) { p.seek(exp); st.pausedTries++; }
      st.seekAt = 0;
      p.setRate(1);
      setSync({ drift: 0, action: 'paused' });
      return;
    }
    // Ahead of the room: wait in place instead of seeking backwards (a pause never re-buffers).
    if (st.holdUntil) {
      if (t < st.holdUntil) { if (p.isPlaying()) p.pause(); setSync((x) => ({ ...x, action: 'waiting for the room' })); return; }
      st.holdUntil = 0; st.settledAt = t; p.play();
      return;
    }
    if (!p.isPlaying()) {
      // The browser may block starting a video with sound until this person taps the page.
      // Try normally first, then fall back to muted playback, then ask for a tap.
      if (!blockedSince.current) blockedSince.current = t;
      const waited = t - blockedSince.current;
      // MP4 can be positioned before it plays. YouTube must not be: every seek restarts its loading,
      // so it only gets play() here and is lined up once it is actually running.
      if (p.kind !== 'youtube' && Math.abs(p.getTime() - exp) > 0.6 && (!st.seekAt || t - st.seekAt > 3000)) { p.seek(exp + st.lead); st.seekAt = t; }
      // YouTube is slow to start on its own, so give it longer before assuming the browser blocked the sound.
      if (waited > (p.kind === 'youtube' ? 4000 : 1300) && !p.isMuted() && autoplayRef.current === 'ok') { p.mute(); setAutoplay('muted'); }
      if (waited > (p.kind === 'youtube' ? 8000 : 3200) && autoplayRef.current !== 'blocked') setAutoplay('blocked');
      p.play();
      setSync({ drift: null, action: 'starting' });
      return;
    }
    blockedSince.current = 0;
    if (autoplayRef.current === 'blocked') setAutoplay(p.isMuted() ? 'muted' : 'ok');
    if (p.isBuffering()) {
      // A YouTube player spinning for ages while the room plays is stuck: let the person tap it directly.
      if (!st.bufferingSince) st.bufferingSince = t;
      if (p.kind === 'youtube' && t - st.bufferingSince > 9000 && autoplayRef.current !== 'blocked') setAutoplay('blocked');
      setSync((x) => ({ ...x, action: 'buffering' }));
      return;
    }
    st.bufferingSince = 0;
    // A seek just finished: learn how long seeks take on this connection, so the next one lands on time.
    if (st.seekAt) {
      const cost = (t - st.seekAt) / 1000;
      if (cost < 6) st.lead = Math.min(4, Math.max(0.05, st.lead * 0.5 + cost * 0.5));
      st.seekAt = 0; st.settledAt = t;
      return;
    }
    if (t - st.settledAt < (p.kind === 'youtube' ? 2500 : 900)) return;
    const drift = p.getTime() - exp;
    drifts.current.push(Math.round(drift * 1000)); if (drifts.current.length > 60) drifts.current.shift();
    allDrift.current.push({ at: Date.now(), ms: Math.round(drift * 1000) }); if (allDrift.current.length > 5000) allDrift.current.shift();
    const c = correction(drift, exp, { canNudge: p.canNudge, noNudgeHard: p.kind === 'youtube' ? 0.8 : 0.45 });
    if (c.action === 'seek') {
      p.setRate(1);
      if (drift > 0 && drift < 5) {
        // Resume exactly when the room catches up, not on the next 400 ms tick.
        const until = t + drift * 1000;
        st.holdUntil = until; p.pause();
        setTimeout(() => { if (st.holdUntil === until && roomRef.current?.playback.playing) { st.holdUntil = 0; st.settledAt = performance.now(); p.play(); } }, drift * 1000);
      }
      else { p.seek(exp + st.lead); st.seekAt = t; }
    } else p.setRate(c.rate);
    setSync({ drift, action: c.action === 'none' ? 'in sync' : c.action === 'rate' ? `nudging ${c.rate}x` : drift > 0 ? 'waiting for the room' : 'jumped to catch up' });
  }, [conn]);

  useEffect(() => {
    const iv = setInterval(tick, 400);
    return () => clearInterval(iv);
  }, [tick]);

  // ---------- messages ----------
  useEffect(() => {
    const off = conn.on((m) => {
      if (m.t === '_status') return setStatus(m.status);
      if (m.sentAt) {
        const lat = conn.serverNow() - m.sentAt;
        if (lat >= 0 && lat < 10000) {
          latencies.current.push(lat); if (latencies.current.length > 60) latencies.current.shift();
          allLat.current.push({ at: Date.now(), type: m.t, action: m.action, ms: Math.round(lat) });
          if (allLat.current.length > 5000) allLat.current.shift();
        }
      }
      if (m.t === 'error') { toast(m.message); return; }
      if (m.t === 'notice') return toast(m.text);
      if (m.t === 'ctl_rejected') {
        dispatch({ t: 'playback', playback: m.playback, force: true });
        toast(m.reason === 'host_only' ? 'Only the host controls playback right now.' : 'Someone else moved the video first. You are on their timeline.');
        setTimeout(tick, 0);
        return;
      }
      if (m.t === 'welcome') rememberRoom(m.room.code, m.room.name);
      if (m.t === 'stats_room') return setRoomStats(m.stats);
      if (m.t === 'dedication') return playDedication(m);
      if (m.t === 'moodcheck') {
        if (!m.list) { setMoodcheck(null); stopHook(); return; }
        setMoodcheck(m);
        m.list.forEach((p, i) => { if (p.song) playHook(p.song, m.startAt + i * m.step + 500, Math.min(p.song.duration, (m.step - 900) / 1000)); });
        return;
      }
      if (m.t === 'vibe' && m.vibe) setVibeHidden(false);
      if (m.t === 'verdict' && m.verdict) setVerdictHidden(false);
      if (m.t === 'swipe' && m.swipe) setSwipeHidden(false);
      dispatch(m);
      if (m.t === 'playback') setTimeout(tick, 0);
      if (m.t === 'chat' && !m.msg.sys && (tabRef.current !== 'chat' || !panelRef.current)) setUnread((u) => u + 1);
      if (m.t === 'react') {
        const world = worldFor(roomRef.current?.playback.item?.genres);
        const recent = (roomRef.current?.reactions || []).filter((x) => x.at > m.reaction.at - 4000 && x.kind === m.reaction.kind).length + 1;
        if ((world === 'fog' && m.reaction.kind === 'scream' && recent >= 3) || (world === 'space' && m.reaction.kind === 'wow' && recent >= 2) ||
            (world === 'rain' && m.reaction.kind === 'cry') || (world === 'stage' && m.reaction.kind === 'laugh' && recent >= 3)) setPulse((x) => x + 1);
      }
      if (m.t === 'poll' && m.poll.open && m.poll.by !== roomRef.current?.me && !m.poll.options.some((o) => o.movieId)) {
        if (!Object.keys(m.poll.votes).length) toast(`New poll: ${m.poll.question}`);
      }
    });
    return () => { off(); conn.close(); };
  }, [conn]);

  // Close popovers on Escape or a tap outside them.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { setPartyOpen(false); setReactOpen(false); setSheetFor(null); } };
    const onDown = (e) => {
      if (!e.target.closest('.party-wrap')) setPartyOpen(false);
      if (!e.target.closest('.react-wrap')) setReactOpen(false);
      if (!e.target.closest('.sheet') && !e.target.closest('.heads .avatar')) setSheetFor(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
  }, []);

  // Any tap on the page counts as permission to play with sound.
  useEffect(() => {
    const unlock = () => {
      const p = player.current;
      if (!p || autoplayRef.current === 'ok') return;
      p.unmute();
      if (roomRef.current?.playback.playing) p.play();
      setAutoplay('ok');
    };
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('keydown', unlock, true);
    return () => { document.removeEventListener('pointerdown', unlock, true); document.removeEventListener('keydown', unlock, true); };
  }, [setAutoplay]);

  // Report measurements to the room every 3 s, fetch room stats when the Sync tab is open.
  useEffect(() => {
    const iv = setInterval(() => {
      conn.send({ t: 'stats', stats: {
        rtt: conn.rtt, offset: conn.offset, latencies: latencies.current.slice(-40), drifts: drifts.current.slice(-40),
        p95: percentile(latencies.current, 95), drift: drifts.current[drifts.current.length - 1] ?? null,
        player: player.current?.kind || null, ua: navigator.userAgent.slice(0, 80),
      } });
      if (tabRef.current === 'stats' && panelRef.current) conn.send({ t: 'stats_get' });
    }, 3000);
    return () => clearInterval(iv);
  }, [conn]);

  useEffect(() => { if (tab === 'chat' && panelOpen) setUnread(0); }, [tab, panelOpen, room?.chat.length]);
  useEffect(() => { setReady(false); setDuration(0); setNow(0); blockedSince.current = 0; }, [room?.playback.item?.id]);

  // ---------- song hooks (dedications + mood check) ----------
  // One hidden YouTube player plays a short hook at an agreed server time,
  // so the whole room hears it together. The film's volume dips meanwhile.
  const dedHost = useRef(null);
  const hookTimers = useRef([]);
  const stopHook = useCallback(() => {
    hookTimers.current.forEach(clearTimeout); hookTimers.current = [];
    if (dedHost.current) dedHost.current.innerHTML = '';
    player.current?.setVolume(1);
  }, []);
  const playHook = useCallback((song, startAtServer, seconds, onDone) => {
    const lead = Math.max(0, startAtServer - conn.serverNow() - 1500);
    const t1 = setTimeout(() => {
      loadYouTube().then((YT) => {
        if (!dedHost.current) return;
        const el = document.createElement('div');
        dedHost.current.appendChild(el);
        const yp = new YT.Player(el, {
          width: 220, height: 124, videoId: song.youtubeId,
          playerVars: { start: Math.floor(song.start), controls: 0, playsinline: 1, disablekb: 1 },
          events: {
            onReady: () => {
              yp.setVolume(90);
              const t2 = setTimeout(() => {
                player.current?.setVolume(0.18);
                yp.playVideo();
                const t3 = setTimeout(() => {
                  try { yp.stopVideo(); yp.destroy(); } catch {}
                  player.current?.setVolume(1);
                  onDone && onDone();
                }, (seconds || song.duration) * 1000);
                hookTimers.current.push(t3);
              }, Math.max(0, startAtServer - conn.serverNow()));
              hookTimers.current.push(t2);
            },
          },
        });
      });
    }, lead);
    hookTimers.current.push(t1);
  }, [conn]);
  const playDedication = useCallback((d) => {
    const r = roomRef.current;
    setDedication(d);
    playHook(d.song, d.startAt, d.song.duration, () => setDedication(null));
    setTimeout(() => setDedication((x) => (x === d ? null : x)), (d.startAt - conn.serverNow()) + d.song.duration * 1000 + 3000);
    if (d.to === r?.me) toast(`${d.fromName} dedicated a song to you`);
  }, [conn, toast, playHook]);

  if (!room) return (
    <div className="gate"><div className="gate-card glass center">
      <div className="serif big">{status === 'reconnecting' ? 'Reconnecting…' : 'Finding your seat…'}</div>
      <div className="muted small">Syncing clocks with the room</div>
    </div></div>
  );

  // ---------- derived ----------
  const me = room.me;
  const isHost = room.hostId === me;
  const canControl = room.controlMode === 'everyone' || isHost;
  const item = room.playback.item;
  const autoWorld = item ? (item.world && item.world !== 'calm' ? item.world : worldFor(item.genres)) : 'fog';
  const world = calm ? 'calm' : (room.world || (autoWorld === 'calm' ? 'space' : autoWorld));
  const serverNow = conn.serverNow();
  const shownTime = scrub ?? now;
  const reactionsHere = room.reactions.filter((r) => r.itemId && r.itemId === item?.id);
  const bursts = room.reactions.filter((r) => serverNow - r.at < 3500).slice(-6);
  const membersById = Object.fromEntries(room.members.map((m) => [m.id, m]));
  const openPoll = [...room.polls].reverse().find((p) => p.options.some((o) => o.movieId));
  const driftMs = sync.drift == null ? null : Math.abs(sync.drift * 1000);
  const outOfSync = room.playback.playing && driftMs != null && driftMs > 500 && sync.action !== 'buffering';

  // ---------- actions ----------
  const sendCtl = (action, extra = {}) => {
    if (!canControl) return toast('Only the host controls playback right now.');
    const p = player.current;
    const base = room.playback.version;
    const sentAt = conn.serverNow();
    // Optimistic: the presser's player reacts instantly, the server confirms for everyone.
    if (p) {
      if (action === 'play') p.play();
      if (action === 'pause') p.pause();
      if (action === 'seek') { p.seek(extra.pos); seekState.current.seekAt = performance.now(); seekState.current.holdUntil = 0; }
    }
    const pos = action === 'pause' ? (p ? p.getTime() : undefined) : extra.pos;
    dispatch({ t: 'playback', force: true, playback: { ...room.playback, playing: action === 'play' ? true : action === 'pause' ? false : room.playback.playing, position: pos ?? expectedPosition(room.playback, sentAt), updatedAt: sentAt } });
    conn.send({ t: 'ctl', action, pos, base, sentAt });
  };
  const resync = () => {
    const p = player.current; if (!p) return;
    const st = seekState.current; st.holdUntil = 0;
    p.seek(expectedPosition(room.playback, conn.serverNow()) + st.lead); p.setRate(1); st.seekAt = performance.now();
    toast('Back in sync');
  };
  const react = (kind) => { conn.send({ t: 'react', kind, sentAt: conn.serverNow() }); setReactOpen(false); if (navigator.vibrate) navigator.vibrate(8); };
  const copyInvite = async () => {
    const url = `${location.origin}/r/${room.code}`;
    try { await navigator.clipboard.writeText(url); } catch { window.prompt('Copy this invite link', url); }
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  };
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ room: room.code, exportedAt: new Date().toISOString(), device: navigator.userAgent, rtt: conn.rtt, offset: conn.offset, latencies: allLat.current, drifts: allDrift.current, roomStats }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `watchparty-${room.code}-measurements.json`; a.click();
  };

  const startMoodCheck = () => {
    const songs = room.songs || [];
    const list = room.members.filter((m) => m.connected).map((m) => {
      const md = moodOf(m.id, room.reactions, room.chat, conn.serverNow());
      const pool = songs.filter((x) => x.mood === md.id);
      const pickFrom = pool.length ? pool : songs;
      const song = pickFrom.length ? pickFrom[Math.floor(Math.random() * pickFrom.length)] : null;
      return { id: m.id, name: m.name, color: m.color, mood: md.id, label: md.label, why: md.why, songId: song?.id };
    });
    conn.send({ t: 'moodcheck', list });
    setPartyOpen(false);
  };
  const startVibe = () => { conn.send({ t: 'vibe_start' }); setPartyOpen(false); setShowDiscover(false); };
  const setWorld = (w) => conn.send({ t: 'settings', world: w });

  const seekFromEvent = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    return f * (duration || 0);
  };

  const targetMember = sheetFor && membersById[sheetFor];
  const mood = targetMember ? moodOf(targetMember.id, room.reactions, room.chat, serverNow) : null;

  return (
    <div className={`room is-${world} ${panelOpen ? "with-panel" : ""} ${LOW_END ? "lite" : ""}`}>
      <World world={world} pulse={pulse} />

      <header className="room-top">
        <a href="/" className="room-name serif" title="Home">{room.name}</a>
        <button className="code-btn" onClick={copyInvite} title="Copy invite link">{copied ? 'Invite link copied' : room.code}</button>
        <div className="spacer" />
        {room.swipe && swipeHidden && <button className="btn sm primary" onClick={() => setSwipeHidden(false)}>{room.swipe.active ? 'Back to swipe' : 'See matches'}</button>}
        {room.vibe?.active && vibeHidden && <button className="btn sm primary" onClick={() => setVibeHidden(false)}>Vibe check</button>}
        {room.verdict && verdictHidden && <button className="btn sm primary" onClick={() => setVerdictHidden(false)}>{room.verdict.active ? 'Give your verdict' : 'Verdict'}</button>}
        {status !== 'live' ? (
          <span className="pill warn"><span className="dot" />{status === 'reconnecting' ? 'Reconnecting…' : 'Connecting…'}</span>
        ) : outOfSync ? (
          <button className="pill warn" onClick={resync}><span className="dot ping" />{(driftMs / 1000).toFixed(1)} s behind · Resync</button>
        ) : (
          <span className="pill"><span className="dot ok" />In sync</span>
        )}
        <div className="party-wrap">
          <button className="hbtn" onClick={() => setPartyOpen((o) => !o)} aria-expanded={partyOpen}>Party</button>
          {partyOpen && (
            <div className="party-menu glass" role="menu">
              <button role="menuitem" className="pm-item" onClick={startVibe} disabled={!!room.vibe?.active || !!room.swipe?.active}>
                <span className="pm-dot" style={{ background: '#FFD23F' }} /><span><b>Pick a movie together</b><br /><span className="muted small">Vibe check, then everyone swipes</span></span>
              </button>
              <button role="menuitem" className="pm-item" onClick={() => { setShowDiscover(true); setPartyOpen(false); }}>
                <span className="pm-dot" style={{ background: '#3DB7FF' }} /><span><b>Browse movies</b><br /><span className="muted small">Search, filters, recommendations</span></span>
              </button>
              <button role="menuitem" className="pm-item" onClick={startMoodCheck} disabled={!isHost}>
                <span className="pm-dot" style={{ background: '#C3B3EE' }} /><span><b>Mood check</b><br /><span className="muted small">{isHost ? 'Pause and roll call everyone’s mood with a song' : 'Host only'}</span></span>
              </button>
              <button role="menuitem" className="pm-item" onClick={() => { conn.send({ t: 'verdict_start' }); setPartyOpen(false); }} disabled={!isHost || !item}>
                <span className="pm-dot" style={{ background: '#FF4F7B' }} /><span><b>Verdict time</b><br /><span className="muted small">{isHost ? 'Everyone rates the film. Never Again if it flops' : 'Host only'}</span></span>
              </button>
              <div className="pm-sep" />
              <div className="small muted" style={{ padding: '4px 10px' }}>World {isHost ? '' : '(host picks)'}</div>
              <div className="pm-worlds">
                {[[null, 'Auto'], ['fog', 'Fog'], ['space', 'Space'], ['rain', 'Rain'], ['stage', 'Stage']].map(([w, label]) => (
                  <button key={label} className={`chip ${room.world === w ? 'on' : ''}`} disabled={!isHost} onClick={() => setWorld(w)}>{label}</button>
                ))}
              </div>
              <label className="toggle" style={{ padding: '4px 10px' }}>
                <input type="checkbox" checked={calm} onChange={() => setCalm((c) => { safeSet('wp:calm', c ? '0' : '1'); return !c; })} />
                <span>Calm mode (no world effects)</span>
              </label>
            </div>
          )}
        </div>
        <button className={`hbtn ${panelOpen ? 'on' : ''}`} onClick={() => setPanelOpen((o) => !o)} aria-pressed={panelOpen}>
          Chat{unread > 0 ? <span className="badge">{unread}</span> : null}
        </button>
      </header>

      <main className="stage">
        <div className={`screen ${autoplay === 'blocked' && item?.src?.type === 'youtube' ? 'yt-open' : ''}`}>
          {item?.src ? (
            <Player key={item.id} ref={player} src={item.src} onReady={() => { setReady(true); setTimeout(tick, 0); }} onDuration={(d) => setDuration(d || 0)} />
          ) : (
            <div className="screen-empty">
              <div className="serif big">{item ? `${item.title} needs a link` : 'Nothing playing yet'}</div>
              <div className="muted">{item ? 'Add a YouTube or video link for it in the Queue.' : 'Pick a movie together or paste a link.'}</div>
              <div className="row center">
                <button className="btn primary" onClick={startVibe}>Pick a movie together</button>
                <button className="btn ghost" onClick={() => setShowDiscover(true)}>Browse</button>
                <button className="btn ghost" onClick={() => { setPanelOpen(true); setTab('next'); }}>Paste a link</button>
              </div>
            </div>
          )}
          {item?.src && !ready && <div className="screen-loading">Loading…</div>}
          {item?.src && ready && room.playback.playing && autoplay === 'blocked' && item.src.type === 'youtube' && (
            <div className="yt-tap-hint">YouTube needs one tap to start. <b>Tap the video.</b></div>
          )}
          {item?.src && ready && room.playback.playing && autoplay === 'blocked' && item.src.type !== 'youtube' && (
            <button className="tap-start" onClick={() => { const p = player.current; if (!p) return; p.unmute(); p.seek(expectedPosition(room.playback, conn.serverNow()) + 0.1); p.play(); setAutoplay('ok'); }}>
              <span className="tap-play" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z" fill="#1A1206" /></svg></span>
              <span className="tap-text">The room is watching. Tap to join in.</span>
            </button>
          )}
          {item?.src && ready && autoplay === 'muted' && (
            <button className="tap-sound" onClick={() => { player.current?.unmute(); setAutoplay('ok'); }}>Sound is off · tap to unmute</button>
          )}

          <div className="bursts" aria-live="polite">
            {bursts.map((b, i) => (
              <div key={b.id} className="burst" style={{ right: `${8 + (i % 3) * 7}%` }}>
                <span className="burst-dot" style={{ background: reactionColor[b.kind], boxShadow: `0 0 14px 4px ${reactionColor[b.kind]}` }} />
                <span className="burst-name">{b.by === me ? 'You' : membersById[b.by]?.name}</span>
              </div>
            ))}
          </div>

          {dedication && (
            <div className="ded-toast glass">
              <span className="eq" aria-hidden="true"><i /><i /><i /></span>
              <span><b>{dedication.from === me ? 'You' : dedication.fromName}</b> dedicated <span className="muted">{dedication.song.title}</span> to <b>{dedication.to === me ? 'you' : dedication.toName}</b>{dedication.line ? <span className="muted"> · “{dedication.line}”</span> : null}</span>
            </div>
          )}
        </div>

        <div className="heads">
          {room.members.filter((m) => m.connected).map((m) => (
            <Avatar key={m.id} member={m} size={42}
              ring={sheetFor === m.id ? '#F2B35B' : dedication?.to === m.id ? '#F2B35B' : m.id === room.hostId ? 'rgba(255,255,255,.7)' : undefined}
              label={m.id === me ? `${m.name} (you)` : `Dedicate a song to ${m.name}`}
              onClick={() => { if (m.id === me) return toast('That is you. Tap a friend.'); setSheetFor(sheetFor === m.id ? null : m.id); setReactOpen(false); }} />
          ))}
          <span className="heads-hint hide-sm">Tap a face to dedicate a song</span>
          {sheetFor && targetMember && (
            <Dedicate key={sheetFor} target={targetMember} mood={mood} songs={room.songs || []} disabled={!room.teasing}
              onClose={() => setSheetFor(null)}
              onSend={(songId, line) => { conn.send({ t: 'dedicate', to: sheetFor, songId, line }); setSheetFor(null); }}
              onAddSong={(song) => { conn.send({ t: 'song_add', song }); toast('Song saved for everyone'); }} />
          )}
        </div>

        <div className="dock glass">
          <button className="play" disabled={!item?.src} onClick={() => sendCtl(room.playback.playing ? 'pause' : 'play')} aria-label={room.playback.playing ? 'Pause' : 'Play'}>
            {room.playback.playing
              ? <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="4.5" height="16" rx="1" /><rect x="14.5" y="4" width="4.5" height="16" rx="1" /></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z" /></svg>}
          </button>
          <span className="time">{fmt(shownTime)}</span>
          <div className={`bar ${canControl ? 'can' : ''}`}
            onPointerDown={(e) => { if (!canControl || !duration) return; e.currentTarget.setPointerCapture(e.pointerId); setScrub(seekFromEvent(e)); }}
            onPointerMove={(e) => { if (scrub != null) setScrub(seekFromEvent(e)); }}
            onPointerUp={(e) => { if (scrub == null) return; const pos = seekFromEvent(e); setScrub(null); sendCtl('seek', { pos }); }}
            role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(shownTime)} tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'ArrowRight') sendCtl('seek', { pos: now + 10 }); if (e.key === 'ArrowLeft') sendCtl('seek', { pos: Math.max(0, now - 10) }); }}>
            <div className="bar-track" />
            <div className="bar-fill" style={{ width: duration ? `${Math.min(100, (shownTime / duration) * 100)}%` : 0 }} />
            {duration > 0 && reactionsHere.slice(-80).map((r) => (
              <span key={r.id} className="pin" style={{ left: `${Math.min(100, (r.pos / duration) * 100)}%`, background: reactionColor[r.kind] }} />
            ))}
            <div className="bar-knob" style={{ left: duration ? `${Math.min(100, (shownTime / duration) * 100)}%` : 0 }} />
          </div>
          <span className="time muted hide-sm">{fmt(duration)}</span>
          <div className="react-wrap">
            <button className={`btn sm ${reactOpen ? '' : 'ghost'}`} onClick={() => { setReactOpen((o) => !o); setSheetFor(null); }} aria-expanded={reactOpen}>React</button>
            {reactOpen && (
              <div className="react-fan glass">
                {REACTIONS.map((r) => (
                  <button key={r.kind} className="react-btn" onClick={() => react(r.kind)}>
                    <span className="burst-dot" style={{ background: r.color, boxShadow: `0 0 10px ${r.color}` }} />{r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {!canControl && <div className="muted tiny center">The host controls playback. Your player follows automatically.</div>}
      </main>

      {panelOpen && (
        <Panel
          tab={tab} setTab={setTab} unread={unread} room={room} me={me} isHost={isHost} canControl={canControl}
          conn={conn} sync={sync} roomStats={roomStats} onExport={exportData}
          onChat={(text, spoiler) => conn.send({ t: 'chat', text, spoiler, sentAt: conn.serverNow() })}
          onLoad={(itemId) => conn.send({ t: 'load', itemId, autoplay: false, sentAt: conn.serverNow() })}
          onRemove={(itemId) => conn.send({ t: 'playlist_remove', itemId })}
          onMove={(itemId, dir) => conn.send({ t: 'playlist_move', itemId, dir })}
          onAddLink={(src, title) => conn.send({ t: 'playlist_add', item: { src, title } })}
          onSetSrc={(itemId, src) => conn.send({ t: 'playlist_src', itemId, src })}
          openDiscover={() => setShowDiscover(true)}
          onPollCreate={(question, options) => conn.send({ t: 'poll_create', question, options })}
          onPollVote={(pollId, option) => conn.send({ t: 'poll_vote', pollId, option })}
          onPollClose={(pollId) => conn.send({ t: 'poll_close', pollId })}
          onTransfer={(to) => conn.send({ t: 'host_transfer', to })}
          onSettings={(s) => conn.send({ t: 'settings', ...s })}
          onReplay={(pos) => { sendCtl('seek', { pos }); if (!room.playback.playing) setTimeout(() => sendCtl('play'), 300); }}
          onNeverRemove={(id) => conn.send({ t: 'never_remove', id })}
        />
      )}

      {showDiscover && (
        <Discover
          likedGenres={{}} swipeBusy={!!room.swipe?.active}
          onClose={() => setShowDiscover(false)}
          onAdd={(movieId) => { conn.send({ t: 'playlist_add', item: { movieId } }); toast('Added to the queue'); }}
          onAddLink={(src, title) => { conn.send({ t: 'playlist_add', item: { src, title } }); toast('Added to the queue'); }}
          onStartSwipe={(deck) => { conn.send({ t: 'swipe_start', deck }); setShowDiscover(false); setSwipeHidden(false); }}
          onVibe={startVibe} never={room.never || []}
        />
      )}

      {room.swipe && !swipeHidden && (
        <Swipe
          key={room.swipe.startedAt} swipe={room.swipe} me={me} members={room.members} isHost={isHost} poll={openPoll}
          onVote={(movieId, vote) => conn.send({ t: 'swipe_vote', movieId, vote })}
          onReveal={() => conn.send({ t: 'swipe_end' })}
          onDismiss={() => { setSwipeHidden(true); if (isHost && !openPoll?.open) conn.send({ t: 'swipe_dismiss' }); }}
          onMinimize={() => setSwipeHidden(true)}
          onPollVote={(pollId, option) => conn.send({ t: 'poll_vote', pollId, option })}
          onPollClose={(pollId) => conn.send({ t: 'poll_close', pollId })}
        />
      )}

      {room.vibe?.active && !vibeHidden && (
        <VibeCheck vibe={room.vibe} me={me} members={room.members} canStart={isHost || room.vibe.startedBy === me}
          onPick={(v) => conn.send({ t: 'vibe_pick', vibe: v })}
          onGo={() => conn.send({ t: 'vibe_go' })}
          onCancel={() => conn.send({ t: 'vibe_cancel' })}
          onMinimize={() => setVibeHidden(true)} />
      )}

      {moodcheck && (
        <MoodCheck data={moodcheck} me={me} serverNow={() => conn.serverNow()} isHost={isHost}
          onEnd={() => { conn.send({ t: 'moodcheck_end' }); sendCtl('play'); }} />
      )}

      {room.verdict && !verdictHidden && (
        <Verdict key={room.verdict.at} verdict={room.verdict} me={me} members={room.members} isHost={isHost} never={room.never || []}
          onPick={(verdict, roast) => conn.send({ t: 'verdict_pick', verdict, roast })}
          onReveal={() => conn.send({ t: 'verdict_reveal' })}
          onClose={() => { if (isHost) conn.send({ t: 'verdict_close' }); setVerdictHidden(true); }}
          onNext={() => { setVerdictHidden(true); if (isHost) conn.send({ t: 'verdict_close' }); startVibe(); }} />
      )}

      <div className="ded-host" ref={dedHost} aria-hidden="true" />
      <div className="toasts" aria-live="polite">{toasts.map((t) => <div key={t.id} className="toast glass">{t.text}</div>)}</div>
    </div>
  );
}
