// Home, built to match the "Home" artboard of the Midnight Snacks design.
import { useEffect, useState } from 'react';
import { safeGet, safeSet } from './net.js';
import { s } from './ui/s.js';
import { SNACKS, SnackIcon } from './ui/snacks.jsx';

const THEMES = [
  { id: 'space', label: 'Rooftop' },
  { id: 'rain', label: 'Cozy bedroom' },
  { id: 'stage', label: 'Old cinema' },
];

export function recentRooms() {
  try { return JSON.parse(localStorage.getItem('wp:recent') || '[]'); } catch { return []; }
}
export function rememberRoom(code, name) {
  try {
    const list = recentRooms().filter((r) => r.code !== code);
    list.unshift({ code, name, at: Date.now() });
    localStorage.setItem('wp:recent', JSON.stringify(list.slice(0, 4)));
  } catch {}
}

export default function Home() {
  const [name, setName] = useState(() => safeGet('wp:name') || '');
  const [snack, setSnack] = useState(() => safeGet('wp:snack') || 'popcorn');
  const [theme, setTheme] = useState('space');
  const [codeIn, setCodeIn] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    const list = recentRooms();
    Promise.all(list.map((r) => fetch(`/api/rooms/${r.code}`).then((x) => (x.ok ? x.json() : null)).catch(() => null)))
      .then((info) => setRecent(list.map((r, i) => ({ ...r, live: info[i] }))));
  }, []);

  const create = async () => {
    if (!name.trim()) return setErr('Tell us what to call you first.');
    setBusy(true); setErr('');
    try {
      safeSet('wp:name', name.trim()); safeSet('wp:snack', snack);
      const r = await fetch('/api/rooms', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: `${name.trim()}'s movie night`, world: theme }) });
      const { code } = await r.json();
      location.href = `/r/${code}`;
    } catch { setErr('Could not reach the server. Is it running?'); setBusy(false); }
  };
  const join = async () => {
    const fromLink = codeIn.match(/\/r\/([A-Za-z0-9]{6})/);
    const code = fromLink ? fromLink[1].toUpperCase() : codeIn.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 6) return setErr('Room codes are 6 characters.');
    const r = await fetch(`/api/rooms/${code}`).catch(() => null);
    if (!r || !r.ok) return setErr('No room with that code. Check it with your friend.');
    if (name.trim()) safeSet('wp:name', name.trim());
    safeSet('wp:snack', snack);
    location.href = `/r/${code}`;
  };

  return (
    <div className="ms" style={s('min-height: 100vh; position: relative; overflow: hidden')}>
      <div style={s('max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; min-height: 100vh')}>
        <header style={s('height: 76px; padding: 0 clamp(16px, 4vw, 48px); display: flex; align-items: center; justify-content: space-between')}>
          <div style={s('display: flex; align-items: center; gap: 12px')}>
            <div style={s('width: 40px; height: 40px; border-radius: 12px; background: #FFD23F; border: 3px solid #0E0A1C; box-shadow: 3px 3px 0 #0E0A1C; transform: rotate(-6deg)')} />
            <span className="ms-display" style={s('font-size: 24px')}>Watch Party</span>
          </div>
        </header>

        <main className="ms-home-grid" style={s('flex: 1; padding: 20px clamp(16px, 4vw, 48px) 40px')}>
          <section style={s('display: flex; flex-direction: column; gap: 22px')}>
            <h1 className="ms-display ms-h1" style={s('margin: 0; font-size: 64px; line-height: 1.02; letter-spacing: -1px')}>
              Stop scrolling.<br />Start <span style={s('display: inline-block; background: #FFD23F; color: #17112B; padding: 0 14px; border: 3px solid #0E0A1C; border-radius: 14px; box-shadow: 5px 5px 0 #0E0A1C; transform: rotate(-3deg)')}>screaming.</span>
            </h1>
            <p style={s('margin: 0; font-size: 19px; line-height: 1.5; color: #D9D0F2; max-width: 470px; font-weight: 600')}>Pick a movie together in 2 minutes, watch it in perfect sync, roast each other the whole way.</p>

            <div style={s('background: #FFF4DC; color: #17112B; border: 3px solid #0E0A1C; border-radius: 22px; box-shadow: 8px 8px 0 #0E0A1C; padding: 24px; display: flex; flex-direction: column; gap: 16px')}>
              <div style={s('display: flex; flex-direction: column; gap: 8px')}>
                <label htmlFor="nick" style={s('font-weight: 800; font-size: 15px')}>What should we call you?</label>
                <input id="nick" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={24}
                  style={s('height: 52px; border: 3px solid #0E0A1C; border-radius: 14px; padding: 0 16px; font-size: 18px; font-weight: 700; background: #FFFFFF; color: #17112B')} />
              </div>
              <div style={s('font-weight: 800; font-size: 15px')}>Pick your snack</div>
              <div className="ms-snacks">
                {SNACKS.map((x) => {
                  const on = snack === x.id;
                  return (
                    <button key={x.id} type="button" className="ms-press" onClick={() => setSnack(x.id)} aria-pressed={on}
                      style={{ ...s('height: 92px; border: 3px solid #0E0A1C; border-radius: 16px; font-weight: 800; font-size: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: #17112B'),
                        background: on ? x.color : '#FFFFFF', boxShadow: on ? '4px 4px 0 #0E0A1C' : 'none', transform: on ? 'translateY(-3px)' : 'none' }}>
                      <SnackIcon id={x.id} />{x.label}
                    </button>
                  );
                })}
              </div>
              <div style={s('font-weight: 800; font-size: 15px')}>Where are we watching?</div>
              <div className="ms-themes">
                {THEMES.map((t) => {
                  const on = theme === t.id;
                  return (
                    <button key={t.id} type="button" className="ms-press" onClick={() => setTheme(t.id)} aria-pressed={on}
                      style={{ ...s('height: 64px; border: 3px solid #0E0A1C; border-radius: 14px; font-weight: 800; font-size: 15px'),
                        background: on ? '#2E2452' : '#FFFFFF', color: on ? '#FFF6E6' : '#17112B', boxShadow: on ? '4px 4px 0 #0E0A1C' : 'none' }}>{t.label}</button>
                  );
                })}
              </div>
              <button type="button" className="ms-press ms-display" onClick={create} disabled={busy}
                style={s('height: 60px; border: 3px solid #0E0A1C; border-radius: 16px; background: #FF4F7B; color: #17112B; box-shadow: 5px 5px 0 #0E0A1C; font-size: 22px')}>
                {busy ? 'Opening…' : 'Create my room'}
              </button>
            </div>
          </section>

          <section style={s('display: flex; flex-direction: column; gap: 26px; padding-top: 14px; position: relative')}>
            <div style={s('background: #3DB7FF; color: #17112B; border: 3px solid #0E0A1C; border-radius: 22px; box-shadow: 8px 8px 0 #0E0A1C; padding: 24px; display: flex; flex-direction: column; gap: 14px; transform: rotate(1.5deg)')}>
              <div className="ms-display" style={s('font-size: 28px')}>Got a code from a friend?</div>
              <label htmlFor="code" style={s('font-weight: 800; font-size: 15px')}>Type it here</label>
              <div style={s('display: flex; gap: 12px')}>
                <input id="code" value={codeIn} onChange={(e) => setCodeIn(e.target.value)} placeholder="X7K2PQ" onKeyDown={(e) => e.key === 'Enter' && join()}
                  className="ms-display" style={s('flex: 1; min-width: 0; height: 60px; border: 3px solid #0E0A1C; border-radius: 14px; padding: 0 18px; font-size: 26px; letter-spacing: 4px; background: #FFFFFF; color: #17112B; text-transform: uppercase')} />
                <button type="button" className="ms-press" onClick={join}
                  style={s('width: 130px; height: 60px; border: 3px solid #0E0A1C; border-radius: 14px; background: #FFD23F; color: #17112B; box-shadow: 4px 4px 0 #0E0A1C; font-weight: 800; font-size: 20px')}>Jump in</button>
              </div>
              <div style={s('font-size: 15px; font-weight: 700')}>Got a link instead? Just open it, you'll land right in the room.</div>
            </div>

            {err && <div role="alert" style={s('background: #FF4F7B; color: #17112B; border: 3px solid #0E0A1C; border-radius: 14px; padding: 12px 16px; font-weight: 800')}>{err}</div>}

            <div style={s('display: flex; flex-direction: column; gap: 12px')}>
              <div className="ms-display" style={s('font-size: 22px')}>Your rooms</div>
              {recent.length === 0 && (
                <div style={s('background: #241B40; border: 3px solid #0E0A1C; border-radius: 18px; padding: 16px 18px; font-weight: 700; color: #BDB3DD')}>Rooms you join show up here so you can jump back in.</div>
              )}
              {recent.map((r) => (
                <div key={r.code} style={s('background: #241B40; border: 3px solid #0E0A1C; border-radius: 18px; padding: 16px 18px; display: flex; align-items: center; gap: 14px')}>
                  <span style={{ ...s('width: 12px; height: 12px; border-radius: 50%'), background: r.live?.members ? '#5BE3A6' : '#6B5F94', animation: r.live?.members ? 'floaty 1.4s ease-in-out infinite' : 'none' }} />
                  <div style={s('flex: 1; min-width: 0')}>
                    <div style={s('font-weight: 800; font-size: 17px')}>{r.name || r.code}</div>
                    <div style={s('font-size: 14px; color: #BDB3DD; font-weight: 600')}>{r.live ? (r.live.members ? `${r.live.members} watching right now` : 'Nobody here right now') : 'This room has ended'}</div>
                  </div>
                  {r.live && <a href={`/r/${r.code}`} style={s('font-weight: 800; font-size: 15px; padding: 10px 14px; border: 3px solid #0E0A1C; border-radius: 12px; background: #5BE3A6; color: #17112B; text-decoration: none')}>Rejoin</a>}
                </div>
              ))}
            </div>

            <div aria-hidden="true" className="ms-hide-sm" style={s('position: absolute; right: 30px; bottom: 6px; display: flex; gap: 14px; pointer-events: none')}>
              <span style={s('font-weight: 800; font-size: 15px; background: #FFD23F; color: #17112B; border: 3px solid #0E0A1C; border-radius: 999px; padding: 8px 14px; animation: rise 4s ease-out infinite')}>LOL</span>
              <span style={s('font-weight: 800; font-size: 15px; background: #FF4F7B; color: #17112B; border: 3px solid #0E0A1C; border-radius: 999px; padding: 8px 14px; animation: rise 4s ease-out 1.3s infinite')}>OMG</span>
              <span style={s('font-weight: 800; font-size: 15px; background: #5BE3A6; color: #17112B; border: 3px solid #0E0A1C; border-radius: 999px; padding: 8px 14px; animation: rise 4s ease-out 2.6s infinite')}>FIRE</span>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
