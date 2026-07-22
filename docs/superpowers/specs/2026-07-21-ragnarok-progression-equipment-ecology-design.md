# Ragnarok-Style Progression, Equipment, and Ecology Design

**Date:** 2026-07-21
**Project:** Aetheria Online active game (`index.html` + `js/*.js`)

## Goal

Complete requested Ragnarok-style identity without replacing systems already shipped:

- preserve two second-job choices per base class;
- add two third-job choices per base class, each with exclusive skills;
- replace skill chapter lists with a readable dependency graph;
- unlock higher cumulative Job Level caps through promotion;
- add class-compatible weapon families and selected armor sets;
- spread monsters through expanded maps and add regional monster variety.

Keep zero-build ES modules, data modules as database, existing save compatibility, and current self-check/verification flow.

## Existing Foundation

Current game already provides:

- seven base classes;
- two permanent second-job choices per base class at Base Lv 15;
- one branch signature active and one passive mechanic for each second job;
- fixed third-job evolution at Base Lv 40;
- continuous Job Lv 1–50;
- three-stage skill manual UI with tooltips and hotbar dragging;
- seven equipment slots, rarity, affixes, refinement, and `classReq` fields;
- five field maps with position-derived heat levels, nursery zones, anchored respawns, expanded annexes, and 23 monsters.

This design extends those systems instead of introducing parallel frameworks.

## Chosen Approach

Use native SVG prerequisite lines beneath existing HTML skill nodes. Reuse current skill data, promotion flow, compatibility fields, and depth-based spawn records.

Rejected approaches:

1. **Keep three plain skill columns:** smallest change, but does not show dependencies clearly enough.
2. **Canvas-only skill tree:** duplicates interaction code and makes tooltips, drag behavior, responsiveness, and accessibility harder.
3. **Reset Job Level on promotion:** closer to classic Ragnarok, but requires separate career histories and disruptive save migration. Cumulative gated caps deliver requested progression with less state.

## Job Structure

### Promotion choices

Each base class keeps its two existing second jobs. At Base Lv 40, every base class receives two third-job choices. Third-job choice is independent of second-job choice.

```text
Base Job
├─ Second Job A ─┐
│                ├─ Third Job A
└─ Second Job B ─┘
                 └─ Third Job B
```

This yields:

- 7 base jobs;
- 14 second jobs;
- 14 third jobs;
- 4 second/third build combinations per base class.

### Player state

- `jobBranchId`: selected second job; existing field remains.
- `advancedJobId`: selected third job; new persisted field.
- `tierIndex`: existing career stage remains `0`, `1`, or `2`.
- `className`: visible selected career title, derived during promotion and preserved in saves.

Second-job and third-job choices remain permanent for one life. Rebirth clears both choices through the existing progression reset.

### Promotion flow

- Base Lv 15 starts existing second-job trial and two-choice panel.
- Completing it selects `jobBranchId`, applies second-job stats, and moves to tier 1.
- Base Lv 40 starts branch-flavored mastery trial.
- Completing it opens a two-choice third-job panel.
- Selecting one sets `advancedJobId`, applies that third job's stats, and moves to tier 2.
- Admin promotion uses deterministic defaults when no interactive choice is possible.

### Job Level caps

Job Level remains cumulative and never resets:

| Career stage | Active cap |
|---|---:|
| Base job | 15 |
| Second job | 40 |
| Third job | 50 |

When Job XP reaches current cap:

- Job XP gain stops;
- partial Job XP remains zero;
- promotion raises cap and later XP resumes from current Job Level;
- no XP is banked while capped.

This prevents pre-promotion farming from skipping the promoted Job track.

### Skill point budget

Existing one-point-per-Job-Level rule remains. Existing promotion bonuses remain only where already balanced. Entitlement and save normalization calculate against earned Job Level, not global cap, so locked caps do not grant points early.

## Third-Job Content

Each base class receives two third-job definitions. Each definition owns:

- title, role, focus, and accent color;
- balanced promotion stat bonus;
- one exclusive active skill;
- one exclusive passive;
- optional illustrative combo using existing and exclusive skills.

Existing uncommitted advanced-job depth work is reused:

- three shared tier-2 actives per base class remain available to either third job;
- one existing advanced active becomes exclusive to Third Job A;
- one new peer active becomes exclusive to Third Job B;
- the two advanced passives per base class are split one per third job.

This gives meaningful choice without doubling the full advanced skill catalog.

Skill nodes gain `reqAdvancedJob` for third-job exclusivity. Existing `reqBranch` continues to gate second-job signatures. Engine checks both gates in learning, casting, Auto-Hunt, learn-all, save normalization, and rendering.

## Skill Tree UI

### Layout

Skills panel keeps existing class-manual header, crest, stat radar, skill-point count, branch identity, reset note, combat-loop guide, rich tooltips, node learning, and hotbar drag behavior.

Skill body becomes one graph with three horizontal stages:

1. First Job
2. Second Job
3. Third Job

Each stage contains HTML skill nodes. Native SVG sits behind them and draws dependency paths from `reqSkill` data after layout.

Third-job stage splits into two labeled branches. Selected branch stays prominent. Unselected branch stays visible but sealed, showing choice consequences without allowing interaction.

### Visual states

Dependency lines:

- gold: learned path;
- green: next learnable path;
- blue: Ascension-preview path;
- gray: locked path;
- red dashed: incompatible second- or third-job path.

Nodes preserve current states:

- learned;
- learnable;
- tier-capped;
- previewed;
- maxed;
- promotion-locked;
- incompatible job choice.

Full skill names and prerequisites remain visible. No crossing-line guarantee is absolute; layout groups nodes by dependency depth and job gate to minimize crossings. SVG recomputes on panel render and resize.

### Accessibility and interaction

- Skill nodes remain semantic clickable HTML elements with keyboard focus.
- SVG is decorative and ignored by assistive technology.
- Locked nodes expose plain-text gate reasons in tooltips.
- Existing drag-to-hotbar behavior remains on learned active nodes.
- Narrow screens scroll graph horizontally instead of shrinking text below readable size.

## Equipment Identity

### Compatibility representation

Reuse `classReq`, normalized as:

- `null`: universal item;
- array of base class IDs: usable by any listed class and all its promoted jobs.

Promotion titles are not stored in equipment requirements. This prevents promotion from invalidating worn gear and avoids duplicating every advanced job ID.

One shared compatibility function is used by:

- equip action;
- inventory action state;
- item tooltip;
- shop listing;
- comparison text;
- starter/default gear checks;
- self-check.

Incompatible items remain lootable and sellable. Equip action is disabled and shows required classes. Existing valid saves keep currently worn gear; save normalization only unequips gear if its requirement data is invalid, not because old unrestricted gear later gains a restriction.

### Weapon families

| Family | Compatible base classes |
|---|---|
| Sword / greatsword | Reborn Blade, Lightbringer |
| Dagger / scythe | Drifter |
| Bow | Far Shot |
| Staff / grimoire | Codeweaver, Stormcaller |
| Knuckles / claws | Iron Fist |
| Mace | Lightbringer |

Add weapon progression across early, middle, and late bands for each family. Existing generic swords are reassigned where appropriate. Worn Dagger remains a universal emergency starter only if needed for save/start compatibility; class-select starter equipment should immediately give each class a compatible identity weapon.

No offhand or shield slot is added. Shield identity can use weapon or body item flavor until dual-slot equipment is explicitly requested.

### Armor sets

Selected body/head/hands/feet pieces gain broad class-family compatibility:

- heavy plate: Reborn Blade, Lightbringer;
- medium leather/mail: Drifter, Far Shot, Iron Fist;
- cloth/robes: Codeweaver, Stormcaller;
- generic travel gear and most cloaks/accessories: universal.

Enough universal drops remain that incompatible loot does not dominate early play. Drop tables bias regional class gear across families rather than targeting player class, preserving trade/sell value and world consistency.

## Monster Ecology

### New types

Add one normal monster to each field region:

- Whispering Woods;
- Sunken Ruins;
- Frostpeak Tundra;
- Dragon Caldera;
- Astral Rift.

Each new monster receives:

- content definition with level, combat behavior, and existing regional-material drops;
- pixel-art states required by `selfCheck()`;
- spawn record with depth and level ranges;
- translation keys where user-visible names/flavor require them.

Reuse existing materials unless a monster has no credible regional drop. Avoid adding crafting rows solely to justify new drops.

### Distribution

Retune spawn records so existing and new monster depth bands overlap and cover expanded annexes. Preserve:

- nursery floor near entry;
- weakest-monster guarantee;
- guardian territory at deepest edge;
- position-derived levels;
- anchored respawns;
- current approximate monster density and combat pacing.

Spawn placement uses deterministic spacing against already placed monsters. It retries nearby valid cells before accepting close placement. This reduces visible clumps without runtime procedural-map generation. Counts are redistributed rather than broadly increased.

### Heat map behavior

`heatDepthAt()` and `heatLevel()` remain source of truth. New spacing changes positions, not level formula. Wider spawn depth ranges ensure annexes receive monsters and heat gradient has prey throughout traversable geography.

## Data and Engine Changes

### Data modules

- `js/progression.js`: third-job definitions, advanced-job gates, Job cap table, exclusive passives.
- `js/combat.js`: exclusive third-job actives and reused shared advanced skills.
- `js/content.js`: class-compatible gear and five monsters.
- `js/maps.js`: new spawn rows and broader depth/count distribution.
- `js/pixelart.js`: new monster sprites and equipment icon mappings.
- `js/design.js`: only balance knobs or auditable stat budgets.
- `js/locale.js`: user-visible Thai translations.

### Engine

`js/game.js` owns minimum required wiring:

- active Job cap lookup and XP gating;
- `advancedJobId` selection, gates, save/load, and rebirth reset;
- third-job choice panel;
- shared item compatibility check and UI messages;
- SVG dependency line rendering;
- deterministic monster spacing;
- expanded `selfCheck()` validation.

No new dependency, database, build step, framework, or parallel progression subsystem.

## Save Migration

### Existing saves below tier 2

- Preserve `jobBranchId`, Job Level, Job XP, skills, gear, and stats.
- Set `advancedJobId` to `null`.
- Clamp Job Level to active stage cap only if corrupted; do not reduce legitimate historical Job Levels from previous versions.

### Existing tier-2 saves

Infer `advancedJobId` in this order:

1. match saved `className` to a third-job title;
2. map former fixed advanced title to designated default third job;
3. use base class default third job.

Preserve learned skills. If a learned skill belongs to the other third job because of legacy data, refund its spent ranks and remove it during normalization. Shared skills remain unchanged.

### Existing equipment

Gear already equipped before this update remains equipped through migration, even if its base item gains a new `classReq`. Future attempts to equip incompatible copies are blocked. This avoids destructive save changes while enforcing new rules going forward.

## Error Handling and Validation

`selfCheck()` fails loudly when:

- a base class lacks exactly two second jobs or exactly two third jobs;
- IDs, defaults, titles, or stat budgets are invalid or duplicated;
- exclusive skill/passive gates reference unknown jobs;
- Job caps are not strictly increasing `15 < 40 < 50`;
- `classReq` contains an unknown base class ID or empty array;
- any base class lacks compatible early, middle, or late weapon progression;
- a spawn references an unknown monster;
- a new monster lacks required sprite states;
- a drop references an unknown item;
- depth or level ranges are malformed.

Runtime equip failures log one clear reason and do not mutate equipment. Invalid promotion selections return without applying stats or changing tier.

## Verification

Every implementation change must pass both project-required paths.

### Headless Node logic harness

Temporary `.mjs` harness shims browser APIs, imports `js/game.js`, and asserts:

- first-job Job XP stops at Job Lv 15;
- second-job promotion unlocks Job Lv 16–40;
- third-job promotion unlocks Job Lv 41–50;
- no XP banking occurs at caps;
- each base class can choose either second and either third job;
- exclusive skills cannot be learned or cast on wrong paths;
- save migration infers third jobs and preserves valid progress;
- compatible equipment equips and incompatible equipment does not mutate slots;
- every base class has weapon progression;
- new field monsters spawn across intended depth ranges;
- deterministic spacing reduces clumps while preserving counts and nursery stock.

Judge by process exit code.

### Headless Brave screenshots

Serve repository and capture `autotest.html` screenshots for:

- first-job skill graph;
- second-job selected graph;
- third-job choice and selected graph;
- narrow/mobile skill graph;
- inventory with compatible and incompatible weapons;
- character paper doll with class gear;
- each field map or representative early/mid/late maps showing distributed monsters.

Freeze animation and tile phase for screenshot comparisons. Read every PNG and verify no red runtime-error banner, clipped labels, unreadable nodes, crossing lines that obscure dependencies, empty annexes, or excessive spawn clumps.

## Scope Boundaries

Included:

- 14 third jobs;
- shared and exclusive advanced skills/passives;
- promotion-gated cumulative Job caps;
- SVG/HTML skill graph;
- weapon families and selected armor compatibility;
- five monsters and field-spawn redistribution;
- save migration, validation, Node harness, and Brave verification.

Excluded:

- fourth jobs;
- per-career Job Level resets/history;
- offhand/shield slot;
- dual wielding or weapon animations per family;
- player-targeted smart loot;
- new maps, crafting systems, or database migration;
- full procedural monster population simulation.

Add excluded systems only after current design is playable and balance data proves need.
