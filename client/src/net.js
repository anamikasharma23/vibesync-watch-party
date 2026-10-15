// WebSocket connection with automatic reconnect and server clock sync.
import { estimateOffset } from '../../shared/sync.js';

export class Conn {
  constructor(room, name) {
    this.room = room;
    this.name = name;
    this.listeners = new Set();
    this.samples = [];
    this.offset = 0;
    this.rtt = 0;
    this.status = 'connecting';
    this.retry = 0;
    this.closed = false;
    this.sessionKey = `wp:session:${room}`;
    this.session = safeGet(this.sessionKey);
    this.open();
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(msg) { for (const fn of this.listeners) fn(msg); }
  setStatus(s) { this.status = s; this.emit({ t: '_status', status: s }); }

  serverNow() { return Date.now() + this.offset; }

  open() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws`);
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      this.setStatus('syncing');
      // Burst of pings to get a good clock estimate quickly, then keep refining.
      for (let i = 0; i < 8; i++) setTimeout(() => this.ping(), i * 60);
      clearInterval(this.pingTimer);
      this.pingTimer = setInterval(() => this.ping(), 4000);
      this.send({ t: 'join', room: this.room, name: this.name, snack: safeGet('wp:snack'), session: this.session });
    };
    ws.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      if (msg.t === 'pong') {
        this.samples.push({ c0: msg.c, s: msg.s, c1: Date.now() });
        if (this.samples.length > 24) this.samples.shift();
        const est = estimateOffset(this.samples);
        this.offset = est.offset; this.rtt = est.rtt;
        return;
      }
      if (msg.t === 'welcome') {
        this.session = msg.you.session;
        safeSet(this.sessionKey, this.session);
        this.setStatus('live');
      }
      this.emit(msg);
    };
    ws.onclose = (e) => {
      clearInterval(this.pingTimer);
      if (this.closed || e.code === 4000) return;
      this.setStatus('reconnecting');
      const wait = Math.min(5000, 300 * 2 ** this.retry++) + Math.random() * 200;
      setTimeout(() => !this.closed && this.open(), wait);
    };
    ws.onerror = () => {};
  }

  ping() { this.send({ t: 'ping', c: Date.now() }); }

  send(msg) {
    if (this.ws && this.ws.readyState === 1) { this.ws.send(JSON.stringify(msg)); return true; }
    return false;
  }

  close() { this.closed = true; clearInterval(this.pingTimer); try { this.ws.close(); } catch {} }
}

export function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
export function safeSet(k, v) { try { localStorage.setItem(k, v); } catch {} }
