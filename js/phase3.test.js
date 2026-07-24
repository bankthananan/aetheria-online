import assert from 'node:assert/strict';

// Mock minimal DOM environment for Node testing (same shim as phase1/phase2.test.js,
// with a real localStorage backing store so saveGame/resumeGame can round-trip).
const _lsStore = {};
globalThis.localStorage = {
  getItem(k) { return k in _lsStore ? _lsStore[k] : 'en'; },
  setItem(k, v) { _lsStore[k] = String(v); },
  removeItem(k) { delete _lsStore[k]; },
};

globalThis.window = {
  AudioContext: class {
    constructor() {
      this.currentTime = 0;
      this.destination = {};
    }
    createGain() {
      return {
        gain: {
          value: 1,
          setValueAtTime() {},
          linearRampToValueAtTime() {},
          exponentialRampToValueAtTime() {},
          setTargetAtTime(v) { this.value = v; },
          cancelScheduledValues() {},
        },
        connect() { return this; },
        disconnect() {},
      };
    }
    createBuffer() {
      return { getChannelData: () => new Float32Array(100) };
    }
    createBufferSource() {
      return { buffer: null, connect() { return this; }, start() {}, stop() {} };
    }
    createOscillator() {
      return { type: 'square', frequency: { value: 440, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() { return this; }, start() {}, stop() {} };
    }
    createBiquadFilter() {
      return { type: 'bandpass', frequency: { value: 1200 }, connect() { return this; } };
    }
  },
  addEventListener() {},
  removeEventListener() {},
  requestAnimationFrame: () => 0,   // resumeGame ends with this; never invoking frame keeps it synchronous
};
globalThis.requestAnimationFrame = globalThis.window.requestAnimationFrame;

const makeCtx = () => new Proxy({}, {
  get(target, prop) {
    if (prop in target) return target[prop];
    return () => {};
  }
});

const makeEl = () => ({
  style: {}, dataset: {}, children: [],
  classList: { add() {}, remove() {}, contains() { return false; } },
  appendChild(c) { return c; }, removeChild() {}, remove() {},
  querySelectorAll() { return []; }, querySelector() { return null; }, addEventListener() {}, setAttribute() {}
});
const elements = Object.fromEntries(['root', 'hud', 'overlays', 'fx-layer', 'game-canvas', 'touch-controls'].map(id => [`#${id}`, makeEl()]));

globalThis.document = {
  createElement(tag) {
    const el = makeEl();
    if (tag === 'canvas') {
      el.width = 100;
      el.height = 100;
      el.getContext = () => makeCtx();
    }
    return el;
  },
  getElementById(id) { return elements[`#${id}`] || makeEl(); },
  querySelector(sel) { return elements[sel] || makeEl(); },
  querySelectorAll() { return []; },
  body: makeEl(),
  head: makeEl(),
};

await import('./combat.js');
await import('./game.js');

const A = globalThis.window.__AWO;
const { G, DESIGN, CONTENT, makePlayer, loadMap, killMonster, monsterStatsFor, saveGame, resumeGame } = A;

console.log('=== RUNNING PHASE 3 TEST SUITE ===');

G.player = makePlayer(DESIGN.classes[0].id, 'RiftTester');
G.running = true;   // saveGame is a no-op unless a run is "live"
loadMap('whispering_woods');
G.monsters.forEach(m => { m.x = m.y = m.homeX = m.homeY = 2000; });

// ---- Task 3.1: Endless Celestial Rift ----
const RIFT = DESIGN.tuning.rift;
const MUTATOR_IDS = ['volcanic_ticks', 'reflective_void', 'mana_surge'];

loadMap('celestial_rift');
assert.equal(G.mapId, 'celestial_rift', 'portal/loadMap lands on the rift map');
assert.equal(G.rift.floor, 1, 'entering the rift starts at floor 1');
assert.equal(G.rift.active, true, 'rift run is active on entry');
assert.equal(G.monsters.length, RIFT.waveSize, 'floor 1 spawns the configured wave size');
assert.ok(MUTATOR_IDS.includes(G.rift.mutatorId), 'active mutator is one of the three rotating ids');
assert.ok(G.rift.best >= 1, 'best floor records floor 1 immediately on entry');
console.log(`✓ mutator today: ${G.rift.mutatorId}`);

// wave scaling matches floorScale ** floor (hp/atk), within rounding tolerance
const voidWisp = CONTENT.monsters.find(m => m.id === 'void_wisp');
const baseHp = monsterStatsFor(voidWisp, voidWisp.level).hp;
const baseAtk = monsterStatsFor(voidWisp, voidWisp.level).atk;
const floor1Wisp = G.monsters.find(m => m.def.id === 'void_wisp');
const expectHp1 = baseHp * Math.pow(RIFT.floorScale, 1);
assert.ok(Math.abs(floor1Wisp.maxHp - expectHp1) / expectHp1 < 0.02, `floor1 hp ~= base*floorScale^1 (got ${floor1Wisp.maxHp}, want ~${expectHp1})`);
const expectAtk1 = baseAtk * Math.pow(RIFT.floorScale, 1);
assert.ok(Math.abs(floor1Wisp.atk - expectAtk1) / expectAtk1 < 0.02, 'floor1 atk ~= base*floorScale^1');

// clearing the wave advances the floor and rescales the next one
G.monsters.forEach(m => { m.hp = 0; killMonster(m); });
assert.equal(G.rift.floor, 2, 'clearing every monster advances to floor 2');
assert.equal(G.rift.best, 2, 'best floor tracks the new high-water mark');
assert.equal(G.monsters.length, RIFT.waveSize, 'floor 2 respawns a full wave');
assert.ok(G.monsters.every(m => m.alive), 'floor 2 wave is freshly alive');
const floor2Wisp = G.monsters.find(m => m.def.id === 'void_wisp');
const expectHp2 = baseHp * Math.pow(RIFT.floorScale, 2);
assert.ok(Math.abs(floor2Wisp.maxHp - expectHp2) / expectHp2 < 0.02, `floor2 hp ~= base*floorScale^2 (got ${floor2Wisp.maxHp}, want ~${expectHp2})`);
console.log('✓ Task 3.1a | Rift entry, wave size, mutator rotation, and 1.15^floor scaling verified');

// best floor persists through saveGame / resumeGame
saveGame();
const bestBeforeResume = G.rift.best;
resumeGame();
assert.equal(G.rift.best, bestBeforeResume, 'best floor survives a saveGame → resumeGame round trip');
console.log('✓ Task 3.1b | Best floor persistence verified');

// ---- Task 3.1c: mutator effects (forced, since only one is live on any given day) ----
const { damageMonster } = A;
loadMap('celestial_rift');
const p2 = A.G.player;

G.rift.mutatorId = 'reflective_void';
const mob = G.monsters.find(m => m.alive);
const hpBeforeReflect = p2.hp;
damageMonster(mob, 100, false);
assert.ok(p2.hp < hpBeforeReflect, 'Reflective Void bleeds the attacker back');

G.rift.mutatorId = 'mana_surge';
p2.mp = Math.floor(p2.maxMp * 0.5);
const mpBefore = p2.mp;
A.step(1);
assert.ok(p2.mp - mpBefore > 3 * (RIFT.manaSurgeMult - 0.01), 'Mana Surge speeds MP regen');

G.rift.mutatorId = 'volcanic_ticks';
G.rift.nextBurnAt = 0;
G.monsters.forEach(m => { m.x = m.y = m.homeX = m.homeY = 2000; });  // park the wave — an adjacent rift mob would attack during step() and flake this
p2.hp = p2.maxHp;
const hpBeforeBurn = p2.hp;
A.step(0.016);
assert.equal(hpBeforeBurn - p2.hp, RIFT.burnTickDmg, 'Volcanic Ticks burns the player for the tuned amount');
console.log('✓ Task 3.1c | Mutator effects (reflect / mana surge / burn tick) verified');

// ---- Task 3.2: World Boss 3-Phase Raid (Voidmaw Sovereign) ----
const { updateMonsters } = A;
const raidDef = CONTENT.monsters.find(m => m.id === 'voidmaw_sovereign');
assert.ok(raidDef && raidDef.raid === true && raidDef.sizeTiles >= 2, 'raid boss def exists, flagged raid + boss-sized');
assert.ok(raidDef.drops.some(d => d.itemId === 'sovereign_core' && d.chance === 1.0), 'raid boss has a 100%-chance mythic drop');
assert.ok(CONTENT.items.some(it => it.id === 'sovereign_core'), 'mythic item resolves in the item table');

loadMap('astral_rift');
G.monsters.forEach(m => { if (m.def.id !== 'voidmaw_sovereign') { m.x = m.y = m.homeX = m.homeY = 4000; } });
const raid = G.monsters.find(m => m.def.id === 'voidmaw_sovereign');
assert.ok(raid, 'raid boss spawns on the astral rift map');
const p3 = G.player;
p3.x = raid.x; p3.y = raid.y;   // in range for the slam/adds/hazard checks below
p3.godMode = true;              // the freshly-summoned lvl~63 adds would otherwise one-shot a lvl1 test hero

const preAddCount = G.monsters.length;
const preWispCount = G.monsters.filter(m => m.def.id === 'void_wisp').length;
raid.hp = raid.maxHp * 0.65;                       // cross the phase-2 (66%) gate
updateMonsters(0.016);
assert.equal(raid.raidAddsSpawned, true, 'phase 2 (66% hp) flags adds as spawned');
assert.ok(G.monsters.length > preAddCount, 'phase 2 summons additional monsters onto the map');
assert.ok(G.monsters.filter(m => m.def.id === 'void_wisp').length > preWispCount, 'phase 2 adds are void_wisps, an existing species (count grew, not just present)');

raid.hp = raid.maxHp * 0.32;                       // cross the phase-3 (33%) gate
updateMonsters(0.016);
assert.equal(raid.raidPhase3, true, 'phase 3 (33% hp) flags the expanding ground hazard');
assert.ok(raid.enraged, 'existing enrage (bossEnrageAt) still fires alongside phase 3');

// phase 3's actual mechanic: the slam ring/damage radius grows each successive impact,
// not just the flag — force two full telegraph→impact cycles and check the tick counter.
raid.lastCombatAt = performance.now(); raid.nextSlamAt = performance.now() - 1; raid.slamAt = null;
updateMonsters(0.016);
assert.ok(raid.slamAt, 'phase 3 boss telegraphs a slam while in range and in combat');
raid.slamAt = performance.now() - 1;   // force the telegraph to have just expired
updateMonsters(0.016);
const ticksAfterFirst = raid.raidHazardTicks;
assert.ok(ticksAfterFirst >= 1, 'first phase-3 slam impact increments the hazard tick (radius) counter');
raid.nextSlamAt = performance.now() - 1; raid.slamAt = null;
updateMonsters(0.016);
raid.slamAt = performance.now() - 1;
updateMonsters(0.016);
assert.ok(raid.raidHazardTicks > ticksAfterFirst, 'a second phase-3 slam keeps growing the hazard radius (tick count increases again)');
console.log('✓ Task 3.2a | Raid def, mythic drop, spawn placement, phase 2/3 HP gates, and growing hazard radius verified');

// mythic item drops 100% of the time on a raid boss kill
raid.hp = 0;
killMonster(raid);
const inv = G.player.inventory || [];
assert.ok(inv.some(it => it.itemId === 'sovereign_core'), 'killing the raid boss always drops the mythic Sovereign Core');
console.log('✓ Task 3.2b | Mythic drop on raid boss kill verified');

// ---- Task 3.3: Rune Socketing & Transmog ----
const { rollItem, socketGem, socketStats, transmogItem, itemQty, addItem, SOCKET_BOUNDS, equip, recompute, passiveBonuses, DESIGN: D3 } = A;
loadMap('whispering_woods');
G.monsters.forEach(m => { m.x = m.y = m.homeX = m.homeY = 2000; });
const p4 = G.player;

// sockets roll within bounds by rarity
for (const rarity of ['common', 'uncommon', 'rare', 'epic', 'legendary']) {
  const [lo, hi] = SOCKET_BOUNDS[rarity];
  for (let i = 0; i < 20; i++) {
    const inst = rollItem('iron_sword', 0, rarity);
    assert.ok(Array.isArray(inst.sockets), `${rarity} roll always carries a sockets array`);
    assert.ok(inst.sockets.length >= lo && inst.sockets.length <= hi, `${rarity} socket count ${inst.sockets.length} within [${lo},${hi}]`);
  }
}
console.log('✓ Task 3.3a | Socket counts roll within their rarity bounds');

// socketing a gem changes derived stats by exactly the gem bonus (item must be equipped)
const ring = rollItem('vitality_amulet', 0, 'legendary');
ring.sockets = [null, null, null];   // pin to 3 for a clean, forced test
p4.inventory.push(ring);
equip(ring.uid);
assert.equal(passiveBonuses(p4).hpPct, 0, 'fresh test hero has no HP% passive — the hpFlat delta below is exact');
const hpBefore = p4.maxHp;
addItem('sapphire_shard', 1);
const gemDef = CONTENT.items.find(i => i.id === 'sapphire_shard').gem;
assert.ok(socketGem(ring.uid, 0, 'sapphire_shard'), 'socketing into an empty slot on an equipped item succeeds');
assert.equal(itemQty('sapphire_shard'), 0, 'the gem is consumed from the bag on socketing');
assert.equal(ring.sockets[0], 'sapphire_shard', 'the socket now holds the gem id');
recompute(p4);
assert.equal(p4.maxHp - hpBefore, gemDef.value, `equipped maxHp rises by exactly the gem's flat bonus (${gemDef.value})`);
assert.equal(socketGem(ring.uid, 0, 'sapphire_shard'), false, 'an already-filled socket refuses a second gem');
console.log('✓ Task 3.3b | Socketing a gem changes derived stats by exactly the gem bonus');

// 3-match set bonus
const soloStats = socketStats(ring);
addItem('sapphire_shard', 2);
socketGem(ring.uid, 1, 'sapphire_shard');
socketGem(ring.uid, 2, 'sapphire_shard');
const setStats = socketStats(ring);
const expectedNoBonus = gemDef.value * 3;
const expectedWithBonus = expectedNoBonus + Math.round(gemDef.value * D3.tuning.gemSetBonusMult);
assert.equal(setStats.hpFlat, expectedWithBonus, '3 matching gems grant the extra set bonus on top of the plain 3× total');
assert.ok(setStats.hpFlat > expectedNoBonus, 'the set-bonus total exceeds the sum of three unbonused gems');
console.log('✓ Task 3.3c | 3-matching-gem set bonus applies on top of the summed gem stats');

// transmog: changes icon id but not stats
const dagger = rollItem('worn_dagger', 0, 'common');
p4.inventory.push(dagger);
const atkBefore = p4.physAtk;
assert.ok(transmogItem(dagger.uid, 'hero_blade'), 'transmog to another owned same-slot item succeeds');
assert.equal(dagger.transmogItemId, 'hero_blade', 'transmogItemId is set to the cosmetic target');
assert.equal(dagger.itemId, 'worn_dagger', 'the real itemId (and its stats) never change');
recompute(p4);
assert.equal(p4.physAtk, atkBefore, 'transmog is purely cosmetic — no stat change from re-skinning an unequipped item');
assert.ok(transmogItem(dagger.uid, null) === true && dagger.transmogItemId === null, 'transmog can be cleared back to the original appearance');
assert.equal(transmogItem(dagger.uid, 'cloth_tunic'), false, 'transmog refuses a target from a different equipment slot');
console.log('✓ Task 3.3d | Transmog swaps the displayed icon id without touching stats');

// persists through saveGame / resumeGame
ring.transmogItemId = 'power_ring';
saveGame();
resumeGame();
const ringAfter = A.G.player.equip.accessory;
assert.ok(ringAfter && ringAfter.uid === ring.uid, 'the socketed/transmogged accessory is still equipped after resume');
assert.deepEqual(ringAfter.sockets, ['sapphire_shard', 'sapphire_shard', 'sapphire_shard'], 'sockets survive a saveGame → resumeGame round trip');
assert.equal(ringAfter.transmogItemId, 'power_ring', 'transmogItemId survives a saveGame → resumeGame round trip');
console.log('✓ Task 3.3e | Sockets, gems, and transmog all persist through saveGame/resumeGame');

console.log('=== PHASE 3 TEST SUITE PASSED ===');
process.exit(0); // music sequencer interval keeps the loop alive otherwise
