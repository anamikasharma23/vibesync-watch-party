import { CATALOG } from '../../../shared/catalog.js';

export const byId = Object.fromEntries(CATALOG.map((m) => [m.id, m]));

export function fmt(t) {
  if (!isFinite(t) || t < 0) t = 0;
  const s = Math.floor(t % 60), m = Math.floor((t / 60) % 60), h = Math.floor(t / 3600);
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const GENRE_TONES = {
  Horror: ['#1d2b28', '#0a100e', '#9fd8b4'],
  Thriller: ['#2a2230', '#0d0b12', '#e8a0b4'],
  'Sci-Fi': ['#1b2148', '#07081a', '#8ec5e8'],
  Romance: ['#46213a', '#140a12', '#ff9fc6'],
  Comedy: ['#4a3215', '#140d05', '#f2b35b'],
  Musical: ['#4a2a15', '#140c05', '#f59e7b'],
  Action: ['#40201a', '#120806', '#f59e7b'],
  Animation: ['#173c3a', '#06110f', '#7fd6d0'],
  Fantasy: ['#2e2450', '#0b0816', '#c3b3ee'],
  Drama: ['#2c2a26', '#0d0c0a', '#e6c76a'],
};

// A generated poster: no external images, consistent per title.
export function Poster({ movie, small = false }) {
  const tone = GENRE_TONES[movie.genres[0]] || GENRE_TONES.Drama;
  const h = hash(movie.title);
  const angle = h % 360;
  const cx = 20 + (h % 60), cy = 15 + ((h >> 8) % 50);
  return (
    <div className={`poster ${small ? 'poster-sm' : ''}`} style={{
      background: `radial-gradient(circle at ${cx}% ${cy}%, ${tone[2]}33 0%, transparent 45%), linear-gradient(${angle}deg, ${tone[0]}, ${tone[1]})`,
    }}>
      <div className="poster-glow" style={{ background: tone[2] }} />
      <div className="poster-meta">{movie.year} · {movie.lang}</div>
      <div className="poster-title">{movie.title}</div>
      {movie.src && <div className="poster-free">Free to watch</div>}
    </div>
  );
}

export function Avatar({ member, size = 40, ring, onClick, label, dim }) {
  const initial = (member?.name || '?').trim()[0]?.toUpperCase() || '?';
  const style = {
    width: size, height: size, fontSize: size * 0.38,
    background: `radial-gradient(circle at 30% 25%, ${member?.color || '#888'}cc, ${member?.color || '#888'}33 70%), #121616`,
    borderColor: ring || 'rgba(255,255,255,.3)', opacity: dim ? 0.4 : 1,
  };
  if (onClick) return <button type="button" className="avatar" style={style} onClick={onClick} aria-label={label} title={label}>{initial}</button>;
  return <span className="avatar" style={style} aria-hidden="true">{initial}</span>;
}

export const REACTIONS = [
  { kind: 'laugh', label: 'Laugh', color: '#F2B35B' },
  { kind: 'scream', label: 'Scream', color: '#E8A0B4' },
  { kind: 'nope', label: 'Nope', color: '#8EC5E8' },
  { kind: 'cry', label: 'Cry', color: '#C3B3EE' },
  { kind: 'wow', label: 'Wow', color: '#7FD6D0' },
  { kind: 'save', label: 'Save moment', color: '#9FD8B4' },
];
export const reactionColor = Object.fromEntries(REACTIONS.map((r) => [r.kind, r.color]));

export const MOODS = [
  { id: 'scaredy', label: 'Terrified' },
  { id: 'drama', label: 'Emotional' },
  { id: 'bored', label: 'Bored' },
  { id: 'lost', label: 'Totally lost' },
  { id: 'giggly', label: 'Giggly' },
  { id: 'lover', label: 'Romantic' },
  { id: 'savage', label: 'Savage' },
];

// Guess a person's mood from what they did in the last 10 minutes (chat + reactions only).
export function moodOf(memberId, reactions, chat, serverNow) {
  const since = serverNow - 10 * 60_000;
  const rs = reactions.filter((r) => r.by === memberId && r.at > since);
  const cs = chat.filter((c) => c.by === memberId && c.at > since).map((c) => c.text.toLowerCase());
  const n = (k) => rs.filter((r) => r.kind === k).length;
  const said = (re) => cs.filter((t) => re.test(t)).length;
  const scores = [
    { id: 'bored', score: said(/bor(ing|ed)|sleep|yawn|slow/) * 3, why: (k) => `said boring ${k} time${k > 1 ? 's' : ''}`, k: said(/bor(ing|ed)|sleep|yawn|slow/) },
    { id: 'scaredy', score: (n('scream') + n('nope')) * 1.5, why: (k) => `${k} scream${k > 1 ? 's' : ''} and nope${k > 1 ? 's' : ''}`, k: n('scream') + n('nope') },
    { id: 'drama', score: n('cry') * 2, why: (k) => `cried ${k} time${k > 1 ? 's' : ''}`, k: n('cry') },
    { id: 'lost', score: said(/what happened|who is|wait what|\?\?/) * 3, why: (k) => `asked what is going on ${k} time${k > 1 ? 's' : ''}`, k: said(/what happened|who is|wait what|\?\?/) },
    { id: 'lover', score: said(/cute|love|aww|romantic/) * 2, why: (k) => `went aww ${k} time${k > 1 ? 's' : ''}`, k: said(/cute|love|aww|romantic/) },
    { id: 'giggly', score: n('laugh') * 1.2, why: (k) => `laughed ${k} time${k > 1 ? 's' : ''}`, k: n('laugh') },
  ].sort((a, b) => b.score - a.score);
  const top = scores[0];
  if (!top.score) return { id: 'savage', label: 'Savage', why: 'too quiet, suspicious' };
  return { id: top.id, label: MOODS.find((m) => m.id === top.id).label, why: top.why(top.k) };
}
