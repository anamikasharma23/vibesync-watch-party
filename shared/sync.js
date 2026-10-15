// Shared playback sync logic. Used by the browser client and by the load test,
// so the numbers in the report come from exactly the code users run.

// Where the video should be right now, in seconds, given the room's playback
// state and the current time on the server clock (ms).
export function expectedPosition(state, serverNowMs) {
  if (!state) return 0;
  if (!state.playing) return state.position;
  const elapsed = (serverNowMs - state.updatedAt) / 1000;
  return state.position + Math.max(0, elapsed) * (state.rate || 1);
}

export const SYNC = {
  deadband: 0.08,     // under this, leave the player alone
  hardSeek: 1.0,      // over this, jump instead of nudging
  maxNudge: 0.10,     // max playback-rate change (1.10x or 0.90x)
  gain: 0.6,          // how aggressively rate tracks the error
  seekLead: 0.08,     // seek slightly ahead to cover the time a seek takes
};

// Decide what a client should do about drift.
// drift = actual - expected (seconds). Positive means the client is ahead.
// Returns { action: 'none' | 'rate' | 'seek', rate, target }
export function correction(drift, expected, opts = {}) {
  const cfg = { ...SYNC, ...opts };
  const abs = Math.abs(drift);
  if (abs < cfg.deadband) return { action: 'none', rate: 1 };
  // Players that cannot change speed smoothly (some YouTube videos) jump sooner.
  // Those players stay put inside the 0.45 s band, which is still under the 0.5 s target.
  const hard = cfg.canNudge === false ? (cfg.noNudgeHard || 0.45) : cfg.hardSeek;
  if (abs >= hard) return { action: 'seek', rate: 1, target: expected + cfg.seekLead };
  if (cfg.canNudge === false) return { action: 'none', rate: 1 };
  const nudge = Math.max(-cfg.maxNudge, Math.min(cfg.maxNudge, -drift * cfg.gain));
  return { action: 'rate', rate: Math.round((1 + nudge) * 100) / 100 };
}

// Clock offset estimate from ping samples. Each sample: { c0, s, c1 } where
// c0/c1 are client send/receive times and s is the server time in the reply.
// Uses the samples with the lowest round trip, which are the least noisy.
export function estimateOffset(samples) {
  if (!samples.length) return { offset: 0, rtt: 0 };
  const scored = samples.map((p) => {
    const rtt = p.c1 - p.c0;
    return { rtt, offset: p.s - (p.c0 + rtt / 2) };
  }).sort((a, b) => a.rtt - b.rtt);
  const best = scored.slice(0, Math.max(1, Math.ceil(scored.length / 2)));
  const offsets = best.map((b) => b.offset).sort((a, b) => a - b);
  return { offset: offsets[Math.floor(offsets.length / 2)], rtt: best[0].rtt };
}

export function percentile(values, p) {
  if (!values.length) return null;
  const v = [...values].sort((a, b) => a - b);
  const idx = Math.min(v.length - 1, Math.max(0, Math.ceil((p / 100) * v.length) - 1));
  return v[idx];
}
