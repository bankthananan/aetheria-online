# UI Flow Audit — "many features in many places" (Oct 2026)

Requirements discovery only (`/sc:brainstorm`). No code changed. Next step: `/sc:design` for the
navigation model, then `/sc:workflow`.

**Direction chosen by user:** RO-faithful navigation · desktop and touch weighted equally · smithing
location undecided. Visual consistency is already done (see `UI_UX_DESIGN.md` P0–P2 + menus pass);
this audit is about *where things live and how many steps they take*.

## 1. Entry-point matrix

Columns: **HUD** = HUD button/panel (tab) · **Key** = hotkey · **NPC** = only after walking to an NPC +
dialogue · **Map** = in-world tile/portal · **Item** = using an item · **Admin**.

| Action | HUD panel / tab | Key | NPC | Map | Item | Notes |
|---|---|---|---|---|---|---|
| Stats, equip, unequip | Status | C | | | | |
| Equip / use (double-click) | Satchel | I | | | | |
| Rebirth | Status | | | | | native `confirm()` (`game.js:7400`) |
| Socket gem/card | Satchel (pick) → Satchel *or* Status (8px dot) | | | | | equipped gear = pick in Satchel, close, open Status, click dot |
| Unsocket card | — | | | | | `cards-ui.renderSocketModalHtml` has an unsocket button, never rendered |
| Transmog | Status / Satchel row `<select>` | | | | | |
| Lock item (protect) | Satchel, Loadouts | | | | | |
| Loot filter | Satchel toolbar | | | | | auto-loot rules also in Automation |
| **Deposit** | Satchel "deposit materials" (**anywhere**) | | Trader › Storage | | | two rules; Satchel button re-implements `depositItem` (`game.js:7450`) |
| Withdraw | | | Trader › Storage | | | |
| Buy / Sell | | | Trader › Buy/Sell | | | |
| **Refine (Enhance)** | | | Trader › Enhance | | | |
| **Socket expansion** | | | Trader › Enhance | | | |
| **Craft** | | | Trader › Craft | | | |
| Learn skills / passives | Abilities | K | | | | |
| **Assign hotbar** | Satchel `assign`, Abilities `assign`, Settings "Assign actions" 1–9, ⌨ → Keybindings, click hotbar slot → slot picker | | | | | **5 entry points** |
| Rebind keys | Keybindings (⌨ only) | | | | | |
| Story quest | Journal, HUD tracker | Q | Elowen | | | |
| Handbook guide quests | Journal (start), HUD tracker (progress) | Q | | | | |
| Pin goal / routes | Field guide (`⋯`), HUD tracker | | | | | |
| World routes | Chronicle › Roads, Field guide | M | | | | |
| Dailies, mastery, mastery travel, dungeons, difficulty | Adventures | | | | | |
| Guild bounties | | | Guild NPC | | | |
| **Bestiary** | Book › Bestiary **and** Chronicle › "Bestiary Codex" (cards) | B / M | | | | same name, two panels |
| Skills reference | Book › Skills, Abilities, Field guide | B / K | | | | three places |
| Milestones claim | Book | B | | | | |
| Pets: tame | | | | | bait + target | |
| Pets: summon / feed / dismiss | Chronicle › Companions | M | | | | `pets-ui.renderFeedModalHtml` unused |
| Pets: petting, gifts | | | | Homestead pasture | | |
| **Spire: enter** | Chronicle › Spire (ascend) | M | | Spire elevator modal | | menu teleport |
| Spire: shop | Chronicle › Spire | M | | | | |
| **Stronghold: upgrade, pedestals, stipend** | Chronicle › Stronghold (**from anywhere**) | M | | gate needs Guild Rank D | | manage remotely, enter physically |
| **Stronghold: siege** | | | | | | **only caller found is Admin** (`game.js:5878`) |
| Homestead: plots, mannequins, hearth | Chronicle › Homestead (overview) | M | | tiles → modals | | gate needs Lv 15 |
| World-boss raid | | | | | Titan Horn | also incursion-spawned |
| Automation | Automation (`⚙ Auto`) | (F = toggle hunt) | | | | |
| Loadouts | Loadouts (`⋯`) | | | | | |
| Settings: audio, touch, scale, contrast, **admin toggle** | "⚙ Audio" (`⋯`) | | | | | label says Audio |
| Language, mute | HUD `⋯` | | | | | |
| Admin | Admin (`⋯`, when admin) | `` ` `` / F2 | | | | the backtick key silently turns admin on for any player (`game.js:9149`) |

## 2. Friction list (ranked)

**P0: broken or unreachable**
1. **No player-facing way to start a Stronghold siege.** `startStrongholdSiege` is called only from the admin action. The siege HUD, grading and spoils exist but players can't reach them.
2. **Escape doesn't close the Spire elevator or the Homestead modals.** They live in `#spire-elevator-modal-container` / `#homestead-modal-container`, outside the `.panel, .dialogue, .slot-picker` set that Escape handles (`game.js:9169`). Job-choice and rebirth overlays aren't in that set either.
3. **Any player can turn on admin** with backtick/F2 or the Settings checkbox.

**P1: one action, many places (the user's core complaint)**
4. Hotbar assignment: 5 entry points with different UIs.
5. Two "Bestiaries" (Book and Chronicle) and three skill references.
6. Deposit: anywhere from the Satchel, but withdraw only at the Trader.
7. Stronghold managed from anywhere, but entered through a portal. Spire entered by menu teleport. Homestead is in-world only. Three different "place" models.
8. Six "what next / claim" surfaces: HUD tracker, Journal, Field guide, Adventures, Chronicle Roads, Book milestones.
9. "Audio" button opens general settings, and hotbar assign is duplicated there.

**P2: extra steps**
10. Trader and Guild replay the NPC dialogue on every visit before opening the panel.
11. Only one window can be open at a time (`togglePanel` removes `#panel`). Compare-and-equip, socketing equipped gear, and Storage↔Satchel each need close/reopen. This is the biggest gap against RO.
12. Socket dots are 8px click targets, which is too small for touch.
13. Badges show only stat and skill points (`game.js:5428`). Unclaimed dailies, mastery, milestones, bounties, stipend, spoils and ripe crops are invisible until you open the right panel.
14. No hotkey for Adventures, Automation, Field guide, Loadouts or Settings.
15. Mixed confirm styles: native `confirm()` for rebirth, in-game confirm for guild revoke.

**Dead UI code** (decide wire-or-delete): `cards-ui.renderSocketModalHtml`, `pets-ui.renderFeedModalHtml`.

## 2b. Menu-by-menu recheck

Every menu surface, with what it holds and what's wrong with its flow. ✅ = no flow issue found.

### HUD
| Menu | Holds | Issues |
|---|---|---|
| HUD bar | Status, Satchel, Abilities, Journal, World, Hunt, ⚙ Auto, Book, Adventures; `⋯` → Field guide, Loadouts, ⚙ Audio, Admin, 🌐, 🔊 | Two `⚙` buttons (Auto, Audio) with different meanings. Hotkey hints only on 6 of 9 buttons |
| Mobile ☰ menu | same buttons | **Opening it pauses the game, and pausing turns auto-hunt off** (see M1) |
| Hotbar + ⌨ | 9 slots, slot picker, ⌨ → Keybindings | Slot picker has a "key settings" link: ✅ |
| Quest tracker | story goal, pinned goal, Handbook progress, advance quest | Shows nothing about rewards waiting to be claimed (FR-4) |

### Panels
| Panel | Holds | Issues |
|---|---|---|
| **Status (C)** | Stats, attributes (+), equipment doll with sockets/transmog, recommended build, Rebirth, **Achievements** | Achievements here **and** Collection Milestones in Book: two trophy lists. Rebirth uses native `confirm()` |
| **Satchel (I)** | Tabs All/Gear/Use/Etc/Quest, search, sort, loot filter, details pane (Use/Equip/Socket…/→Bar/Lock), Deposit Mats | Deposit Mats works anywhere (P1-6). Loot filter here, but auto-loot rules are in Automation |
| **Abilities (K)** | Skill tree, passives, branch/advanced-job identity, combo guide, build reset hint, drag to hotbar | Skill info is also in Book › Skills and Field guide. Otherwise ✅ |
| **Journal (Q)** | Main story, job-advance quest, accepted bounties, **Zone Mastery & Exploration**, Handbook | **Zone Mastery appears here and in Adventures**. Bounty list duplicates Guild's "Your open bounties" (acceptable: read-only mirror) |
| **World (M)** | Roads, Bestiary Codex, Companions, Spire, Stronghold, Homestead | Bestiary duplicate (P1-5). Companions is pet *management*, not world lore, so it's hard to find |
| **Book (B)** | Bestiary, Items, Elements, Skills, Milestones | See Status and World rows |
| **Adventures** | Dailies, Dungeons, Zone Mastery + difficulty + free travel | No hotkey. Mastery duplicated in Journal |
| **⚙ Auto** | Hunt target, recovery profile, skill priority, macro rules, JSON import/export | No hotkey. Loot rules split from the Satchel loot filter. Otherwise ✅ |
| **Field guide** (`⋯`) | Pin goal, item/skill lookup, recipes, routes | Hidden behind `⋯`, no hotkey. Overlaps Book (lookup) and the Journal (goals) |
| **Loadouts** (`⋯`) | Save/rename/apply worn gear sets, "switch in town" | **Homestead Mannequins A/B do the same job** (save and swap a gear set) |
| **⚙ Audio** (`⋯`) | Touch, Assign actions, volumes, UI scale, contrast, Admin toggle | Mislabelled. Duplicate assign row. Player-visible admin (P0-3) |
| **Keybindings** (⌨) | Rebind 9 slots, reset | Help text "Reserved: WASD, E/F, C/I/K/Q" is stale: it omits M, B and V |
| **Trader** (NPC) | Buy, Sell, Enhance (refine + sockets), Craft, Storage (chest and backpack side by side) | Dialogue replayed each visit (P2-10). Storage is already RO-style side by side: ✅ |
| **Guild** (NPC) | Rank, board, accept/claim/revoke, refresh | Dialogue replayed each visit |
| **Admin** | grouped dev actions | Only path to siege (P0-1) |

### Overlays and screens
| Surface | Issues |
|---|---|
| Sign-in → Title (continue / new / class / delete save / switch profile) | **No way back to the title screen or profile switch from inside the game**, except reloading the page |
| Dialogue | Space/click to advance ✅. Escape closes it but **skips the onClose**, so the Trader/Guild panel never opens: a quick Escape means re-talking |
| Job choice / Advanced job / Rebirth class | Mandatory choices that pause ✅. Rebirth path has a Cancel ✅ |
| "Game paused · Resume" (blur) | Clears `taskGuide` and `huntTargetId` on every alt-tab. The active route and hunt target are lost |
| Death | Toast + auto-revive in town ✅ fast. Cancels hunt and route (stated in log) |
| Spire elevator, Homestead plot/pasture/mannequin/hearth | Not Escape-closable (P0-2) |
| Raid / Siege victory summaries | Claim-spoils buttons wired ✅ |

### New findings from this pass
- **M1 (P0): opening any menu cancels auto-hunt.** `pauseGame` (`game.js:5029`) sets `G.autoFarm=false`, and `resumeGameFromPause` never restores it. Opening the Satchel or the mobile ☰ mid-hunt stops hunting until you press F again. *Confirmed headless: autoFarm true → pause+resume → false.*
- **M2 (P0): keys fire while typing.** keydown has no text-field guard. A synthetic `i` aimed at an `<input>` gets past the handler (`G.keys.i = true`). This affects Satchel search, the loadout name field and the sign-in name.
- **M3 (P1): Escape on NPC dialogue drops the service.** It removes `dlg` without calling `onClose`, so the Trader/Guild panel never opens.
- **M4 (P1): alt-tab forgets your route and hunt target** (`pauseForInterruption` clears `taskGuide` and `huntTargetId`).
- **M5 (P1) duplicates:** Zone Mastery (Journal + Adventures), trophies (Status Achievements + Book Milestones), gear sets (Loadouts + Mannequins).
- **M6 (P2) naming:** "Book", "Handbook", "Field guide", "Class skill manual", "Bestiary Codex" are five book-like names. There are also two `⚙` icons.
- **M7 (P2):** Keybindings help text is stale. There's no in-game "return to title".

## 3. Requirements

**FR-1 One home per action.** Every row in §1 has exactly one primary surface. Other places may only *link* there with a deep-link button, never re-implement the action.
- AC: the matrix has ≤ 1 implementing surface per action. The Satchel deposit reuses `depositItem`.

**FR-2 RO window model.** Several windows can be open together (at least Status + Satchel, Satchel + Storage/Trader), each with its own toggle key. They are draggable on desktop and stacked/sheet-style on touch.
- AC: equip-compare and socketing an equipped item need no close/reopen. Escape closes the topmost window of any kind, including the place modals.

**FR-3 Hotkey coverage.** Every HUD window has a key. Bindings follow RO's Alt+letter scheme where it doesn't clash with the existing C/I/K/Q/M/B/F/E. *Look up the actual RO bindings; don't recall them.*
- AC: a keys reference lists every window, and the Keybindings panel can rebind window keys as well as hotbar keys.

**FR-4 Single "what's next / claim" hub.** One surface (or one HUD indicator) shows every claimable reward and the current goal.
- AC: an unclaimed reward anywhere puts a badge on the HUD within one tick. Mobile ☰ badge covers it too.

**FR-5 Consistent place model.** Spire, Stronghold and Homestead follow one rule: either managed remotely or managed only on-site.
- AC: the siege has a player-facing trigger. Gates are stated on the HUD/Chronicle before you walk to them.

**FR-6 NPC repeat visits.** After the first talk, Trader/Guild open their panel directly. Dialogue stays reachable with a "Talk" button.

**FR-7 Settings is Settings.** Rename the button, and remove admin and the duplicate hotbar row from player Settings. Admin is reachable only via the existing `admin` name or the dev host.

**NFR**
- Works at 1280×800 and true 390px (iframe wrapper; see memory note on Brave's 500px minimum width). Touch targets ≥ 32px.
- Keeps Aetheria × RO tokens (`docs/UI_UX_DESIGN.md#template`). No new hex literals.
- No new deps or build step. Content stays in data modules.
- Verify by both methods in CLAUDE.md (Node harness + Brave screenshots).

## 4. Open questions for the user

1. **Smithing:** keep Refine, Socket-expand and Craft at the Trader (RO NPC smith), or also open them from a Satchel item ("Refine…" when in town)?
2. **Multi-window scope:** full RO (any number of windows, draggable, positions saved), or capped at 2 (one left, one right)?
3. **Bestiary merge:** fold the card Codex into Book › Bestiary (cards shown per monster), or keep the Chronicle tab and remove it from the Book?
4. **Cards:** RO cards are permanent once socketed. Keep that (and delete the dead unsocket modal), or allow unsocketing for a cost?
5. **Place model (FR-5):** remote management for all three places, or on-site only?
6. **Siege trigger:** an interact on the Stronghold crystal, a Guild bounty, or a timed event?
7. **Admin access:** is the backtick shortcut meant to stay for players, or should it be dev-only?
