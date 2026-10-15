// Discover: recommendations by category, filters, fuzzy search, and the door into the group swipe.
import { useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import { CATALOG, CATEGORIES, GENRES, LANGS, recommend } from '../../../shared/catalog.js';
import { Poster } from './common.jsx';
import { parseVideoLink } from '../Player.jsx';

const fuse = new Fuse(CATALOG, {
  keys: [{ name: 'title', weight: 3 }, { name: 'genres', weight: 1 }, { name: 'lang', weight: 1 }, { name: 'blurb', weight: 0.5 }],
  threshold: 0.38, ignoreLocation: true, includeScore: true,
});

export default function Discover({ onClose, onAdd, onAddLink, onStartSwipe, onVibe, never = [], likedGenres, swipeBusy }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('for-you');
  const [genres, setGenres] = useState([]);
  const [lang, setLang] = useState('');
  const [maxRun, setMaxRun] = useState(200);
  const [link, setLink] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [added, setAdded] = useState({});

  const results = useMemo(() => {
    let list = q.trim() ? fuse.search(q.trim()).map((r) => r.item) : (cat === 'for-you' ? recommend(likedGenres) : CATALOG.filter(CATEGORIES.find((c) => c.id === cat)?.test || (() => true)));
    if (genres.length) list = list.filter((m) => genres.every((g) => m.genres.includes(g)));
    if (lang) list = list.filter((m) => m.lang === lang);
    list = list.filter((m) => m.runtime <= maxRun && !never.includes(m.id));
    return list;
  }, [q, cat, genres, lang, maxRun, likedGenres, never]);

  const suggestion = q.trim() && results[0] && results[0].title.toLowerCase() !== q.trim().toLowerCase() ? results[0].title : null;
  const toggleGenre = (g) => setGenres((gs) => gs.includes(g) ? gs.filter((x) => x !== g) : [...gs, g]);
  const parsed = parseVideoLink(link);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Discover movies">
      <div className="discover glass">
        <div className="discover-head">
          <h2 className="serif">What are we watching?</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Close /></button>
        </div>

        <div className="discover-body">
          <aside className="filters">
            <label className="field-label" htmlFor="dq">Search</label>
            <input id="dq" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try intersteler or hindi horror" autoFocus />
            {suggestion && <div className="hint">Showing results for <b>{suggestion}</b></div>}

            <div className="field-label">Genre</div>
            <div className="chips">
              {GENRES.map((g) => <button key={g} className={`chip ${genres.includes(g) ? 'on' : ''}`} onClick={() => toggleGenre(g)}>{g}</button>)}
            </div>

            <label className="field-label" htmlFor="dl">Language</label>
            <select id="dl" className="input" value={lang} onChange={(e) => setLang(e.target.value)}>
              <option value="">Any language</option>
              {LANGS.map((l) => <option key={l}>{l}</option>)}
            </select>

            <label className="field-label" htmlFor="dr">Max length · {maxRun >= 200 ? 'any' : `${maxRun} min`}</label>
            <input id="dr" type="range" min="10" max="200" step="10" value={maxRun} onChange={(e) => setMaxRun(Number(e.target.value))} />

            <div className="swipe-cta">
              <div className="swipe-cta-title">Can't decide?</div>
              <div className="muted small">Everyone picks a vibe, then swipes a deck built for the room. Matches reveal together.</div>
              <button className="btn primary" disabled={swipeBusy} onClick={onVibe}>
                {swipeBusy ? 'A group pick is already running' : 'Vibe check + swipe'}
              </button>
              <button className="link-btn" disabled={results.length < 3 || swipeBusy} onClick={() => onStartSwipe(results.slice(0, 12).map((m) => m.id))}>
                Or swipe these {Math.min(12, results.length)} right away
              </button>
            </div>

            <div className="field-label">Or paste a link</div>
            <input className="input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="YouTube or .mp4 link" aria-label="Video link" />
            {link && <input className="input" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Title (optional)" aria-label="Video title" />}
            <button className="btn" disabled={!parsed} onClick={() => { onAddLink(parsed, linkTitle || (parsed.type === 'youtube' ? 'YouTube video' : 'Video')); setLink(''); setLinkTitle(''); }}>Add link to queue</button>
          </aside>

          <section className="results">
            {!q.trim() && (
              <div className="tabs-row">
                <button className={`tab ${cat === 'for-you' ? 'on' : ''}`} onClick={() => setCat('for-you')}>For this room</button>
                {CATEGORIES.map((c) => <button key={c.id} className={`tab ${cat === c.id ? 'on' : ''}`} onClick={() => setCat(c.id)}>{c.label}</button>)}
              </div>
            )}
            {results.length === 0 && <div className="empty">Nothing fits all those filters. Loosen one?</div>}
            <div className="grid">
              {results.map((m) => (
                <article key={m.id} className="card">
                  <Poster movie={m} />
                  <div className="card-body">
                    <div className="card-title">{m.title}</div>
                    <div className="muted small">{m.genres.slice(0, 2).join(' · ')} · {m.runtime} min</div>
                    <button className={`btn sm ${added[m.id] ? '' : 'ghost'}`} onClick={() => { onAdd(m.id); setAdded((a) => ({ ...a, [m.id]: true })); }} disabled={added[m.id]}>
                      {added[m.id] ? 'Added' : 'Add to queue'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export function Close() {
  return <svg width="12" height="12" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
}
