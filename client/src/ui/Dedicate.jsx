// Song dedication sheet: tap a friend's face, the app suggests songs that match their mood.
import { useState } from 'react';
import { MOODS } from './common.jsx';
import { Close } from './Discover.jsx';
import { parseVideoLink } from '../Player.jsx';

export default function Dedicate({ target, mood, songs, onSend, onAddSong, onClose, disabled }) {
  const matching = songs.filter((s) => s.mood === mood.id);
  const list = (matching.length ? matching : songs).slice(0, 4);
  const [picked, setPick] = useState(null);
  // Default to the first matching song, also once songs arrive after being added.
  const pick = picked && list.some((x) => x.id === picked) ? picked : list[0]?.id || null;
  const [line, setLine] = useState('');
  const [adding, setAdding] = useState(songs.length === 0);
  const [form, setForm] = useState({ title: '', link: '', start: '', mood: mood.id });
  const parsed = parseVideoLink(form.link);

  return (
    <div className="sheet glass" role="dialog" aria-label={`Dedicate a song to ${target.name}`}>
      <div className="sheet-head">
        <div>
          <div className="serif sheet-title">For {target.name}</div>
          <div className="muted small">{mood.label} · {mood.why}</div>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><Close /></button>
      </div>

      {disabled && <div className="muted small">The host has turned dedications off.</div>}

      {!adding && !disabled && (
        <>
          <div className="song-list">
            {list.map((s) => (
              <button key={s.id} className={`song ${pick === s.id ? 'on' : ''}`} onClick={() => setPick(s.id)}>
                <span className="song-dot" aria-hidden="true" />
                <span className="song-title">{s.title}</span>
                <span className="muted small">{s.mood}</span>
              </button>
            ))}
          </div>
          <input className="input" value={line} onChange={(e) => setLine(e.target.value)} placeholder="Add a line (optional)" maxLength={80} aria-label="Dedication line" />
          <button className="btn primary" disabled={!pick} onClick={() => onSend(pick, line)}>Play it for the room</button>
          <button className="link-btn" onClick={() => setAdding(true)}>Add a new song</button>
        </>
      )}

      {adding && !disabled && (
        <div className="add-song">
          <div className="small muted">{songs.length === 0 ? 'No songs yet. Add the first one: any YouTube link and the second where the hook starts.' : 'Add a song to the shared list.'}</div>
          <input className="input" placeholder="Song name" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} aria-label="Song name" />
          <input className="input" placeholder="YouTube link" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} aria-label="YouTube link" />
          <div className="row">
            <input className="input" placeholder="Hook starts at (sec)" inputMode="numeric" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} aria-label="Hook start in seconds" />
            <select className="input" value={form.mood} onChange={(e) => setForm({ ...form, mood: e.target.value })} aria-label="Mood">
              {MOODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <button className="btn primary" disabled={!form.title || !parsed || parsed.type !== 'youtube'} onClick={() => {
            onAddSong({ title: form.title, youtubeId: parsed.id, start: Number(form.start) || 0, mood: form.mood, duration: 7 });
            setAdding(false); setForm({ title: '', link: '', start: '', mood: mood.id });
          }}>Save song</button>
          {songs.length > 0 && <button className="link-btn" onClick={() => setAdding(false)}>Back</button>}
        </div>
      )}
    </div>
  );
}
