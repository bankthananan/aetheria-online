# Skill System Redesign — Momentum Core Loop

**Date:** 2026-07-12
**Status:** Approved design, pending implementation plan
**Scope:** Core loop only (Momentum + Finishers + Detonate). Augments deferred to a follow-up.

## Goal

Replace the current "hotbar of independent cooldowns" with a single unified combat
loop where skills interact with each other and with statuses. Three mechanics,
one shared resource:

- **Combo / chaining** — build a resource with basic skills, spend it on payoff skills.
- **Resource / charge** — that shared resource is *Momentum*.
- **Status synergy** — some skills *detonate* an existing status for bonus damage.

Deferred (not in this pass): **skill augments** (generic augment pool + picker UI +
save/load persistence). Design revisits after the core loop is verified to feel good.

## The unified mechanic: Momentum

A single per-player integer, `p.momentum` (0..max). It is the connective tissue for
all three mechanics.

- **Builders** — existing basic damage skills (melee/ranged/aoe, non-finisher).
  Unchanged gating (MP + cooldown). On a **landed hit**, grant `+perHit` Momentum,
  capped at `max`, and stamp `p.lastSkillAt`.
- **Finishers** — tagged skills (`finisher: true`), the tier-2/3 heavy hitters.
  Gated on **Momentum ≥ finisherMin** *instead of* the MP check. On cast they
  **consume all** Momentum and scale power by `1 + powerPerPoint · spent`.
  Cooldown still applies. Mashing a finisher with too little Momentum fails with a
  message, same shape as the existing "on cooldown" / "not enough MP" paths.
- **Detonate** — a skill with `detonate: 'burn'|'slow'|'stun'`. When it damages a
  target that currently has that status, add `detonateBonus` to the damage and
  **clear** the status. Turns the existing DoT/CC statuses into setups.

### Two economies, never three gates on one skill

- Builders and utility (buff/heal) keep **MP + cooldown** — unchanged.
- Finishers use **Momentum + cooldown** (MP check replaced by Momentum check).

A player tracks MP for builders and Momentum for finishers — different skills, not
three simultaneous gates on the same skill. This is the point of the redesign: it
adds an *interesting* economy, not an additive one.

### Economy rules (why sequencing matters)

- Momentum comes **only from damaging-skill hits** — not auto-attacks — so skills
  stay central to combat.
- Momentum **decays out of combat**: in the update loop, if
  `now() - lastSkillAt > decayMs` and `momentum > 0`, drop 1 and re-stamp
  `lastSkillAt`. You cannot bank Momentum between fights.
- Finishers require `finisherMin` and consume everything, so you must *build then
  spend*. Spamming a finisher fails; spamming a builder caps at `max` with no payoff
  until you spend.

## Data changes

### `js/design.js` — tuning block (all balance knobs live here)

```js
momentum: {
  max: 5,            // Momentum cap
  finisherMin: 3,    // minimum Momentum to fire a finisher
  perHit: 1,         // Momentum gained per landed builder hit
  decayMs: 3000,     // out-of-combat: lose 1 Momentum per this interval
  powerPerPoint: 0.25, // finisher power multiplier per Momentum spent
  detonateBonus: 0.5,  // +50% damage when a detonate consumes a matching status
}
```

### `js/combat.js` — two optional fields per skill

- `finisher: true` on the tier-2/3 payoff skills. Initial set:
  `world_cleaver, apocalypse, arcane_nova, meteor, star_fall, dawnbreaker,
  blizzard, divine_wrath, aegis_rend, rampage, rapid_volley, falcon_strike,
  titan_slam, decapitate`.
  (Exact list is a tuning decision — reviewer may adjust; the mechanic doesn't
  depend on which skills carry the flag.)
- `detonate: '<status>'` on a thematic few: `meteor → 'burn'`,
  `chain_lightning → 'slow'`, `shockwave → 'stun'`. Others may be added later.

Fields are optional; absent = builder, no detonate. No change to existing fields.

## Engine changes (`js/game.js`)

1. **Player init (`makePlayer`)** — add `momentum: 0`, `lastSkillAt: 0`.
2. **Save/load** — do **not** persist Momentum. On load it is 0 (decays anyway).
   Confirm `lastSkillAt` also defaults cleanly (0 is fine — first decay tick is a
   no-op when momentum is 0).
3. **`castSkillById` (~line 852)** — single new branch:
   - Compute `isFinisher = !!sk.finisher`.
   - **Gate:** if finisher, replace the `p.mp < sk.mpCost` check with
     `p.momentum < finisherMin` → fail message ("Not enough Momentum."). Do not
     deduct MP for finishers. Non-finishers keep the MP check and deduction.
   - **Finisher payoff:** `const spent = p.momentum; p.momentum = 0;` and fold
     `(1 + powerPerPoint * spent)` into the `atk` used for that cast.
   - **Builder gain:** in the melee/ranged/aoe damage paths, on a landed hit
     (after `damageMonster`), if `!isFinisher` do
     `p.momentum = Math.min(max, p.momentum + perHit); p.lastSkillAt = now();`.
     For aoe, grant once per cast that hits ≥1 target (not per target).
   - **Detonate:** in the damage computation, if `sk.detonate` and the target's
     `m.statuses[sk.detonate]` is active, multiply damage by `1 + detonateBonus`
     and `delete m.statuses[sk.detonate]`.
4. **Decay (update loop)** — once per frame/tick: if
   `now() - p.lastSkillAt > decayMs && p.momentum > 0`, `p.momentum--;
   p.lastSkillAt = now();`.
5. **HUD** — render Momentum as pips (filled/empty, `max` total) near the hotbar.
   Highlight when `≥ finisherMin` (finisher-ready).
6. **`selfCheck`** — for every skill, if `sk.detonate` is set it must be a key in
   `COMBAT.statusEffects`; else fail loudly. (Finisher flag needs no validation
   beyond being boolean.)

## `__AWO` export additions

Expose whatever the Node harness needs that isn't already exported. `G` and
`castSkillById` are already exported; the harness reads `G.player.momentum`
directly. Add nothing unless the decay tick lives in a function that must be driven
manually — if so, export it.

## Testing

Both required before "done" (per CLAUDE.md), judged by **exit code**, not grep.

### Node logic harness (`.mjs` in a tmp dir, shims browser globals, imports `js/game.js`)

- **Build & cap:** cast a builder N>max times against a parked dummy target →
  `G.player.momentum === max`, never exceeds.
- **Finisher gate:** with `momentum < finisherMin`, cast a finisher → no damage, no
  MP spent, momentum unchanged.
- **Finisher payoff:** with `momentum ≥ finisherMin`, cast a finisher → momentum
  becomes 0, and damage scales with the amount spent (compare two casts at
  different momentum, use delta/range not strict float equality).
- **Detonate:** apply `burn` to a target, cast a `detonate:'burn'` skill → status
  cleared and damage exceeds the no-status baseline (range check).
- **Decay:** build momentum, advance `now()` past `decayMs` with no cast → momentum
  drops by 1 per interval.
- Follow the known flake guard: **park all monsters**
  (`G.monsters.forEach(m => { m.x = m.y = m.homeX = m.homeY = 2000; })`) before any
  movement/facing-sensitive assertion.

### Brave headless screenshot (`autotest.html`)

- Screenshot the hotbar showing Momentum pips (some filled) and, ideally, a finisher
  firing. Add an `autotest.html` param if needed to build momentum + fire a finisher
  (e.g. reuse an existing `farm`/`fxskill` hook). Read the PNG; the red error banner
  surfaces any runtime crash.

## Out of scope (explicit)

- **Augments** — generic augment pool, tree-milestone picker, save/load persistence,
  its own selfCheck wiring. Separate design once the core loop is verified.
- No change to MP for builders, to cooldowns, to the skill tree structure, to
  passives, or to the existing status durations/tick damage.
