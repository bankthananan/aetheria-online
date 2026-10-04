// The LPC animation state machine: per-class attack identity, one-shot vs
// looping frame math, and the priority order in playerAnim. Before this layer
// existed every class played the same 6-frame sword slash and stood frozen on
// walk frame 0, while 10 of the 15 animations on every sheet went unused.
import assert from 'node:assert/strict';

import { installBrowserEnv } from './test-support/browser-env.js';

let vnow = 0;

// records the 9-arg drawImage source rects so the sheet row/frame math is checkable
const drawn = [];

const { makeCtx: ctx2d } = installBrowserEnv({
  now: () => vnow,
  innerWidth: 1440,
  innerHeight: 900,
  nullSelectors: [],
  strictIds: false,
  ctx2d: { drawImage: (...a) => { if (a.length === 9) drawn.push({ sx: a[1], sy: a[2] }); } },
});
// LPC sheets must look already loaded so drawLpc takes the sprite-sheet path
globalThis.Image = class { constructor() { this.complete = true; this.naturalWidth = 832; } };

await import('./game.js');
const A = globalThis.__AWO;
assert.ok(A, 'game debug API loaded');
const { LPC } = A;

// ---- 1. frame math: one-shot states hold the last frame, loops wrap ----
const shoot = LPC.states.shoot;
assert.equal(A.animFrame('shoot', 0), 0, 'a one-shot state starts on frame 0');
assert.equal(A.animFrame('shoot', shoot.ms - 1), shoot.frames - 1, 'a one-shot state reaches its last frame');
assert.equal(A.animFrame('shoot', shoot.ms * 10), shoot.frames - 1, 'a one-shot state HOLDS the last frame, never wraps');
assert.ok(A.animFrame('shoot', shoot.ms / 2) > 0 && A.animFrame('shoot', shoot.ms / 2) < shoot.frames - 1,
  'a one-shot state passes through its middle frames');
const walk = LPC.states.walk;
assert.equal(A.animFrame('walk', 0), 0, 'a looping state starts on frame 0');
assert.equal(A.animFrame('walk', walk.ms * walk.frames), 0, 'a looping state wraps back to frame 0');
assert.equal(A.animFrame('walk', walk.ms * (walk.frames + 1)), 1, 'a looping state keeps advancing after the wrap');
for (const [id, st] of Object.entries(LPC.states)) {
  for (const t of [0, 1, st.ms - 1, st.ms, st.ms * 7 + 13]) {
    const f = A.animFrame(id, t);
    assert.ok(Number.isInteger(f) && f >= 0 && f < st.frames, `${id} produced out-of-range frame ${f} at t=${t}`);
  }
}
assert.equal(A.animFrame('nope', 0), 0, 'an unknown state degrades to frame 0 instead of throwing');

// ---- 2. every class gets its own attack motion ----
const CLASS_COMBAT = {
  reborn_blade: 'blade', drifter: 'berserker', codeweaver: 'mage', far_shot: 'ranger',
  lightbringer: 'paladin', iron_fist: 'monk', stormcaller: 'elementalist',
};
for (const [classId, cc] of Object.entries(CLASS_COMBAT)) {
  const hero = A.makePlayer(classId, 'AnimTester');
  assert.equal(A.attackStateFor(hero), LPC.anim[cc].attack, `${cc} basic attack state`);
  assert.equal(A.finisherStateFor(hero), LPC.anim[cc].finisher, `${cc} finisher state`);
  assert.ok(LPC.states[A.attackStateFor(hero)], `${cc} attack state must exist on the sheet`);
}
assert.notEqual(A.attackStateFor(A.makePlayer('far_shot', 'x')), A.attackStateFor(A.makePlayer('reborn_blade', 'x')),
  'the archer and the swordsman must not share an attack animation');

// ---- 3. playerAnim priority: hurt > dodge > cast > attack > move > stand ----
const p = A.makePlayer('far_shot', 'AnimHero');
A.G.player = p; A.buildHud(); A.recompute(p, true);
A.G.target = null;
p.facing = { x: 0, y: 1 };
p.moving = false; p.hurtUntil = 0; p.invulnUntil = 0; p.animCastUntil = 0; p.animAttackUntil = 0;

assert.equal(A.playerAnim(p).state, 'idle', 'standing with no target breathes');
A.G.target = { alive: true };
assert.equal(A.playerAnim(p).state, 'combatIdle', 'standing with a live target holds a battle stance');
A.G.target = null;

p.moving = true;
p.moveMult = 1;
assert.equal(A.playerAnim(p).state, 'walk', 'an ordinary pace walks');
p.moveMult = 1.4;
assert.equal(A.playerAnim(p).state, 'run', 'a high-AGI pace runs');
p.moving = false; p.moveMult = 1;

p.animAttackUntil = vnow + 100;
assert.equal(A.playerAnim(p).state, 'shoot', 'the archer draws a bow on basic attack');
p.animCastUntil = vnow + 100; p.animCastState = 'cast';
assert.equal(A.playerAnim(p).state, 'cast', 'a cast outranks a basic attack');
p.invulnUntil = vnow + 100;
assert.equal(A.playerAnim(p).state, 'jump', 'the stamina dodge roll outranks a cast');
p.hurtUntil = vnow + 100;
assert.equal(A.playerAnim(p).state, 'hurt', 'taking a hit outranks everything');
p.hurtUntil = 0; p.invulnUntil = 0; p.animCastUntil = 0; p.animAttackUntil = 0;

// facing drives the direction row for every 4-way state
for (const [facing, dir] of [[{ x: 0, y: -1 }, 'up'], [{ x: -1, y: 0 }, 'left'], [{ x: 0, y: 1 }, 'down'], [{ x: 1, y: 0 }, 'right']]) {
  p.facing = facing;
  assert.equal(A.playerAnim(p).dir, dir, `facing ${dir} must select the ${dir} row`);
}

// ---- 4. a bow draw must never outlast the swing it belongs to ----
A.G.monsters.forEach(m => { m.x = m.y = m.homeX = m.homeY = 20000; });
p.facing = { x: 0, y: 1 };
const dummy = { alive: true, x: p.x, y: p.y, size: 32, flee: 0, dv: 0, lvl: p.level, hp: 9e9, maxHp: 9e9, statuses: {}, def: { id: 'slime', name: 'Dummy', drops: [] } };
A.G.target = dummy;
p.attackCdUntil = 0;
A.playerBasicAttack();
assert.ok(p.animAttackUntil > vnow, 'a basic attack starts the attack animation');
assert.ok(p.animAttackUntil - vnow <= (p.atkDelay || 1000) + 1,
  `the ${A.attackStateFor(p)} animation (${p.animAttackUntil - vnow}ms) outlasts the ${p.atkDelay}ms swing`);
assert.ok(p.animAttackUntil - vnow <= A.animMs('shoot'), 'the animation never exceeds one full pass');

// ---- 5. skills pick the right motion: channelled buffs vs the class's own strike ----
const blade = A.makePlayer('reborn_blade', 'SkillAnim');
A.G.player = blade; A.recompute(blade, true);
blade.skillLevels = { rift_slash: 1, guard_sigil: 1, aegis_rend: 1 };
blade.momentum = 5; blade.mp = blade.maxMp;
A.G.target = dummy; dummy.x = blade.x; dummy.y = blade.y;
A.castSkillById('guard_sigil');
assert.equal(blade.animCastState, 'cast', 'a buff is channelled');
blade.skillCd = {};
A.castSkillById('rift_slash');
assert.equal(blade.animCastState, 'attack', 'a damage skill uses the class attack motion');
blade.skillCd = {}; blade.momentum = 5;
A.castSkillById('aegis_rend');
assert.equal(blade.animCastState, 'backslash', 'a Momentum finisher uses the heavy wind-up');

// ---- 6. the row table itself: what rectangle does drawLpc actually sample? ----
// This is the check that catches a wrong LPC.states row — without it a bad table
// renders a real, plausible-looking sprite from the neighbouring animation.
A.setCtx({ width: 900, height: 700, getContext: ctx2d });
const C = LPC.cell;
const probe = (state, dir, frame) => {
  drawn.length = 0;
  A.drawLpc('assets/lpc/ranger.png', 100, 100, state, dir, frame, 64);
  return drawn.at(-1);
};
assert.ok(probe('walk', 'down', 0), 'drawLpc must reach the sheet path in this harness');
for (const [id, st] of Object.entries(LPC.states)) {
  assert.equal(probe(id, 'up', 0).sy, st.row * C, `${id} must sample its declared row ${st.row}`);
}
// each direction steps down exactly one row, in LPC.dirs order
LPC.dirs.forEach((dir, i) => {
  assert.equal(probe('shoot', dir, 0).sy, (LPC.states.shoot.row + i) * C, `shoot/${dir} row offset`);
});
// ...except down-only states, which ignore direction entirely
for (const dir of LPC.dirs) assert.equal(probe('hurt', dir, 0).sy, LPC.states.hurt.row * C, 'hurt is down-only');
// frames advance by column and clamp at the end of the animation
for (const f of [0, 5, 12]) assert.equal(probe('shoot', 'right', f).sx, f * C, `shoot frame ${f} column`);
assert.equal(probe('shoot', 'right', 99).sx, (LPC.states.shoot.frames - 1) * C, 'an over-run frame clamps to the last');
// an unknown state falls back to walk rather than sampling garbage off-sheet
assert.equal(probe('bogus', 'down', 0).sy, (LPC.states.walk.row + LPC.dirs.indexOf('down')) * C, 'unknown state falls back to walk');

console.log('Animation audit passed: frame math, per-class attack identity, state priority, skill motions, and sheet row mapping.');
