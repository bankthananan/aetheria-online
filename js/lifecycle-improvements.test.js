import assert from 'node:assert/strict';
import { createGameClock } from './systems/game-clock.js';
import { createRuntime } from './test-support/runtime.js';
let t=1000;
const c=createGameClock(()=>t);
c.pause('panel');t+=2000;c.pause('hidden');c.resume('panel');t+=3000;
assert.equal(c.now(),1000);assert.equal(c.isPaused(),true);
c.resume('hidden');t+=100;assert.equal(c.now(),1100);
const {A,advance}=await createRuntime();
const before=A.gameClock.now();
A.G.player.skillCd.test=before+500;
const monster=A.G.monsters[0];if(monster)monster.atkCdUntil=before+500;
A.G.keys.w=true;A.G.autoFarm=true;
A.pauseGame('hidden');advance(60000);
assert.equal(A.gameClock.now(),before);
assert.equal(A.G.player.skillCd.test-A.gameClock.now(),500);
if(monster)assert.equal(monster.atkCdUntil-A.gameClock.now(),500);
assert.equal(A.G.autoFarm,false);assert.equal(!!A.G.keys.w,false);
A.resumeGameFromPause('hidden');advance(100);
assert.equal(A.gameClock.now(),before+100);
A.G.player.stamina=0;
A.setCtx(document.getElementById('game-canvas'));
advance(50);A.frame(performance.now());
assert.ok(A.G.player.stamina>0,'ordinary animation frames advance simulation');

// Test pauseOnUnfocus option for background idle farming
A.resumeGameFromPause('hidden');
A.G.player.features.pauseOnUnfocus = false;
A.G.autoFarm = true;
window.dispatchEvent(new Event('blur'));
assert.equal(A.gameClock.isPaused(), false, 'Game should NOT pause on blur when pauseOnUnfocus is false');
assert.equal(A.G.autoFarm, true, 'Auto-farm should remain active on blur when pauseOnUnfocus is false');

A.G.player.features.pauseOnUnfocus = true;
window.dispatchEvent(new Event('blur'));
assert.equal(A.gameClock.isPaused(), true, 'Game should pause on blur when pauseOnUnfocus is true');
assert.equal(A.G.autoFarm, false, 'Auto-farm stops when interrupted if pauseOnUnfocus is true');

console.log('Pause lifecycle passed.');
