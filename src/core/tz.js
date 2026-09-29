const OFFSET_HOURS = 5;

export function toInstant(date, hm) {
  return new Date(`${date}T${hm}:00+05:00`);
}

export function dateOf(instant) {
  return new Date(instant.getTime() + OFFSET_HOURS * 3600e3).toISOString().slice(0, 10);
}

export function addDays(date, n) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
