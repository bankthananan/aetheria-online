// Adventurer's Handbook: optional guide quests (CONTENT.guideQuests) progressed by engine events.
// Pure state logic; the engine owns rewards, toasts and rendering.

export function emptyHandbook() { return { active: {}, done: [] }; }

export function normaliseHandbook(raw) {
  const h = emptyHandbook();
  if (raw && typeof raw === 'object') {
    for (const [id, n] of Object.entries(raw.active || {})) h.active[id] = Math.max(0, Number(n) || 0);
    if (Array.isArray(raw.done)) h.done = raw.done.filter(x => typeof x === 'string');
  }
  return h;
}

// 'locked' (level / prerequisite), 'available', 'active', 'done'
export function handbookStatus(state, def, level) {
  if (state.done.includes(def.id)) return 'done';
  if (def.id in state.active) return 'active';
  if (level < (def.minLevel || 1) || (def.after && !state.done.includes(def.after))) return 'locked';
  return 'available';
}

export function startHandbook(state, def, level) {
  if (handbookStatus(state, def, level) !== 'available') return false;
  state.active[def.id] = 0;
  return true;
}

// Advances every active entry listening for `event`; returns the defs that just completed.
export function recordHandbook(state, defs, event, n = 1) {
  const finished = [];
  for (const def of defs) {
    if (def.event !== event || !(def.id in state.active)) continue;
    state.active[def.id] += n;
    if (state.active[def.id] >= def.count) { delete state.active[def.id]; state.done.push(def.id); finished.push(def); }
  }
  return finished;
}
