// Snack avatars from the design: each person picks one, it sets their colour across the app.
export const SNACKS = [
  { id: 'popcorn', label: 'Popcorn', color: '#FFD23F' },
  { id: 'samosa', label: 'Samosa', color: '#FFB547' },
  { id: 'cola', label: 'Cola', color: '#3DB7FF' },
  { id: 'nachos', label: 'Nachos', color: '#5BE3A6' },
];
export const snackColor = Object.fromEntries(SNACKS.map((x) => [x.id, x.color]));

export function SnackIcon({ id, size = 40 }) {
  if (id === 'samosa') return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true"><path d="M20 6L35 33H5z" fill="#FFB547" stroke="#0E0A1C" strokeWidth="2.5" strokeLinejoin="round" /><path d="M13 27l4-6M23 27l4-6" stroke="#0E0A1C" strokeWidth="2" strokeLinecap="round" /></svg>
  );
  if (id === 'cola') return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true"><g stroke="#0E0A1C" strokeWidth="2.5" strokeLinejoin="round"><path d="M11 13h18l-2 22H13z" fill="#3DB7FF" /><rect x="9" y="9" width="22" height="5" rx="2" fill="#FFF4DC" /><path d="M22 9l4-6" fill="none" strokeLinecap="round" /></g></svg>
  );
  if (id === 'nachos') return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true"><path d="M6 31L20 7l14 24z" fill="#5BE3A6" stroke="#0E0A1C" strokeWidth="2.5" strokeLinejoin="round" /><circle cx="17" cy="22" r="2" fill="#0E0A1C" /><circle cx="24" cy="26" r="2" fill="#0E0A1C" /><circle cx="21" cy="16" r="1.6" fill="#0E0A1C" /></svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true"><g stroke="#0E0A1C" strokeWidth="2.5"><circle cx="13" cy="14" r="6" fill="#FFF4DC" /><circle cx="27" cy="14" r="6" fill="#FFF4DC" /><circle cx="20" cy="10" r="7" fill="#FFF4DC" /><path d="M9 17h22l-3 18H12z" fill="#FF4F7B" strokeLinejoin="round" /></g><path d="M16 19l1 15M24 19l-1 15" stroke="#FFF4DC" strokeWidth="2.5" /></svg>
  );
}

// Sticker-style avatar used on the party screens (rounded square, initial, thick outline).
export function StickerAvatar({ member, size = 52, ring }) {
  const initial = (member?.name || '?').trim()[0]?.toUpperCase() || '?';
  return (
    <div style={{
      width: size, height: size, flexShrink: 0, borderRadius: size * 0.3, background: member?.color || '#FFD23F',
      border: '3px solid #0E0A1C', boxShadow: ring || 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: size * 0.4, color: '#17112B',
    }} aria-hidden="true">{initial}</div>
  );
}
