import assert from 'node:assert/strict';
import { DESIGN } from './design.js';
import { PROGRESSION } from './progression.js';
import { PAL, PX } from './pixelart.js';
import {
  CLASS_JOB_MODELS,
  resolvePlayerVisualModel,
  getJobPixelMatrix,
  drawPlayerJobRegalia,
  renderJobPortraitHtml,
  renderHeroModelShowcaseHtml,
} from './render/player-models.js';

// 1. Verify all 59 archetypes exist in CLASS_JOB_MODELS
const baseClassIds = DESIGN.classes.map(c => c.id);
assert.equal(baseClassIds.length, 10, '10 base classes exist');
for (const cid of baseClassIds) {
  assert.ok(CLASS_JOB_MODELS[cid], `Base class model missing for ${cid}`);
  assert.equal(CLASS_JOB_MODELS[cid].tier, 0);

  const branches = PROGRESSION.jobBranches[cid]?.choices || [];
  assert.equal(branches.length, 2, `2 Tier-II branches expected for ${cid}`);
  for (const br of branches) {
    assert.ok(CLASS_JOB_MODELS[br.id], `Tier-II branch model missing for ${br.id}`);
    assert.equal(CLASS_JOB_MODELS[br.id].tier, 1);
  }

  const advs = PROGRESSION.advancedJobs[cid]?.choices || [];
  assert.equal(advs.length, 2, `2 Tier-III advanced jobs expected for ${cid}`);
  for (const adv of advs) {
    assert.ok(CLASS_JOB_MODELS[adv.id], `Tier-III advanced job model missing for ${adv.id}`);
    assert.equal(CLASS_JOB_MODELS[adv.id].tier, 2);
  }
}

const hybridIds = Object.keys(PROGRESSION.hybridJobs);
assert.equal(hybridIds.length, 9, '9 Tier-IV hybrid jobs exist');
for (const hid of hybridIds) {
  assert.ok(CLASS_JOB_MODELS[hid], `Tier-IV hybrid job model missing for ${hid}`);
  assert.equal(CLASS_JOB_MODELS[hid].tier, 3);
}
assert.equal(Object.keys(CLASS_JOB_MODELS).length, 59, 'Exactly 59 total class/job visual models');

// 2. Verify every model has distinct 16x22 pixel matrices with valid PAL keys
for (const [id, model] of Object.entries(CLASS_JOB_MODELS)) {
  assert.ok(model.palette?.primary && model.palette?.secondary && model.palette?.aura, `Palette complete for ${id}`);
  assert.ok(
    model.regalia?.headgear &&
    model.regalia?.mantle &&
    model.regalia?.mainhand &&
    model.regalia?.offhand &&
    model.regalia?.auraStyle,
    `Regalia complete for ${id}`,
  );

  const idleMat = getJobPixelMatrix(id, false);
  const walkMat = getJobPixelMatrix(id, true);
  assert.equal(idleMat.length, 22, `Idle matrix for ${id} is 22 rows`);
  assert.equal(walkMat.length, 22, `Walk matrix for ${id} is 22 rows`);
  for (const row of idleMat) {
    assert.equal(row.length, 16, `Row width is 16 for ${id}`);
    for (const ch of row) assert.ok(ch in PAL, `Valid PAL char '${ch}' in ${id}`);
  }
  assert.ok(PX.jobModel?.[id], `PX.jobModel registered for ${id}`);
  assert.ok(PX.jobModelWalk?.[id], `PX.jobModelWalk registered for ${id}`);
}

// Verify Tier-II / Tier-III / Tier-IV matrices differ from base class matrix and from sibling paths
for (const cid of baseClassIds) {
  const baseStr = getJobPixelMatrix(cid, false).join('\n');
  const [b1, b2] = PROGRESSION.jobBranches[cid].choices;
  const b1Str = getJobPixelMatrix(b1.id, false).join('\n');
  const b2Str = getJobPixelMatrix(b2.id, false).join('\n');
  assert.notEqual(b1Str, baseStr, `Branch ${b1.id} pixel matrix must differ from base ${cid}`);
  assert.notEqual(b2Str, baseStr, `Branch ${b2.id} pixel matrix must differ from base ${cid}`);
  assert.notEqual(b1Str, b2Str, `Sibling branches ${b1.id} and ${b2.id} must have distinct pixel matrices`);

  const [a1, a2] = PROGRESSION.advancedJobs[cid].choices;
  const a1Str = getJobPixelMatrix(a1.id, false).join('\n');
  const a2Str = getJobPixelMatrix(a2.id, false).join('\n');
  assert.notEqual(a1Str, baseStr, `Advanced job ${a1.id} pixel matrix must differ from base ${cid}`);
  assert.notEqual(a2Str, baseStr, `Advanced job ${a2.id} pixel matrix must differ from base ${cid}`);
  assert.notEqual(a1Str, a2Str, `Sibling advanced jobs ${a1.id} and ${a2.id} must have distinct pixel matrices`);
}

// 3. Verify resolvePlayerVisualModel across tiers & preview override
const mockPlayer = {
  classId: 'shadow_blade',
  combatClass: 'assassin',
  tierIndex: 0,
  jobBranchId: null,
  advancedJobId: null,
  hybridJobId: null,
};
const resolved0 = resolvePlayerVisualModel(mockPlayer);
assert.equal(resolved0.id, 'shadow_blade');
assert.equal(resolved0.lineage.length, 4);

mockPlayer.tierIndex = 1;
mockPlayer.jobBranchId = 'phantom_blade';
assert.equal(resolvePlayerVisualModel(mockPlayer).id, 'phantom_blade');

mockPlayer.tierIndex = 2;
mockPlayer.advancedJobId = 'void_stalker';
assert.equal(resolvePlayerVisualModel(mockPlayer).id, 'void_stalker');

mockPlayer.tierIndex = 3;
mockPlayer.hybridJobId = 'nightblade_phantom';
assert.equal(resolvePlayerVisualModel(mockPlayer).id, 'nightblade_phantom');

// Preview override in Status window
assert.equal(resolvePlayerVisualModel(mockPlayer, { previewTier: 0 }).id, 'shadow_blade');
assert.equal(resolvePlayerVisualModel(mockPlayer, { previewTier: 1 }).id, 'phantom_blade');
assert.equal(resolvePlayerVisualModel(mockPlayer, { previewTier: 2 }).id, 'void_stalker');
assert.equal(resolvePlayerVisualModel(mockPlayer, { previewTier: 3 }).id, 'nightblade_phantom');

// 4. Verify drawPlayerJobRegalia executes cleanly on mock 2D context for all directions & tiers
const drawnOps = [];
const mockCtx = {
  save: () => drawnOps.push('save'),
  restore: () => drawnOps.push('restore'),
  beginPath: () => drawnOps.push('beginPath'),
  closePath: () => {},
  arc: () => drawnOps.push('arc'),
  ellipse: () => drawnOps.push('ellipse'),
  fill: () => drawnOps.push('fill'),
  stroke: () => drawnOps.push('stroke'),
  fillRect: () => drawnOps.push('fillRect'),
  strokeRect: () => {},
  moveTo: () => {},
  lineTo: () => {},
  translate: () => {},
  scale: () => {},
  rotate: () => {},
};
for (const dir of ['down', 'left', 'right', 'up']) {
  drawnOps.length = 0;
  drawPlayerJobRegalia(mockCtx, mockPlayer, 100, 120, { state: 'idle', dir, frame: 0 }, 1000);
  assert.ok(drawnOps.includes('save') && drawnOps.includes('restore'), `Balanced save/restore for dir=${dir}`);
  assert.ok(drawnOps.length > 4, `Drew regalia primitives for dir=${dir}`);
}

// 5. Verify HTML helpers output expected classes and attributes
const portraitHtml = renderJobPortraitHtml('abyssal_lich', { size: 48 });
assert.ok(portraitHtml.includes('job-model-portrait'), 'Portrait wrapper class present');
assert.ok(portraitHtml.includes('data-model-id="abyssal_lich"'), 'Model ID attribute present');

const showcaseHtml = renderHeroModelShowcaseHtml(mockPlayer, { previewTier: 2 });
assert.ok(showcaseHtml.includes('st-model-showcase'), 'Showcase container present');
assert.ok(showcaseHtml.includes('data-preview-model-tier="0"'), 'Tier preview buttons present');
assert.ok(showcaseHtml.includes('data-preview-model-tier="3"'), 'Tier IV preview button present');

console.log('player-models.test.js passed');
