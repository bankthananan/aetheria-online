// Simulation time freezes across overlapping UI/background pause reasons.
export function createGameClock(read=()=>performance.now()) {
  const reasons=new Set();let pausedAt=null,pausedTotal=0;
  return {
    now:()=> (pausedAt ?? read())-pausedTotal,
    isPaused:()=>reasons.size>0,
    pause(reason) { if(!reasons.size)pausedAt=read();reasons.add(reason); },
    resume(reason) {
      if(!reasons.delete(reason))return;
      if(!reasons.size&&pausedAt!==null){pausedTotal+=read()-pausedAt;pausedAt=null;}
    },
    reset(){reasons.clear();pausedAt=null;pausedTotal=0;},
  };
}
