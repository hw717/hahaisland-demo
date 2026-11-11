// The planner also works on its own. In HahaIsland only the same-origin parent
// may open it; a nickname is presentation data, never an inferred preference.
export function routeSummary(route){
  return {id:route.id,length:route.length,minutes:route.minutes,groups:[...route.groups],coverage:route.coverage};
}

export function connectIslandBridge(win,{onOpen=()=>{}}={}){
  const embedded=win.parent!==win;
  const origin=win.location.origin;
  const allowed=embedded&&origin!=='null';
  function emit(type,payload={}){
    if(allowed)win.parent.postMessage({type,...payload},origin);
  }
  function receive(event){
    if(!allowed||event.source!==win.parent||event.origin!==origin)return;
    if(event.data?.type!=='hahaisland:route-open')return;
    const nickname=typeof event.data.nickname==='string'?event.data.nickname.trim().slice(0,20):'';
    onOpen({nickname});
  }
  win.addEventListener('message',receive);
  return {embedded,emit,destroy:()=>win.removeEventListener('message',receive)};
}
