import { SubdungeonSystem } from './subdungeon.js';
import { ExplorationSystem } from './exploration.js';
import { RareSpawnsSystem } from './rare-spawns.js';
import { DailiesSystem } from './dailies.js';
import { MasterySystem } from './mastery.js';

const record = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
const safeKey = k => !['__proto__','constructor','prototype'].includes(k);
const count = v => Number.isSafeInteger(v) && v >= 0 ? v : 0;
const map = (v, fn) => Object.fromEntries(Object.entries(record(v)).filter(([k])=>safeKey(k)).map(([k,x])=>[k,fn(x)]));
const strings = v => Array.isArray(v) ? [...new Set(v.filter(x=>typeof x==='string' && safeKey(x)))].slice(0,10000) : [];
const flags = v => map(v,x=>x===true);
export function normalizeFeatures(raw, catalog = {}) {
  const r=record(raw), loot=record(r.loot), training=record(r.training), woods=record(r.woods), expedition=record(r.expedition);
  const has=(kind,id)=>typeof id==='string' && (!catalog[kind] || catalog[kind].includes(id));
  const goal=record(r.goal);
  const claimedThrough=count(expedition.claimedThrough);
  const pending=record(expedition.pendingReward);
  return {
    version:1, touch:['on','off','auto'].includes(r.touch)?r.touch:'auto',
    loot:{mode:['all','usable','affixes'].includes(loot.mode)?loot.mode:'all',affixes:strings(loot.affixes).filter(x=>has('affixes',x)),quiet:loot.quiet===true},
    goal:['item','recipe'].includes(goal.kind) && has(goal.kind==='item'?'items':'recipes',goal.id)?{kind:goal.kind,id:goal.id}:null,
    loadouts:[0,1].map(i=>{
      const p=record(r.loadouts?.[i]);if(typeof p.name!=='string')return null;
      return {name:[...p.name.trim()].slice(0,24).join(''),equipment:map(p.equipment,x=>count(x)||null),hotbar:Array.from({length:9},(_,n)=>{
        const h=p.hotbar?.[n];return h?.type==='skill'&&has('skills',h.id)?{type:'skill',id:h.id}:h?.type==='item'&&has('items',h.itemId)?{type:'item',itemId:h.itemId}:null;
      })};
    }),
    training:{completed:map(training.completed,strings),claimed:flags(training.claimed)},
    woods:{stage:['available','supplies','defenseReady','defending','recovery','complete'].includes(woods.stage)?(woods.stage==='defending'?'defenseReady':woods.stage):'available',claimed:woods.claimed===true,revealed:woods.revealed===true},
    expedition:{nextRun:Math.max(1,count(expedition.nextRun),claimedThrough+1,count(pending.runId)+1),claimedThrough,
      pendingReward:count(pending.runId)>claimedThrough && pending.variantId==='mana_surge_v1'?{runId:pending.runId,variantId:'mana_surge_v1'}:null},
  };
}

export function normalizeExpansion(raw) {
  const r=record(raw);
  const dungeonState=SubdungeonSystem.createDefaultState();
  dungeonState.clearedDungeons=flags(r.dungeonState?.clearedDungeons);dungeonState.bestTimes=map(r.dungeonState?.bestTimes,count);
  const exploration=ExplorationSystem.createDefaultState();
  exploration.discoveredTiles=map(r.exploration?.discoveredTiles,flags);exploration.unlockedPOIs=map(r.exploration?.unlockedPOIs,strings);
  exploration.loreFragments=strings(r.exploration?.loreFragments);exploration.claimedMilestones=map(r.exploration?.claimedMilestones,flags);
  const rareSpawns=RareSpawnsSystem.createDefaultState();
  rareSpawns.killCounters=map(r.rareSpawns?.killCounters,count);rareSpawns.lastSpawnTimes=map(r.rareSpawns?.lastSpawnTimes,count);
  // Active actors are reconstructed by the runtime from known rare definitions, never deserialized.
  rareSpawns.activeRares=map(r.rareSpawns?.activeRares,x=>({id:typeof x?.id==='string'?x.id:''}));
  const dailies=DailiesSystem.createDefaultState(), d=record(r.dailies);
  dailies.lastRollDate=typeof d.lastRollDate==='string'?d.lastRollDate:null;dailies.claimedDailies=flags(d.claimedDailies);
  dailies.activeDailies=Array.isArray(d.activeDailies)?d.activeDailies.filter(x=>x&&typeof x.id==='string'&&typeof x.target==='string'||x&&typeof x.id==='string'&&typeof x.targetId==='string').slice(0,3).map(x=>({id:x.id,type:x.type,targetId:x.targetId||x.target,required:Math.max(1,count(x.required)),progress:Math.min(count(x.progress),Math.max(1,count(x.required))),completed:count(x.progress)>=Math.max(1,count(x.required))})):[];
  const mastery=MasterySystem.createDefaultState();mastery.zonePoints=map(r.mastery?.zonePoints,count);mastery.claimedRanks=map(r.mastery?.claimedRanks,flags);
  const zoneDifficulty=map(r.zoneDifficulty,x=>['normal','hard','nightmare'].includes(x)?x:'normal');
  return {dungeonState,exploration,rareSpawns,dailies,mastery,zoneDifficulty};
}
