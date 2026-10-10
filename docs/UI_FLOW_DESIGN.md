# UI Flow Design: RO window model + one home per action (Oct 2026)

Input: `docs/UI_FLOW_AUDIT.md` (matrix, friction list, FR-1…FR-7). Output: the design for
`/sc:implement`. No code is written here.

## 0. Decisions taken (defaults — flip any before implementing)

The audit left 7 questions open. Each one is answered here with the most RO-faithful option that
also removes steps.

| # | Question | Decision | Why |
|---|---|---|---|
| D1 | Smithing location | **Stays at the Trader**. Satchel item details get a "Refine at Trader →" link that routes there (`activateTaskGuide('npc', …)`) | RO smiths are NPCs. The link fixes discoverability without adding a second refine UI |
| D2 | Multi-window scope | **Desktop: any number of windows, draggable, positions saved. Touch / compact viewport: one at a time** (today's behaviour) | A 390px screen can't show two windows; desktop gets real RO behaviour |
| D3 | Bestiary merge | **Book › Bestiary is the only bestiary.** The card Codex (zone album milestones + card per monster) moves into it; the Chronicle tab is removed | Book (B) already owns collection and milestones; Chronicle is about the *world* |
| D4 | Unsocket | **Cards are permanent (RO).** Superseded by `UI_MENU_REDESIGN.md` R-D2: *wire* `renderSocketModalHtml` as the socket picker (minus its unsocket button) instead of deleting it | Matches RO; no unsocket UI exists to keep |
| D5 | Place model | **Keep remote management** (Chronicle › Stronghold upgrades, pedestals, stipend). Only the *siege* is on-site (D6). The other two idle Stronghold NPCs (`craft` Borgan, `banker` Vane, `maps.js:581`) open the same Stronghold tab as a deep link | Moving upgrades on-site would be more RO-like but **adds steps**, which goes against this pass's goal. Flip D5 if you want RO flavour over speed |
| D6 | Siege trigger | **Talk to Tactician Cedric** (role `tactician`) → in-game confirm → `startStrongholdSiege()` | Uses an existing NPC on the map; no new interaction type |
| D7 | Admin access | **Dev-only:** backtick/F2 and the Settings toggle work only when `shouldEnableAdminByDefault(p.name)` is true (localhost, `?dev`, or the hero named `admin`) | Players can't silently enable god mode |
| D8 | Pause with windows open | **Desktop: windows don't pause** (RO-like; the game keeps running behind Status/Satchel). **Compact viewport and NPC/choice overlays: still pause** | Persistent side-by-side windows that freeze the game would make multi-window pointless |

## 1. Window manager (FR-2) — the one structural change

### Today
`togglePanel(id)` keeps a single `#panel` and removes it before opening another. Call sites that
assume one panel:
- `game.js`: `$('#panel')` at 3659, 5180, 5299, 5579, 7424, 7437 and 7800; `getElementById('panel')` at 7129 (guide route) and 7517.
- `guidance-runtime.js`: lines 14, 19 and 20.
- `autotest.html`: lines 181 and 212–226.
- `js/test-support/browser-env.js`: the `nullSelectors=['#panel']` default.

Escape closes `.panel, .dialogue, .slot-picker` only.

### Design
The `.panel` element and `panelBody`/`wirePanel` stay as they are. Only *how many* windows can be
open and *how they are found* changes.

```
panelEl(id)          → document.querySelector(`.panel[data-kind="${id}"]`)   // replaces every $('#panel')
openPanels()         → [...document.querySelectorAll('.panel')]
togglePanel(id)      → if panelEl(id): close it
                       else: if (compactViewport()) close all panels   // D2 touch rule
                             create .panel[data-kind=id] (no id="panel")
                             place at saved position or default anchor
                             bringToFront(el)
refreshPanel(id)     → re-render panelEl(id) if open, then every other open panel
                       // ponytail: refresh-all, O(open windows) ≤ ~4; add per-panel deps only if it gets slow
closeTopmost()       → highest z-index of: .panel, .dialogue, .slot-picker,
                       #spire-elevator-modal-container, #homestead-modal-container
                       (job-choice / rebirth overlays are mandatory choices: excluded)
                       and calls THAT surface's own close path, never a bare .remove():
                         guide panel → closeGuide() · dialogue → remove + dlg = null
                         homestead → click its [data-homestead-close] (container is reused via display)
                         spire → click its [data-spire-close]
```

- **`compactViewport()`**: `body.dataset.viewport !== 'desktop' || innerWidth <= 680`.
  `viewport.js:5` sets `desktop` for every non-touch device, and `portrait`/`landscape` only for
  touch. A wide desktop window is therefore never compact. Reuse this flag; don't add a new one.
- **Z-order**: a module counter. `pointerdown` on a panel calls `bringToFront`. The focus trap stays
  per panel.
- **Drag**: `pointerdown` on `.panel__head` (not on its buttons) → `pointermove` sets `left/top` and
  clears the centering `transform`. Clamp so the header stays on screen. Desktop only.
- **Positions**: `G.ui.winPos[id] = {x, y}`, saved with the game (survives devices, unlike
  `localStorage`). Default anchors when none are saved: `char` left third, `inv` right third, `shop`
  left, everything else centred with a 24px cascade offset per open window.
- **Pause (D8)**: `syncModalPause` (`game.js:5038`) counts any `.panel`. Change it to count
  `.panel` only when `compactViewport()`. Dialogue, slot picker, job choice and the open ☰ menu
  still pause.
- **Ids inside bodies** (`#inv-search`, `#vol-master`, …) stay unique because each kind opens at
  most once.
- **Language switch** (`game.js:5180`) re-renders every open panel instead of one.

### Flows this unlocks (no new UI)
- **Compare / equip**: Status + Satchel side by side. Equipping in one refreshes the other.
- **Socket equipped gear**: pick a gem in Satchel, then click the dot in Status. No close/reopen.
- **Storage**: no change needed. Trader › Storage already shows chest and backpack side by side
  with double-click moves (`game.js:6996`).

## 2. Window keys (FR-3)

One table replaces the `else if (key === 'c') …` chain at `game.js:9161`:

```js
// js/game.js — ponytail: static table; make rebindable when a player asks
const WINDOW_KEYS = [
  ['char', 'KeyC', 'KeyA', 'KeyQ'],  // [panel, plain key, ...Alt+ aliases]; Alt+Q = RO equip/status
  ['inv', 'KeyI', 'KeyE'],           // RO Alt+E inventory
  ['skills', 'KeyK', 'KeyS'],        // RO Alt+S skills
  ['quest', 'KeyQ', 'KeyU'],
  ['world', 'KeyM'],
  ['book', 'KeyB'],
  ['adventure', 'KeyJ'],
  ['automation', 'KeyT'],
  ['loadouts', 'KeyL'],
  ['guide', 'KeyG'],
  ['settings', 'KeyO', 'KeyO'],      // RO Alt+O options
];
```

- **Text-field guard, first line of keydown**: `if (e.target.closest?.('input,textarea,select,[contenteditable]')) return;`.
  Today there is none, and the pause whitelist passes c/i/k/m/q/b through. So typing "mace" into
  Satchel search or a loadout name probably toggles World/Satchel. **Reproduce in the phase-1
  harness, then fix in phase 1**, before phase 3 adds more letter keys.
- **Alt never falls through**: after the `WINDOW_KEYS` lookup, `if (e.altKey) return;` runs
  *before* the E/F/V/Space handlers. Otherwise Alt+F reaches `toggleFarm` on Windows, where
  `key === 'f'`.
- Match on `e.code`, not `e.key`. On macOS, Option+E produces the dead key `´`, but `code` is
  still `KeyE`.
- Alt aliases are verified against iRO Wiki (Alt+E, Alt+Q, Alt+A, Alt+S). `Alt+U` and `Alt+O` must
  be **checked against the iRO Wiki before shipping**. Alt+E/Alt+F can open the browser menu on
  Windows Chrome. If `preventDefault` can't stop that, the plain keys still work.
- `normaliseHotkeys` (`game.js:238`) already strips reserved codes from *saved* bindings, but its
  fallback list (`RTYUOPGHJLZXVBNM`) is not filtered. Change it to
  `fallbacks.filter(isBindableHotkey)`. Old saves with a slot on T/O/G/J/L then lose that slot's
  key on load and get the next free one. Accepted: slot lookup runs before window keys, so
  without this a saved KeyT slot would silently shadow Automation.
- `RESERVED_HOTKEYS` (`game.js:123`) gets every plain key from the table. **This also fixes a
  latent bug: `KeyB` (Book) and `KeyV` (parry) aren't reserved today**, so a hotbar binding can
  silently shadow them.
- The pause whitelist (`game.js:9136`) uses the same table instead of its hard-coded list.
- HUD button labels read their key from the table.

## 3. One home per action (FR-1, FR-6, FR-7)

| Action | Home | Change |
|---|---|---|
| Deposit materials | Trader › Storage | Move the "deposit all materials" button there and call `depositItem` per entry. Delete the copy at `game.js:7450` |
| Hotbar assign | Slot picker (click a hotbar slot) | Satchel/Abilities "assign" buttons keep calling `assignItemHotbar` / `assignSkillHotbar` (shared). **Remove the Settings "Assign actions" row** |
| Bestiary | Book › Bestiary (D3) | Book's bestiary detail shows the card and its zone album progress through `cardsUI.renderBestiaryTab` pieces. Remove `['bestiary', …]` from the Chronicle tabs |
| Stronghold actions | Chronicle › Stronghold (D5) | Upgrades, pedestals and stipend stay remote. Tactician Cedric → siege (D6, the only place). Borgan and Vane open the Stronghold tab |
| Refine / craft / expand | Trader (D1) | Satchel detail adds a "Refine at Trader →" route link |
| NPC services | NPC | If `G.talked.has(n.id)` **before** this interaction and there's no quest follow-up, open the panel directly. The panel head gets a "💬 Talk" button that replays the dialogue |
| Settings | "⚙ Settings" | Rename from "Audio". Show the admin row only when D7 allows. Remove the assign row |
| Rebirth confirm | Status | Use the two-click "armed" pattern from guild revoke (`requestGuildRevoke`) instead of `confirm()` |

### 3b. Duplicates from the menu-by-menu recheck (audit §2b)

| Duplicate | Home | Other place becomes |
|---|---|---|
| Zone Mastery | Adventures | Journal shows one line, "Mastery: rank N →", linking to Adventures |
| Trophies | Book › Milestones | Status › Achievements becomes a single count line linking to Book |
| Gear sets | Loadouts (anywhere in town) | Mannequins stay as Homestead flavour, but **read and write the same loadout slots A/B**, so there's one set of saved gear (needs a save migration for existing mannequin contents) |
| Loot rules | Automation | Satchel loot filter stays (it's visual filtering); add a link to the Automation loot rules |
| Names | | "⚙ Audio" → "⚙ Settings"; "⚙ Auto" → "🤖 Auto"; "Field guide" stays and gets key G; "Handbook" stays inside Journal |

**M4**: `pauseForInterruption` stops clearing `taskGuide` and `huntTargetId`. Freezing the clock
is enough.

**Return to title**: add a "Save & return to title" button in Settings (`saveGame(); showTitle()`).

**Escape** uses `closeTopmost()` (§1). The two place modals become closable with Escape.

**Dead code**: delete `pets-ui.renderFeedModalHtml`. `cards-ui.renderSocketModalHtml` is kept and wired (R-D2).
Chronicle › Companions already feeds inline. Its tests go with it: `js/pets-ui.test.js:12, 190–254`.

**Bestiary data after the merge**: two sources stay separate.
- `G.seenMonsters` keeps driving "seen" and the Book milestones (`game.js:6587`), so milestone
  progress in old saves doesn't change.
- `G.bestiary` (card kills and drops) drives only the card column and the zone album bonuses.
- `autotest.html:198` `chrontab=bestiary` maps to `panel=book&booktab=bestiary`.

## 4. Rewards-ready badges (FR-4)

No new hub panel. Badges on the windows that own each claim, plus one tracker line:

```
pendingClaims() → { adventure: n, book: n, world: n, guild: n }   // pure, read-only
  adventure = claimable dailies + claimable mastery
  book      = claimable milestones
  world     = stipend ready + mature homestead plots
  guild     = completed bounties awaiting claim (no HUD button → tracker line only)
```

- Each count must come from a function the owning system already uses to enable its Claim button.
  The implementer finds those predicates; **no duplicated claim rules**.
- `updateHud` (`game.js:5428`, where the +stat/+skill nudges already live) adds a dot to the
  matching HUD buttons. The mobile ☰ badge shows if any count is > 0.
- The quest tracker gets one line, `🎁 N rewards ready`. Clicking it opens the window that owns the
  first pending claim.

## 5. Touch (D2, NFR)

- Compact viewport: one window at a time, full-screen sheet (current CSS at `theme.js:682`). No
  drag.
- Socket dots: 8px → 20px hit area on touch (padding around the 8px dot, `@media (pointer:coarse)`).

## 6. Phasing (each phase is one commit, verified per CLAUDE.md)

| Phase | Scope | Risk |
|---|---|---|
| **1. Fix P0s** | **M1: pause no longer touches `G.autoFarm`** (the loop already skips ticks while paused) · M2 text-field key guard · M3 Escape on dialogue runs its `onClose` · D6 siege via Tactician · Escape via `closeTopmost` · D7 admin gate · reserve B/V · filter hotkey fallbacks · fix Keybindings help text | low; isolated |
| **2. Window manager** | `panelEl` swap at 8 call sites · multi-open · z-order · drag · saved positions · compact rule · refresh-all | **highest**; touches every panel |
| **3. Window keys** | `WINDOW_KEYS` table, Alt aliases, pause whitelist, HUD labels | low |
| **4. One home per action** | §3 table, §3b, dead-code removal | medium; Bestiary merge is the largest |
| **5. Badges** | `pendingClaims` + HUD dots + tracker line | low |

Phase 1 can ship on its own today. Phase 2 must land before Satchel↔Storage double-click (phase 4).

## 7. Verification plan

**Node harness** (tmp `.mjs`, exit code):
- P1: autoFarm survives `pauseGame` + `resume` (the check that failed today). A keydown `i` whose
  target is `#inv-search` doesn't close Satchel. Escape on the Trader dialogue opens the Trader. Interacting with
  Tactician starts a siege. A non-admin on a non-dev host gets no admin from
  backtick. `closeTopmost` closes the homestead modal.
- P2: open `char` then `inv` → both in DOM. Toggle `inv` → only `inv` closes. Equip from `inv` →
  `char` body reflects it. Compact viewport → opening `inv` closes `char`.
- P3: every `WINDOW_KEYS` entry opens its panel by plain key and by each Alt alias. A hotbar slot
  can't be bound to a reserved key.
- P4: deposit-all equals N × `depositItem`. A known NPC opens its panel with no dialogue. A new
  NPC still talks first.
- P5: force a claimable daily → `pendingClaims().adventure === 1` and the HUD button has a dot.

**Brave screenshots** (1280×800 and true 390px iframe, `tilephase`/`anim` frozen): Status +
Satchel side by side; Trader Storage + Satchel; Book Bestiary with card; Tactician siege confirm;
HUD with badges. `autotest.html` needs a `panels=char,inv` param for multi-open (small addition).

Before phase 2, update the single-panel assumptions in `autotest.html` (181, 212–226) and the
`browser-env.js` `nullSelectors` default to `.panel[data-kind]` / `panelEl(id)`.

## 8. Out of scope

Window-key rebinding UI, window resize, saving which windows were open across reloads, a unified
rewards hub panel, and moving Spire entry on-site (it stays a menu warp, like a Kafra teleport).
