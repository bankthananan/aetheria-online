# Menu UX Redesign: per-menu (Oct 2026)

Third doc in the series, after `UI_FLOW_AUDIT.md` (where things live) and `UI_FLOW_DESIGN.md`
(window model, keys, one-home-per-action). This one covers **what each menu is like to use**.

Evidence:
- Brave screenshots at 1280×900 in EN and TH, via `autotest.html?panel=<id>&adv=1[&lang=th][&scrollpanel=N]`.
- A headless language probe that renders every `panelBody(id)` with `lang=th` and counts the English runs left over (§L).

Each section lists what was seen, the redesign, a wireframe, and the code it reuses.

---

## S. Status (C)

**Seen**
- With 83 unspent points, every point is a single `+N` click: 83 clicks to spend them all.
- "Recommended build: **VSA**" is a cryptic three-letter code at the bottom. The rows it refers to (VIT/STR/AGI) look like every other row.
- Equipment is below the fold, under the stat block. Each slot card is dominated by a truncated transmog `<select>` ("Warding C ▾").
- Sockets are 8px `○` dots after the rarity tag. Putting a card in means: Satchel → pick card → reopen Status → hit the dot. Nothing tells you this.
- "Relic: empty" gives no hint of where relics come from.
- Achievements (0/13 greyed cards) take half the scroll, and Book › Milestones duplicates them.

**Redesign (RO Equip + Status as one window, two columns)**
```
┌ Status ─────────────────────────────────────────────────────────────┐
│ Hero — Reborn Blade   Lv 33 ▓▓▓▓░░  Job 15/15 ▓▓▓▓▓▓  [Advance ▸]   │
├──────────── EQUIPMENT ───────────┬──────────── STATS ───────────────┤
│  [Head ◎◎]          [Acc  ◎○]    │ Points: 83   step [1|5|10]      │
│  [Weapon ◎○]  (doll) [Body ○]    │ ★1 VIT 60  max HP·DEF    [+3]   │
│  [Hands ○]          [Cloak ○]    │ ★2 STR 58  phys ATK      [+3]   │
│  [Feet ○]           [Relic +]    │ ★3 AGI 24  speed·flee    [+1]   │
│ ── selected: Iron Sword +0 ───── │    INT  9  magic·MP      [+1]   │
│ ATK 15 · +8% ATK · +7% Crit      │    DEX 24  HIT·ranged    [+1]   │
│ Sockets: [◎ Gel Slime] [○ Add ▾] │    LUK 16  crit          [+1]   │
│ Look: [Iron Sword ▾]  [Refine →] │ [Spend 10 by build ★]           │
│                                  │ ATK 166 DEF 104 HIT 128 FLEE 123│
│                                  │ 🏆 Achievements 0/13 → Book     │
└──────────────────────────────────┴─────────────────────────────────┘
```
- **Paper-doll grid** of 8 slots (RO layout). Clicking a slot selects it, and one detail strip below shows that item's stats, sockets, transmog and links.
- **Socket from Status**: each empty socket in the strip is a big `[○ Add ▾]` button (≥32px). It opens a picker of compatible cards and gems from the bag, then confirms "Cards are permanent". **Reuse `cards-ui.renderSocketModalHtml`** (it already filters by slot). Drop its unsocket button and wire it instead of deleting it (this **replaces D4's "delete"**). Gems use the same picker through `socketGem`.
- **Build highlight**: the top-3 stats from `recommendedBuild()` get a ★1/★2/★3 rank and a tinted row. The letter code goes away.
- **Batch spend**: a step toggle `1|5|10` (Shift-click = 10). **"Spend 10 by build"** loops `spendStat` over the ★ stats in growth ratio and stops when points run out. Confirm only if the batch is above 20.
- Transmog moves from every card into the detail strip.
- Achievements shrink to one count line linking to Book (audit M5).
- Relic slot, when empty: tooltip "Relics drop from Guardians, Raids and the Spire".
- **Mobile**: the columns stack, stats first when points > 0 and equipment first otherwise.

**AC**: spending 50 points takes ≤ 5 clicks. A card is socketed into an equipped weapon from Status alone. ★ rows match `recommendedBuild`.

---

## K. Abilities (K): a real tree

**Seen**
- It's a long single-column list. Prerequisites exist only as small text ("Requires Rift Slash Lv 2"). `renderSkillGraphLines` draws an SVG, but nothing visible connects the rows.
- Locked, learnable and learned rows look nearly identical: the same card, only a small right badge differs.
- Second job and Advanced job sections sit far below. The "03" chapter number wraps onto two lines, and "Voidcleaver Lord" renders as unstyled large blue text (CSS miss).
- Each skill point is one "LEARN +" click.
- The tooltip appears in the screen's top-left corner, far from the node.
- In TH, the row text is about 9px with three cramped lines per row.

**Redesign (RO skill tree grid with job tabs)**
```
┌ Abilities ─────────────── 9 pts ── [1st Job][2nd Job][Advanced] ───┐
│  Tier/Job Lv →   1        4        7        10       12            │
│              ┌──────┐  ┌──────┐                                    │
│              │ †  5 │──│ ◇  2 │──┬──────────┐                      │
│              │Slash │  │Sigil │  │          │                      │
│              └──────┘  └──────┘  ▼          ▼                      │
│                  │            ┌──────┐  ┌──────┐                   │
│                  └──────────▶ │ ✦ 0  │  │ ◇ 0  │                   │
│                     Lv 3      │Shock │  │Bulwk │                   │
│                               └──────┘  └──────┘                   │
│ ── Passives ── [◈ Iron Body 0/10] [◈ Blade Mastery 0/10]           │
├─────────────────────────── detail ─────────────────────────────────┤
│ Guardian Sigil Lv 2/3 · buff · MP 14 · CD 12s   [−] [+] [→ Bar]    │
│ Next level: +X% DEF.  Unlocks: Shockwave (Lv1), Bulwark (Lv2)      │
└────────────────────────────────────────────────────────────────────┘
```
- **Job tabs** (1st, 2nd, Advanced). The tab for the current job is selected. Future tabs show "Choose at Lv 15" with the branch picker (`showJobChoice`).
- **Grid**: the column is the job-level gate, and the row comes from prerequisite chains. Each node is a 56px icon with a level badge. Arrows run prerequisite → dependent, drawn by the existing `renderSkillGraphLines` (it already computes endpoints from bounding rects; it just needs node positions).
- **Node states** must be distinguishable at a glance: *learned* (filled, gold border), *learnable* (pulsing green edge), *locked by Job Lv* (dim, with lock and level), *locked by prerequisite* (dim, arrow from the blocker shown red).
- **Detail strip**, not a floating tooltip. It shows the selected node's numbers now and at the next level, plus what it unlocks. It has `[−]` (only when a reset is available), `[+]` and `[→ Bar]` (`assignSkillHotbar`). Hovering on desktop previews into the same strip.
- Drag a node onto the hotbar (`data-drag-skill` exists).
- Header: points, job level, ★ build. The combo guide moves behind a small `?` toggle.
- **Mobile**: the grid scrolls horizontally inside the window (`overflow-x:auto` on the grid only, never the page), and the detail strip is fixed at the bottom.
- Fix the "03" wrap and the unstyled advanced-job title.

**AC**: from opening the window, a learnable skill is identifiable without reading text. Learning and binding takes 2 clicks. There's no horizontal page scroll at 390px. TH text in nodes is ≥ 12px.

---

## Q. Journal (Q)

**Seen**
- One long page: story chapter strip (8px text), class-advance card, current story card, then an 8-card Handbook grid, then bounties and mastery further down.
- There's no Navigate or Track button on the story card (the HUD tracker has one).
- Rewards repeat items instead of counting them ("Grilled Trout, Grilled Trout", "Minor Potion, Minor Potion").
- The objective is a raw verb + id ("kill Gel Slime — 0/3"), with no progress bar.
- In TH, the Handbook is entirely English (25 English runs, the worst panel). "Aetheria" and place names are mixed in.

**Redesign (RO Quest window: list + detail)**
```
┌ Journal ─────────── [Active 4][Available 6][Done 12] ──────────────┐
│ ▸ STORY              │ ✦ Trial of the Rift Knight   (Class)         │
│   ◆ A Strange Awak…  │ A true knight is forged in the hunt…         │
│ ▸ CLASS              │ Defeat Dire Wolf      ▓▓▓▓░░░░  0/5          │
│   ✦ Trial of the…  ● │ 📍 Whispering Woods · Lv 10                  │
│ ▸ GUILD (2)          │ Rewards: [🍖×2] [🧪×1] 30 XP · 40z           │
│   Cull 12 Beetle     │ [Navigate ▸] [Track ☆] [Abandon]             │
│ ▸ HANDBOOK (0/8)     │                                              │
│   Gone Fishing       │                                              │
└──────────────────────┴──────────────────────────────────────────────┘
   Story progress: I ●───○───○───○───○ V  (The Awakened Road · Lv 1–15)
```
- **Tabs** Active, Available and Done. **Categories** (collapsible) are Story, Class, Guild and Handbook. Zone Mastery moves to Adventures (audit M5).
- **Detail pane** has an objective verb from a localized table (`kill`→"Defeat"/"กำจัด", `collect`, `talk`, `explore`). It shows a progress bar, location and level, and **rewards as icon chips with ×qty** (group by item id).
- Buttons: `Navigate` (`activateTaskGuide`, the existing `data-task`), `Track` (`pinGoal`) and `Abandon` for bounties (`requestGuildRevoke`).
- The chapter strip becomes a one-line roadmap at the bottom; details stay in Chronicle › Roads.
- Available Handbook entries get `Start`, and locked ones say why ("After: Gone Fishing").
- **Mobile**: list, then tap → detail slides over with a back arrow.

**AC**: any active quest is navigable in 2 clicks from the Journal. No duplicate reward names. 0 English runs in TH (§L).

---

## I. Satchel (I)

**Seen**: in good shape after the Oct RO slot grid. Remaining issues:
- "Deposit Mats" works anywhere (audit P1-6).
- The comparison "Keep equipped item" box is red-heavy and hard to scan.
- Socket… flow, see Status.

**Changes**
- Comparison as a two-column `▲/▼` table: ▲ green on gains, ▼ red on losses, with a one-line verdict ("+11 ATK, −6 Flee").
- `Socket…` opens the same picker as Status, with the item preselected.
- "Refine at Trader →" link (D1).
- Remove Deposit Mats (moved to Trader › Storage).

---

## W. World Chronicle (M)

**Seen**
- Six tabs wrap onto two rows under a large header, so the Roads content starts low.
- Bestiary is duplicated with Book (D3).
- Companions is management, not world lore.

**Changes**
- Tabs are Roads, Spire, Stronghold and Homestead (4, one row).
- Bestiary goes to Book (D3).
- **Companions moves to its own window** (key `P`). Taming, feeding and summoning become one place.
- The header shrinks to one line with the charted counter.

## B. Collection Book (B)

**Seen**: a new player sees a 4×N wall of `? ???` cards, with no count and no hint.

**Changes**
- Group by zone with a header per zone: "Whispering Woods 3/7 seen · cards 1/7".
- Unseen entries show the monster's silhouette (the same sprite drawn black) and the zone, not `???`.
- Filter chips: All, Seen, Unseen, Has card.
- The Milestones tab absorbs Achievements (M5).
- Card info comes from the merged Codex (D3).

## A. Adventures

**Seen**
- The three Daily rows each show a disabled "Claim" and no way to act on them.
- Dungeons are bare buttons with no level or reward info.
- In TH, section and tier names are English.

**Changes**
- Each daily row has a `[Hunt ▸]` button that sets `huntTargetId` and starts Hunt. It turns into `Claim` when done.
- Dungeon cards: name, recommended level, boss, and an `Enter` button.
- The mastery tier ladder becomes a single progress track with 4 markers instead of 4 cards.

## T. Trader

**Enhance tab**
- The rows wrap unevenly. Change to a fixed table: item · +N/9 · success % · fuel (have/need) · [Expand] [Refine].
- Rows you can't afford are dimmed, with the missing resource in red.
- Equipped items come first (already the case).

**Buy/Sell/Craft**: ✅. **Storage**: ✅ (chest and backpack side by side).

**Repeat visits**: skip the dialogue (FR-6).

## G. Guild

✅ It's clear. Add `[Accept & Go ▸]` (accept + `activateTaskGuide`) next to Accept.

## Au. Automation

✅ It's well structured. Two changes:
- The 6 empty "Drop a skill here" boxes shrink to one drop row that grows as skills are ranked.
- The "Macro Rules" section is folded by default when there are no rules.

## Se. Settings

**Seen**: titled "Settings & Audio".
- "Assign actions" duplicates the ⌨ button.
- Player-visible Admin.
- English-only strings.

**Changes**: sections in this order:
1. **Gameplay**: touch, language (move 🌐 here and keep the HUD shortcut).
2. **Audio**.
3. **Display & Accessibility**.
4. **Keybindings**: open the Keybindings window.
5. **Account**: "Save & return to title".

Admin only for dev (D7).

## H. HUD

- 7 of 9 HUD buttons stay English in TH (`Satchel (I)`, `Journal (Q)`, `World (M)`, `Hunt (F)`, `Auto`, `Book (B)`, `Adventures`). Only Status and Abilities are translated.
- Fix: translate the label without the key hint and append `(${key})` from `WINDOW_KEYS`, so locale keys don't contain hotkey letters.
- Two `⚙` icons become `🤖 Auto` and `⚙ Settings`.

---

## L. Language (TH) — measured

Headless probe, `lang=th`, low-level hero, English runs ≥ 5 chars per panel (stat abbreviations
excluded):

| Panel | EN runs | Examples |
|---|---|---|
| Journal | **25** | the whole Handbook (names, descriptions), "Aetheria" |
| Book | **14** | tab names, "Collection Milestones", milestone names |
| Automation | **12** | "Macro Rules", "Add Rule", "Import JSON", rule help |
| Abilities | **10** | "Choose at Lv", "Exclusive to", "INCOMPATIBLE", combo tags `SET burn`/`DET slow`/`FINISH` |
| Status | **9** | stat hints "phys ATK", "max HP", "crit chance"; rarity "Common" |
| Settings | **7** | all volume and accessibility labels (hard-coded, no `T()`) |
| Adventures | **6** | section title, difficulty `<option>`s, mastery tier names |
| Guild, World, Satchel | 1 each | "Normal", "Adventurer's Homestead", "Deposit Mats" |
| Guide, Loadouts, Keybindings, Trader | 0 | ✅ |
| HUD | 7 buttons | see H |

**Root causes**
1. Strings not wrapped in `T()` (Settings, parts of Automation).
2. `T()` keys missing from `js/locale.js` (Handbook content in `CONTENT.guideQuests`, milestones, mastery tiers).
3. Keys that bake in hotkey letters (`'Satchel (I)'`).
4. Objective text built from raw verbs (`kill ${name}`).

**Requirement**: a **locale check in `selfCheck()`** or a test that renders every panel with `lang=th`
and fails on any untranslated `T()` key. The probe in `$CLAUDE_JOB_DIR/tmp/lang.mjs` is the
prototype; move it to `js/locale-coverage.test.js`. An allow-list covers stat abbreviations and
proper nouns kept in English (game title).

**Thai typography**: Thai needs more line-height and size than Latin at the same px. Rule:
`:lang(th) .panel { font-size: max(12px, 1em); line-height: 1.6 }`. This applies especially to skill
rows and chapter chips, which are currently 8–9px.

---

## Phasing (after UI_FLOW_DESIGN phase 1)

| # | Menu work | Depends on |
|---|---|---|
| R1 | ✅ **Language**: locale test + fill missing keys + HUD label fix + Thai typography | none (ship first: cheap, broad) |
| R2 | ✅ **Status**: build ★ highlight, batch spend (+1/+5/+10, Shift = +10, Spend by build), socket picker inline under the clicked slot, achievements collapsed | none |
| R3 | **Journal**: list + detail, objective verbs, grouped rewards, Navigate/Track | R1 verbs |
| R4 | **Abilities tree**: job tabs, grid, node states, detail strip | none (largest) |
| R5 | Book zones/silhouettes, Adventures actions, Trader table, Settings regroup, Companions window | flow-design phase 4 |

Each phase is verified per CLAUDE.md:
- **Node harness**, for example: spending 50 points takes ≤ 5 actions; socket via the Status picker; Journal Navigate starts a task guide; a learnable node has the `.learnable` class; the TH probe reports 0 runs for the touched panel.
- **Brave**: 1280 and true 390px, EN and TH, with `tilephase`/`anim` frozen.

## Decisions to confirm

- **R-D1**: Status merges Equipment and Stats into one two-column window (RO style), instead of keeping a separate Equipment window (RO Alt+Q vs Alt+A). Recommended: **merged**.
- **R-D2** *(shipped differently)*: the Status socket picker was built in `game.js` (`socketPickerHtml`/`socketCandidates`), not by wiring `cards-ui.renderSocketModalHtml`. That helper is card-only and reads an inventory shape the game doesn't use, while the picker needs gems too. `renderSocketModalHtml` stays dead code; delete it with its tests in phase 4.
- **R-D3**: Companions gets its own window and key `P`.
- **R-D4**: the skill tree is laid out automatically from prerequisite data, with no hand-placed coordinates. If an auto layout looks wrong for a class, add an optional `col/row` hint in `progression.js`.
