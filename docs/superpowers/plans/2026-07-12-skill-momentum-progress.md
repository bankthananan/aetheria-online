# Momentum plan — progress ledger

- Task 1: complete (data+selfCheck, review clean; Minor: single-quote detonate values — spec-directed, ok)
- Task 2: complete (lifecycle: init/gain/cap/decay, review clean, reviewer re-ran tests)
- Task 3: complete (finisher gate+spend+scale, review clean; notes: no heal/buff finishers; finisher-miss burns Momentum = parity w/ old MP)
- Task 4: pending
- Task 5: complete (HUD pips; controller CSS fix: pips were position:static in top strip → fixed above hotbar, re-screenshotted OK; final review clean)

## Final whole-branch review (opus)
- Verdict: ready to merge after ONE fix. Manual/hotkey play fully correct end-to-end (meteor traced: gate→scale→detonate→re-apply burn; no negative/overflow/MP-leak; save/load correct; no gate-bypass path). No over-engineering.
- Fix applied: `autoFarmActions` `ready` helper (js/game.js:733) gated finishers on MP; now gates finishers on `TUNING.momentum.finisherMin`. Verified by new test t5_autofarm.mjs (momentum-ready finisher fires at low MP; below-threshold does not). Buffs unaffected (never finishers).
- Verification: Node t1–t4 + t5_autofarm all exit 0; Brave screenshots (mage low-level, ranger lv33 auto-farm) show pips above hotbar, no error banner.

STATUS: COMPLETE.
