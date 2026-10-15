// 10-user load test for the watch party sync engine.
//
// Spawns N simulated viewers against a running server. Each viewer:
//   - syncs its clock with the server (same algorithm as the browser),
//   - runs a simulated video player with realistic imperfections
//     (clock error between devices, random buffering stalls, seeks that take time),
//   - corrects drift with the exact same function the browser uses (shared/sync.js).
// Meanwhile viewers press play / pause / seek, sometimes at the same moment,
// one viewer drops off and reconnects, and one joins late.
//
// Usage: node bench/loadtest.js [--clients 10] [--duration 60] [--jitter 0] [--host localhost:3000] [--label name]
//   --jitter N adds 0..N ms random one-way delay per message in each direction (simulated Wi-Fi).

import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { expectedPosition, correction, estimateOffset, percentile } from '../shared/sync.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const N = Number(arg('clients', 10));
const DURATION = Number(arg('duration', 60)) * 1000;
const JITTER = Number(arg('jitter', 0));
const HOST = arg('host', 'localhost:3000');
const LABEL = arg('label', JITTER ? `wifi-sim-${JITTER}ms` : 'localhost');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const delay = () => (JITTER ? Math.random() * JITTER : 0);
const t0 = Date.now();
const elapsed = () => Date.now() - t0;

const latency = [];          // { ms, action, from, to }
const drift = [];            // { ms, client, kind }
const rejections = [];
const events = [];
let actionsSent = 0;

class Viewer {
  constructor(i, code, kind) {
    this.i = i; this.code = code; this.kind = kind; // 'mp4' can nudge speed, 'youtube' cannot
    this.name = `viewer${i}`;
    this.samples = []; this.offset = 0;
    this.pb = null; this.version = 0;
    // Simulated player
    this.pos = 0; this.playing = false; this.rate = 1;
    this.clockError = 1 + (Math.random() - 0.5) * 0.01;  // +-0.5% playback clock error
    this.stallUntil = 0; this.seekBusyUntil = 0; this.lastJump = 0;
    this.session = null; this.connected = false;
  }
  serverNow() { return Date.now() + this.offset; }

  connect() {
    return new Promise((resolve) => {
      const ws = new WebSocket(`ws://${HOST}/ws`);
      this.ws = ws;
      ws.on('open', async () => {
        for (let k = 0; k < 10; k++) { this.raw({ t: 'ping', c: Date.now() }); await sleep(40); }
        this.raw({ t: 'join', room: this.code, name: this.name, session: this.session });
      });
      ws.on('message', (data) => {
        const handle = () => {
          const m = JSON.parse(data.toString());
          if (m.t === 'pong') {
            this.samples.push({ c0: m.c, s: m.s, c1: Date.now() });
            if (this.samples.length > 20) this.samples.shift();
            this.offset = estimateOffset(this.samples).offset;
            return;
          }
          if (m.t === 'welcome') {
            this.session = m.you.session; this.id = m.you.id; this.connected = true;
            this.applyPlayback(m.room.playback, true);
            resolve();
            return;
          }
          if (m.t === 'playback') {
            if (m.sentAt && m.by !== this.id) latency.push({ ms: this.serverNow() - m.sentAt, action: m.action, to: this.i });
            this.applyPlayback(m.playback);
          }
          if (m.t === 'ctl_rejected') { rejections.push({ client: this.i, reason: m.reason, at: elapsed() }); this.applyPlayback(m.playback, true); }
        };
        const d = delay();
        d ? setTimeout(handle, d) : handle();
      });
      ws.on('close', () => { this.connected = false; });
      ws.on('error', () => {});
    });
  }
  raw(msg) { if (this.ws.readyState === 1) this.ws.send(JSON.stringify(msg)); }
  send(msg) { const d = delay(); d ? setTimeout(() => this.raw(msg), d) : this.raw(msg); }

  applyPlayback(pb, force) {
    if (!force && this.pb && pb.version < this.pb.version) return;
    this.pb = pb;
    const exp = expectedPosition(pb, this.serverNow());
    // React like a browser player would on a control message.
    if (Math.abs(this.pos - exp) > 0.3) this.jump(exp);
    this.playing = pb.playing;
    if (!pb.playing) this.rate = 1;
  }
  jump(target) {
    // A seek takes 80-250 ms to complete, during which the video does not advance.
    const cost = 80 + Math.random() * 170;
    this.seekBusyUntil = Date.now() + cost;
    this.pos = target + cost / 1000 * (this.pb?.playing ? 1 : 0) * 0.6;
    this.lastJump = Date.now();
  }
  control(action, pos) {
    actionsSent++;
    this.send({ t: 'ctl', action, pos, base: this.pb?.version, sentAt: this.serverNow() });
  }

  // Advance the simulated video by dt ms of real time.
  step(dt) {
    if (!this.playing) return;
    const n = Date.now();
    if (n < this.stallUntil || n < this.seekBusyUntil) return;
    this.pos += (dt / 1000) * this.rate * this.clockError;
    // Random buffering stall, about once every 20 s per viewer.
    if (Math.random() < dt / 20000) { this.stallUntil = n + 200 + Math.random() * 700; events.push({ at: elapsed(), client: this.i, ev: 'stall' }); }
  }

  // Same correction loop as the browser (every 400 ms).
  correct() {
    if (!this.pb || !this.connected) return;
    const n = Date.now();
    const exp = expectedPosition(this.pb, this.serverNow());
    if (!this.pb.playing) { this.pos = exp; return; }
    if (n < this.stallUntil || n - this.lastJump < 1200) return; // same "buffering / just seeked" skip as the browser
    const d = this.pos - exp;
    drift.push({ ms: Math.round(d * 1000), client: this.i, kind: this.kind, at: elapsed() });
    const c = correction(d, exp, { canNudge: this.kind === 'mp4' });
    if (c.action === 'seek') { this.jump(c.target); this.rate = 1; }
    else this.rate = c.rate;
  }
}

async function main() {
  const res = await fetch(`http://${HOST}/api/rooms`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Load test' }) });
  const { code } = await res.json();
  console.log(`Room ${code} · ${N} viewers · ${DURATION / 1000}s · jitter ${JITTER} ms`);

  const viewers = [];
  for (let i = 0; i < N; i++) viewers.push(new Viewer(i, code, i % 2 === 0 ? 'mp4' : 'youtube'));
  const lateJoiner = viewers[N - 1];
  await Promise.all(viewers.slice(0, N - 1).map((v) => v.connect()));
  // Host lets everyone control playback, so concurrent actions really happen.
  viewers[0].send({ t: 'settings', controlMode: 'everyone' });
  // Load a video.
  viewers[0].send({ t: 'playlist_add', item: { src: { type: 'mp4', url: 'http://example.invalid/video.mp4' }, title: 'Test' } });
  await sleep(800);

  const sim = setInterval(() => { for (const v of viewers) v.step(50); }, 50);
  const corr = setInterval(() => { for (const v of viewers) v.correct(); }, 400);

  const script = async () => {
    viewers[0].control('play');
    let k = 0;
    while (elapsed() < DURATION) {
      await sleep(2500 + Math.random() * 1500);
      const who = viewers[Math.floor(Math.random() * (N - 1))];
      if (!who.connected) continue;
      const exp = expectedPosition(who.pb, who.serverNow());
      const r = k++ % 6;
      if (r === 0) { who.control('pause', who.pos); await sleep(1500); who.control('play'); }
      else if (r === 3) {
        // Two people seek at the same moment: one wins, one is rejected as stale.
        const other = viewers[(who.i + 1) % (N - 1)];
        who.control('seek', exp + 30);
        other.control('seek', exp - 10 > 0 ? exp - 10 : 0);
      } else who.control('seek', Math.max(0, exp + (Math.random() * 60 - 20)));
    }
  };

  // Late join at 20 s, reconnect test at 30 s.
  setTimeout(async () => {
    const at = elapsed();
    await lateJoiner.connect();
    events.push({ at, ev: 'late-join', client: lateJoiner.i, inSyncAfterMs: await timeToSync(lateJoiner, Date.now()) });
  }, Math.min(20000, DURATION * 0.33));
  setTimeout(async () => {
    const v = viewers[3];
    const at = elapsed();
    v.ws.terminate();
    await sleep(2000);
    const back = Date.now();
    await v.connect();
    events.push({ at, ev: 'reconnect', client: 3, offlineMs: 2000, sameSeat: !!v.session, inSyncAfterMs: await timeToSync(v, back) });
  }, Math.min(30000, DURATION * 0.5));

  await script();
  await sleep(1500);
  clearInterval(sim); clearInterval(corr);
  for (const v of viewers) try { v.ws.close(); } catch {}

  report(code);
}

async function timeToSync(v, from) {
  for (let i = 0; i < 100; i++) {
    await sleep(100);
    if (!v.pb) continue;
    const d = Math.abs(v.pos - expectedPosition(v.pb, v.serverNow()));
    if (!v.pb.playing || d < 0.5) return Date.now() - from;
  }
  return null;
}

function stats(arr) {
  const a = arr.map(Math.abs);
  return { n: a.length, p50: percentile(a, 50), p95: percentile(a, 95), p99: percentile(a, 99), max: a.length ? Math.max(...a) : null };
}

function report(code) {
  const L = stats(latency.map((x) => x.ms));
  const D = stats(drift.map((x) => x.ms));
  const Dm = stats(drift.filter((x) => x.kind === 'mp4').map((x) => x.ms));
  const Dy = stats(drift.filter((x) => x.kind === 'youtube').map((x) => x.ms));
  const within = drift.length ? drift.filter((x) => Math.abs(x.ms) <= 500).length / drift.length : 0;
  const result = {
    label: LABEL, date: new Date().toISOString(), room: code, clients: N, durationS: DURATION / 1000, jitterMs: JITTER,
    node: process.version, actionsSent, rejectedStale: rejections.filter((r) => r.reason === 'stale').length,
    latency: L, drift: D, driftMp4: Dm, driftYoutube: Dy, driftWithin500: within,
    events, pass: { latencyP95Under250: L.p95 != null && L.p95 <= 250, driftP95Under500: D.p95 != null && D.p95 <= 500 },
  };
  const dir = path.join(__dirname, 'results');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${LABEL}.json`), JSON.stringify({ ...result, rawLatency: latency, rawDrift: drift }, null, 2));
  const r = (v) => (v == null ? '-' : `${Math.round(v)} ms`);
  console.log(`\n=== ${LABEL} ===`);
  console.log(`Control propagation (press -> other device), ${L.n} samples: p50 ${r(L.p50)} · p95 ${r(L.p95)} · p99 ${r(L.p99)} · max ${r(L.max)}  ${result.pass.latencyP95Under250 ? 'PASS' : 'FAIL'} (<= 250 ms p95)`);
  console.log(`Drift after correction, ${D.n} samples: p50 ${r(D.p50)} · p95 ${r(D.p95)} · max ${r(D.max)} · within 500 ms ${(within * 100).toFixed(1)}%  ${result.pass.driftP95Under500 ? 'PASS' : 'FAIL'} (<= 500 ms)`);
  console.log(`  smooth-speed players (MP4): p95 ${r(Dm.p95)} · jump-only players (YouTube-like): p95 ${r(Dy.p95)}`);
  console.log(`Actions sent ${actionsSent} · stale concurrent actions rejected ${result.rejectedStale}`);
  for (const e of events.filter((x) => x.ev !== 'stall')) console.log(`  ${e.ev} at ${(e.at / 1000).toFixed(1)}s: back in sync after ${e.inSyncAfterMs} ms`);
  console.log(`  buffering stalls injected: ${events.filter((x) => x.ev === 'stall').length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
