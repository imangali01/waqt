export function clampToDisplays(saved, displays, size = 200) {
  if (!saved) return null;
  for (const { workArea: a } of displays) {
    const insideX = saved.x + size > a.x && saved.x < a.x + a.width;
    const insideY = saved.y + size > a.y && saved.y < a.y + a.height;
    if (insideX && insideY) {
      return {
        x: Math.min(Math.max(saved.x, a.x), a.x + a.width - size),
        y: Math.min(Math.max(saved.y, a.y), a.y + a.height - size),
      };
    }
  }
  return null;
}
