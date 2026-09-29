export function startRefresh({ refresh, isMissing, everyMs, retryMs }) {
  refresh();
  const a = setInterval(refresh, everyMs);
  const b = setInterval(() => { if (isMissing()) refresh(); }, retryMs);
  return () => { clearInterval(a); clearInterval(b); };
}
