// VibeMatch ("VibeMatch" artboard), Mood Check ("Mood Check roll call") and Verdict ("Verdict + Never Again wall").
import { useEffect, useState } from 'react';
import { VIBES, VERDICTS } from '../../../shared/catalog.js';
import { byId } from './common.jsx';
import { s } from './s.js';
import { StickerAvatar } from './snacks.jsx';
import { CloseBtn, Confetti, posterBg } from './Swipe.jsx';

// ---------------- VibeMatch ----------------
export function VibeCheck({ vibe, me, members, canStart, onPick, onGo, onCancel, onMinimize }) {
  const mine = vibe.picks[me];
  const connected = members.filter((m) => m.connected);
  const picks = Object.values(vibe.picks);
  const counts = VIBES.map((v) => ({ ...v, n: picks.filter((p) => p === v.id).length })).filter((v) => v.n).sort((a, b) => b.n - a.n);
  return (
    <div role="dialog" aria-modal="true" aria-label="Vibe check" style={s("position: fixed; inset: 0; z-index: 20; background: #17112B; color: #FFF6E6; font-family: 'Nunito', sans-serif; display: flex; justify-content: center; overflow: auto")}>
      <div style={s('width: 100%; max-width: 430px; box-sizing: border-box; padding: 34px 22px 26px; display: flex; flex-direction: column; gap: 22px; min-height: 100%')}>
        <div style={s('display: flex; justify-content: space-between; align-items: flex-start; gap: 10px')}>
          <div>
            <div style={s('font-weight: 800; font-size: 14px; color: #8C80B8')}>Step 1 of 2</div>
            <h1 className="ms-display" style={s('margin: 6px 0 0; font-size: 34px; line-height: 1.05')}>What's the vibe tonight?</h1>
          </div>
          <CloseBtn onClick={onMinimize} label="Minimise" />
        </div>
        <div style={s('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px')}>
          {VIBES.map((m) => {
            const on = mine === m.id;
            const who = connected.filter((x) => vibe.picks[x.id] === m.id);
            return (
              <button key={m.id} onClick={() => onPick(m.id)} aria-pressed={on} className="ms-press"
                style={{ ...s('height: 112px; border-radius: 22px; font-weight: 800; font-size: 17px; line-height: 1.15; text-align: left; padding: 14px; display: flex; flex-direction: column; justify-content: space-between'),
                  border: `3px solid ${on ? '#0E0A1C' : '#2E2452'}`, background: on ? m.color : '#241B40', color: on ? '#17112B' : '#FFF6E6',
                  boxShadow: on ? '4px 4px 0 #0E0A1C' : 'none', transform: on ? 'translateY(-3px)' : 'none' }}>
                <span style={s('display: flex; justify-content: space-between; align-items: center; width: 100%')}>
                  <span style={{ ...s('width: 14px; height: 14px; border-radius: 50%'), background: on ? '#17112B' : m.color }} />
                  <span style={s('display: flex')}>{who.map((x, i) => <span key={x.id} title={x.name} style={{ ...s('width: 20px; height: 20px; border-radius: 50%; border: 2px solid #0E0A1C'), background: x.color, marginLeft: i ? -6 : 0 }} />)}</span>
                </span>
                {m.label}
              </button>
            );
          })}
        </div>
        <div style={s('margin-top: auto; display: flex; flex-direction: column; gap: 10px')}>
          <div style={s('display: flex; justify-content: space-between; font-weight: 800; font-size: 14px')}><span>Room vibe so far</span><span style={s('color: #8C80B8')}>{picks.length} of {connected.length} picked</span></div>
          <div style={s('display: flex; height: 14px; border-radius: 7px; overflow: hidden; background: #241B40; transform-origin: left; animation: grow .8s ease-out')}>
            {counts.map((c) => <span key={c.id} style={{ flex: c.n, background: c.color, transition: 'flex .4s' }} />)}
          </div>
          <div style={s('font-size: 15px; font-weight: 700; color: #D9D0F2; line-height: 1.4')}>
            {counts.length === 0 ? 'Waiting for the first pick…'
              : counts.length === 1 ? <>Everyone so far: <b style={{ color: counts[0].color }}>{counts[0].label.toLowerCase()}</b>. Your swipe deck will lean that way.</>
              : <>Mostly <b style={{ color: counts[0].color }}>{counts[0].label.toLowerCase()}</b> with a side of <b style={{ color: counts[1].color }}>{counts[1].label.toLowerCase()}</b>. Your swipe deck will mix both.</>}
          </div>
          {canStart ? (
            <>
              <button className="ms-press ms-display" disabled={!picks.length} onClick={onGo} style={s('margin-top: 6px; height: 58px; border-radius: 18px; border: 3px solid #0E0A1C; background: #FFD23F; color: #17112B; box-shadow: 4px 4px 0 #0E0A1C; font-size: 20px')}>Start swiping</button>
              <button onClick={onCancel} style={s('background: none; border: none; color: #8C80B8; font-weight: 800; font-size: 14px; padding: 8px')}>Cancel</button>
            </>
          ) : <div style={s('text-align: center; font-weight: 700; color: #8C80B8; font-size: 14px; padding: 10px')}>Swiping starts when everyone has picked</div>}
        </div>
      </div>
    </div>
  );
}

// ---------------- Mood Check ----------------
const darken = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgb(${Math.round(r * 0.22)}, ${Math.round(g * 0.22)}, ${Math.round(b * 0.25)})`;
};
export function MoodCheck({ data, serverNow, isHost, onEnd, me }) {
  const [, force] = useState(0);
  useEffect(() => { const iv = setInterval(() => force((x) => x + 1), 250); return () => clearInterval(iv); }, []);
  const t = serverNow() - data.startAt;
  const idx = Math.floor(t / data.step);
  const done = idx >= data.list.length;
  const cur = data.list[Math.max(0, Math.min(idx, data.list.length - 1))];
  const glow = darken(cur?.color || '#5BE3A6');
  return (
    <div role="dialog" aria-modal="true" aria-label="Mood check"
      style={{ ...s("position: fixed; inset: 0; z-index: 20; color: #FFF6E6; font-family: 'Nunito', sans-serif; display: flex; flex-direction: column; align-items: center; padding: 44px 20px 30px; gap: 28px; overflow: auto; transition: background .4s"),
        background: `radial-gradient(ellipse at 50% 45%, ${glow} 0%, #0F1A17 55%, #07100D 100%)` }}>
      <div style={s('display: flex; flex-direction: column; align-items: center; gap: 12px')}>
        <div style={s('font-weight: 800; font-size: 15px; color: #9BE8B0; letter-spacing: 2px')}>INTERVAL · MOOD CHECK</div>
        <div style={s('display: flex; gap: 8px')}>
          {data.list.map((p, k) => <span key={p.id} style={{ width: k === idx ? 34 : 10, height: 10, borderRadius: 5, background: k <= idx ? p.color : 'rgba(255,246,230,.2)', transition: 'width .3s' }} />)}
        </div>
      </div>
      <div style={s('flex: 1; display: flex; align-items: center; justify-content: center; width: 100%')}>
        {t < 0 || done ? (
          <div style={s('width: min(520px, 100%); background: #FFF4DC; color: #17112B; border: 3px solid #0E0A1C; border-radius: 32px; box-shadow: 10px 10px 0 #0E0A1C; padding: 34px; display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center; animation: enter .45s cubic-bezier(.2,1.4,.4,1) both; box-sizing: border-box')}>
            <div className="ms-display" style={s('font-size: 50px; line-height: 1; letter-spacing: -1px')}>{done ? "That's the room." : 'Mood check!'}</div>
            <div style={s('font-size: 16px; font-weight: 700; color: #4A3F6B')}>{done ? 'Back to the movie?' : "Let's see how everyone is really doing…"}</div>
          </div>
        ) : (
          <div key={cur.id} style={s('width: min(520px, 100%); background: #FFF4DC; color: #17112B; border: 3px solid #0E0A1C; border-radius: 32px; box-shadow: 10px 10px 0 #0E0A1C; padding: 34px; display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center; animation: enter .45s cubic-bezier(.2,1.4,.4,1) both; box-sizing: border-box')}>
            <div className="ms-display" style={{ ...s('width: 110px; height: 110px; border-radius: 50%; border: 3px solid #0E0A1C; display: flex; align-items: center; justify-content: center; font-size: 46px; animation: bob 2s ease-in-out infinite'), background: cur.color }}>{(cur.name || '?')[0].toUpperCase()}</div>
            <div style={s('font-weight: 800; font-size: 18px')}>{cur.id === me ? 'You are' : `${cur.name} is`}</div>
            <div className="ms-display" style={s('font-size: clamp(38px, 7vw, 50px); line-height: 1; letter-spacing: -1px')}>{cur.label}</div>
            <div style={s('font-size: 16px; font-weight: 700; color: #4A3F6B')}>{cur.why}</div>
            <div style={s('display: flex; align-items: center; gap: 12px; min-height: 52px; padding: 0 20px; border-radius: 999px; background: #17112B; color: #FFF4DC; margin-top: 6px')}>
              <span aria-hidden="true" style={s('display: flex; align-items: center; gap: 3px; height: 22px')}>
                {[0, 0.15, 0.3, 0.45].map((d) => <span key={d} style={{ width: 4, height: 6, background: cur.color, borderRadius: 2, animation: `eqb .6s ease-in-out ${d}s infinite` }} />)}
              </span>
              <span style={s('font-weight: 800; font-size: 15px')}>{cur.song ? `Now playing: ${cur.song.title}` : 'No song for this mood yet'}</span>
            </div>
          </div>
        )}
      </div>
      {isHost ? (
        <div style={s('display: flex; gap: 12px; align-items: center; flex-wrap: wrap; justify-content: center')}>
          {!done && <button onClick={onEnd} style={s('height: 52px; padding: 0 20px; border-radius: 16px; border: 2px solid rgba(255,246,230,.35); background: transparent; color: #FFF6E6; font-weight: 800; font-size: 15px')}>Skip, back to movie</button>}
          {done && <button className="ms-press ms-display" onClick={onEnd} style={s('height: 52px; padding: 0 26px; border-radius: 16px; border: 3px solid #0E0A1C; background: #FFD23F; color: #17112B; box-shadow: 4px 4px 0 #0E0A1C; font-size: 18px')}>Resume movie</button>}
        </div>
      ) : done && <div style={s('font-weight: 700; color: #8FB3A3')}>Waiting for the host to resume</div>}
      <div style={s('font-size: 13px; font-weight: 700; color: #8FB3A3; text-align: center')}>Moods come from chat and reactions only. Plays only during a pause, interval or the end.</div>
    </div>
  );
}

// ---------------- Verdict ----------------
function saveCard(verdict, members, V) {
  const c = document.createElement('canvas');
  c.width = 1080; c.height = 1350;
  const g = c.getContext('2d');
  g.fillStyle = '#17112B'; g.fillRect(0, 0, 1080, 1350);
  g.fillStyle = '#2E2452';
  for (let x = 14; x < 1080; x += 28) for (let y = 14; y < 1350; y += 28) { g.beginPath(); g.arc(x, y, 1.5, 0, 7); g.fill(); }
  g.fillStyle = '#FFD23F'; g.font = '800 34px Nunito, sans-serif'; g.fillText('THE ROOM HAS SPOKEN', 80, 120);
  g.fillStyle = '#FFF6E6'; g.font = '800 74px "Bricolage Grotesque", sans-serif'; g.fillText(verdict.title.slice(0, 22), 80, 210);
  const res = verdict.result || {};
  g.save(); g.translate(540, 470); g.rotate(-0.24);
  g.strokeStyle = '#FF4F7B'; g.lineWidth = 12; g.fillStyle = '#17112B';
  g.beginPath(); g.roundRect(-330, -110, 660, 220, 26); g.fill(); g.stroke();
  g.fillStyle = '#FF4F7B'; g.font = '800 96px "Bricolage Grotesque", sans-serif'; g.textAlign = 'center';
  g.fillText(res.banned ? 'NEVER AGAIN' : (V[res.top]?.label.split(' ').slice(0, 2).join(' ').toUpperCase() || 'MIXED'), 0, 34);
  g.restore();
  let y = 720;
  g.textAlign = 'left';
  for (const [mid, vid] of Object.entries(verdict.picks || {}).slice(0, 6)) {
    const m = members.find((x) => x.id === mid);
    g.fillStyle = '#241B40'; g.beginPath(); g.roundRect(80, y - 60, 920, 92, 20); g.fill();
    g.fillStyle = m?.color || '#FFD23F'; g.beginPath(); g.roundRect(100, y - 44, 60, 60, 18); g.fill();
    g.fillStyle = '#FFF6E6'; g.font = '800 30px Nunito, sans-serif'; g.fillText(`${m?.name || '?'} · ${V[vid]?.label || ''}`, 184, y - 10);
    g.fillStyle = '#BDB3DD'; g.font = '700 26px Nunito, sans-serif'; g.fillText(verdict.roasts?.[mid] ? `"${verdict.roasts[mid]}"` : '', 184, y + 22);
    y += 108;
  }
  const a = document.createElement('a');
  a.href = c.toDataURL('image/png'); a.download = `verdict-${verdict.title.replace(/\W+/g, '-').toLowerCase()}.png`; a.click();
}

export function Verdict({ verdict, me, members, isHost, never, onPick, onReveal, onClose, onNext }) {
  const [pick, setPick] = useState(null);
  const [roast, setRoast] = useState('');
  const [locked, setLocked] = useState(false);
  const connected = members.filter((m) => m.connected);
  const byMember = Object.fromEntries(members.map((m) => [m.id, m]));
  const V = Object.fromEntries(VERDICTS.map((v) => [v.id, v]));
  const revealed = !verdict.active;
  const res = verdict.result || {};
  const iDone = locked || verdict.done.includes(me);
  const myPick = revealed ? verdict.picks?.[me] : pick;
  const topV = V[res.top];
  const bg = posterBg(verdict.movieId || verdict.title);

  return (
    <div className="ms" role="dialog" aria-modal="true" aria-label="Verdict" style={s('position: fixed; inset: 0; z-index: 20; overflow: auto')}>
      {revealed && !res.banned && <Confetti n={18} />}
      <div style={s('position: relative; z-index: 1; max-width: 1280px; margin: 0 auto; box-sizing: border-box; padding: 32px clamp(16px, 4vw, 44px); display: flex; flex-direction: column; gap: 22px')}>
        <div style={s('display: flex; justify-content: space-between; align-items: flex-end; gap: 14px; flex-wrap: wrap')}>
          <div>
            <div style={s('font-weight: 800; font-size: 15px; color: #FFD23F; letter-spacing: 1px')}>{revealed ? 'THE ROOM HAS SPOKEN' : 'THE CREDITS ARE ROLLING'}</div>
            <h1 className="ms-display" style={s('margin: 4px 0 0; font-size: clamp(34px, 5vw, 48px); letter-spacing: -1px')}>So... how was it?</h1>
          </div>
          <div style={s('display: flex; gap: 12px; flex-wrap: wrap')}>
            {revealed && <button className="ms-press" onClick={() => saveCard(verdict, members, V)} style={s('height: 52px; padding: 0 18px; border-radius: 14px; border: 3px solid #0E0A1C; background: #3DB7FF; color: #17112B; box-shadow: 4px 4px 0 #0E0A1C; font-weight: 800; font-size: 16px')}>Save verdict card</button>}
            {revealed && <button className="ms-press" onClick={onNext} style={s('height: 52px; padding: 0 18px; border-radius: 14px; border: 3px solid #0E0A1C; background: #FFD23F; color: #17112B; box-shadow: 4px 4px 0 #0E0A1C; font-weight: 800; font-size: 16px')}>Pick the next one</button>}
            {(revealed || isHost) && <CloseBtn onClick={onClose} />}
          </div>
        </div>

        <div className="ms-verdict">
          <section style={s('width: 340px; max-width: 100%; display: flex; flex-direction: column; gap: 16px; align-items: center; flex-shrink: 0; margin: 0 auto')}>
            <div style={{ ...s('width: 300px; height: 420px; max-width: 100%; position: relative'), animation: revealed && res.banned ? 'shake 3.2s ease-out 1' : 'none' }}>
              <div style={{ ...s('position: absolute; inset: 0; border: 3px solid #0E0A1C; border-radius: 20px; box-shadow: 8px 8px 0 #0E0A1C; display: flex; align-items: flex-end; padding: 18px; box-sizing: border-box'), background: bg }}>
                <span className="ms-display" style={s('font-size: 32px; line-height: 1; color: #17112B')}>{verdict.title}</span>
              </div>
              {revealed && res.banned && (
                <>
                  <svg aria-hidden="true" viewBox="0 0 300 420" preserveAspectRatio="none" style={s('position: absolute; inset: 0; width: 100%; height: 100%')}><path d="M36 50L264 370M264 50L36 370" stroke="#FF4F7B" strokeWidth="22" strokeLinecap="round" /></svg>
                  <div className="ms-display" style={s('position: absolute; left: 22px; top: 160px; border: 6px solid #FF4F7B; color: #FF4F7B; background: #17112B; border-radius: 14px; padding: 8px 18px; font-size: 40px; line-height: 1; text-align: center; animation: slam 1.6s ease-out both')}>NEVER<br />AGAIN</div>
                </>
              )}
              {revealed && !res.banned && topV && (
                <div className="ms-display" style={{ ...s('position: absolute; left: 22px; top: 170px; border: 6px solid; background: #17112B; border-radius: 14px; padding: 8px 16px; font-size: 26px; line-height: 1.05; text-align: center; animation: slam 1.6s ease-out both'), color: topV.color, borderColor: topV.color }}>{topV.label.toUpperCase()}</div>
              )}
            </div>
            <div style={{ ...s('color: #17112B; border: 3px solid #0E0A1C; border-radius: 18px; box-shadow: 5px 5px 0 #0E0A1C; padding: 14px 18px; text-align: center; width: 100%; box-sizing: border-box'), background: revealed ? (res.banned ? '#FF4F7B' : (topV?.color || '#FFD23F')) : '#FFF4DC' }}>
              <div className="ms-display" style={s('font-size: 22px')}>
                {revealed ? (res.banned ? 'Room verdict: never again in this life' : `Room verdict: ${topV ? topV.label.toLowerCase() : 'mixed feelings'}`) : 'Verdicts reveal together'}
              </div>
              <div style={s('font-weight: 700; font-size: 14px; margin-top: 4px')}>
                {revealed ? (res.banned ? `${res.neverVotes} of ${res.total} voted it out. Banned from your swipes forever.` : `${res.total} verdicts in. It survives.`) : `${verdict.done.length} of ${connected.length} locked in`}
              </div>
            </div>
          </section>

          <section style={s('flex: 1; display: flex; flex-direction: column; gap: 16px; min-width: 0')}>
            <div style={s('background: #FFF4DC; color: #17112B; border: 3px solid #0E0A1C; border-radius: 22px; box-shadow: 6px 6px 0 #0E0A1C; padding: 20px; display: flex; flex-direction: column; gap: 12px')}>
              <div className="ms-display" style={s('font-size: 22px')}>{iDone && !revealed ? 'Locked in. Waiting for the others…' : 'Your verdict'}</div>
              <div className="ms-verdict-picks">
                {VERDICTS.map((v, i) => {
                  const on = myPick === v.id;
                  return (
                    <button key={v.id} className="ms-press" disabled={iDone || revealed} onClick={() => setPick(v.id)}
                      style={{ ...s('min-height: 56px; border: 3px solid #0E0A1C; border-radius: 14px; font-weight: 800; font-size: 15px; color: #17112B; padding: 8px 10px; opacity: 1'),
                        background: on ? v.color : '#FFFFFF', boxShadow: on ? '4px 4px 0 #0E0A1C' : 'none', transform: `rotate(${['-1.5deg', '1deg', '-0.5deg', '1.5deg', '-1deg', '0.5deg'][i]})` }}>{v.label}</button>
                  );
                })}
              </div>
              {!iDone && !revealed && (
                <div style={s('display: flex; gap: 10px')}>
                  <label htmlFor="roast" style={s('position: absolute; left: -9999px')}>One-line roast review</label>
                  <input id="roast" value={roast} onChange={(e) => setRoast(e.target.value)} placeholder="One-line roast review" maxLength={80}
                    style={s('flex: 1; min-width: 0; height: 50px; border: 3px solid #0E0A1C; border-radius: 14px; padding: 0 14px; font-weight: 700; font-size: 16px; background: #FFFFFF; color: #17112B')} />
                  <button className="ms-press" disabled={!pick} onClick={() => { onPick(pick, roast); setLocked(true); }}
                    style={s('height: 50px; padding: 0 18px; border-radius: 14px; border: 3px solid #0E0A1C; background: #17112B; color: #FFD23F; font-weight: 800; font-size: 16px')}>Lock it</button>
                </div>
              )}
              {isHost && !revealed && <button onClick={onReveal} style={s('align-self: flex-start; background: none; border: none; color: #4A3F6B; font-weight: 800; text-decoration: underline; padding: 4px 0')}>Reveal now (host)</button>}
            </div>

            <div className="ms-people">
              {connected.map((m) => {
                const vid = verdict.picks?.[m.id];
                const done = verdict.done.includes(m.id);
                return (
                  <div key={m.id} style={s('background: #241B40; border: 3px solid #0E0A1C; border-radius: 16px; padding: 12px 14px; display: flex; gap: 12px; align-items: center')}>
                    <StickerAvatar member={m} size={44} />
                    <div style={s('min-width: 0')}>
                      <div style={s('font-weight: 800; font-size: 15px')}>{m.id === me ? 'You' : m.name} · <span style={{ color: revealed ? (V[vid]?.color || '#BDB3DD') : done ? '#5BE3A6' : '#BDB3DD' }}>{revealed ? (V[vid]?.label || 'no verdict') : done ? 'locked in' : 'thinking…'}</span></div>
                      {revealed && verdict.roasts?.[m.id] && <div style={s('font-size: 14px; font-weight: 700; color: #BDB3DD')}>“{verdict.roasts[m.id]}”</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div style={s('background: #241B40; border: 3px solid #0E0A1C; border-radius: 20px; padding: 14px 18px; display: flex; align-items: center; gap: 16px; overflow-x: auto')}>
          <div style={s('width: 190px; flex-shrink: 0')}>
            <div className="ms-display" style={s('font-size: 20px')}>Never Again wall</div>
            <div style={s('font-size: 13px; font-weight: 700; color: #BDB3DD')}>{never.length ? `${never.length} movie${never.length === 1 ? '' : 's'} banned by this room` : 'Nothing banned yet. Lucky.'}</div>
          </div>
          {never.map((id) => (
            <div key={id} title={byId[id]?.title || id} style={{ ...s('width: 70px; height: 100px; flex-shrink: 0; border: 3px solid #0E0A1C; border-radius: 10px; position: relative; overflow: hidden; display: flex; align-items: flex-end; padding: 4px; box-sizing: border-box'), background: posterBg(id) }}>
              <span style={s('font-size: 10px; font-weight: 800; color: #17112B; line-height: 1.1')}>{byId[id]?.title || id}</span>
              <svg aria-hidden="true" viewBox="0 0 64 94" preserveAspectRatio="none" style={s('position: absolute; inset: 0; width: 100%; height: 100%')}><path d="M8 10L56 84M56 10L8 84" stroke="#FF4F7B" strokeWidth="7" strokeLinecap="round" /></svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
