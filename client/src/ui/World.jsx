// Ambient "world" behind the screen, picked from the film's genre.
// Pure CSS (transform/opacity only), so it never competes with the video for the main thread.
import { memo, useMemo } from 'react';

const seq = (n, f) => Array.from({ length: n }, (_, i) => f(i));

function World({ world = 'calm', pulse = 0 }) {
  const stars = useMemo(() => seq(70, (i) => ({ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 85}%`, size: i % 5 === 0 ? 2 : 1, dur: `${2 + (i % 5) * 0.8}s` })), []);
  const rain = useMemo(() => seq(60, (i) => ({ left: `${(i * 29) % 100}%`, dur: `${0.6 + (i % 4) * 0.15}s`, delay: `${-(i * 0.11).toFixed(2)}s` })), []);
  const bokeh = useMemo(() => seq(14, (i) => ({ left: `${(i * 31) % 95}%`, top: `${30 + (i * 17) % 50}%`, size: 30 + (i % 4) * 16, dur: `${3 + (i % 3)}s`, c: ['rgba(255,190,120,.55)', 'rgba(140,180,255,.45)', 'rgba(255,140,170,.4)', 'rgba(255,230,170,.5)'][i % 4] })), []);
  const dust = useMemo(() => seq(18, (i) => ({ left: `${(i * 67) % 98}%`, dur: `${5 + (i % 3)}s`, delay: `${-(i * 0.7).toFixed(1)}s` })), []);

  return (
    <div className={`world world-${world}`} aria-hidden="true">
      {world === 'fog' && (<>
        <div className="w-moon" />
        <svg className="w-trees" viewBox="0 0 1280 260" preserveAspectRatio="none"><path d="M0 260V150l30-40 18 30 26-70 22 52 30-30 20 46 40-80 26 60 34-28 28 50 44-90 30 70 22-26 30 44 50-60 26 40 36-20 40 54 30-70 34 50 40-30 30 40 50-84 30 66 30-22 36 50 46-58 24 34 40-26 44 48 34-62 30 46 40-36 36 60 30-30 34 28V260z" /></svg>
        <div className="w-fog a" /><div className="w-fog b" />
        <div key={pulse} className={`w-flash ${pulse ? 'go' : ''}`} />
      </>)}
      {world === 'space' && (<>
        <div className="w-nebula" />
        {stars.map((s, i) => <span key={i} className="w-star" style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDuration: s.dur }} />)}
        <div key={pulse} className={`w-shoot ${pulse ? 'go' : ''}`} />
      </>)}
      {world === 'rain' && (<>
        {bokeh.map((b, i) => <span key={i} className="w-bokeh" style={{ left: b.left, top: b.top, width: b.size, height: b.size, background: b.c, animationDuration: b.dur }} />)}
        <div className={`w-rainwrap ${pulse ? 'heavy' : ''}`}>
          {rain.map((r, i) => <span key={i} className="w-drop" style={{ left: r.left, animationDuration: r.dur, animationDelay: r.delay }} />)}
        </div>
      </>)}
      {world === 'stage' && (<>
        <div className={`w-beam l ${pulse ? 'fast' : ''}`} /><div className={`w-beam r ${pulse ? 'fast' : ''}`} />
        {bokeh.slice(0, 10).map((b, i) => <span key={i} className="w-bokeh gold" style={{ left: b.left, top: b.top, width: b.size, height: b.size, animationDuration: b.dur }} />)}
        {dust.map((d, i) => <span key={i} className="w-dust" style={{ left: d.left, animationDuration: d.dur, animationDelay: d.delay }} />)}
      </>)}
      <div className="w-vignette" />
    </div>
  );
}

export default memo(World);
