const ease = (t) => 1 - (1 - t) ** 3;

export function animateBounds(win, from, to, { ms = 220, steps = 12 } = {}) {
  return new Promise((resolve) => {
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      const k = ease(i / steps);
      win.setBounds({
        x: Math.round(from.x + (to.x - from.x) * k),
        y: Math.round(from.y + (to.y - from.y) * k),
        width: Math.round(from.width + (to.width - from.width) * k),
        height: Math.round(from.height + (to.height - from.height) * k),
      });
      if (i >= steps) { clearInterval(timer); resolve(); }
    }, ms / steps);
  });
}
