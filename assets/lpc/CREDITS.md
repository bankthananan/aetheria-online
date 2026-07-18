# LPC character sheet credits

The 7 class spritesheets in this folder (`blade.png`, `berserker.png`, `mage.png`,
`ranger.png`, `paladin.png`, `monk.png`, `elementalist.png`) were generated with
the Universal LPC Spritesheet Generator character assets (CC-BY-SA 3.0 / GPL 3.0),
via the `lpc-character-mcp` random-character tool.

Generator: https://github.com/liberatedpixelcup/Universal-LPC-Spritesheet-Character-Generator

Each sheet was curated from randomly rolled candidates (fixed seeds, recorded
below for reproducibility) and picked for a readable match to its combat-class
archetype.

| Class | Seed | bodyType |
|---|---|---|
| blade | 210258 | male |
| berserker | 105284 | muscular |
| mage | 949 | female |
| ranger | 315500 | male |
| paladin | 2323 | male |
| monk | 3131 | male |
| elementalist | 213700 | female |

See `.superpowers/sdd/task-2-report.md` for the full curation log (rejected-roll
counts, per-class notes).

## NPC role sheets (Task 3)

The 4 NPC-role spritesheets (`npc_shop.png`, `npc_quest.png`, `npc_guild.png`,
`npc_story.png`) were generated the same way, via `lpc-character-mcp`.

| Role | Seed | bodyType | Note |
|---|---|---|---|
| shop | 314687 | male | merchant coat + wide hat, apron-adjacent |
| guild | 315287 | muscular | second-pass pick — bare-chested, headband, green-tinted "Human Female Elderly" head; reads as an imposing barbarian-type enforcer, distinct palette from the 7 class sheets |
| quest | 1500 | male | second-pass pick — red-tinted "Human Female Elderly" head, apron/vest/bowtie, holding goods rather than a weapon; reads as "friendly civilian" much better than the original pick |
| story | 105529 | female | second-pass pick — tan-furred "Human Male Elderly" head, apron/tabard/kimono robe layers; matches "elder/robed" directly, unlike the original armored-adventurer pick |

Guild/quest/story were re-rolled in a second pass after the first-pass picks (documented seeds 1100/700/210258)
proved weak matches for their archetypes (see `.superpowers/sdd/task-3-report.md`). Shop's first-pass pick was
kept as-is — its second-pass alternative (seed 319687) read as less coherently "merchant" despite a valid
human head, so shop still uses the original seed 314687 sheet.

See `.superpowers/sdd/task-3-report.md` for the full curation log (rejected-roll
counts, concerns).
