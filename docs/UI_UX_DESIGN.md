# UI/UX Audit & Design Spec — Aetheria Online (Oct 2026)

Scope: `index.html`, `js/theme.js`, HUD/panels in `js/game.js`, and the six subsystem UIs
`js/render/{cards,pets,spire,stronghold,homestead,raids}-ui.js`.
Evidence: headless Brave screenshots at 1280×800 and 390×844 (`autotest.html?panel=world&chrontab=<tab>`).

## Core finding

`theme.js` defines a coherent 16-bit "walnut + brass + parchment" token system (`--gold`, `--wood-*`,
`--parchment-*`, `--text`, `--text-muted`, `--success`, `--danger`) and a ready-made tab/grid/card kit
(`.book-tabs`, `.book-tab`, `.book-grid`, `.book-card`). **The six `*-ui.js` modules use none of it** —
0 `var(--…)` references across ~440 inline `style=` attributes — each ships its own palette
(GitHub-dark `#30363d`/`#e6edf3`, Material `#4caf50`/`#ffd54f`, neon `#7c4dff`/`#00e5ff`) and its own
font sizes (10–24px). Result: World Chronicle tabs look like six different apps inside one brass frame.

Design rule going forward: **subsystem UIs compose existing classes + tokens; no new hex literals.**
No new component layer is needed — this is mostly deleting inline styles.

## P0 — visible breakage (shipped)

| # | Issue | Root cause → fix |
|---|---|---|
| 1 | Stronghold badge rendered `Tier …` | Title wrapper had `width:100%`, squeezing the badge (which had `min-width:0` + ellipsis) to nothing. Wrapper → `flex:1`, badge → `flex-shrink:0`, ellipsis dropped. Rule: containment goes on containers, never on badges/labels. |
| 2 | Chronicle tab strip clipped the 6th tab; indigo active state off-theme | Inline flex row without wrap + per-button inline styles. Now `.book-tabs.chronicle-tabs` / `.book-tab.active` (wraps, gold active), `white-space:nowrap`, light inactive text for the navy chronicle body, `role="tab"`/`aria-selected`. |
| 3 | Content clipped on the right at 1280px (companion roster, stronghold grid) | `.world-chronicle` was a fixed `min(760px,84vw)` inside a 760px panel with 15px padding → always ~30px too wide. Now `width:100%`. |
| 3b | Bestiary detail columns overflow at 390px | Fixed `min-width:220px` + `flex:0 0 240px` → `min(220px,100%)` / `flex:0 1 240px; max-width:100%`. |
| 4 | Spire elevator nested as a modal inside the Chronicle (double ×, inner scroll) | `inline` mode now omits the close button and the `max-height:90vh` inner scroller. Standalone modal unchanged. |
| 5 | Boss frame overlapped the top menu (desktop) / stat stack (phone) | Desktop `top:80px` (below the two menu rows); ≤680px anchored `bottom:104px`, above momentum + hotbar. |
| 6 | Phone minimap cropped, weather label wrapping out of the frame | Mobile minimap is 96px but the 136px canvas wasn't scaled → `canvas{width:100%;height:100%}`; weather label `nowrap` + ellipsis. |

Retracted from the first draft: "homestead grid clipped at 390px" and "hotbar slot 9 clipped" were
screenshot artifacts — **headless Brave clamps `--window-size` to a 500px minimum width**, so a "390px"
screenshot is a 500px layout cropped. True phone widths need an iframe wrapper (see Verification). The
mobile hotbar is an intentional scroll-snap row.

## P1 — consistency (shipped)

Result: `var(--…)` uses in the six `*-ui.js` files went 0 → ~340; hard-coded hex 200+ → 27, all
intentional (rarity/grade/pet-archetype data maps, Spire violet accent, heart-pink loyalty bar, canvas
fanfare). Deviations from the plan below:

- New tokens: `--success-text`/`--danger-text` (text-safe ≥6.5:1 on dark cards — `--danger` alone is
  4.3:1), `--info`, `--warn`, `--card-bg`, `--card-border`. Tints use `color-mix(in srgb, var(--x) N%, transparent)`.
- `.panel__body` swaps `--text`/`--text-muted`/`--accent-alt`/`--success` to parchment ink; `.world-chronicle`
  restores the dark values so tokens are readable on its navy body.
- Card `RARITY_COLORS` now derive from `loot.js` `RARITY` (cards and gear previously disagreed, e.g.
  legendary yellow vs orange).
- Inline `box-sizing`/`min-width:0`/`overflow-x:hidden` "boxing containment" is kept — it is a documented
  convention asserted by the UI tests — but stripped from badges/pills (`flex-shrink:0` instead), the
  pattern behind `Tier …`.
- Font sizes: 13→12, 15/16→14, 18→17; a 14px card-title step stayed.

Original mapping plan:

Apply across all six `*-ui.js` files:

| Hard-coded | Token |
|---|---|
| `#ffd54f` `#ffd700` `#f0d47d` | `var(--gold-bright)` / `var(--accent-alt)` |
| `#aaa` `#888` `#8b949e` `#9e9e9e` `#a0a0a0` | `var(--text-muted)` |
| `#fff` `#ffffff` `#e6edf3` | `var(--text)` |
| `#4caf50` `#81c784` | `var(--success)` |
| `#e57373` | `var(--danger)` |
| `#30363d`, `rgba(255,255,255,.05–.1)` surfaces/borders | `.book-card` (bg `rgba(0,0,0,.28)`, border `rgba(120,90,50,.4)`) |
| `font-family` system sans (pets) | inherit `--font-ui`; headings `--font-head` |
| font-size zoo 10/11/12/13/14/15/16/18/20/24 | 10 (meta) · 11 (body) · 12 (card title) · 17 (section head, `--font-head`) |

Allowed exceptions: one **biome accent** per subsystem (Spire violet, Raids ember) for a single border/title
color — surfaces stay on-theme. Rarity colors stay as defined in `loot.js`.

Card anatomy (all subsystems): `.book-card` → `.book-card-head` (icon + `<b>` title + right-aligned status
badge) → `<small>` description → requirement rows → full-width action button. Locked/unbuilt =
`.book-card.locked`, not a red-text list.

Unverified: whether high-contrast mode (`hc`) re-colors these tabs. If HC works by overriding tokens,
every hard-coded hex above currently ignores it — P1 fixes that for free. Check with a settings→HC toggle
then reopening the Chronicle.

## P2 — polish (shipped)

- Raw item ids → names from `CONTENT.items` (raid spoils, homestead mannequin/plot/pasture). `46640ec`
- Homestead plot/mannequin openers guard the id before appending the blocking backdrop; regression test
  `js/homestead-modal-guard.test.js`. `46640ec`
- Neutral states read neutral: unmet Stronghold requirements muted (✓ when met, not color-only), disabled
  button says "Requirements not met"; empty plots drop green "None"; zero forage gifts and locked Spire floors
  muted. Duplicate per-tab titles removed. `7f82f5d`
- Desktop menu fits one row at 1280px: Field guide/Loadouts/Audio/Admin/lang/mute fold behind `⋯`; touch
  popover still lists all. The phone "Menu" button was leaking onto desktop behind the level badge
  (specificity) — fixed. `cc17c47`

### Found, not fixed (content, not UI)

- Stronghold costs reference item ids missing from `CONTENT.items`: `wood` (Botanical Conservatory tier 1)
  and `essence_nature`. That upgrade can never be afforded; `selfCheck()` doesn't validate
  `systems/stronghold.js` costs. Needs a content decision (add the items + a source, or change the cost).
- Mannequin modal lists 7 slots; gauntlets/cloak/boots/ring slots worn by the player aren't shown.

Out of scope: overlapping canvas nameplates over monster clusters (canvas render, not DOM UI).

## Tooling change made during audit

`autotest.html` gained `chrontab=<road|bestiary|companions|spire|stronghold|homestead>` (sets
`G._chronicleTab`, mirrors `booktab`).

## Verification contract for implementation

Per CLAUDE.md: Node harness (assert tab render + no throw for all six tabs) **and** Brave screenshots at
1280×800 and a true 390px (iframe `<iframe style="width:390px;height:844px">` around `autotest.html`,
window ≥500px) for every Chronicle tab, with `tilephase`/`anim` frozen. Acceptance: no horizontal
clipping at either width, `grep -c '#[0-9a-fA-F]\{3,6\}' js/render/*-ui.js` trends to ~0 (biome accent
excepted), `Tier 0/3` fully visible.

## Suggested phasing

1. ~~P0~~ shipped (`0437bde`…`2db2054`).
2. ~~P1~~ shipped (`b996cf5`…, one `*-ui.js` per commit).
3. ~~P2~~ shipped (`46640ec`…`cc17c47`).
