// Step 2 · 点位与路段静态光学底座 solar = {svf, canopy, lamp, horizon[8]}
// Input : data/海淀街景/海淀区街景语义分割.dbf  (panorama semantic-segmentation ratios)
//         route-demo/data/buildings.json        (Step 1, footprints with h)
//         route-demo/data/map.json              (park polygons → canopy bonus)
// Output: writes `solar` in place into route-demo/data/points.json, places.json and
//         graph.json (edges). Re-running overwrites the previous `solar` values.
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dataDir=path.join(root,'route-demo','data');
const sviFile=path.resolve(root,'..','data','海淀街景','海淀区街景语义分割.dbf');
const load=async f=>JSON.parse(await readFile(path.join(dataDir,f),'utf8'));
const tsinghuaFile=path.join(root,'dist','maps','tsinghua-points.json');
const [buildingsDoc,mapDoc,points,placesDoc,graph,tsinghuaDoc]=await Promise.all([
  ...['buildings.json','map.json','points.json','places.json','graph.json'].map(load),
  readFile(tsinghuaFile,'utf8').then(JSON.parse)
]);
const [S,W,N,E]=buildingsDoc.bbox; // study area + 150 m buffer

// Local metric plane, same constants as core.mjs distance().
const O=[116.32,40.0],KX=85300,KY=111200;
const toM=([lng,lat])=>[(lng-O[0])*KX,(lat-O[1])*KY];
const EYE=1.5,RADIUS=150,SVI_RADIUS=100;

// ---------- 1. Street-view segmentation (DBF reader, no dependencies) ----------
const dbf=await readFile(sviFile);
const nRec=dbf.readUInt32LE(4),hLen=dbf.readUInt16LE(8),rLen=dbf.readUInt16LE(10);
const fields={};
for(let o=32,off=1;dbf[o]!==0x0d;o+=32){const name=dbf.toString('latin1',o,o+11).replace(/\0.*$/,''),len=dbf[o+16];fields[name]=[off,len];off+=len;}
const val=(r,name)=>{const [o,l]=fields[name];return parseFloat(dbf.toString('latin1',hLen+r*rLen+o,hLen+r*rLen+o+l));};
const svi=[];
for(let r=0;r<nRec;r++){
  if(dbf[hLen+r*rLen]===0x2a)continue; // deleted record
  const lng=val(r,'lon'),lat=val(r,'lat');
  if(!(lng>=W&&lng<=E&&lat>=S&&lat<=N))continue;
  // Exclude the capture vehicle so ratios describe the scene, not the camera car.
  const scene=Math.max(.3,1-(val(r,'ego vehicl')||0)-(val(r,'car mount')||0));
  svi.push({xy:toM([lng,lat]),sky:val(r,'sky')/scene,veg:val(r,'vegetation')/scene,lamp:val(r,'street lig')/scene,bldg:val(r,'building')/scene});
}
const quant=(arr,p)=>{const s=[...arr].sort((a,b)=>a-b);return s[Math.floor(p*(s.length-1))];};
// Linear map raw P5→lo, P95→hi (extrapolated, then clipped by caller).
const scaler=(key,lo,hi)=>{const a=quant(svi.map(s=>s[key]),.05),b=quant(svi.map(s=>s[key]),.95);return v=>lo+(v-a)/Math.max(1e-9,b-a)*(hi-lo);};
const qSky=scaler('sky',.10,.90),qVeg=scaler('veg',.05,.80),qLamp=scaler('lamp',0,1),qBldg=scaler('bldg',0,1);
const clip=(v,a,b)=>Math.max(a,Math.min(b,v));

// ---------- 2. Spatial grids ----------
function grid(items,cell,xyOf){const g=new Map();for(const it of items){const [x,y]=xyOf(it),k=`${Math.floor(x/cell)},${Math.floor(y/cell)}`;if(!g.has(k))g.set(k,[]);g.get(k).push(it);}return g;}
function near(g,cell,[x,y],r,cb){const r0=Math.floor((x-r)/cell),r1=Math.floor((x+r)/cell),c0=Math.floor((y-r)/cell),c1=Math.floor((y+r)/cell);
  for(let i=r0;i<=r1;i++)for(let j=c0;j<=c1;j++){const list=g.get(`${i},${j}`);if(list)for(const it of list)cb(it);}}
const sviGrid=grid(svi,50,s=>s.xy);

// Building walls sampled every ≤3 m so large footprints span several directions.
const blds=buildingsDoc.buildings.map((b,i)=>({i,h:b.h,ring:b.ring.map(toM)}));
const walls=[];
for(const b of blds){if(b.h<=EYE)continue;
  for(let k=0;k<b.ring.length-1;k++){const [x1,y1]=b.ring[k],[x2,y2]=b.ring[k+1],n=Math.max(1,Math.ceil(Math.hypot(x2-x1,y2-y1)/3));
    for(let t=0;t<n;t++)walls.push({x:x1+(x2-x1)*t/n,y:y1+(y2-y1)*t/n,h:b.h,b:b.i});}}
const wallGrid=grid(walls,50,w=>[w.x,w.y]);
const bldGrid=grid(blds,100,b=>b.ring[0]);
const inside=([x,y],ring)=>{let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [xi,yi]=ring[i],[xj,yj]=ring[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c;}return c;};
const parks=mapDoc.parks.filter(f=>!f.properties.water&&f.geometry.type==='Polygon').map(f=>f.geometry.coordinates[0].map(toM));
const inPark=p=>parks.some(r=>inside(p,r));
// Fallback for locations with no street view ≤100 m (mostly unsurveyed park paths,
// e.g. 圆明园): use the median scene of surveyed samples of the same class.
const median=a=>quant(a,.5);
const sviClass=[false,true].map(park=>{const ss=svi.filter(s=>inPark(s.xy)===park);
  return {sky:median(ss.map(s=>s.sky)),veg:median(ss.map(s=>s.veg)),lamp:median(ss.map(s=>s.lamp)),bldg:median(ss.map(s=>s.bldg)),n:ss.length};});

// ---------- 3. Per-location features ----------
// horizon[k]: obstruction elevation (°) toward azimuth 45k (N=0, clockwise). Each
// sector is the mean of nine 5° sub-bin maxima over [45k−22.5°, 45k+22.5°), so a
// single slender tower no longer blocks a whole 45° wedge.
function horizonAt(p){
  const hosts=new Set();near(bldGrid,100,p,200,b=>{if(inside(p,b.ring))hosts.add(b.i);});
  const bins=new Float64Array(72);
  near(wallGrid,50,p,RADIUS,w=>{
    if(hosts.has(w.b))return;
    const dx=w.x-p[0],dy=w.y-p[1],d=Math.hypot(dx,dy);if(d>RADIUS)return;
    const el=Math.atan((w.h-EYE)/Math.max(3,d))*180/Math.PI;
    const az=(Math.atan2(dx,dy)*180/Math.PI+360)%360,bin=Math.floor(((az+22.5)%360)/5);
    if(el>bins[bin])bins[bin]=el;
  });
  return Array.from({length:8},(_,k)=>{let s=0;for(let j=0;j<9;j++)s+=bins[k*9+j];return s/9;});
}
function sviAt(p){
  let w=0,sky=0,veg=0,lamp=0,bldg=0;
  near(sviGrid,50,p,SVI_RADIUS,s=>{const d=Math.hypot(s.xy[0]-p[0],s.xy[1]-p[1]);if(d>SVI_RADIUS)return;const k=1/Math.max(5,d);w+=k;sky+=k*s.sky;veg+=k*s.veg;lamp+=k*s.lamp;bldg+=k*s.bldg;});
  return w?{sky:sky/w,veg:veg/w,lamp:lamp/w,bldg:bldg/w}:null;
}
const stats={total:0,withSvi:0};
function rawFeatures(p){
  const horizon=horizonAt(p),park=inPark(p),found=sviAt(p),s=found??sviClass[+park];
  stats.total++;if(found)stats.withSvi++;
  const meanH=horizon.reduce((a,b)=>a+b,0)/8;
  // Fallback sky is additionally capped by what the surrounding buildings leave open.
  const svf=clip(found?qSky(s.sky):Math.min(qSky(s.sky),Math.cos(meanH*Math.PI/180)**2),.05,.95);
  const canopy=clip(clip(qVeg(s.veg),0,.9)+(park?.15:0),0,.9);
  const lamp=clip(.7*clip(qLamp(s.lamp),0,1)+.3*clip(qBldg(s.bldg),0,1),0,1);
  return {svf,canopy,lamp,horizon};
}
const pack=f=>({svf:+f.svf.toFixed(2),canopy:+f.canopy.toFixed(2),lamp:+f.lamp.toFixed(2),horizon:f.horizon.map(v=>Math.round(v))});
const at=xy=>pack(rawFeatures(toM(xy)));
// Long edges: average of three samples (1/6, 1/2, 5/6) instead of the midpoint alone.
function alongEdge(a,b,d){
  const ts=d<60?[.5]:[1/6,.5,5/6],fs=ts.map(t=>rawFeatures(toM([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])));
  const avg=k=>fs.reduce((s,f)=>s+f[k],0)/fs.length;
  return pack({svf:avg('svf'),canopy:avg('canopy'),lamp:avg('lamp'),horizon:Array.from({length:8},(_,j)=>fs.reduce((s,f)=>s+f.horizon[j],0)/fs.length)});
}

const t0=Date.now();
for(const p of points)p.solar=at(p.xy);
for(const p of placesDoc.places)p.solar=at(p.xy);
for(const e of graph.edges)e.solar=alongEdge(graph.nodes[e.a],graph.nodes[e.b],e.d);
for(const ds of Object.values(tsinghuaDoc.datasets??{}))for(const p of ds.points??[])p.solar=at([p.lng,p.lat]);
await writeFile(path.join(dataDir,'points.json'),JSON.stringify(points));
await writeFile(path.join(dataDir,'places.json'),JSON.stringify(placesDoc));
await writeFile(path.join(dataDir,'graph.json'),JSON.stringify(graph));
await writeFile(tsinghuaFile,JSON.stringify(tsinghuaDoc,null,2));

// ---------- 4. Verification report ----------
console.log(`SVI samples in area: ${svi.length}; buildings: ${blds.length}; wall samples: ${walls.length}; ${((Date.now()-t0)/1000).toFixed(1)} s`);
console.log(`locations ${stats.total}, with street view ≤100 m: ${(100*stats.withSvi/stats.total).toFixed(1)}% (fallback medians from ${sviClass[0].n} street / ${sviClass[1].n} park samples)`);
const dist=(arr,k)=>{const v=arr.map(x=>x.solar[k]);return `P10 ${quant(v,.1)} · P50 ${quant(v,.5)} · P90 ${quant(v,.9)}`;};
for(const k of ['svf','canopy','lamp'])console.log(`edges ${k}: ${dist(graph.edges,k)}`);
const sH=graph.edges.map(e=>e.solar.horizon[4]);console.log(`edges south-horizon (°): P10 ${quant(sH,.1)} · P50 ${quant(sH,.5)} · P90 ${quant(sH,.9)} · max ${Math.max(...sH)}`);
for(const pl of placesDoc.places.slice(0,5))console.log(`  ${pl.name}: ${JSON.stringify(pl.solar)}`);
