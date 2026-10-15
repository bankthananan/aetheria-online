import assert from 'node:assert/strict';
import { createRuntime } from './test-support/runtime.js';

const { A } = await createRuntime({ classId: 'shadow_blade', nullSelectors: [], strictIds: false });
const G = A.G;
const now = () => A.gameClock.now();

// Test 1: Paper-Doll Weapon Slot Imbue Badge
{
  const p = A.makePlayer('shadow_blade', 'ImbueTester');
  G.player = p;
  A.recompute(p, true);

  // Baseline: no imbue active
  let charHtml = A.panelBody('char');
  assert.equal(charHtml.includes('weapon-imbue-badge'), false, 'no imbue badge when p.imbue is null');

  // Activate Nature imbue (poison_coat)
  p.imbue = { element: 'nature', until: now() + 12000 };
  charHtml = A.panelBody('char');
  assert.ok(charHtml.includes('weapon-imbue-badge'), 'weapon-imbue-badge renders when imbue is active');
  assert.ok(charHtml.includes('Nature'), 'badge shows Nature element');
  assert.ok(charHtml.includes('12s'), 'badge shows 12s remaining');

  // Expired imbue
  p.imbue = { element: 'nature', until: now() - 1000 };
  charHtml = A.panelBody('char');
  assert.equal(charHtml.includes('weapon-imbue-badge'), false, 'no imbue badge when imbue has expired');

  // Holy imbue (e.g. blessing)
  p.imbue = { element: 'holy', until: now() + 20000 };
  charHtml = A.panelBody('char');
  assert.ok(charHtml.includes('weapon-imbue-badge'), 'renders holy imbue badge');
  assert.ok(charHtml.includes('Holy'), 'badge shows Holy element');
  assert.ok(charHtml.includes('20s'), 'badge shows 20s remaining');
  p.imbue = null;
}

// Test 2: Active Effects & Buffs Strip in Character Panel
{
  const p = A.makePlayer('shadow_blade', 'BuffTester');
  G.player = p;
  p.buffs = [];
  p.imbue = null;
  A.recompute(p, true);

  // When no buffs or imbues active
  let charHtml = A.panelBody('char');
  assert.equal(charHtml.includes('st-active-strip'), false, 'no active effects strip when no buffs or imbues');

  // Active combat buff (e.g. ATK +30% from smoke_screen / buff skill)
  p.buffs = [{
    stat: 'atk',
    mult: 1.3,
    flat: 0,
    until: now() + 15000,
    sourceSkillId: 'smoke_screen'
  }];
  charHtml = A.panelBody('char');
  assert.ok(charHtml.includes('st-active-strip'), 'active strip renders when p.buffs has active entries');
  assert.ok(charHtml.includes('Smoke Screen'), 'buff chip identifies source skill');
  assert.ok(charHtml.includes('ATK +30%'), 'buff chip displays magnitude');
  assert.ok(charHtml.includes('15s'), 'buff chip displays remaining seconds');

  // Add active Nature imbue alongside buff
  p.imbue = { element: 'nature', until: now() + 8000 };
  charHtml = A.panelBody('char');
  assert.ok(charHtml.includes('st-effect-chip--imbue'), 'imbue chip renders in active strip');
  assert.ok(charHtml.includes('Nature'), 'imbue chip identifies Nature element');
  assert.ok(charHtml.includes('8s'), 'imbue chip shows 8s remaining');

  // Clean up
  p.buffs = [];
  p.imbue = null;
}

// Test 3: Tier IV Hybrid Calling Badge in Status Header
{
  const p = A.makePlayer('shadow_blade', 'HybridMaster');
  G.player = p;
  p.level = 70;
  p.jobLevel = 70;
  p.tierIndex = 2;
  p.jobBranchId = 'nightstalker';
  p.advancedJobId = 'shadow_sovereign';
  A.recompute(p, true);

  // Before Lv 70 promotion (Tier 2): no hybrid badge
  let charHtml = A.panelBody('char');
  assert.equal(charHtml.includes('st-hybrid-badge'), false, 'no hybrid badge prior to Tier IV promotion');

  // Promote to Tier IV (ti = 3)
  A.doPromote(p, 3);
  assert.equal(p.tierIndex, 3, 'tierIndex is 3');
  assert.equal(p.hybridJobId, 'nightblade_phantom', 'hybridJobId assigned');

  charHtml = A.panelBody('char');
  assert.ok(charHtml.includes('st-hybrid-badge'), 'hybrid badge renders upon Tier IV promotion');
  assert.ok(charHtml.includes('✦'), 'renders hybrid crest ✦');
  assert.ok(charHtml.includes('Nightblade Sovereign'), 'renders hybrid title');
  assert.ok(charHtml.includes('[Void Assassin]'), 'renders hybrid role');
  assert.ok(charHtml.includes('Shadow Blade + Drifter'), 'renders dual-class lineage');
  assert.ok(charHtml.includes('+12 AGI · +8 DEX · +5 LUK'), 'renders evolution bonus');

  // Also verify another hybrid class: Soul Binder -> Eldritch Netherlord
  const p2 = A.makePlayer('soul_binder', 'EldritchMaster');
  G.player = p2;
  p2.level = 70;
  p2.jobLevel = 70;
  p2.tierIndex = 2;
  p2.jobBranchId = 'dread_summoner';
  p2.advancedJobId = 'abyssal_lich';
  A.recompute(p2, true);
  A.doPromote(p2, 3);
  assert.equal(p2.hybridJobId, 'eldritch_lord', 'Soul Binder promoted to eldritch_lord');

  const charHtml2 = A.panelBody('char');
  assert.ok(charHtml2.includes('Eldritch Netherlord'), 'renders Eldritch Netherlord title');
  assert.ok(charHtml2.includes('[Nether Occultist]'), 'renders Nether Occultist role');
  assert.ok(charHtml2.includes('Soul Binder + Codeweaver'), 'renders lineage Soul Binder + Codeweaver');
  assert.ok(charHtml2.includes('+12 INT · +8 VIT · +5 LUK'), 'renders evolution bonus +12 INT · +8 VIT · +5 LUK');
}

// Test 4: Derived Attributes (MATK, Lifesteal, Attack Element)
{
  const p = A.makePlayer('soul_binder', 'DerivedTester');
  G.player = p;
  p.imbue = null;
  A.recompute(p, true);

  let charHtml = A.panelBody('char');
  assert.ok(charHtml.includes('<dt>MATK</dt>'), 'MATK displayed when player has magicAtk');
  assert.equal(charHtml.includes('<dt>Lifesteal</dt>'), false, 'Lifesteal omitted when 0');
  assert.ok(charHtml.includes('<dt>Element</dt>'), 'Element attribute displayed');
  assert.ok(charHtml.includes('Neutral'), 'Default element is Neutral');

  // Now set lifesteal
  p.lifesteal = 5;
  charHtml = A.panelBody('char');
  assert.ok(charHtml.includes('<dt>Lifesteal</dt><dd>5%</dd>'), 'Lifesteal 5% displayed when player has lifesteal');

  // Now imbue with Nature
  p.imbue = { element: 'nature', until: now() + 10000 };
  charHtml = A.panelBody('char');
  assert.ok(charHtml.includes('Nature'), 'Element attribute updates to Nature when imbued');
}

// Test 5: Thai Localization Parity
{
  const p = A.makePlayer('shadow_blade', 'ThaiTester');
  G.player = p;
  p.level = 70;
  p.jobLevel = 70;
  p.tierIndex = 2;
  A.recompute(p, true);
  A.doPromote(p, 3);

  p.imbue = { element: 'nature', until: now() + 10000 };
  p.buffs = [{ stat: 'atk', mult: 1.25, flat: 0, until: now() + 10000, sourceSkillId: 'shadow_strike' }];

  A.setLanguage('th');
  const thaiHtml = A.panelBody('char');

  // Verify Thai labels
  assert.ok(thaiHtml.includes('สถานะและบัฟที่ทำงานอยู่'), 'Thai Active Effects label translated');
  assert.ok(thaiHtml.includes('เคลือบธาตุ'), 'Thai Imbued label translated');
  assert.ok(thaiHtml.includes('ธรรมชาติ'), 'Thai Nature element translated');
  assert.ok(thaiHtml.includes('สายเลือดอาชีพ'), 'Thai Lineage label translated');
  assert.ok(thaiHtml.includes('โบนัสวิวัฒนาการ'), 'Thai Evolution Bonus label translated');
  assert.ok(thaiHtml.includes('มือสังหารสุญญากาศ'), 'Thai Void Assassin role translated');
  assert.ok(thaiHtml.includes('ธาตุโจมตี'), 'Thai Element attribute translated');

  // Reset language
  A.setLanguage('en');
}
