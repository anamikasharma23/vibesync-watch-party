// One player interface over two backends: HTML5 <video> (MP4) and the YouTube IFrame API.
// The rest of the app only ever calls getTime/play/pause/seek/setRate/setVolume.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

let ytPromise = null;
export function loadYouTube() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytPromise) return ytPromise;
  ytPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev && prev(); resolve(window.YT); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  });
  return ytPromise;
}

const Player = forwardRef(function Player({ src, onReady, onDuration }, ref) {
  const videoRef = useRef(null);
  const ytHost = useRef(null);
  const yt = useRef(null);
  const [error, setError] = useState(null);
  const kind = src?.type;
  const key = src ? (src.type === 'youtube' ? src.id : src.url) : null;

  useImperativeHandle(ref, () => ({
    kind,
    ready() {
      if (kind === 'mp4') return !!videoRef.current && videoRef.current.readyState >= 2;
      return !!yt.current && typeof yt.current.getCurrentTime === 'function';
    },
    get canNudge() { return kind === 'mp4' ? true : ytCanNudge(yt.current); },
    getTime() {
      if (kind === 'mp4') return videoRef.current ? videoRef.current.currentTime : 0;
      try { return yt.current.getCurrentTime() || 0; } catch { return 0; }
    },
    duration() {
      if (kind === 'mp4') return videoRef.current?.duration || 0;
      try { return yt.current.getDuration() || 0; } catch { return 0; }
    },
    isPlaying() {
      if (kind === 'mp4') return videoRef.current ? !videoRef.current.paused : false;
      try { const st = yt.current.getPlayerState(); return st === 1 || st === 3; } catch { return false; }
    },
    isBuffering() {
      if (kind === 'mp4') return videoRef.current ? videoRef.current.readyState < 3 : true;
      try { return yt.current.getPlayerState() === 3; } catch { return true; }
    },
    play() {
      if (kind === 'mp4') return videoRef.current?.play().catch(() => {});
      try { yt.current.playVideo(); } catch {}
    },
    pause() {
      if (kind === 'mp4') return videoRef.current?.pause();
      try { yt.current.pauseVideo(); } catch {}
    },
    seek(t) {
      if (kind === 'mp4') { if (videoRef.current) videoRef.current.currentTime = Math.max(0, t); return; }
      try { yt.current.seekTo(Math.max(0, t), true); } catch {}
    },
    setRate(r) {
      if (kind === 'mp4') { if (videoRef.current && videoRef.current.playbackRate !== r) videoRef.current.playbackRate = r; return; }
      try { if (yt.current.getPlaybackRate() !== r) yt.current.setPlaybackRate(r); } catch {}
    },
    mute() {
      if (kind === 'mp4') { if (videoRef.current) videoRef.current.muted = true; return; }
      try { yt.current.mute(); } catch {}
    },
    unmute() {
      if (kind === 'mp4') { if (videoRef.current) videoRef.current.muted = false; return; }
      try { yt.current.unMute(); yt.current.setVolume(100); } catch {}
    },
    isMuted() {
      if (kind === 'mp4') return !!videoRef.current?.muted;
      try { return yt.current.isMuted(); } catch { return false; }
    },
    setVolume(v) {
      if (kind === 'mp4') { if (videoRef.current) videoRef.current.volume = Math.max(0, Math.min(1, v)); return; }
      try { yt.current.setVolume(Math.round(v * 100)); } catch {}
    },
  }), [kind, key]);

  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setError(null);
    if (kind !== 'youtube') return;
    let dead = false;
    loadYouTube().then((YT) => {
      if (dead || !ytHost.current) return;
      const el = document.createElement('div');
      ytHost.current.innerHTML = '';
      ytHost.current.appendChild(el);
      yt.current = new YT.Player(el, {
        videoId: src.id,
        width: '100%', height: '100%',
        // Same player settings as the version where trailers played. No forced "origin":
        // a mismatch there (localhost vs the tunnel link) makes YouTube refuse the video.
        playerVars: { controls: 0, disablekb: 1, modestbranding: 1, rel: 0, playsinline: 1, iv_load_policy: 3, fs: 0 },
        events: {
          onReady: () => { if (!dead) { onReady && onReady(); onDuration && onDuration(yt.current.getDuration()); } },
          onError: (e) => {
            if (dead) return;
            const code = e && e.data;
            // 5 and other glitches are often temporary: rebuild the player once or twice before giving up.
            if ((code === 5 || code === undefined || code === 153) && attempt < 2) { setTimeout(() => !dead && setAttempt((a) => a + 1), 800); return; }
            const why = code === 100 ? 'This video was removed or is private.'
              : code === 101 || code === 150 ? 'The owner of this video does not allow it to play on other websites.'
              : code === 2 ? 'That YouTube link looks wrong.'
              : `YouTube could not play this video (error ${code}).`;
            setError(`${why} Try another link.`);
          },
        },
      });
    });
    return () => { dead = true; try { yt.current && yt.current.destroy(); } catch {} yt.current = null; };
  }, [kind, key, attempt]);

  if (!src) return null;
  return (
    <div className="player">
      {kind === 'mp4' ? (
        <video
          key={key}
          ref={videoRef}
          src={src.url}
          playsInline
          preload="auto"
          onLoadedData={() => onReady && onReady()}
          onDurationChange={(e) => onDuration && onDuration(e.currentTarget.duration)}
          onError={() => setError('This video link could not be loaded.')}
        />
      ) : (
        <div className="yt" ref={ytHost} />
      )}
      {kind === 'youtube' && <div className="yt-shield" aria-hidden="true" />}
      {error && <div className="player-error">{error}</div>}
    </div>
  );
});

function ytCanNudge(p) {
  try {
    const rates = p.getAvailablePlaybackRates();
    return rates.some((r) => r > 1 && r < 1.2);
  } catch { return false; }
}

export default Player;

// Parse a pasted link into a playable source.
export function parseVideoLink(text) {
  const s = String(text || '').trim();
  if (!s) return null;
  const yt = s.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (yt) return { type: 'youtube', id: yt[1] };
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return { type: 'youtube', id: s };
  if (/^https?:\/\/.+\.(mp4|webm|m4v|mov)(\?.*)?$/i.test(s)) return { type: 'mp4', url: s };
  if (/^https?:\/\//.test(s)) return { type: 'mp4', url: s };
  return null;
}
