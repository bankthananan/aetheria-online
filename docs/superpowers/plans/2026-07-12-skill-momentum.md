# Skill Momentum Core Loop — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a unified Momentum combat loop — builders build it, finishers spend it, detonators consume statuses for bonus damage — layered onto the existing skill system.

**Architecture:** One integer `p.momentum` on the player is the shared resource. All logic funnels through the single cast choke point `castSkillById` (game.js:852) plus a decay tick in `step` and pip rendering in `updateHud`. Data-only additions go in `design.js` (tuning) and `combat.js` (per-skill flags); everything fails loudly through `selfCheck`.

**Tech Stack:** Plain ES modules, zero build. Web Audio. Verification = headless Node `.mjs` harness (logic) + headless Brave screenshot of `autotest.html` (render).

## Global Constraints

- **No git in this repo** (`git` reports not-a-repository). Replace every "commit" gate with the two-way verification below. Do not run `git`.
- **Verification is required before a task is "done"** (CLAUDE.md): a Node `.mjs` harness judged **by exit code, not grep**, and — for any UI-visible change — a Brave screenshot Read back. Write harness scripts in a tmp dir (`$CLAUDE_JOB_DIR/tmp` or `/tmp`), never in the repo.
- **All balance numbers live in `design.js` `tuning`** — never hardcode momentum constants in engine code; read them from `TUNING.momentum`.
- **Data modules are the database** — no JSON/DB. Add fields to the existing `combat.js` skill objects.
- **Serve to test:** `python3 -m http.server 8777` then `http://localhost:8777/autotest.html?...`.
- Debug handle: `window.__AWO`. Flake guard: park monsters (`G.monsters.forEach(m => { m.x = m.y = m.homeX = m.homeY = 2000; })`) before movement/facing assertions.

---

### Task 1: Momentum data + selfCheck wiring

**Files:**
- Modify: `js/design.js:77` (tuning block — add `momentum`)
- Modify: `js/combat.js` (add `finisher`/`detonate` fields to skill objects)
- Modify: `js/game.js:198` (selfCheck — validate momentum tuning + detonate ids)
- Test: `$CLAUDE_JOB_DIR/tmp/t1_data.mjs`

**Interfaces:**
- Produces: `TUNING.momentum = { max, finisherMin, perHit, decayMs, powerPerPoint, detonateBonus }`; skills may carry `finisher: true` and/or `detonate: '<statusKey>'`.

- [ ] **Step 1: Add the tuning block.** In `js/design.js`, inside `tuning: {` (line 77), add:

```js
    // --- skill Momentum loop ---
    momentum: {
      max: 5,             // Momentum cap
      finisherMin: 3,     // minimum Momentum to fire a finisher
      perHit: 1,          // Momentum gained per landed builder hit
      decayMs: 3000,      // out-of-combat: lose 1 Momentum per this interval
      powerPerPoint: 0.25,// finisher power +this per Momentum spent
      detonateBonus: 0.5, // +this fraction of damage when detonating a matching status
    },
```

- [ ] **Step 2: Tag finishers and detonators in `js/combat.js`.** Add `finisher: true` to these skill objects: `aegis_rend, world_cleaver, rampage, apocalypse, meteor, arcane_nova, rapid_volley, star_fall, dawnbreaker, titan_slam, decapitate, blizzard, falcon_strike, divine_wrath`. Add `detonate: 'burn'` to `meteor`, `detonate: 'slow'` to `chain_lightning`, `detonate: 'stun'` to `shockwave`. (Append the field to each line, e.g. `..., effect: "stun", finisher: true },`.)

- [ ] **Step 3: Extend `selfCheck` (`js/game.js`, near line 198).** After the existing tuning-keys loop, add momentum validation and a detonate-id check:

```js
  for (const k of ['max','finisherMin','perHit','decayMs','powerPerPoint','detonateBonus'])
    if (!Number.isFinite(TUNING?.momentum?.[k])) errs.push(`tuning.momentum.${k} missing/non-numeric`);
  for (const s of COMBAT.skills) if (s.detonate && !COMBAT.statusEffects[s.detonate]) errs.push(`skill ${s.id} detonate → unknown status ${s.detonate}`);
```

- [ ] **Step 4: Write the failing test** `$CLAUDE_JOB_DIR/tmp/t1_data.mjs`:

```js
import assert from 'node:assert';
// shim browser globals, then import the game (copy the shim header from any existing harness;
// minimal version below)
globalThis.window = globalThis; globalThis.document = { createElement: () => ({ style:{}, appendChild(){}, getContext: () => ctx2d(), querySelector: () => null, querySelectorAll: () => [] }), querySelector: () => null, querySelectorAll: () => [], addEventListener(){}, body:{ appendChild(){} } };
globalThis.localStorage = { getItem: () => null, setItem(){}, removeItem(){} };
globalThis.AudioContext = class { createOscillator(){return{connect(){},start(){},stop(){},frequency:{setValueAtTime(){}}};} createGain(){return{connect(){},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}}};} get destination(){return{};} get currentTime(){return 0;} };
function ctx2d(){ return new Proxy({}, { get: () => () => {} }); }
const { DESIGN } = await import('../../../Desktop/personal/aetheria-online/js/design.js'); // adjust relative path
const { COMBAT } = await import('../../../Desktop/personal/aetheria-online/js/combat.js');
assert.ok(DESIGN.tuning.momentum, 'momentum tuning present');
for (const k of ['max','finisherMin','perHit','decayMs','powerPerPoint','detonateBonus'])
  assert.ok(Number.isFinite(DESIGN.tuning.momentum[k]), `momentum.${k}`);
assert.ok(COMBAT.skills.find(s => s.id === 'meteor').finisher, 'meteor is finisher');
assert.strictEqual(COMBAT.skills.find(s => s.id === 'meteor').detonate, 'burn', 'meteor detonates burn');
for (const s of COMBAT.skills) if (s.detonate) assert.ok(COMBAT.statusEffects[s.detonate], `detonate ${s.detonate}`);
console.log('t1 OK');
```

*(Use absolute paths for the imports; the relative form above is illustrative. Prefer `import(pathToFileURL('/Users/.../js/game.js'))` to also trigger `selfCheck` at load.)*

- [ ] **Step 5: Verify.** Run `node $CLAUDE_JOB_DIR/tmp/t1_data.mjs` → exit 0, prints `t1 OK`. Then load the real game (`import js/game.js`) once so `selfCheck()` runs and prints `[selfcheck] OK` — confirms the new validation doesn't false-trip. Break a detonate id on purpose to confirm it throws, then restore.

---

### Task 2: Player state, builder gain, cap, decay

**Files:**
- Modify: `js/game.js:260` (`makePlayer` — init state)
- Modify: `js/game.js:852` (`castSkillById` — grant on builder hit)
- Modify: `js/game.js:1601` (`step` — decay tick)
- Test: `$CLAUDE_JOB_DIR/tmp/t2_build.mjs`

**Interfaces:**
- Consumes: `TUNING.momentum` (Task 1).
- Produces: `p.momentum` (int, 0..max), `p.lastSkillAt` (ms). A module-level helper `gainMomentum(p)` that clamps and stamps.

- [ ] **Step 1: Init player state.** In `makePlayer` (game.js:260), in the `attackCdUntil: 0, skillCd: {}, buffs: [],` line region add: `momentum: 0, lastSkillAt: 0,`.

- [ ] **Step 2: Add the gain helper + builder grant.** Above `castSkillById`, add:

```js
function gainMomentum(p) {
  const M = TUNING.momentum;
  p.momentum = Math.min(M.max, p.momentum + M.perHit);
  p.lastSkillAt = now();
}
```

In `castSkillById`, in the **aoe** branch grant once if it hit anything, and in the **melee/ranged** branch grant on a landed (non-miss) hit — only when the skill is a builder (`!sk.finisher`):
- aoe (after the `for` loop that damages monsters): track `let hit = false;` set true inside the loop, then `if (hit && !sk.finisher) gainMomentum(p);`
- melee/ranged (after `damageMonster(t, ...)`): `if (!sk.finisher) gainMomentum(p);` (do NOT grant on the `miss` early-return path).

- [ ] **Step 3: Add decay to `step`.** In `step` (game.js:1601), after `p.buffs = p.buffs.filter(...)`, add:

```js
  // Momentum decays out of combat
  const M = TUNING.momentum;
  if (p.momentum > 0 && now() - p.lastSkillAt > M.decayMs) { p.momentum--; p.lastSkillAt = now(); }
```

- [ ] **Step 4: Export `gainMomentum` if the harness needs it** — not required (harness drives via `castSkillById` + reads `G.player.momentum`). Skip unless a test can't reach it.

- [ ] **Step 5: Write the failing test** `$CLAUDE_JOB_DIR/tmp/t2_build.mjs` (shim header as Task 1, load `js/game.js`, use `__AWO`):

```js
const A = window.__AWO;
A.G.player = A.makePlayer('reborn', 'admin'); // use a real classId from design.js
A.loadMap(/* a spawn map so combat resolves */);
A.G.monsters.forEach(m => { m.x = m.y = m.homeX = m.homeY = 2000; });
// place one dummy in range and target it
const dummy = A.G.monsters[0]; dummy.x = A.G.player.x + 20; dummy.y = A.G.player.y; dummy.alive = true; dummy.hp = 99999;
A.G.target = dummy;
const p = A.G.player; p.mp = 999;
const builder = /* a learned melee/ranged builder id for this class, e.g. 'rift_slash' */;
p.skillLevels[builder] = 1;
for (let i = 0; i < 10; i++) { p.skillCd = {}; A.castSkillById(builder); }
assert.strictEqual(p.momentum, A.DESIGN.tuning.momentum.max, 'builds to cap, not beyond');
// decay: rewind lastSkillAt and step
p.lastSkillAt = -999999; A.step(0.016);
assert.ok(p.momentum < A.DESIGN.tuning.momentum.max, 'decays out of combat');
console.log('t2 OK');
```

- [ ] **Step 6: Verify.** `node $CLAUDE_JOB_DIR/tmp/t2_build.mjs` → exit 0. (If `now()` is wall-clock and can't be forced, set `p.lastSkillAt` far in the past as shown rather than sleeping.)

---

### Task 3: Finisher gate + payoff

**Files:**
- Modify: `js/game.js:852` (`castSkillById` — gate + power scale)
- Test: `$CLAUDE_JOB_DIR/tmp/t3_finisher.mjs`

**Interfaces:**
- Consumes: `p.momentum`, `TUNING.momentum` (Tasks 1–2).
- Produces: finisher casts consume all momentum and scale damage by `1 + powerPerPoint*spent`.

- [ ] **Step 1: Replace the gate for finishers.** In `castSkillById`, the current checks are `cooldown`, then `if (p.mp < sk.mpCost) ...`. Change the MP check to:

```js
  const M = TUNING.momentum;
  if (sk.finisher) {
    if (p.momentum < M.finisherMin) { logMsg(`${sk.name} — not enough Momentum.`, 'bad'); return; }
  } else if (p.mp < sk.mpCost) { logMsg('Not enough MP.', 'bad'); return; }
```

- [ ] **Step 2: Spend + scale.** Where MP is deducted (`p.mp -= sk.mpCost;` and cooldown set), branch:

```js
  let momentumMult = 1;
  if (sk.finisher) { momentumMult = 1 + M.powerPerPoint * p.momentum; p.momentum = 0; }
  else { p.mp -= sk.mpCost; }
  p.skillCd[sk.id] = now() + sk.cooldownMs;
```

Then fold `momentumMult` into the attack: change `const atk = p.atkStat * buffMult(p, 'atk') * skillPower(p, sk);` to `... * skillPower(p, sk) * momentumMult;`.

- [ ] **Step 3: Write the failing test** `$CLAUDE_JOB_DIR/tmp/t3_finisher.mjs` (same setup harness as Task 2):

```js
const finisher = /* a learned finisher id for this class, e.g. 'meteor' for a mage */;
p.skillLevels[finisher] = 1; p.mp = 999;
// gate: below threshold does nothing
p.momentum = A.DESIGN.tuning.momentum.finisherMin - 1;
const hpBefore = dummy.hp; p.skillCd = {}; A.castSkillById(finisher);
assert.strictEqual(dummy.hp, hpBefore, 'finisher blocked below threshold');
assert.ok(p.momentum > 0, 'momentum not consumed when blocked');
// payoff: full momentum consumed, more damage than a min cast
dummy.hp = 100000; p.momentum = A.DESIGN.tuning.momentum.max; p.skillCd = {}; A.castSkillById(finisher);
const bigHit = 100000 - dummy.hp;
assert.strictEqual(p.momentum, 0, 'consumes all momentum');
dummy.hp = 100000; p.momentum = A.DESIGN.tuning.momentum.finisherMin; p.skillCd = {}; A.castSkillById(finisher);
const smallHit = 100000 - dummy.hp;
assert.ok(bigHit > smallHit, 'more momentum = more damage'); // range check, not float-eq
console.log('t3 OK');
```

- [ ] **Step 4: Verify.** `node $CLAUDE_JOB_DIR/tmp/t3_finisher.mjs` → exit 0. Use a finisher whose type resolves against the dummy (single-target `melee/ranged` finisher like `rapid_volley`/`decapitate` is simplest; for an aoe finisher, place the dummy at the cast center).

---

### Task 4: Detonate bonus

**Files:**
- Modify: `js/game.js:852` (`castSkillById` damage step) — apply detonate in `damageMonster` call sites, or in a shared helper
- Test: `$CLAUDE_JOB_DIR/tmp/t4_detonate.mjs`

**Interfaces:**
- Consumes: `sk.detonate`, `TUNING.momentum.detonateBonus`, monster `m.statuses`.
- Produces: a skill with `detonate` deals `×(1+detonateBonus)` and clears the matching status.

- [ ] **Step 1: Apply detonate at each damage site.** Both the aoe loop and the single-target path call `calcDamage(...)` then `damageMonster(m, dmg, isCrit)`. Wrap the damage with a detonate check just before `damageMonster`:

```js
  if (sk.detonate && m.statuses[sk.detonate]) { dmg = Math.round(dmg * (1 + M.detonateBonus)); delete m.statuses[sk.detonate]; }
```

(For the aoe branch the target var is `m`; for single-target it is `t`. `dmg` comes from the destructured `calcDamage` result — change `const { dmg, isCrit }` to `let { dmg, isCrit }` so it can be reassigned.)

- [ ] **Step 2: Write the failing test** `$CLAUDE_JOB_DIR/tmp/t4_detonate.mjs`:

```js
const det = /* a learned detonate skill, e.g. 'chain_lightning' (aoe, detonate slow) or 'shockwave' (aoe, detonate stun) */;
p.skillLevels[det] = 1; p.mp = 999; p.momentum = 0;
const detStatus = A.COMBAT.skills.find(s => s.id === det).detonate;
// baseline: no status
dummy.hp = 100000; delete dummy.statuses[detStatus]; p.skillCd = {}; A.castSkillById(det);
const base = 100000 - dummy.hp;
// with status present
dummy.hp = 100000; dummy.statuses[detStatus] = { until: A.__now?.() ?? 1e12, nextTick: 1e12 }; p.skillCd = {}; A.castSkillById(det);
const boosted = 100000 - dummy.hp;
assert.ok(boosted > base, 'detonate adds damage');
assert.ok(!dummy.statuses[detStatus], 'detonate clears the status');
console.log('t4 OK');
```

- [ ] **Step 3: Verify.** `node $CLAUDE_JOB_DIR/tmp/t4_detonate.mjs` → exit 0. If `now()` isn't exported, set the status `until` to a large constant so it stays active during the cast.

---

### Task 5: HUD momentum pips + screenshot

**Files:**
- Modify: `js/game.js:1703` (`buildHud` — inject pip container) and `js/game.js:1791` (`updateHud` — render pips)
- Modify: `js/theme.js` (optional pip styling) OR inline styles
- Verify: Brave headless screenshot of `autotest.html`

**Interfaces:**
- Consumes: `p.momentum`, `TUNING.momentum.max`, `finisherMin`.

- [ ] **Step 1: Inject a pip container.** In `buildHud`, near where the hotbar element is created, add a container above/beside it: `<div id="momentum-pips" class="momentum-pips"></div>`. (Match the existing HUD string-building style in `buildHud`.)

- [ ] **Step 2: Render pips each frame.** In `updateHud`, after the hotbar loop, add:

```js
  const mp = $('#momentum-pips');
  if (mp) {
    const M = TUNING.momentum, ready = p.momentum >= M.finisherMin;
    mp.innerHTML = Array.from({ length: M.max }, (_, i) =>
      `<span class="pip${i < p.momentum ? ' on' : ''}${ready ? ' ready' : ''}"></span>`).join('');
  }
```

- [ ] **Step 3: Style the pips.** Add minimal CSS (inline in the `style` element already at game.js:1790, or in `theme.js`):

```css
.momentum-pips{display:flex;gap:4px;justify-content:center;margin-bottom:4px}
.pip{width:10px;height:10px;border-radius:50%;background:#333;border:1px solid #555}
.pip.on{background:#ffcf4d;border-color:#ffe08a}
.pip.on.ready{background:#ff7a3d;border-color:#ffb27a;box-shadow:0 0 6px #ff7a3d}
```

- [ ] **Step 4: Screenshot.** Serve (`python3 -m http.server 8777`) and run:

```bash
"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" --headless --disable-gpu \
  --screenshot=$CLAUDE_JOB_DIR/tmp/momentum.png --virtual-time-budget=5000 \
  "http://localhost:8777/autotest.html?class=mage&farm=1"
```

`farm=1` auto-fights so Momentum builds. Read `momentum.png`: confirm pips render, some are filled, no red error banner. If pips never fill in the screenshot window, add an `autotest.html` param that seeds `G.player.momentum` (follow the file's existing param pattern) and screenshot that.

- [ ] **Step 5: Full regression.** Re-run all four Node harnesses (`t1`–`t4`) → all exit 0. Load the game once → `[selfcheck] OK`. Both verification paths green = done.

---

## Self-Review

- **Spec coverage:** momentum tuning (T1) ✓, finisher/detonate flags + selfCheck (T1) ✓, player state + not-persisted (T2 — momentum defaults 0 in `makePlayer`, save/load untouched so it's never written) ✓, builder gain/cap (T2) ✓, decay (T2) ✓, finisher gate/payoff (T3) ✓, detonate (T4) ✓, HUD pips (T5) ✓, both verification paths (every task) ✓.
- **Save/load note (resolved):** the spec says don't persist momentum. Verified `resumeGame` (game.js:2669) builds the player via `makePlayer` then `Object.assign`s a *whitelist* of fields that excludes momentum — so `momentum`/`lastSkillAt` keep the `makePlayer` default 0 on both new and resumed characters. `saveGame`/`readSave` stay untouched. **No `??=` guard needed anywhere.** Task 2 Step 1's `makePlayer` init is sufficient.
- **Type consistency:** `gainMomentum(p)`, `p.momentum`, `p.lastSkillAt`, `TUNING.momentum.*`, `sk.finisher`, `sk.detonate` used identically across tasks ✓.
- **Placeholders:** the `/* ... */` markers are per-class id choices the implementer fills from `combat.js` (documented inline), not unresolved logic.
