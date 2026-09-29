export function nameOfDay(names, date) {
  if (!names.length) return null;
  const [y, m, d] = date.split('-').map(Number);
  const dayOfYear = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86400000);
  return names[(dayOfYear - 1) % names.length];
}
