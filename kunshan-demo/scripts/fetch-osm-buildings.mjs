// Fetches every OSM building footprint (with height / building:levels tags)
// inside the study area plus a 150 m obstruction buffer. Run once with network;
// the raw Overpass response is cached so later steps work offline.
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// Study area = route-demo graph / points extent (116.2889–116.3340E, 39.9585–40.0167N)
// expanded by 150 m (Δlat 0.00135°, Δlng 0.00176° at 40°N).
const [S,W,N,E]=[39.9571,116.2871,40.0181,116.3358];
const query=`[out:json][timeout:180];
(way["building"](${S},${W},${N},${E});relation["building"](${S},${W},${N},${E}););
out body geom;`; // "body" keeps relation members (multipolygon outer rings)
const endpoints=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
let data=null;
for(const url of endpoints){
  try{
    const res=await fetch(url,{method:'POST',body:new URLSearchParams({data:query}),headers:{'User-Agent':'hahaisland-solar/0.1'}});
    if(!res.ok)throw Error(`HTTP ${res.status}`);
    data=await res.json();console.log(`Fetched from ${url}`);break;
  }catch(e){console.warn(`${url} failed: ${e.message}`);}
}
if(!data)throw Error('All Overpass endpoints failed');
const out=path.join(root,'Database','osm-buildings-study.json');
await mkdir(path.dirname(out),{recursive:true});
await writeFile(out,JSON.stringify({bbox:[S,W,N,E],fetchedAt:new Date().toISOString(),osm3s:data.osm3s,elements:data.elements}));
const tagged=data.elements.filter(e=>e.tags?.height||e.tags?.['building:levels']).length;
console.log(`${data.elements.length} elements (${tagged} with height/levels) → ${path.relative(root,out)}`);
