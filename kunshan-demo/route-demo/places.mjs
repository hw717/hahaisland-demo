import {shortest,compatibility,solarContext,blendSolar,evaluateSolar} from './core.mjs';
export const PLACES_RANK_VERSION='nearby-match-and-travel/1.0';
export function rankPlaces(graph,places,{start,end=null,minutes=30,answers,stayMinutes=5,solar:solarOptions=null}){
  const solar=solarContext(solarOptions);
  // Reverse adjacency measures directed travel FROM each candidate TO the end.
  const reverse={...graph,adj:graph.nodes.map(()=>[])};
  graph.adj.forEach((edges,a)=>edges.forEach(([b,i])=>reverse.adj[b].push([a,i])));
  const outward=shortest(graph,start,answers,null,{strength:0}).dist;
  const onward=shortest(reverse,end??start,answers,null,{strength:0}).dist;
  const ranked=[];
  for(const p of places){
    const distance=outward[p.node]+onward[p.node],totalMinutes=distance/75+stayMinutes;
    if(p.node===start||!Number.isFinite(distance)||totalMinutes>Math.max(60,minutes))continue;
    const score=blendSolar(compatibility(p.env,answers),p.solar,solar);
    const light=solar?evaluateSolar(p.solar,solar.sun,solar.mode):undefined;
    ranked.push({...p,score,light,fitsBudget:totalMinutes<=minutes,requiredMinutes:Math.ceil(totalMinutes/5)*5,soloMinutes:totalMinutes,distance,utility:(score??0)-12*totalMinutes/minutes});
  }
  ranked.sort((a,b)=>Number(b.fitsBudget)-Number(a.fitsBudget)||b.utility-a.utility||a.id.localeCompare(b.id));
  const names=new Set();return ranked.filter(p=>{if(names.has(p.name))return false;names.add(p.name);return true;}).slice(0,8);
}
