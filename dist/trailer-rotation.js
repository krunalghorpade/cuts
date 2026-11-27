// Only successful playback counts as a visit to a title. A temporarily broken
// source can rejoin the current cycle after its cooldown.
export function roomRotation(room,entries){
  const key='myroom.trailers.v2.'+room,ids=new Set(entries.map(entry=>entry.id));
  let state={};
  try{state=JSON.parse(localStorage.getItem(key))||{};}catch{}
  const seen=new Set((Array.isArray(state.seen)?state.seen:[]).filter(id=>ids.has(id)));
  const retry=new Map(Object.entries(state.retry||{}).filter(([id,time])=>ids.has(id)&&Number(time)>Date.now()));
  const lastSource=new Map(Object.entries(state.lastSource||{}).filter(([id])=>ids.has(id)));
  let last=state.last;
  function save(){
    try{localStorage.setItem(key,JSON.stringify({seen:[...seen],retry:Object.fromEntries(retry),lastSource:Object.fromEntries(lastSource),last}));}catch{}
  }
  return {
    choose(){
      const now=Date.now(),ready=entries.filter(e=>!(retry.get(e.id)>now));
      let pool=ready.filter(e=>!seen.has(e.id));
      if(!pool.length)pool=ready;
      if(pool.length>1)pool=pool.filter(e=>e.id!==last);
      return pool[Math.floor(Math.random()*pool.length)]||null;
    },
    sourcesFor(entry){
      const shuffled=entry.sources.slice();
      for(let i=shuffled.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1));
        [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];
      }
      // Prefer direct playback, rotating away from the last clip for this title.
      const previous=entry.sources[lastSource.get(entry.id)];
      const score=s=>(s.type==='youtube'?2:0)+(s===previous?1:0);
      return shuffled.sort((a,b)=>score(a)-score(b));
    },
    played(id,siblings=[],sourceIndex){
      if(seen.has(id))seen.clear();
      for(const key of [id,...siblings]){
        seen.add(key);retry.delete(key);
        if(sourceIndex!==undefined)lastSource.set(key,sourceIndex);
      }
      last=id;save();
    },
    unavailable(id){
      retry.set(id,Date.now()+8*60*1000);save();
    }
  };
}
