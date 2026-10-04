export function matchesLoot(entry,definition,preferences,classId) {
  if(!entry.uid||!definition)return true;
  if(preferences.mode==='usable')return !definition.classReq||definition.classReq.includes(classId);
  if(preferences.mode==='affixes'&&preferences.affixes.length)return (entry.affixes||[]).some(a=>preferences.affixes.includes(a.stat));
  return true;
}
