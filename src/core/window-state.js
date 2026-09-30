const SIZES = {
  full: { width: 180, height: 180 },
  compact: { width: 180, height: 90 },
  medium: { width: 150, height: 150 },
  strip: { width: 150, height: 75 },
};
export const VIEW_MODES = Object.keys(SIZES);

export const normalizeViewMode = (m) => (m in SIZES ? m : 'full');
export const viewSize = (mode) => ({ ...SIZES[normalizeViewMode(mode)] });

export function clampToDisplays(saved, displays, size = 200) {
  if (!saved) return null;
  const { width, height } = typeof size === 'number' ? { width: size, height: size } : size;
  for (const { workArea: a } of displays) {
    const insideX = saved.x + width > a.x && saved.x < a.x + a.width;
    const insideY = saved.y + height > a.y && saved.y < a.y + a.height;
    if (insideX && insideY) {
      return {
        x: Math.min(Math.max(saved.x, a.x), a.x + a.width - width),
        y: Math.min(Math.max(saved.y, a.y), a.y + a.height - height),
      };
    }
  }
  return null;
}
