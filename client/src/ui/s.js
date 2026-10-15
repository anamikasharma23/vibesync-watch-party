// Turns a CSS declaration string into a React style object, so the screens can use
// the exact styles from the design file. Results are cached.
const cache = new Map();
export function s(str) {
  let out = cache.get(str);
  if (out) return out;
  out = {};
  for (const decl of str.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    const val = decl.slice(i + 1).trim();
    if (!prop) continue;
    const key = prop.startsWith('--') ? prop : prop.replace(/^-webkit-/, 'Webkit-').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[key] = val;
  }
  cache.set(str, out);
  return out;
}
// Merge a design style string with live values.
export const sx = (str, extra) => ({ ...s(str), ...extra });
