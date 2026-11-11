export const GROUPS = ['兴趣取向','环境氛围','情感需求','游逛方式'];
export const ENV = ['探新','回游','活力','静谧','激活','修复','规划','漫游'];
export const MATCH_VERSION = 'four-sliders-equal/2.0';
export const ROUTING_VERSION = 'selected-stops-routing/0.4';
// Version 1 is retained solely for displaying an already-started legacy walk.
export function match(env, answers, version=MATCH_VERSION) {
  if(!Array.isArray(answers)||answers.length!==4)throw Error('需要四组偏好');
  return [0,1,2,3].map(i=>{
    const l=env?.[i*2],r=env?.[i*2+1],u=answers[i];
    if (u!==null && (!Number.isFinite(u)||u<0||u>1)) throw Error('偏好输入无效');
    if (![l,r].every(v=>Number.isFinite(v)&&v>=0&&v<=100))return {score:null,answered:u!==null};
    const base=(l+r)/2,blend=u===null?base:(1-u)*l+u*r;
    return {score:u!==null&&version==='four-groups/1.0'&&[0,3].includes(i)?.7*blend+.3*base:blend,answered:u!==null};
  });
}
export function aggregate(groups,priority=null){
  if(priority!==null)return groups[priority]??null;
  return groups.every(Number.isFinite)?groups.reduce((sum,v)=>sum+v,0)/4:null;
}
export function compatibility(env,answers,priority=null,version=MATCH_VERSION){
  return aggregate(match(env,answers,version).map(m=>m.score),priority);
}
// Shared by the road overlay and the chosen route. Scores outside 30–70
// saturate at the legend endpoints; unknown data always stays grey.
export function matchColor(score){
  if(!Number.isFinite(score))return '#a4a9ad';
  const t=Math.max(0,Math.min(1,(score-30)/40));
  const a=t<.5?[49,113,181]:[190,185,174],b=t<.5?[190,185,174]:[234,126,40],f=t<.5?t*2:(t-.5)*2;
  return `rgb(${a.map((v,i)=>Math.round(v+(b[i]-v)*f)).join(',')})`;
}
export function distance(a,b){return Math.hypot((a[0]-b[0])*85300,(a[1]-b[1])*111200);}
// ---- Dynamic sunlight -------------------------------------------------------
// Every location carries a static `solar` = {svf, canopy, lamp, horizon[8]}
// (scripts/build-solar-features.mjs); only the sun position changes with time.
export const SOLAR_VERSION='horizon8-sigmoid/1.0';
export const SOLAR_MODES=['warm','shade'];
// Solar altitude/azimuth (°, azimuth N=0 clockwise) for Beijing local time (UTC+8).
export function computeSunPosition(hour=15,dayOfYear=319,lat=40.002,lng=116.323){
  const rad=Math.PI/180,deg=180/Math.PI;
  const decl=23.45*Math.sin(rad*(360/365)*(284+dayOfYear)); // Cooper
  const B=rad*(360/365)*(dayOfYear-81);
  const eot=9.87*Math.sin(2*B)-7.53*Math.cos(B)-1.5*Math.sin(B); // equation of time, minutes
  const hourAngle=15*(hour+(lng-120)/15+eot/60-12);
  const sinAlt=Math.sin(lat*rad)*Math.sin(decl*rad)+Math.cos(lat*rad)*Math.cos(decl*rad)*Math.cos(hourAngle*rad);
  const altitudeDeg=Math.asin(Math.max(-1,Math.min(1,sinAlt)))*deg;
  const cosAz=(Math.sin(decl*rad)-Math.sin(lat*rad)*sinAlt)/(Math.cos(lat*rad)*Math.max(1e-5,Math.cos(altitudeDeg*rad)));
  let azimuthDeg=Math.acos(Math.max(-1,Math.min(1,cosAz)))*deg;
  if(hourAngle>0)azimuthDeg=360-azimuthDeg;
  const isNight=altitudeDeg<=0,isGoldenHour=!isNight&&altitudeDeg<=20;
  const periodLabel=isNight?'夜间柔光':isGoldenHour?(hour<12?'晨间暖光':'黄金时刻 · 落日暖光'):hour<10?'晨间清朗':hour<14?'正午明媚':'午后暖阳';
  return {hour,dayOfYear,altitudeDeg,azimuthDeg,isNight,isGoldenHour,periodLabel};
}
// light: physical brightness 0–100; healingScore: fit for the chosen mode 0–100;
// litRatio: 0 = in building shadow, 1 = direct sun (sigmoid across the horizon).
export function evaluateSolar(solar,sunPos,mode='warm'){
  if(!solar)return {light:50,healingScore:50,litRatio:.5,obstacleDeg:null,tag:'暂无光照数据'};
  const {svf=.5,canopy=.2,lamp=.2,horizon=[10,10,10,10,10,10,10,10]}=solar;
  if(sunPos.isNight){
    const light=Math.round(15+70*Math.min(1,lamp*1.4+svf*.2));
    return {light,healingScore:light,litRatio:0,obstacleDeg:0,tag:light>=55?'夜间暖灯廊道':'静谧夜色'};
  }
  const sector=((sunPos.azimuthDeg%360)+360)%360/45,i0=Math.floor(sector)%8,i1=(i0+1)%8,f=sector-Math.floor(sector);
  const obstacleDeg=horizon[i0]*(1-f)+horizon[i1]*f;
  const litRatio=1/(1+Math.exp(-.35*(sunPos.altitudeDeg-obstacleDeg)));
  const sinAlt=Math.sin(sunPos.altitudeDeg*Math.PI/180);
  const treeTrans=mode==='shade'?1-.75*canopy:1-.42*canopy;
  const direct=Math.pow(sinAlt,.62)*litRatio*treeTrans,diffuse=.28*Math.pow(sinAlt,.48)*svf;
  const light=Math.max(5,Math.min(100,Math.round(100*(direct+diffuse))));
  let healingScore=light;
  if(mode==='warm'){
    // Relative to an open, unshaded spot at the same moment, so sun-vs-shade contrast
    // stays decisive at low morning/afternoon sun instead of shrinking with sin(α).
    const reference=Math.pow(sinAlt,.62)+.28*Math.pow(sinAlt,.48)*.95,relative=Math.min(1,(direct+diffuse)/reference);
    const golden=sunPos.isGoldenHour&&litRatio>.55?1.18:1,dappled=canopy>.2&&canopy<.65&&litRatio>.5?8:0;
    healingScore=Math.max(5,Math.min(100,Math.round(85*relative*golden+dappled)));
  }else if(mode==='shade')healingScore=Math.max(5,Math.min(100,Math.round(65*canopy+35*(1-litRatio*.7))));
  let tag='充足暖阳';
  if(litRatio<.35)tag='建筑背阴区';
  else if(sunPos.isGoldenHour&&litRatio>=.6)tag='黄金时刻暖光';
  else if(canopy>=.38&&litRatio>=.45)tag='斑驳林荫暖光';
  else if(light<45)tag='柔和漫射光';
  return {light,healingScore,litRatio,obstacleDeg:Math.round(obstacleDeg),tag};
}
// Light scores (0–100) are mapped onto the 30–70 band where static matches lie
// (P5–P95 ≈ 35–68), so the weight is a true share of the combined score.
export function lightToMatch(score){return 30+.4*score;}
// Validates serialisable options {hour, dayOfYear?, weight?, mode?}; null = sunlight off.
export function solarContext(options){
  if(!options)return null;
  const {hour,dayOfYear=319,weight=.4,mode='warm'}=options;
  if(!Number.isFinite(hour)||hour<0||hour>24)throw Error('日照时间无效');
  if(!Number.isInteger(dayOfYear)||dayOfYear<1||dayOfYear>366)throw Error('日照日期无效');
  if(!Number.isFinite(weight)||weight<0||weight>1)throw Error('日照权重应在 0–1 之间');
  if(!SOLAR_MODES.includes(mode))throw Error('日照模式无效');
  return {sun:computeSunPosition(hour,dayOfYear),weight,mode};
}
// Unknown static scores stay unknown; sunlight never fabricates a match.
export function blendSolar(score,solar,ctx){
  if(!ctx||!Number.isFinite(score))return score;
  return (1-ctx.weight)*score+ctx.weight*lightToMatch(evaluateSolar(solar,ctx.sun,ctx.mode).healingScore);
}
// Warm-light colour scale for pure solar heatmaps (0–100): cool shade → warm cream → amber → golden orange.
export function solarColor(score){
  if(!Number.isFinite(score))return '#a4a9ad';
  const t=Math.max(0,Math.min(1,score/100));
  const stops=[[59,105,152],[216,207,196],[245,158,11],[234,88,12]];
  const s=t*(stops.length-1),i=Math.min(stops.length-2,Math.floor(s)),f=s-i;
  return `rgb(${stops[i].map((v,k)=>Math.round(v+(stops[i+1][k]-v)*f)).join(',')})`;
}
export function azimuthLabel(az){
  const dirs=['正北','东北','正东','东南','正南','西南','正西','西北'];
  return `${dirs[Math.round(((az%360)+360)%360/45)%8]} ${Math.round(az)}°`;
}
// Best daytime window (HH:MM–HH:MM) for a point under the selected solar mode.
export function bestSolarWindow(solar,mode='warm',dayOfYear=319){
  if(!solar)return '14:00–16:30';
  let bestStart=14,bestAvg=-1;
  for(let h=8;h<=15.5;h+=.5){
    const s=(evaluateSolar(solar,computeSunPosition(h,dayOfYear),mode).healingScore+
      evaluateSolar(solar,computeSunPosition(h+1,dayOfYear),mode).healingScore+
      evaluateSolar(solar,computeSunPosition(h+1.5,dayOfYear),mode).healingScore)/3;
    if(s>bestAvg){bestAvg=s;bestStart=h;}
  }
  const fmtH=x=>`${String(Math.floor(x)).padStart(2,'0')}:${x%1?30:'00'}`;
  return `${fmtH(bestStart)}–${fmtH(Math.min(17,bestStart+2))}`;
}
// 2.5D extruded shadow silhouette (convex hull of base + shifted roof footprint, closed ring [[lng,lat],...]).
export function projectBuildingShadowRing(ring,heightMeters=15,sunPos){
  if(!Array.isArray(ring)||ring.length<3||!sunPos||sunPos.isNight||sunPos.altitudeDeg<=1)return null;
  const tanAlt=Math.max(.18,Math.tan(sunPos.altitudeDeg*Math.PI/180));
  const shadowLenMeters=Math.min(110,Math.max(2,heightMeters)/tanAlt);
  const shadowAzRad=(sunPos.azimuthDeg+180)*Math.PI/180;
  const dLng=shadowLenMeters*Math.sin(shadowAzRad)/85300,dLat=shadowLenMeters*Math.cos(shadowAzRad)/111200;
  const base=ring[0][0]===ring.at(-1)[0]&&ring[0][1]===ring.at(-1)[1]?ring.slice(0,-1):ring;
  const shifted=base.map(([lng,lat])=>[+(lng+dLng).toFixed(7),+(lat+dLat).toFixed(7)]);
  if(base.length>28)return [...shifted,shifted[0]];
  const pts=[...base.map(([x,y])=>[+x.toFixed(7),+y.toFixed(7)]),...shifted].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const lower=[],upper=[];
  for(const p of pts){while(lower.length>=2&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
  for(let i=pts.length-1;i>=0;i--){const p=pts[i];while(upper.length>=2&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
  const hull=[...lower.slice(0,-1),...upper.slice(0,-1)];
  return hull.length>=3?[...hull,hull[0]]:[...shifted,shifted[0]];
}
export class Heap {
  a=[];
  push(item){let a=this.a,i=a.length;a.push(item);while(i){let p=(i-1)>>1;if(a[p][0]<=item[0])break;a[i]=a[p];i=p;}a[i]=item;}
  pop(){let a=this.a,top=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1][0]<a[c][0])c++;if(a[c][0]>=last[0])break;a[i]=a[c];i=c;}a[i]=last;}return top;}
}
export function buildGraph(data){
  const adj=data.nodes.map(()=>[]);
  data.edges.forEach((e,i)=>{
    if(!Number.isInteger(e.a)||!Number.isInteger(e.b)||!adj[e.a]||!adj[e.b]||!Number.isFinite(e.d)||e.d<=0)throw Error(`路段 ${i} 的端点或长度无效`);
    const oneway=String(e.oneway??'no').toLowerCase();
    if(oneway!=='-1')adj[e.a].push([e.b,i]);
    if(!['yes','1','true'].includes(oneway))adj[e.b].push([e.a,i]);
  });
  return {...data,adj};
}
export function nearestNode(g,xy){let best=-1,d=Infinity;g.nodes.forEach((p,i)=>{let v=distance(p,xy);if(v<d){best=i;d=v;}});return {id:best,distance:d};}
export function shortest(g,start,answers,priority=null,{strength=1.8,penalty=new Set(),maxCost=Infinity,solar=null}={}){
  const dist=new Float64Array(g.nodes.length).fill(Infinity),prev=new Int32Array(g.nodes.length).fill(-1),pe=new Int32Array(g.nodes.length).fill(-1);
  const heap=new Heap();dist[start]=0;heap.push([0,start]);
  const scores=g.edges.map(e=>blendSolar(compatibility(e.s,answers,priority),e.solar,solar));
  while(heap.a.length){const [cost,n]=heap.pop();if(cost!==dist[n])continue;if(cost>maxCost)break;
    for(const [next,ei] of g.adj[n]){const e=g.edges[ei],s=scores[ei];
      const multiplier=strength===0?1:1+strength*(s===null?1.15:1-s/100);
      const v=cost+e.d*multiplier*(penalty.has(ei)?4:1);
      if(v<dist[next]){dist[next]=v;prev[next]=n;pe[next]=ei;heap.push([v,next]);}
    }
  }
  return {dist,prev,pe};
}
export function pathTo(tree,start,end){
  if(!Number.isFinite(tree.dist[end]))return null;
  let nodes=[end],edges=[],n=end;
  while(n!==start){if(tree.prev[n]<0)return null;edges.push(tree.pe[n]);n=tree.prev[n];nodes.push(n);}
  return {nodes:nodes.reverse(),edges:edges.reverse()};
}
export function describe(g,path,answers,priority=null,solar=null){
  let length=0,covered=0,sums=[0,0,0,0],groupLengths=[0,0,0,0];const unique=new Set();let repeated=0;
  let lightSum=0,healSum=0,lit=0;
  for(const i of path.edges){const e=g.edges[i];length+=e.d;if(unique.has(i))repeated+=e.d;unique.add(i);
    const scores=match(e.s,answers).map(m=>m.score);
    // Incomplete dimensions remain unknown; null must not turn into a zero score.
    if(scores.every(Number.isFinite))covered+=e.d;
    scores.forEach((score,j)=>{if(Number.isFinite(score)){sums[j]+=score*e.d;groupLengths[j]+=e.d;}});
    if(solar){const l=evaluateSolar(e.solar,solar.sun,solar.mode);lightSum+=l.light*e.d;healSum+=l.healingScore*e.d;if(l.litRatio>=.5)lit+=e.d;}
  }
  const groups=sums.map((v,j)=>groupLengths[j]?v/groupLengths[j]:null);
  const result={...path,length,minutes:length/75,coverage:length?covered/length:0,groups,score:aggregate(groups,priority),repeat:length?repeated/length:0};
  if(solar&&length){
    result.staticScore=result.score;result.avgLightScore=lightSum/length;result.avgHealingLight=healSum/length;result.sunlitRatio=lit/length;
    if(Number.isFinite(result.score))result.score=(1-solar.weight)*result.score+solar.weight*lightToMatch(result.avgHealingLight);
  }
  return result;
}
export function overlap(g,a,b){const set=new Set(a.edges);return b.edges.reduce((s,i)=>s+(set.has(i)?g.edges[i].d:0),0)/Math.max(1,b.length);}
export function recommend(g,{start,end=null,minutes=30,answers=[0,.8,.9,1],priority=null,waypoints=[],stayMinutes=0,solar:solarOptions=null}){
  if(!Number.isFinite(minutes)||minutes<5||minutes>120)throw Error('散步时长应在 5–120 分钟之间');
  if(!Number.isInteger(start)||start<0||start>=g.nodes.length)throw Error('起点无效');
  if(end!==null&&(!Number.isInteger(end)||end<0||end>=g.nodes.length))throw Error('目的地无效');
  if(priority!==null&&(!Number.isInteger(priority)||priority<0||priority>3))throw Error('推荐重点无效');
  if(!Array.isArray(answers)||answers.length!==4)throw Error('需要四组偏好');
  match(null,answers);
  if(!Array.isArray(waypoints)||waypoints.length>2||waypoints.some(n=>!Number.isInteger(n)||n<0||n>=g.nodes.length))throw Error('最多选择两个有效途经点');
  if(!Number.isFinite(stayMinutes)||stayMinutes<0||stayMinutes>30)throw Error('每处停留时间应在 0–30 分钟之间');
  const solar=solarContext(solarOptions);
  const candidates=[];const budget=minutes*75;
  if(waypoints.length){
    // Preserve the user's explicit visiting order. A distance baseline ensures
    // environment detours cannot hide an otherwise feasible itinerary.
    const stops=[start,...waypoints,end??start],stayTotal=stayMinutes*waypoints.length;
    for(const strength of [0,1.8,6]){
      let path={nodes:[start],edges:[]},valid=true;const used=new Set();
      for(let i=1;i<stops.length;i++){
        const leg=pathTo(shortest(g,stops[i-1],answers,priority,{strength,penalty:strength?used:new Set(),solar}),stops[i-1],stops[i]);
        if(!leg){valid=false;break;}
        path.nodes.push(...leg.nodes.slice(1));path.edges.push(...leg.edges);leg.edges.forEach(e=>used.add(e));
      }
      if(valid&&path.edges.length){
        const r=describe(g,path,answers,priority,solar);r.walkingMinutes=r.minutes;r.stayMinutes=stayTotal;r.minutes+=stayTotal;
        r.waypoints=[...waypoints];r.baseline=strength===0;
        if(r.minutes<=minutes)candidates.push(r);
      }
    }
  }else if(end!==null){
    for(const strength of [0,1.8,6]){
      const p=pathTo(shortest(g,start,answers,priority,{strength,solar}),start,end);
      if(p?.edges.length){const r=describe(g,p,answers,priority,solar);r.baseline=strength===0;if(r.length<=budget)candidates.push(r);}
    }
    if(candidates.length){const best=candidates.at(-1);const p=pathTo(shortest(g,start,answers,priority,{strength:3,penalty:new Set(best.edges),solar}),start,end);if(p?.edges.length){const r=describe(g,p,answers,priority,solar);if(r.length<=budget)candidates.push(r);}}
  }else{
    const tree=shortest(g,start,answers,priority,{solar});const buckets=Array.from({length:12},()=>[]);const origin=g.nodes[start];
    for(let n=0;n<g.nodes.length;n++){
      const direct=distance(origin,g.nodes[n]);if(direct<budget*.13||direct>budget*.4||!Number.isFinite(tree.dist[n]))continue;
      const angle=(Math.atan2(g.nodes[n][1]-origin[1],(g.nodes[n][0]-origin[0])*.767)+Math.PI)/(2*Math.PI);
      const k=Math.min(11,Math.floor(angle*12));buckets[k].push(n);
    }
    const targets=buckets.flatMap(bucket=>bucket.sort((a,b)=>Math.abs(distance(origin,g.nodes[a])-budget*.28)-Math.abs(distance(origin,g.nodes[b])-budget*.28)).slice(0,2));
    for(const endNode of targets){
      const out=pathTo(tree,start,endNode);if(!out)continue;
      const back=pathTo(shortest(g,endNode,answers,priority,{penalty:new Set(out.edges),maxCost:budget*12,solar}),endNode,start);if(!back)continue;
      const r=describe(g,{nodes:[...out.nodes,...back.nodes.slice(1)],edges:[...out.edges,...back.edges]},answers,priority,solar);
      if(r.length<=budget&&r.length>=budget*.65&&r.repeat<=.35)candidates.push(r);
    }
  }
  candidates.forEach(r=>r.utility=(r.score??0)-Math.abs(minutes-r.minutes)/minutes*(end!==null||waypoints.length?0:22)-r.repeat*25-(1-r.coverage)*15);
  candidates.sort((a,b)=>b.utility-a.utility);
  const routes=[];for(const r of candidates){if(routes.every(x=>overlap(g,x,r)<.88)){routes.push(r);if(routes.length===3)break;}}
  return routes.map((r,i)=>({...r,id:`route-${i+1}`}));
}
