// Step 1 · 建筑高度三层赋高
// Input : Database/osm-buildings-study.json  (scripts/fetch-osm-buildings.mjs)
//         dist/maps/city-buildings.geojson    (names for any footprint OSM lacks)
// Output: route-demo/data/buildings.json      (study area + 150 m buffer, with h / levels / src)
// Priority: ① OSM height / building:levels → ② named-building rules → ③ footprint-area fallback.
import {readFile,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const raw=JSON.parse(await readFile(path.join(root,'Database','osm-buildings-study.json'),'utf8'));
const backupCity=path.join(root,'_backups','route-data-pre-solar','city-buildings.geojson');
const cityPath=await stat(backupCity).then(()=>backupCity,()=>path.join(root,'dist','maps','city-buildings.geojson'));
const city=JSON.parse(await readFile(cityPath,'utf8'));
const [S,W,N,E]=raw.bbox;

// ② Named-building rules (first match wins). [pattern, levels, height m]
// Covers both the northern half (Tsinghua / PKU / Wudaokou) and the southern half
// (Zhongguancun / Zhichunlu / Renmin University / Beijing Institute of Technology).
const RULES=[
  [/科技大厦[ABC]座/,26,88],
  [/中关村科贸电子城|科贸电子城/,22,80],
  [/辽宁大厦|中航科技大厦/,22,78],
  [/数码大厦|银谷大厦/,22,75],
  [/^鼎好|中国化工集团大厦/,20,72],
  [/紫光大厦|理想国际大厦|融科资讯中心|银科大厦/,20,68],
  [/海龙大厦|搜狐媒体大厦|神州数码大厦|银网中心/,18,65],
  [/搜狐网络大厦|中关村e世界/,17,58],
  [/中心教学楼/,15,56],
  [/威盛|新中关购物中心|左岸工社|领航科技大厦|京东科技大厦|长远天地|中关村公馆|远中悦莱|辉煌时代大厦|恒润国际大厦|时代网络大厦|未来科技大厦|新东方大厦|新东方南楼|知识产权大厦|创富大厦|文化大厦|维亚大厦|海兴大厦|海淀文化艺术大厦|海淀新技术大厦|世纪科贸大厦|科海福林大厦|紫金大厦|紫金数码园|寰太大厦|大华时尚科技大厦|恒兴大厦|美华·海润大厦|育新大厦|绿创大厦|银丰大厦|鸿诚拓展大厦|1\+1大厦|自动化大厦|航天恆星大廈|兴发大厦|大钟寺广场|方恒广场|燕山大酒店|骏马大酒店/,16,55],
  [/东升大厦|华业大厦|知行\d*楼|知行[A-Z]楼/,15,50],
  [/创新大厦|创业大厦|方正大厦|过程大厦/,15,52],
  [/科建大厦|同方大厦|^高\d+号楼$|太阳园|紫金庄园|韦伯豪/,14,48],
  [/立德楼/,12,46],
  [/荷清大厦|蒙民伟科技大楼|紫荆学生公寓1[4-7]号楼|硕博小区|研究生公寓/,14,45],
  [/^中央主楼$|罗姆楼|电子工程馆/,10,42],
  [/伟清楼|理科二号楼|明德/,10,38],
  [/人环楼|生物医学馆|理科一号楼/,9,36],
  [/刘卿楼|品园\d*楼/,10,35],
  [/崇德楼/,9,34],
  [/郑裕彤医学楼/,8,32],
  [/李兆基|环境节能楼|理科五号楼/,7,28],
  [/光华管理学院|中国人民大学图书馆|藏书馆|购物中心|商场|商城|百货|电子城/,6,26],
  [/美院|美术学院大楼|凯风楼|百周年纪念讲堂|综合体育馆|新清华学堂|^[1-9]#教学楼$|七号教学楼|逸夫教学楼|^主楼$|贵宾楼|敬宾楼|迎宾楼|怡宾楼|瑞宾楼|悅宾楼/,6,24],
  [/舜德楼|何添楼|逸夫馆|建华楼|第六教学楼/,5,22],
  [/紫荆学生公寓\d+号楼/,7,21],
  [/蓝旗营\d*号楼|华清嘉园|东王庄\d*号楼|五道口嘉园|红杉国际公寓|High Rise/i,18,60],
  [/FIT|Future Internet|文科图书馆|明理楼|蒙民伟人文楼|蒙民伟音乐厅|公共教学|求是楼|教学四楼|科研南楼|数学学院|新闻与传播学院|艺术学院|资源楼/,5,20],
  [/^[东西]主楼$|9003大楼|第[四五]教学楼|^大礼堂$|陈明游泳馆|世纪馆|逸夫会堂|北京理工大学体育馆|海淀游泳馆|^游泳馆$/,4,18],
  [/^老馆$|第三教学楼|西体育馆|观畴园/,4,16],
  [/紫荆园餐厅/,3,15],
  [/^第一教学楼$/,3,14],
  [/^(善斋|明斋|新斋|静斋)$/,3,13],
  [/桃李园餐厅|听涛园|清芬园|丁香园|芝兰园|玉树园|熙春园/,3,12],
  [/大厦|写字楼|国际中心|商务中心/,14,48],
  [/公寓|宿舍|号楼|幢$|住宅$|^林园\d+楼$|^红\d+楼$|^东风\d+楼$|^留学生\d+楼$|专家楼|^(东|中|西|南|西南|西北|东南)\d+楼?$|^[一二三四五六七八九十]+号楼$|勺园/,6,19],
  [/亭|榭|轩|牌坊|门$|传达室|配电|锅炉|故居|甲所|丙所|^[一二三四五六]院$|平房|殿$|阁$/,1,6],
];
const RESIDENTIAL=new Set(['apartments','residential','dormitory','house','detached','terrace']);
const num=v=>{const x=parseFloat(String(v??'').replace(',','.'));return Number.isFinite(x)&&x>0?x:null;};
const areaM2=ring=>{let a=0;for(let i=0;i<ring.length-1;i++){const [x1,y1]=ring[i],[x2,y2]=ring[i+1];a+=(x1*85300)*(y2*111200)-(x2*85300)*(y1*111200);}return Math.abs(a)/2;};

function assign(tags,name,ring){
  const h=num(tags.height),lv=num(tags['building:levels']);
  if(h&&h<300)return {h:+h.toFixed(1),levels:lv??Math.max(1,Math.round(h/3.3)),src:'osm-height'};
  if(lv&&lv<80){const per=RESIDENTIAL.has(tags.building)?3.0:3.5;return {h:+(lv*per).toFixed(1),levels:lv,src:'osm-levels'};}
  if(name)for(const [re,levels,height] of RULES)if(re.test(name))return {h:height,levels,src:'name-rule'};
  const A=areaM2(ring);
  if(A<120)return {h:4.5,levels:1,src:'area'};
  if(A<350)return {h:9,levels:3,src:'area'};
  if(A<1200)return {h:16,levels:5,src:'area'};
  return {h:21,levels:6,src:'area'};
}
const closed=r=>r.length>=4&&r[0][0]===r.at(-1)[0]&&r[0][1]===r.at(-1)[1];
// Joins unclosed outer member ways of a multipolygon relation into closed rings.
function stitch(parts){
  const rings=[],open=parts.map(p=>[...p]);
  while(open.length){
    let ring=open.shift(),grown=true;
    while(!closed(ring)&&grown){grown=false;
      for(let i=0;i<open.length;i++){const p=open[i],end=ring.at(-1);
        const same=(a,b)=>a[0]===b[0]&&a[1]===b[1];
        if(same(end,p[0])){ring=ring.concat(p.slice(1));}
        else if(same(end,p.at(-1))){ring=ring.concat([...p].reverse().slice(1));}
        else continue;
        open.splice(i,1);grown=true;break;}
    }
    if(closed(ring))rings.push(ring);
  }
  return rings;
}

const cityName=new Map(city.features.map(f=>[f.id,f.properties.name]));
const out=[],seen=new Set(),extraCity=[];let droppedRel=0,skippedTower=0;
for(const el of raw.elements){
  const tags=el.tags??{},id=`${el.type}/${el.id}`;
  // Lattice masts / towers are tagged building but cast no solid shadow.
  if(['tower','mast'].includes(tags.man_made)){seen.add(id);skippedTower++;continue;}
  let rings=[];
  if(el.type==='way'&&el.geometry)rings=[el.geometry.map(p=>[p.lon,p.lat])];
  if(el.type==='relation'){
    const outer=(el.members??[]).filter(m=>m.role==='outer'&&m.geometry).map(m=>m.geometry.map(p=>[p.lon,p.lat]));
    rings=stitch(outer);if(!rings.length){droppedRel++;continue;}
  }
  rings=rings.filter(closed);if(!rings.length)continue;
  const nm=tags.name??(cityName.has(id)&&!/^(way|relation)\//.test(cityName.get(id))?cityName.get(id):null);
  rings.forEach((ring,k)=>{
    const a=assign(tags,nm,ring);
    out.push({id:rings.length>1?`${id}#${k}`:id,name:nm,...a,type:tags.building??'yes',ring:ring.map(([x,y])=>[+x.toFixed(6),+y.toFixed(6)])});
  });
  seen.add(id);
}
// Footprints present in city-buildings but missing from the Overpass snapshot.
let fromCity=0;
for(const f of city.features){
  if(seen.has(f.id)||seen.has(`${f.id}#0`))continue;
  const ring=f.geometry.coordinates[0];
  const nm=/^(way|relation)\//.test(f.properties.name)?null:f.properties.name;
  const item={id:f.id,name:nm,...assign({},nm,ring),type:'yes',ring:ring.map(([x,y])=>[+x.toFixed(6),+y.toFixed(6)])};
  if(ring.some(([x,y])=>x>=W&&x<=E&&y>=S&&y<=N)){out.push(item);fromCity++;}
  else extraCity.push(item);
}
const file=path.join(root,'route-demo','data','buildings.json');
await writeFile(file,JSON.stringify({version:'three-tier-heights/1.0',bbox:raw.bbox,osmFetchedAt:raw.fetchedAt,
  sourceLicense:'OpenStreetMap contributors, ODbL 1.0',heightNote:'h = metres above ground; src ∈ osm-height | osm-levels | name-rule | area',buildings:out}));
const geojsonFile=path.join(root,'dist','maps','city-buildings.geojson');
const allFeatures=[...out,...extraCity].map(b=>({
  type:'Feature',id:b.id,
  properties:{name:b.name??b.id,h:b.h,levels:b.levels,src:b.src},
  geometry:{type:'Polygon',coordinates:[b.ring]}
}));
await writeFile(geojsonFile,JSON.stringify({
  type:'FeatureCollection',
  name:'Haidian full-study-area building base (Tsinghua, PKU, Wudaokou, Zhongguancun, RUC)',
  bbox:raw.bbox,
  attribution:'© OpenStreetMap contributors; ODbL 1.0; merged with campus building base',
  note:'WGS84 footprints with three-tier height calibration (osm-height, osm-levels, name-rule, area) for 2.5D solar shadows.',
  features:allFeatures
}));

// Verification report
const bySrc={};out.forEach(b=>bySrc[b.src]=(bySrc[b.src]??0)+1);
const southCount=out.filter(b=>b.ring[0][1]<39.987).length;
console.log(`${out.length} footprints (north: ${out.length-southCount}, south: ${southCount}; ${fromCity} from city-buildings only, ${droppedRel} unclosed relations, ${skippedTower} towers skipped) → ${path.relative(root,file)}`);
console.log('by source',bySrc);
const hs=out.map(b=>b.h).sort((a,b)=>a-b),q=p=>hs[Math.floor(p*(hs.length-1))];
console.log(`h quantiles P10 ${q(.1)} · P50 ${q(.5)} · P90 ${q(.9)} · max ${hs.at(-1)}`);
for(const n of ['中央主楼','紫荆学生公寓14号楼','科技大厦A座','大礼堂','紫光大厦','理科一号楼','中关村科贸电子城','海龙大厦','数码大厦','理想国际大厦','明德主楼','中国人民大学图书馆','立德楼','中心教学楼'])
  {const b=out.find(x=>x.name===n);console.log(`  ${n}: ${b?`${b.h} m / ${b.levels}F (${b.src})`:'not found'}`);}
const tallest=[...out].sort((a,b)=>b.h-a.h).slice(0,12).map(b=>`${b.name??b.id} ${b.h}m(${b.src})`);
console.log('tallest:',tallest.join('；'));
