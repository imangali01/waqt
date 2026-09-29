const DEFAULTS = () => ({
  marks: {},
  tracked: {},
  sync: { lastPulledAt: null },
  settings: { autostartSet: false },
  window: null,
});

export function createData(file) {
  const data = { ...DEFAULTS(), ...file.read({}) };
  return { data, save: () => file.write(data) };
}
