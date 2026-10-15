// NoMoreScrolling: the group swipe ("Swipe (phone)" artboard) and the match reveal ("It's a match" artboard).
import { useMemo, useRef, useState } from 'react';
import { byId } from './common.jsx';
import { s } from './s.js';

const POSTER_BG = ['#3DB7FF', '#FF4F7B', '#5BE3A6', '#FFB547', '#B69CFF', '#FFD23F'];
export const posterBg = (id) => POSTER_BG[[...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % POSTER_BG.length];

export function CloseBtn({ onClick, label = 'Close' }) {
  return (
    <button onClick={onClick} aria-label={label} className="ms-press" style={s('width: 44px; height: 44px; border-radius: 50%; border: 3px solid #0E0A1C; background: #FFF4DC; color: #17112B; display: flex; align-items: center; justify-content: center; flex-shrink: 0')}>
      <svg width="12" height="12" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1L1 9" stroke="#17112B" strokeWidth="2" strokeLinecap="round" /></svg>
    </button>
  );
}

export function Confetti({ n = 24 }) {
  const bits = useMemo(() => Array.from({ length: n }, (_, i) => ({
    left: `${(i * 53) % 100}%`, color: ['#FFD23F', '#FF4F7B', '#3DB7FF', '#5BE3A6', '#FFB547'][i % 5],
    dur: `${5 + (i % 4)}s`, delay: `${-(i * 0.7).toFixed(1)}s`,
  })), [n]);
  return bits.map((c, i) => (
    <span key={i} aria-hidden="true" style={{ ...s('position: fixed; top: 0; width: 12px; height: 18px; border: 2px solid #0E0A1C; border-radius: 3px; pointer-events: none; z-index: 0'), left: c.left, background: c.color, animation: `fall ${c.dur} linear ${c.delay} infinite` }} />
  ));
}

const runtime = (m) => `${Math.floor(m / 60) ? Math.floor(m / 60) + 'h ' : ''}${m % 60}m`;

export default function Swipe({ swipe, me, members, isHost, poll, onVote, onReveal, onDismiss, onPollVote, onPollClose, onMinimize }) {
  const [mine, setMine] = useState({});
  const [drag, setDrag] = useState({ x: 0, active: false });
  const start = useRef(null);
  const deck = swipe.deck;
  const current = deck.find((id) => !mine[id]);
  const doneCount = Object.keys(mine).length;
  const connected = members.filter((m) => m.connected);
  const finished = connected.filter((m) => (swipe.progress?.[m.id] || 0) >= deck.length).length;
  const swiping = connected.length - finished;

  const vote = (v) => {
    if (!current) return;
    setMine((x) => ({ ...x, [current]: v }));
    onVote(current, v);
    if (navigator.vibrate) navigator.vibrate(v === 'super' ? [12, 40, 12] : 10);
    setDrag({ x: 0, active: false });
  };
  const onDown = (e) => { start.current = e.clientX; setDrag({ x: 0, active: true }); e.currentTarget.setPointerCapture(e.pointerId); };
  const onMove = (e) => { if (start.current != null) setDrag({ x: e.clientX - start.current, active: true }); };
  const onUp = () => {
    const x = drag.x; start.current = null;
    if (x > 110) vote('yes'); else if (x < -110) vote('no'); else setDrag({ x: 0, active: false });
  };

  // ---------------- Match reveal ----------------
  if (!swipe.active) {
    const matches = swipe.matches || [];
    const near = swipe.near || [];
    const shown = (matches.length ? matches : near).slice(0, 3);
    const secs = Math.max(1, Math.round((Date.now() - swipe.startedAt) / 1000));
    const took = secs >= 60 ? `${Math.floor(secs / 60)} min ${secs % 60} s` : `${secs} s`;
    const total = poll ? Object.keys(poll.votes).length : 0;
    const byMember = Object.fromEntries(members.map((m) => [m.id, m]));
    return (
      <div className="ms" role="dialog" aria-modal="true" aria-label="Matches" style={s('position: fixed; inset: 0; z-index: 20; overflow: auto')}>
        <Confetti />
        <div className="ms-match" style={s('position: relative; z-index: 1; max-width: 1280px; margin: 0 auto; padding: 36px clamp(16px, 4vw, 48px); box-sizing: border-box')}>
          <section style={s('flex: 1.4; display: flex; flex-direction: column; gap: 22px; min-width: 0')}>
            <div style={s('display: flex; justify-content: space-between; align-items: flex-start; gap: 12px')}>
              <h1 className="ms-display" style={s('margin: 0; font-size: clamp(42px, 7vw, 72px); line-height: 1; letter-spacing: -1px')}>
                <span style={s('display: inline-block; background: #5BE3A6; color: #17112B; border: 3px solid #0E0A1C; border-radius: 18px; box-shadow: 6px 6px 0 #0E0A1C; padding: 4px 18px; animation: popIn 1.8s ease-in-out infinite')}>
                  {matches.length ? "It's a match!" : 'So close!'}
                </span>
              </h1>
              <CloseBtn onClick={onDismiss} />
            </div>
            <div style={s('font-size: 19px; font-weight: 700; color: #D9D0F2')}>
              {matches.length
                ? `All ${shown[0]?.of || connected.length} of you said yes to ${matches.length === 1 ? 'this one' : `these ${Math.min(3, matches.length)}`}. Took you ${took}, not 40 minutes.`
                : 'Nobody agreed on everything. These came closest.'}
            </div>
            <div className="ms-match-cards">
              {shown.map((x, i) => {
                const mv = byId[x.movieId];
                if (!mv) return null;
                return (
                  <div key={x.movieId} style={{ ...s('background: #FFF4DC; color: #17112B; border: 3px solid #0E0A1C; border-radius: 20px; box-shadow: 6px 6px 0 #0E0A1C; overflow: hidden; display: flex; flex-direction: column'), transform: `rotate(${['-2deg', '1.5deg', '-1deg'][i]})` }}>
                    <div style={{ ...s('height: 200px; border-bottom: 3px solid #0E0A1C; display: flex; align-items: flex-end; padding: 14px; box-sizing: border-box'), background: posterBg(mv.id) }}>
                      <span className="ms-display" style={s('font-size: 22px; line-height: 1.05; color: #17112B')}>{mv.title}</span>
                    </div>
                    <div style={s('padding: 14px; display: flex; flex-direction: column; gap: 6px')}>
                      <div className="ms-display" style={s('font-size: 18px')}>{mv.title}</div>
                      <div style={s('font-size: 14px; font-weight: 700; color: #4A3F6B')}>{mv.genres[0]} · {runtime(mv.runtime)} · {mv.lang}</div>
                      <div style={s('font-weight: 800; font-size: 14px')}>{x.yes} / {x.of} yes · {x.super} must-watch</div>
                    </div>
                  </div>
                );
              })}
            </div>
            {matches.length > 0 && near.length > 0 && (
              <div style={s('background: #241B40; border: 3px solid #0E0A1C; border-radius: 18px; padding: 14px 18px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap')}>
                <span style={s('font-weight: 800; font-size: 15px')}>So close:</span>
                {near.slice(0, 3).map((x) => byId[x.movieId] && (
                  <span key={x.movieId} style={s('font-weight: 800; font-size: 14px; background: #FFF4DC; color: #17112B; border: 2px solid #0E0A1C; border-radius: 999px; padding: 6px 12px')}>{byId[x.movieId].title} · {x.yes} of {x.of}</span>
                ))}
              </div>
            )}
          </section>

          {poll && (
            <section style={s('flex: 1; background: #FFD23F; color: #17112B; border: 3px solid #0E0A1C; border-radius: 26px; box-shadow: 10px 10px 0 #0E0A1C; padding: 26px; display: flex; flex-direction: column; gap: 14px; align-self: flex-start; width: 100%; box-sizing: border-box')}>
              <div style={s('display: flex; justify-content: space-between; align-items: center')}>
                <span className="ms-display" style={s('font-size: 30px')}>Final vote</span>
                <span className="ms-display" style={s('font-size: 18px; background: #17112B; color: #FFD23F; border-radius: 12px; padding: 6px 12px')}>{total} / {connected.length}</span>
              </div>
              <div style={s('font-size: 16px; font-weight: 700')}>{poll.open ? 'Tap one. Majority wins, ties go to must-watch stars.' : 'Vote closed. The winner is in the queue.'}</div>
              {poll.options.map((o) => {
                const voters = Object.entries(poll.votes).filter(([, v]) => v === o.id).map(([k]) => byMember[k]).filter(Boolean);
                const pct = total ? (voters.length / total) * 100 : 0;
                const minev = poll.votes[me] === o.id;
                return (
                  <button key={o.id} className="ms-press" disabled={!poll.open} onClick={() => onPollVote(poll.id, o.id)}
                    style={{ ...s('text-align: left; background: #FFF4DC; border: 3px solid #0E0A1C; border-radius: 16px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; color: #17112B'), boxShadow: minev ? '5px 5px 0 #0E0A1C' : 'none' }}>
                    <div style={s('display: flex; justify-content: space-between; width: 100%; font-weight: 800; font-size: 17px; gap: 10px')}><span>{o.text}</span><span>{voters.length} vote{voters.length === 1 ? '' : 's'}</span></div>
                    <div style={s('height: 14px; width: 100%; background: #FFFFFF; border: 2px solid #0E0A1C; border-radius: 8px; overflow: hidden')}>
                      <div style={{ height: '100%', width: `${pct}%`, background: ['#5BE3A6', '#FF4F7B', '#3DB7FF', '#FFB547'][Number(o.id) % 4], transition: 'width .4s' }} />
                    </div>
                    <div style={s('display: flex; gap: 4px; min-height: 22px')}>
                      {voters.map((v) => <span key={v.id} title={v.name} style={{ ...s('width: 22px; height: 22px; border-radius: 50%; border: 2px solid #0E0A1C'), background: v.color }} />)}
                    </div>
                  </button>
                );
              })}
              {poll.open && isHost && (
                <>
                  <button className="ms-press ms-display" onClick={() => onPollClose(poll.id)} style={s('margin-top: 8px; height: 60px; border: 3px solid #0E0A1C; border-radius: 16px; background: #FF4F7B; color: #17112B; box-shadow: 5px 5px 0 #0E0A1C; font-size: 21px')}>Lights off, start the movie</button>
                  <div style={s('font-size: 13px; font-weight: 700; text-align: center')}>Only the host sees this button</div>
                </>
              )}
              {!poll.open && <button className="ms-press ms-display" onClick={onDismiss} style={s('height: 56px; border: 3px solid #0E0A1C; border-radius: 16px; background: #FF4F7B; color: #17112B; box-shadow: 5px 5px 0 #0E0A1C; font-size: 19px')}>Back to the room</button>}
            </section>
          )}
        </div>
      </div>
    );
  }

  // ---------------- Swiping ----------------
  const movie = current && byId[current];
  return (
    <div className="ms" role="dialog" aria-modal="true" aria-label="Group swipe" style={s('position: fixed; inset: 0; z-index: 20; display: flex; justify-content: center; overflow: auto')}>
      <div style={s('width: 100%; max-width: 430px; min-height: 100%; box-sizing: border-box; padding: 22px 20px; display: flex; flex-direction: column; gap: 14px')}>
        <div style={s('display: flex; justify-content: space-between; align-items: center; gap: 10px')}>
          <span className="ms-display" style={s('font-size: 24px')}>Tonight's pick</span>
          <div style={s('display: flex; gap: 8px; align-items: center')}>
            <span style={s('font-weight: 800; font-size: 15px; background: #FFF4DC; color: #17112B; border: 3px solid #0E0A1C; border-radius: 12px; padding: 4px 10px')}>{Math.min(doneCount + 1, deck.length)} / {deck.length}</span>
            <CloseBtn onClick={onMinimize} label="Minimise" />
          </div>
        </div>
        <div style={s('height: 12px; background: #2E2452; border: 2px solid #0E0A1C; border-radius: 8px; overflow: hidden')}><div style={{ height: '100%', width: `${(doneCount / deck.length) * 100}%`, background: '#FFD23F', transition: 'width .3s' }} /></div>
        <div style={s('display: flex; align-items: center; gap: 10px; background: #241B40; border: 3px solid #0E0A1C; border-radius: 14px; padding: 10px 12px')}>
          <div style={s('display: flex')}>
            {connected.slice(0, 5).map((m, i) => <div key={m.id} style={{ ...s('width: 30px; height: 30px; border-radius: 50%; border: 3px solid #0E0A1C'), background: m.color, marginLeft: i ? -10 : 0 }} />)}
          </div>
          <span style={s('font-weight: 700; font-size: 14px')}>{swiping} swiping · <b style={s('color: #FFD23F')}>{finished} done</b></span>
        </div>

        {movie ? (
          <>
            <div style={s('flex: 1; position: relative; margin-top: 6px; min-height: 420px')}>
              <div style={s('position: absolute; inset: 20px 18px -4px 18px; background: #3DB7FF; border: 3px solid #0E0A1C; border-radius: 24px; transform: rotate(5deg)')} />
              <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
                style={{ ...s('position: absolute; inset: 0 0 12px 0; background: #FFF4DC; color: #17112B; border: 3px solid #0E0A1C; border-radius: 24px; box-shadow: 6px 6px 0 #0E0A1C; display: flex; flex-direction: column; overflow: hidden; touch-action: none; user-select: none; cursor: grab'),
                  transform: drag.active ? `translateX(${drag.x}px) rotate(${drag.x / 18}deg)` : undefined,
                  transition: drag.active ? 'none' : 'transform .25s ease',
                  animation: drag.active ? 'none' : 'wob 3s ease-in-out infinite' }}>
                <div style={{ ...s('flex: 1; display: flex; align-items: flex-end; padding: 18px; position: relative; border-bottom: 3px solid #0E0A1C'), background: posterBg(movie.id) }}>
                  <span className="ms-display" style={s('font-size: 34px; line-height: 1; color: #17112B; opacity: .9')}>{movie.title}</span>
                  {drag.x > 30 && <span className="ms-display" style={{ ...s('position: absolute; top: 20px; left: 18px; border: 4px solid #17112B; color: #17112B; background: #5BE3A6; border-radius: 10px; padding: 4px 12px; font-size: 26px; transform: rotate(-12deg)'), opacity: Math.min(1, drag.x / 110) }}>YES!</span>}
                  {drag.x < -30 && <span className="ms-display" style={{ ...s('position: absolute; top: 20px; right: 18px; border: 4px solid #17112B; color: #17112B; background: #FF4F7B; border-radius: 10px; padding: 4px 12px; font-size: 26px; transform: rotate(12deg)'), opacity: Math.min(1, -drag.x / 110) }}>NOPE</span>}
                  {movie.src && <span style={s('position: absolute; bottom: 14px; right: 14px; background: #FFD23F; border: 3px solid #0E0A1C; border-radius: 999px; padding: 4px 10px; font-weight: 800; font-size: 13px; color: #17112B')}>Free to watch now</span>}
                </div>
                <div style={s('padding: 16px 18px; display: flex; flex-direction: column; gap: 8px')}>
                  <div className="ms-display" style={s('font-size: 24px')}>{movie.title}</div>
                  <div style={s('display: flex; gap: 6px; flex-wrap: wrap')}>
                    {[movie.genres[0], runtime(movie.runtime), movie.lang].map((t) => (
                      <span key={t} style={s('font-weight: 800; font-size: 13px; border: 2px solid #0E0A1C; border-radius: 999px; padding: 3px 10px; background: #FFFFFF')}>{t}</span>
                    ))}
                  </div>
                  <div style={s('font-size: 14px; font-weight: 700; color: #4A3F6B')}>{movie.blurb}</div>
                </div>
              </div>
            </div>
            <div style={s('display: flex; justify-content: center; align-items: center; gap: 22px; padding: 6px 0 2px')}>
              <button className="ms-press" onClick={() => vote('no')} style={s('width: 76px; height: 76px; border-radius: 50%; border: 3px solid #0E0A1C; background: #FF4F7B; box-shadow: 4px 4px 0 #0E0A1C; font-weight: 800; font-size: 14px; color: #17112B; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px')}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#17112B" strokeWidth="3.5" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>Nope
              </button>
              <button className="ms-press" onClick={() => vote('super')} style={s('width: 62px; height: 62px; border-radius: 50%; border: 3px solid #0E0A1C; background: #FFD23F; box-shadow: 4px 4px 0 #0E0A1C; font-weight: 800; font-size: 12px; color: #17112B; display: flex; flex-direction: column; align-items: center; justify-content: center; animation: pulse 1.6s ease-in-out infinite')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#17112B" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></svg>Must
              </button>
              <button className="ms-press" onClick={() => vote('yes')} style={s('width: 76px; height: 76px; border-radius: 50%; border: 3px solid #0E0A1C; background: #5BE3A6; box-shadow: 4px 4px 0 #0E0A1C; font-weight: 800; font-size: 14px; color: #17112B; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px')}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#17112B" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>Yes
              </button>
            </div>
            <div style={s('text-align: center; font-weight: 700; font-size: 14px; color: #BDB3DD')}>Drag the card or tap a button</div>
          </>
        ) : (
          <div style={s('flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; text-align: center')}>
            <div className="ms-display" style={s('font-size: 40px; background: #FFF4DC; color: #17112B; border: 3px solid #0E0A1C; border-radius: 20px; box-shadow: 6px 6px 0 #0E0A1C; padding: 14px 24px; transform: rotate(-2deg)')}>You're done!</div>
            <div style={s('font-weight: 700; font-size: 16px; color: #D9D0F2')}>Waiting for {swiping} more. Matches reveal together.</div>
            {isHost && <button className="ms-press ms-display" onClick={onReveal} style={s('height: 56px; padding: 0 24px; border: 3px solid #0E0A1C; border-radius: 16px; background: #FFD23F; color: #17112B; box-shadow: 4px 4px 0 #0E0A1C; font-size: 19px')}>Reveal now</button>}
          </div>
        )}
      </div>
    </div>
  );
}
