import {nearestNode, MATCH_VERSION, matchColor, computeSunPosition, evaluateSolar, solarContext, blendSolar, compatibility, solarColor, azimuthLabel, bestSolarWindow, projectBuildingShadowRing} from './route/core.mjs';
import {preparePhoto,savePhoto,readPhoto} from './route/experience.mjs';
import {newLocalId} from './route/id.mjs';
import {SLIDER_PAIRS,toEngineAnswers,toVisualAnswers,planningParams,haversine,taskInRange,routeName,readJSON,recordList,validActiveWalk} from './mobile-core.mjs';
import {mapMatchingAnswers,roadMatchBuckets,availableStreetPhotos,streetPointMatch} from './mobile-map-layers.mjs';
import {createVoyage} from './mobile-voyage.mjs';
import {fitDesignViewport} from './voyage-model.mjs';
import {validPhotoLocation,locationFromGPS,locationFromMap,createPhotoPoint,personalPhotoPoints} from './mobile-photo-points.mjs';
const $=id=>document.getElementById(id), A='./assets/new-figma/';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEYS={profile:'hahaisland.mobile.profile.v1',saved:'hahaisland-blueprint-demo-v1',records:'hahaisland.mobile.records.v1',walk:'hahaisland.mobile.activeWalk.v1'};
const storedProfile=readJSON(localStorage,KEYS.profile,{}), saved=readJSON(localStorage,KEYS.saved,{}), oldPrefs=readJSON(localStorage,'lantu.preferences.v1',null);
const profile=storedProfile&&typeof storedProfile==='object'&&!Array.isArray(storedProfile)?storedProfile:{};
const legacy=saved&&typeof saved==='object'&&!Array.isArray(saved)?saved:{};
if(!legacy.visitedPois||typeof legacy.visitedPois!=='object'||Array.isArray(legacy.visitedPois))legacy.visitedPois={};
if(!legacy.mobileNotes||typeof legacy.mobileNotes!=='object'||Array.isArray(legacy.mobileNotes))legacy.mobileNotes={};
let values=[.7,.3,.55,.75];try{if(oldPrefs?.answers)values=toVisualAnswers(oldPrefs.answers);}catch{}
const state={screen:'welcome',previous:'home',theme:'healing',values,minutes:30,mode:'loop',start:[116.31828,39.99962],startLabel:'清华园 · 二校门',end:null,endLabel:'选一个终点',stops:[],stayMinutes:5,solarHour:15,solarDay:319,solarMode:'warm',solarWeight:.4,solarColorMode:'combined',solar:{hour:15,dayOfYear:319,weight:.4,mode:'warm'},revision:0,routes:[],selected:0,context:null,position:[116.3217,40.002],positionKind:'browse',pick:null,point:null,walk:null,photo:null,photoBusy:false,photoKind:'point',feedbackMood:null,busy:false,taskStep:0,taskFilter:'all',captureLocation:null,captureId:0,captureWalkId:null,capturePending:false,captureError:'',recordSaving:false};
const THEMES=[{id:'healing',name:'疗愈岛',image:'c8ea7.png',desc:'给自己一点慢下来的时间'},{id:'art',name:'文艺岛',image:'4f67d.png',desc:'在城市里，遇见一点灵感'},{id:'lighthouse',name:'灯塔岛',image:'a7207.png',desc:'向着心里的方向出发'},{id:'graffiti',name:'涂鸦岛',image:'7652b.png',desc:'给平凡的一天添一点颜色'},{id:'nature',name:'自然岛',image:'ce305.png',desc:'沿着绿意，走进城市'}];
const START_PRESETS=[{id:'thu',short:'清华园',label:'清华园 · 二校门',xy:[116.31828,39.99962]},{id:'wdk',short:'五道口',label:'五道口 · 成府路',xy:[116.32602,39.99158]},{id:'zgc',short:'中关村',label:'中关村 · 核心区',xy:[116.31406,39.98305]},{id:'ruc',short:'人民大学',label:'人民大学 · 校区',xy:[116.30801,39.97011]}];
let graph,mapData,buildings,pointData,meta,places,worker,workerReady,map,poiLayer,routeLayer,endpointLayer,labelLayer,currentMarker,toastTimer,seaZoom=0,photoToken=0,walkTimer,taskPoint=null,taskMood=null,placeResults=[],requestNumber=0;
let voyage=null,splashTransition=false;
function fitPage(){const layout=fitDesignViewport(innerWidth,innerHeight);document.documentElement.style.setProperty('--app-scale',layout.scale);document.documentElement.style.setProperty('--shell-bottom',layout.bottom+'px');}
fitPage();window.addEventListener('resize',fitPage);
async function enterLogin(){if(splashTransition)return;splashTransition=true;const logo=document.querySelector('.launch-logo');logo.disabled=true;logo.classList.add('is-entering');await new Promise(resolve=>setTimeout(resolve,matchMedia('(prefers-reduced-motion: reduce)').matches?0:500));setScreen('login');logo.classList.remove('is-entering');logo.disabled=false;splashTransition=false;}
let streetPanelOpen=false;
function setStreetPanel(open){streetPanelOpen=!!open;$('streetLayerPanel').hidden=!streetPanelOpen;$('streetLayerToggle').setAttribute('aria-expanded',String(streetPanelOpen));$('streetLayerTools').classList.toggle('is-expanded',streetPanelOpen);}
let personalPhotoLayer=null,personalPins=new Map(),photoPickCandidate=null,photoPickMarker=null,captureGeoRequest=0;
const requests=new Map();
const storedLayers=readJSON(localStorage,'hahaisland.mobile.layers.v1',{});
const mapLayers={solar:storedLayers?.solar!==false,match:storedLayers?.match===true,photos:storedLayers?.photos===true};
let matchLayer,matchRenderer,selectedRouteRenderer,shadowLayer,shadowRenderer,solarPlayTimer=null,solarReplanTimer=null,matchKey='',matchTimer,streetLayer,streetPoints=null,streetPromise=null,selectedStreetPoint=null;
function syncSolarOption(){
 state.solar=mapLayers.solar&&state.solarWeight>0?{hour:state.solarHour,dayOfYear:state.solarDay,weight:state.solarWeight,mode:state.solarMode}:null;
 return state.solar;
}
syncSolarOption();
function fmtHour(h){const hh=Math.floor(h),mm=Math.round((h-hh)*60);return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;}
function updateSolarTimelineUI(){
 syncSolarOption();
 const bar=$('solarTimeline');if(!bar)return;
 bar.hidden=!mapLayers.solar;
 const sun=computeSunPosition(state.solarHour,state.solarDay);
 const icon=sun.isNight?'🌙':sun.isGoldenHour?'🌇':'☀️';
 $('solarTimeBadge').textContent=`${icon} ${fmtHour(state.solarHour)} · ${sun.periodLabel}`;
 $('solarAngleMeta').textContent=sun.isNight?'日落之后 · 街灯柔光':`${azimuthLabel(sun.azimuthDeg)} · 仰角 ${Math.round(sun.altitudeDeg)}°`;
 const slider=$('solarHourSlider');
 if(slider){slider.value=state.solarHour;slider.style.setProperty('--fill',`${((state.solarHour-7)/12)*100}%`);}
 for(const b of bar.querySelectorAll('[data-solar-hour]'))b.classList.toggle('active',Math.abs(+b.dataset.solarHour-state.solarHour)<.13);
 const modeBtn=$('solarModeBtn');
 if(modeBtn){
  modeBtn.textContent=state.solarWeight===0?'日照关闭':state.solarMode==='shade'?'🌿 林荫 40%':'☀️ 追光 40%';
  modeBtn.classList.toggle('is-shade',state.solarWeight>0&&state.solarMode==='shade');
  modeBtn.classList.toggle('is-off',state.solarWeight===0);
 }
 const playBtn=$('solarPlayBtn');
 if(playBtn){playBtn.setAttribute('aria-pressed',String(!!solarPlayTimer));playBtn.textContent=solarPlayTimer?'⏸ 暂停':'▶ 流转';}
}
function refreshBuildingShadows(){
 if(!map||!shadowLayer||!buildings)return;
 shadowLayer.clearLayers();
 if(!mapLayers.solar)return;
 const sun=computeSunPosition(state.solarHour,state.solarDay);
 if(sun.isNight||sun.altitudeDeg<=1)return;
 const bounds=map.getBounds().pad(.16),rings=[];
 for(const f of buildings.features){
  const ring=f.geometry?.coordinates?.[0];if(!ring?.length)continue;
  const [lng0,lat0]=ring[0];if(!bounds.contains([lat0,lng0]))continue;
  const shadow=projectBuildingShadowRing(ring,f.properties?.h??16,sun);
  if(shadow)rings.push(shadow.map(([lng,lat])=>[lat,lng]));
 }
 if(rings.length)L.polygon(rings,{renderer:shadowRenderer,stroke:false,fillColor:'#1e293b',fillOpacity:sun.isGoldenHour?.30:.22,interactive:false}).addTo(shadowLayer);
}
function solarDiagHTML(solar){
 if(!solar)return '';
 const sun=computeSunPosition(state.solarHour,state.solarDay),ev=evaluateSolar(solar,sun,state.solarMode),win=bestSolarWindow(solar,state.solarMode,state.solarDay);
 const occText=sun.isNight?`夜间无日照遮挡 · 街灯基底 ${Math.round((solar.lamp??.2)*100)}%`:`当前方位遮挡角 ${ev.obstacleDeg}° ${ev.litRatio>=.5?'<':'≥'} 太阳仰角 ${Math.round(sun.altitudeDeg)}°（${ev.litRatio>=.65?'暖阳直达无遮挡':ev.litRatio>=.35?'半影过渡':'处于建筑阴影'}）`;
 return `<div class="solar-diag-card"><b><span>📍 经纬度光线值：${ev.light} / 100</span><span>${esc(ev.tag)} · 适配 ${ev.healingScore}</span></b><small>🏛️ 建筑遮挡：${occText}</small><small>🌳 开敞度 SVF ${Math.round((solar.svf??.5)*100)}% · 林荫度 ${Math.round((solar.canopy??.2)*100)}% · 最佳时段 ${win}</small></div>`;
}
function effectiveAnswers(){return mapMatchingAnswers(state.values,state.walk);}
function updateMapLayerControls(){
 $('streetLayerTools').classList.toggle('has-active-layers',mapLayers.solar||mapLayers.match||mapLayers.photos);
 for(const kind of ['solar','match','photos']){const b=$('toggle-'+kind);if(b)b.setAttribute('aria-checked',String(mapLayers[kind]));}
 $('matchLegend').hidden=!mapLayers.match;
 const pureSolar=mapLayers.solar&&state.solarColorMode==='solar';
 $('matchLegendTitle').textContent=pureSolar?`实时光线热力 (${fmtHour(state.solarHour)})`:state.walk?'与本次漫步匹配':state.solar?'人地综合匹配 (含日照 40%)':'与当前偏好匹配';
 $('heatModeToggle').hidden=!mapLayers.solar;
 $('heatModeToggle').textContent=pureSolar?'切回综合匹配':'切换纯光照热力';
 $('matchColorScale').classList.toggle('solar-scale',pureSolar);
 $('matchScaleLabels').innerHTML=pureSolar?'<span>背阴 ≤20</span><span>漫射 55</span><span>≥85 暖阳</span>':'<span>低 ≤30</span><span>50</span><span>≥70 高</span>';
 $('screen-map').classList.toggle('show-road-match',mapLayers.match);
 $('streetHint').hidden=!mapLayers.photos;
 updateSolarTimelineUI();
 updateStreetHint();
}
function refreshRoadMatch(){
 if(!map||!matchLayer)return;
 updateMapLayerControls();
 if(!mapLayers.match){if(map.hasLayer(matchLayer))map.removeLayer(matchLayer);return;}
 const answers=effectiveAnswers(),solarOpt=syncSolarOption(),colorMode=mapLayers.solar?state.solarColorMode:'combined';
 const key=JSON.stringify({answers,solarOpt,colorMode,sun:mapLayers.solar?state.solarHour:null});
 if(matchKey!==key){
  matchLayer.clearLayers();
  const activeSolar=colorMode==='solar'?{hour:state.solarHour,dayOfYear:state.solarDay,weight:.4,mode:state.solarMode}:solarOpt;
  const paint=colorMode==='solar'?solarColor:matchColor;
  roadMatchBuckets(graph,answers,activeSolar,colorMode).forEach((lines,index)=>{if(lines.length)L.polyline(lines,{renderer:matchRenderer,color:paint(index===101?null:index),weight:4,opacity:.88,interactive:false,lineCap:'round'}).addTo(matchLayer);});
  matchKey=key;
 }
 if(!map.hasLayer(matchLayer))matchLayer.addTo(map);
}
function scheduleRoadMatch(){clearTimeout(matchTimer);if(mapLayers.match)matchTimer=setTimeout(refreshRoadMatch,70);}
async function loadStreetPoints(){
 if(streetPoints)return streetPoints;
 if(!streetPromise)streetPromise=fetch('./route/data/points.json').then(r=>{if(!r.ok)throw Error('街景暂时未能载入');return r.json();}).then(data=>{streetPoints=availableStreetPhotos(data);return streetPoints;}).catch(e=>{streetPromise=null;throw e;});
 return streetPromise;
}
function updateStreetHint(){
 if(!mapLayers.photos||!map)return;
 const visible=streetPoints?.filter(p=>map.getBounds().contains([p.xy[1],p.xy[0]])).length||0;
 $('streetHintText').textContent=!streetPoints?'正在载入街景…':visible?`视野内 ${visible} 处历史街景`:'这里暂无街景照片';
 $('streetHint').disabled=!streetPoints?.length;
}
async function refreshStreetPhotos(){
 if(!map||!streetLayer)return;
 if(!mapLayers.photos){if(map.hasLayer(streetLayer))map.removeLayer(streetLayer);if($('streetPhotoViewer'))closeOverlay();updateMapLayerControls();return;}
 $('toggle-photos').setAttribute('aria-busy','true');updateMapLayerControls();
 try{
  const photos=await loadStreetPoints();
  if(!mapLayers.photos)return;
  if(!streetLayer.getLayers().length)for(const p of photos){
   const marker=L.marker([p.xy[1],p.xy[0]],{streetPointId:p.id,zIndexOffset:700,icon:L.divIcon({className:'street-photo-marker',html:'<span class="street-photo-symbol" aria-hidden="true"></span>',iconSize:[28,28],iconAnchor:[14,14]})});
   marker.on('click',()=>{if(state.pick)applyMapPick(p.xy);else showStreetPhoto(p);});
   streetLayer.addLayer(marker);
  }
  streetLayer.addTo(map);
  streetLayer.eachLayer(marker=>{const p=photos.find(p=>p.id===marker.options.streetPointId);if(p&&marker.getElement()){marker.getElement().setAttribute('aria-label',`查看 ${p.date||'历史'} 街景照片`);marker.getElement().setAttribute('role','button');marker.getElement().dataset.streetPoint=p.id;}});
  updateStreetHint();
 }catch(e){mapLayers.photos=false;persist('hahaisland.mobile.layers.v1',mapLayers);updateMapLayerControls();toast(e.message);}
 finally{$('toggle-photos').removeAttribute('aria-busy');}
}
function setSolarHour(hour,{replan=false}={}){
 state.solarHour=Math.max(7,Math.min(19,+hour));
 syncSolarOption();
 updateSolarTimelineUI();
 refreshBuildingShadows();
 scheduleRoadMatch();
 updateOptionsText();
 if(state.routes.length&&!state.walk){
  refreshRoutesSolarLive();
  renderResults();
  drawRoute(false);
  if(replan&&state.solar){clearTimeout(solarReplanTimer);solarReplanTimer=setTimeout(()=>replanActiveSolar(),180);}
 }
}
async function replanActiveSolar(){
 if(state.busy||state.walk||!state.routes.length)return;
 let params;try{params=planningParams(graph,nearestNode,state);}catch{return;}
 const rev=state.revision;
 try{
  await workerReady;
  const result=await workerCall('recommend',params);
  if(rev!==state.revision||!result.routes?.length||state.walk)return;
  state.routes=result.routes.map((r,i)=>({...r,id:`${Date.now()}-${i}`}));
  state.selected=0;
  if(state.context)state.context.solar=params.solar??null;
  renderResults();drawRoute(false);
 }catch{}
}
function refreshRoutesSolarLive(){
 const ctx=solarContext(syncSolarOption()??{hour:state.solarHour,dayOfYear:state.solarDay,weight:.4,mode:state.solarMode});
 for(const r of state.routes){
  if(!r.edges?.length||!r.length)continue;
  let lightSum=0,healSum=0,lit=0;
  for(const ei of r.edges){
   const e=graph.edges[ei];if(!e)continue;
   const ev=evaluateSolar(e.solar,ctx.sun,ctx.mode);
   lightSum+=ev.light*e.d;healSum+=ev.healingScore*e.d;if(ev.litRatio>=.5)lit+=e.d;
  }
  r.avgLightScore=lightSum/r.length;r.avgHealingLight=healSum/r.length;r.sunlitRatio=lit/r.length;
 }
}
function stopSolarPlay(){if(solarPlayTimer){clearInterval(solarPlayTimer);solarPlayTimer=null;updateSolarTimelineUI();}}
function toggleSolarPlay(){
 if(solarPlayTimer){stopSolarPlay();if(state.routes.length&&!state.walk&&state.solar)replanActiveSolar();return;}
 if(state.solarHour>=18.5)state.solarHour=7.5;
 solarPlayTimer=setInterval(()=>{
  const next=+(state.solarHour+.25).toFixed(2);
  if(next>18.75){stopSolarPlay();if(state.routes.length&&!state.walk&&state.solar)replanActiveSolar();return;}
  setSolarHour(next,{replan:false});
 },220);
 updateSolarTimelineUI();
}
function cycleSolarMode(){
 if(state.solarWeight>0&&state.solarMode==='warm'){state.solarMode='shade';}
 else if(state.solarWeight>0&&state.solarMode==='shade'){state.solarWeight=0;}
 else{state.solarMode='warm';state.solarWeight=.4;}
 syncSolarOption();updateSolarTimelineUI();scheduleRoadMatch();updateOptionsText();
 if(state.routes.length&&!state.walk){refreshRoutesSolarLive();renderResults();drawRoute(false);replanActiveSolar();}
}
function toggleHeatMode(){
 state.solarColorMode=state.solarColorMode==='solar'?'combined':'solar';
 refreshRoadMatch();if(state.routes.length)drawRoute(false);
}
function toggleMapLayer(kind){
 mapLayers[kind]=!mapLayers[kind];persist('hahaisland.mobile.layers.v1',mapLayers);
 if(kind==='solar'){if(!mapLayers.solar)stopSolarPlay();syncSolarOption();updateMapLayerControls();refreshBuildingShadows();scheduleRoadMatch();if(state.routes.length){renderResults();drawRoute(false);}}
 else if(kind==='match')refreshRoadMatch();
 else refreshStreetPhotos();
}
function showStreetPhoto(point){
 if(!point?.image)return;
 selectedStreetPoint=point;
 const result=streetPointMatch(point,effectiveAnswers(),syncSolarOption()),format=v=>Number.isFinite(v)?Math.round(v):'—';
 overlay('街景照片',`<article id="streetPhotoViewer"><div class="street-photo-frame"><img src="./route/images/${encodeURIComponent(point.image)}" alt="${esc(point.date||'历史')}采样的街景照片"><span>历史街景 · ${esc(point.date||'年份未知')}</span></div><div class="street-match-heading"><b>${state.walk?'与本次漫步匹配':state.solar?'人地+日照综合契合度':'与当前偏好匹配'}</b><strong style="color:${matchColor(result.score)}">${format(result.score)}<small> / 100</small></strong></div>${solarDiagHTML(point.solar)}<div class="street-match-groups">${['兴趣','环境','心情','游逛'].map((label,i)=>`<div><span>${label}</span><b>${format(result.groups[i])}</b><i><em style="width:${result.groups[i]??0}%;background:${matchColor(result.groups[i])}"></em></i></div>`).join('')}</div><details class="street-data"><summary>环境线索与采样信息</summary><div>${['步行感知','骑行感知','愉悦感知','绿意感知','感知安全'].map((label,i)=>`<p><span>${label}</span><b>${Number.isFinite(point.raw?.[i])?point.raw[i].toFixed(1):'—'} / 5</b></p>`).join('')}</div><p class="street-data-note">历史图像模型估计，非实时街景。${point.flag?'图像质量有标记，不参与道路评分。':''}</p></details><button class="street-map-link" data-action="street-show-location">在地图上看这个点 →</button></article>`);
}
async function nearestStreetPhoto(){
 try{const points=await loadStreetPoints();if(!points.length){toast('暂无可查看的街景照片');return;}const c=map.getCenter(),xy=[c.lng,c.lat];const nearest=points.reduce((best,p)=>!best||haversine(xy,p.xy)<haversine(xy,best.xy)?p:best,null);map.setView([nearest.xy[1],nearest.xy[0]],16.5);showStreetPhoto(nearest);}catch(e){toast(e.message);}
}

function persist(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{toast('空间不足，请先导出记录');return false;}}
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3500);}
function closeOverlay(){if($('overlay').open)$('overlay').close();}
function overlay(title,html){$('overlayContent').innerHTML=`<header class="modal-head"><h2 id="overlayTitle">${esc(title)}</h2><button class="close-button" data-action="close-overlay" aria-label="关闭">×</button></header>${html}`;if(!$('overlay').open)$('overlay').showModal();}
function closePreferences(){if($('preferencesDialog').open)$('preferencesDialog').close();}
function setScreen(screen,{history=true}={}){
 if(!['welcome','login','home','island','map','photo','records','tasks'].includes(screen))screen='home';
 closeOverlay();closePreferences();if(screen!=='map')setStreetPanel(false);if(screen!=='map'&&state.pick==='photo')clearPhotoMapPick();if(state.screen!==screen)state.previous=state.screen;state.screen=screen;
 for(const el of document.querySelectorAll('.screen')){el.hidden=el.id!==`screen-${screen}`;}
 $('mobileApp').dataset.screen=screen;voyage?.setActive(screen==='home');
 if(history)window.history.pushState({screen},'',`#${screen}`);
 if(screen==='map'){const firstMap=!map;initMap();if(firstMap&&state.routes.length)drawRoute(true);refreshPersonalPhotoPoints();requestAnimationFrame(()=>{map.invalidateSize();renderLabels();updateMapLayerControls();});}
 if(screen==='island')renderIsland();if(screen==='records')renderRecords();if(screen==='tasks')renderTasks();
 document.querySelector('meta[name="theme-color"]').content=['welcome','login','home'].includes(screen)?'#77d4f2':'#fffbf5';
 updateIdentity();
}
function updateIdentity(){const name=profile.name||'漫游者';for(const el of document.querySelectorAll('[data-user-title]'))el.textContent=`${name}的岛屿`;for(const el of document.querySelectorAll('[data-user-name]'))el.textContent=name;const date=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'long',day:'numeric'}).format(new Date());for(const el of document.querySelectorAll('[data-date]'))el.textContent=date;for(const el of document.querySelectorAll('[data-fragments]'))el.textContent=completedCount();}
function allPoints(){return Object.entries(pointData.datasets).flatMap(([dataset,d])=>d.points.map(p=>({...p,dataset,kind:dataset==='tsinghua-sculptures'?'sculpture':'landmark'})));}
function pointKey(p){return `${p.kind==='sculpture'?'art':'odyssey'}:${p.id}`;}
function completedCount(){if(!pointData)return 0;return allPoints().filter(p=>legacy.visitedPois[pointKey(p)]).length;}
function renderIsland(){const theme=THEMES.find(t=>t.id===state.theme)||THEMES[0];$('islandName').textContent=theme.name;$('islandImage').src=A+theme.image;$('islandImage').alt=theme.name;$('taskCount').textContent=completedCount();$('walkCount').textContent=getRecords().filter(r=>r.kind==='walk').length;$('islandMood').textContent=profile.mood||'—';$('islandProgress').style.width=`${completedCount()/52*100}%`;document.querySelector('.progress-track').setAttribute('aria-valuenow',completedCount());$('islandDots').innerHTML=THEMES.map(t=>`<i class="${t.id===state.theme?'active':''}"></i>`).join('');$('islandPicker').innerHTML=THEMES.map(t=>`<button data-theme="${t.id}" aria-pressed="${t.id===state.theme}"><img src="${A+t.image}" alt="${t.name}"><span>${t.name}</span></button>`).join('');}
function renderSliders(){ $('preferenceSliders').innerHTML=SLIDER_PAIRS.map((pair,i)=>`<label class="preference-row"><span class="${state.values[i]<.5?'preferred':''}">${pair[0]}</span><input type="range" min="0" max="100" value="${Math.round(state.values[i]*100)}" data-preference="${i}" aria-label="${pair[0]}到${pair[1]}" style="--fill:${state.values[i]*100}%"><span class="${state.values[i]>.5?'preferred':''}">${pair[1]}</span></label>`).join('');updateOptionsText();}
function updateOptionsText(){
 const sunNote=state.solar?` · ☀️ ${fmtHour(state.solarHour)} ${state.solarMode==='shade'?'林荫':'追光'}`:'';
 $('journeyOptionsText').textContent=`${state.minutes} 分钟 · ${state.mode==='loop'?'回到起点':'前往目的地'}${sunNote}`;
 $('selectedStops').innerHTML=state.stops.map(p=>`<button class="stop-chip" data-remove-stop="${esc(p.id)}">${esc(p.name)} ×</button>`).join('');
}
function dirty(){state.revision++;state.routes=[];state.context=null;routeLayer?.clearLayers();endpointLayer?.clearLayers();renderResults();scheduleRoadMatch();}
function openPreferences(){if(state.walk){toast('先结束这段漫步，再调整路线');return;}if(state.screen!=='map')setScreen('map');state.pick=null;$('pickBanner').hidden=true;renderSliders();$('planStatus').textContent='';$('preferencesDialog').showModal();}
function initMap(){if(map)return;map=L.map('cityMap',{zoomControl:false,preferCanvas:true,minZoom:13,maxZoom:19,zoomSnap:.25,maxBounds:[[39.947,116.277],[40.029,116.346]],maxBoundsViscosity:.9}).setView([40.002,116.32],15.75);map.attributionControl.setPrefix(false);map.attributionControl.addAttribution('© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> · 离线城市底图');
 const renderer=L.canvas({padding:.5});L.geoJSON({type:'FeatureCollection',features:mapData.parks},{renderer,style:f=>({color:f.properties.water?'#b8dce3':'#c8dfcf',fillColor:f.properties.water?'#c9e5e9':'#d4e7d6',fillOpacity:.85,weight:.6}),interactive:false}).addTo(map);
 L.geoJSON(buildings,{renderer,style:{color:'#dfe3dc',fillColor:'#e4e8e0',fillOpacity:1,weight:.7},interactive:false}).addTo(map);
 const foot=[],roads=[];for(const e of graph.edges){(e.name==='步行连接道'?foot:roads).push([[graph.nodes[e.a][1],graph.nodes[e.a][0]],[graph.nodes[e.b][1],graph.nodes[e.b][0]]]);}
 L.polyline(foot,{renderer,color:'#e1e2d7',weight:4,opacity:1,interactive:false}).addTo(map);L.polyline(foot,{renderer,color:'#fffff8',weight:2.6,opacity:1,interactive:false}).addTo(map);L.polyline(roads,{renderer,color:'#edc89b',weight:5,opacity:.85,interactive:false}).addTo(map);L.polyline(roads,{renderer,color:'#fffef7',weight:3.2,opacity:1,interactive:false}).addTo(map);
 map.createPane('building-shadows').style.zIndex=415;map.getPane('building-shadows').style.pointerEvents='none';shadowRenderer=L.canvas({pane:'building-shadows',padding:.35});shadowLayer=L.layerGroup().addTo(map);
 map.createPane('road-matching').style.zIndex=430;map.getPane('road-matching').style.pointerEvents='none';matchRenderer=L.canvas({pane:'road-matching',padding:.5});matchLayer=L.layerGroup();map.createPane('selected-mobile-route').style.zIndex=450;selectedRouteRenderer=L.canvas({pane:'selected-mobile-route',padding:.5});streetLayer=L.layerGroup();
 labelLayer=L.layerGroup().addTo(map);routeLayer=L.layerGroup().addTo(map);poiLayer=L.layerGroup().addTo(map);endpointLayer=L.layerGroup().addTo(map);
 personalPhotoLayer=L.layerGroup().addTo(map);refreshPersonalPhotoPoints();
 currentMarker=L.marker([state.position[1],state.position[0]],{zIndexOffset:1200,icon:L.divIcon({className:'map-current',html:'<span class="position-dot"></span>',iconSize:[40,40],iconAnchor:[20,20]})}).addTo(map);
 map.on('moveend zoomend',()=>{if(state.positionKind==='browse')$('mapSubtitle').textContent=map.getCenter().lat<39.987?'中关村与人大 · 城市漫游':'清华园 · 城市漫游';renderLabels();renderMapPoints();refreshBuildingShadows();updateStreetHint();});map.on('click',e=>{if(state.pick)applyMapPick([e.latlng.lng,e.latlng.lat]);});renderMapPoints();renderLabels();refreshBuildingShadows();renderResults();refreshRoadMatch();if(mapLayers.photos)refreshStreetPhotos();else updateMapLayerControls();
}
function renderLabels(){if(!map||state.screen!=='map')return;labelLayer.clearLayers();const drawn=[];for(const p of mapData.labels){if(!p.name||p.name.length>14||!map.getBounds().contains([p.xy[1],p.xy[0]]))continue;const xy=map.latLngToContainerPoint([p.xy[1],p.xy[0]]);if(drawn.some(v=>Math.abs(v.x-xy.x)<70&&Math.abs(v.y-xy.y)<42))continue;drawn.push(xy);L.tooltip({permanent:true,direction:'center',className:'city-label',interactive:false}).setLatLng([p.xy[1],p.xy[0]]).setContent(esc(p.name)).addTo(labelLayer);if(drawn.length>22)break;}}
function renderMapPoints(){if(!poiLayer)return;poiLayer.clearLayers();const points=allPoints().filter(p=>state.theme==='art'?p.kind==='sculpture':p.kind==='landmark');const chosen=[],colors=['orange','blue','green','pink'];for(const p of points){const ll=[p.lat,p.lng];if(!map.getBounds().pad(.1).contains(ll))continue;const xy=map.latLngToContainerPoint(ll);if(xy.x<25||xy.x>map.getSize().x-25||xy.y<175||xy.y>map.getSize().y-135||chosen.length>=4)continue;if(chosen.some(q=>xy.distanceTo(q)<100)&&p.id!==state.point?.id)continue;chosen.push(xy);const color=colors[(chosen.length-1)%4],done=legacy.visitedPois[pointKey(p)];const marker=L.marker(ll,{zIndexOffset:400,icon:L.divIcon({className:'event-marker',iconSize:[44,44],iconAnchor:[22,22],html:`<span class="event-badge ${color}"><img src="${A+(color==='blue'?'96734.svg':'1d1eb.svg')}" width="22" height="22" alt="">${done?'<i class="done-marker">✓</i>':''}</span>`})}).addTo(poiLayer);marker.getElement().setAttribute('aria-label',`探索${p.name}`);marker.getElement().setAttribute('role','button');marker.on('click',()=>{if(state.pick)applyMapPick([p.lng,p.lat]);else openPoint(p);});marker.bindTooltip(p.name,{className:'poi-label',direction:'bottom',offset:[0,22]});}}
function workerCall(type,params){return new Promise((resolve,reject)=>{const id=`mobile-${++requestNumber}`;requests.set(id,{resolve,reject});worker.postMessage({type,id,revision:state.revision,params});});}
async function generate(){if(state.busy)return;if(state.walk){toast('当前漫步尚未结束');return;}let params;try{params=planningParams(graph,nearestNode,state);}catch(e){$('planStatus').textContent=e.message;return;}const revision=state.revision;state.busy=true;$('generateRoute').disabled=true;$('generateRoute').textContent='正在找一条喜欢的路…';$('planStatus').textContent='';try{await workerReady;const result=await workerCall('recommend',params);if(revision!==state.revision){$('planStatus').textContent='偏好已变化，请重新开始';return;}if(!result.routes?.length){$('planStatus').textContent='这次时间不够，增加一点时间试试';return;}state.routes=result.routes.map((r,i)=>({...r,id:`${Date.now()}-${i}`}));state.selected=0;state.context={answers:params.answers,minutes:state.minutes,mode:state.mode,revision,start:[...state.start],end:state.end?[...state.end]:null,stops:state.stops.map(p=>({...p})),stayMinutes:state.stayMinutes};persist('lantu.preferences.v1',{answers:params.answers,minutes:state.minutes,tripType:state.mode,matchingVersion:MATCH_VERSION});closeOverlay();closePreferences();renderResults();drawRoute(true);}catch(e){$('planStatus').textContent=e.message||'暂时没找到路线，请重试';}finally{state.busy=false;$('generateRoute').disabled=false;$('generateRoute').textContent='开始探索';}}
function drawRoute(fit=false){if(!routeLayer)return;routeLayer.clearLayers();endpointLayer.clearLayers();const r=state.routes[state.selected];if(!r)return;const ll=r.nodes.map(n=>[graph.nodes[n][1],graph.nodes[n][0]]);L.polyline(ll,{renderer:selectedRouteRenderer,color:'#fff',weight:10,lineCap:'round',opacity:.95,interactive:false}).addTo(routeLayer);
 const ctx=mapLayers.solar?solarContext(syncSolarOption()??{hour:state.solarHour,dayOfYear:state.solarDay,weight:.4,mode:state.solarMode}):null;
 if(ctx&&r.edges?.length){
  const answers=state.context?.answers||toEngineAnswers(state.values);
  for(const ei of r.edges){
   const e=graph.edges[ei];if(!e)continue;
   const a=graph.nodes[e.a],b=graph.nodes[e.b];
   const c=state.solarColorMode==='solar'?solarColor(evaluateSolar(e.solar,ctx.sun,ctx.mode).healingScore):matchColor(blendSolar(compatibility(e.s,answers),e.solar,ctx));
   L.polyline([[a[1],a[0]],[b[1],b[0]]],{renderer:selectedRouteRenderer,color:c,weight:5.8,lineCap:'round',opacity:1,interactive:false}).addTo(routeLayer);
  }
 }else L.polyline(ll,{renderer:selectedRouteRenderer,color:'#ff912b',weight:5.5,lineCap:'round',opacity:1,interactive:false}).addTo(routeLayer);
 const first=ll[0],last=ll.at(-1);L.marker(first,{icon:L.divIcon({className:'endpoint-marker',html:'起',iconSize:[28,28],iconAnchor:[14,14]})}).addTo(endpointLayer);if(r.nodes[0]!==r.nodes.at(-1))L.marker(last,{icon:L.divIcon({className:'endpoint-marker',html:'终',iconSize:[28,28],iconAnchor:[14,14]})}).addTo(endpointLayer);if(fit&&state.screen==='map')map.fitBounds(L.latLngBounds(ll),{paddingTopLeft:[40,225],paddingBottomRight:[60,state.walk?260:330],maxZoom:17,animate:false});persist('hahaisland.lastRoute.v1',{route:{id:r.id,length:r.length,minutes:r.minutes,groups:r.groups,coverage:r.coverage},answers:state.context?.answers||toEngineAnswers(state.values)});}
function renderResults(){if(map){updateMapLayerControls();scheduleRoadMatch();}const active=state.routes.length>0&&!state.walk;$('routeResults').hidden=!active;$('walkingSheet').hidden=!state.walk;$('screen-map').classList.toggle('has-results',active);$('screen-map').classList.toggle('walking',!!state.walk);if(active){refreshRoutesSolarLive();const sunMeta=state.solar?` · ☀️ ${fmtHour(state.solarHour)} ${state.solarMode==='shade'?'林荫':'追光'}`:'';$('resultsBudget').textContent=`${state.context.minutes} 分钟 · ${state.context.mode==='loop'?'回到起点':'到达目的地'}${sunMeta}`;$('resultsTitle').textContent='为这次漫游';$('routeCards').innerHTML=state.routes.map((r,i)=>`<button class="route-card ${i===state.selected?'selected':''}" data-route="${i}" aria-pressed="${i===state.selected}"><small>路线 0${i+1}<b>${i===0?'为你推荐':'另一种走法'}</b></small><h3>${esc(routeName(graph,r))}</h3><strong>${Math.round(r.minutes)}</strong><span>分钟</span><span class="route-distance">${(r.length/1000).toFixed(1)} km · 契合 ${r.score==null?'—':Math.round(r.score)}</span>${r.sunlitRatio!=null?`<span class="route-solar-tag">☀️ 暖阳 ${Math.round(r.sunlitRatio*100)}% · 光照 ${Math.round(r.avgLightScore)}/100</span>`:''}</button>`).join('');}if(state.walk){$('walkingName').textContent=routeName(graph,state.walk.route);$('walkingDistance').textContent=`${(state.walk.route.length/1000).toFixed(1)} km · 预计 ${Math.round(state.walk.route.minutes)} 分钟`;updateTimer();}}
function pickLocation(kind){closeOverlay();closePreferences();if(state.screen!=='map')setScreen('map');state.pick=kind;$('pickText').textContent=kind==='start'?'点一下，选你的起点':'点一下，选你的终点';$('pickBanner').hidden=false;}
function applyMapPick(xy){if(state.pick==='photo'){photoPickCandidate=locationFromMap({lng:xy[0],lat:xy[1]},allPoints());if(photoPickMarker)map.removeLayer(photoPickMarker);photoPickMarker=L.circleMarker([xy[1],xy[0]],{radius:9,color:'#fff',weight:3,fillColor:'#ff7a24',fillOpacity:1}).addTo(map);$('pickText').textContent=photoPickCandidate.name;$('confirmPhotoLocation').hidden=false;return;}const nearest=nearestNode(graph,xy);if(nearest.distance>180){toast('请选在附近道路上');return;}const key=state.pick;state[key]=[...graph.nodes[nearest.id]];state[key+'Label']='地图选点';state.pick=null;$('pickBanner').hidden=true;dirty();L.circleMarker([state[key][1],state[key][0]],{radius:6,color:'#fff',weight:3,fillColor:'#ff912b',fillOpacity:1}).addTo(endpointLayer);openPreferences();}
function openOptions(){overlay('安排这次漫游',`<label class="form-label">留多少时间？</label><div class="pill-group">${[15,30,45,60].map(n=>`<button data-minutes="${n}" class="${state.minutes===n?'active':''}">${n} 分钟</button>`).join('')}</div><label class="form-label">怎么走？</label><div class="pill-group"><button data-mode="loop" class="${state.mode==='loop'?'active':''}">走一圈</button><button data-mode="destination" class="${state.mode==='destination'?'active':''}">去个地方</button></div><label class="form-label">南北片区快捷起点</label><div class="pill-group">${START_PRESETS.map(p=>`<button data-preset-start="${p.id}" class="${state.startLabel===p.label?'active':''}">${p.short}</button>`).join('')}</div><div class="option-line"><span>起点</span><button data-action="pick-start">${esc(state.startLabel)} ›</button></div>${state.mode==='destination'?`<div class="option-line"><span>终点</span><button data-action="pick-end">${esc(state.endLabel)} ›</button></div>`:''}<div class="option-line"><span>顺路看看</span><button data-action="places">${state.stops.length?state.stops.length+'处':'可选 2 处'} ›</button></div>${state.stops.length?`<label class="form-label">每处停留</label><div class="pill-group">${[0,5,10].map(n=>`<button data-stay="${n}" class="${state.stayMinutes===n?'active':''}">${n} 分钟</button>`).join('')}</div>`:''}<button class="primary" data-action="close-overlay">就这样出发</button>`);}
async function openPlaces(){overlay('顺路看看',`<p id="placesStatus">找找沿途的绿意…</p><div id="placesChoices"></div>`);try{await workerReady;const rev=state.revision;const data=await workerCall('places',{start:nearestNode(graph,state.start).id,end:state.mode==='destination'&&state.end?nearestNode(graph,state.end).id:null,minutes:state.minutes,answers:toEngineAnswers(state.values),stayMinutes:state.stayMinutes,solar:syncSolarOption()});if(rev!==state.revision||!$('placesChoices'))return;placeResults=data.places;$('placesStatus').textContent=placeResults.length?'最多选两处（已融合当前时刻日照评分）。':'附近暂无预算内地点，可直接规划路线。';$('placesChoices').innerHTML=placeResults.slice(0,5).map((p,i)=>`<article class="place-option"><h3>${esc(p.name)}</h3><small>${p.kind}附近 · ${p.fitsBudget?'预算内':`至少 ${p.requiredMinutes} 分钟`}${p.light?` · ☀️ 光照 ${p.light.light} (${esc(p.light.tag)})`:''}</small><button data-place="${i}" ${state.stops.some(s=>s.id===p.id)?'disabled':''}>${state.stops.some(s=>s.id===p.id)?'已加入':p.fitsBudget?'加入漫游 ＋':`${p.requiredMinutes} 分钟 · 加入`}</button></article>`).join('');}catch(e){if($('placesStatus'))$('placesStatus').textContent='暂时没找到地点，可以直接规划路线';}}
function addPlace(i){const p=placeResults[i];if(!p)return;if(state.stops.length>=2){toast('最多加入两处，先移除一处吧');return;}if(state.stops.some(s=>s.id===p.id))return;if(!p.fitsBudget)state.minutes=p.requiredMinutes;state.stops.push({...p});dirty();updateOptionsText();closeOverlay();toast(`已加入${p.name}`);}
function openPoint(p){state.point=p;taskPoint=p;if(state.screen!=='map')setScreen('map');map.panTo([p.lat,p.lng]);const done=legacy.visitedPois[pointKey(p)],inRange=taskInRange(state.position,p);const d=haversine(state.position,[p.lng,p.lat]);overlay('附近的小发现',`<div class="task-detail"><span class="task-category">${esc(p.category||'城市探索')}</span><h3>${esc(p.name)}</h3><p>${esc(p.note||p.place||'慢下来，看看这里有什么不一样。')}</p>${solarDiagHTML(p.solar)}<p class="task-distance">${state.positionKind==='gps'?'距你':'距浏览位置'} ${d>1000?(d/1000).toFixed(1)+' km':Math.round(d)+' m'} · 10 米内可完成探索</p><button class="primary" data-action="start-task" ${!inRange||done?'disabled':''}>${done?'已探索':inRange?'开始探索':'靠近一点，再开始'}</button><div class="task-actions"><button data-action="point-photo">留个记录</button><button data-action="point-notes">我的印象</button><button data-action="simulate-point">模拟到这里</button></div></div>`);}
function beginTask(){if(!taskPoint||!taskInRange(state.position,taskPoint)){toast('请先靠近这个地点');return;}state.taskStep=0;showTaskStep();}
function showTaskStep(){const p=taskPoint,steps=[['看看这里','找一处你平时没注意过的细节。'],['感受片刻','听听周围的声音，留意此刻的心情。'],['收下这一刻','这次探索即将记入你的岛屿。']];overlay(p.name,`<span class="small-badge">${state.taskStep+1} / 3</span><div class="task-step"><h3>${steps[state.taskStep][0]}</h3><p>${steps[state.taskStep][1]}</p></div><button class="primary" data-action="next-task">${state.taskStep<2?'下一步':'完成探索'}</button>`);}
function finishTask(){if(!taskInRange(state.position,taskPoint)){toast('你已离开任务附近，靠近后再完成');closeOverlay();return;}const next={...legacy.visitedPois,[pointKey(taskPoint)]:true};if(!persist(KEYS.saved,{...legacy,visitedPois:next}))return;legacy.visitedPois=next;closeOverlay();renderMapPoints();updateIdentity();toast(state.positionKind==='gps'?'已收下这次探索':'模拟探索已完成');}
function showPointNotes(){const notes=recordList(legacy.mobileNotes[pointKey(taskPoint)]);overlay('我的印象',`<p>${esc(taskPoint.name)}</p><div class="pill-group" style="margin:12px 0">${['有绿意','很安静','有活力','适合放空'].map(t=>`<button data-note-tag="${t}">${t}</button>`).join('')}</div><textarea class="field-input" id="pointNote" maxlength="300" rows="2" placeholder="写下此刻的感受…" aria-label="地点印象"></textarea><button class="primary" data-action="save-point-note">留下印象</button><div>${notes.slice(-5).reverse().map(n=>`<p style="padding-top:12px">${esc(n.text)}</p>`).join('')}</div>`);}
function renderTasks(){const pts=allPoints().filter(p=>state.taskFilter==='all'||state.taskFilter==='done'&&legacy.visitedPois[pointKey(p)]||p.kind===state.taskFilter);$('taskTotal').textContent=`${completedCount()}/52`;$('taskList').innerHTML=pts.length?pts.map(p=>`<button class="task-item ${legacy.visitedPois[pointKey(p)]?'done':''}" data-point="${p.id}"><span class="event-badge ${p.kind==='sculpture'?'pink':'green'}"><img src="${A}1d1eb.svg" width="20" height="20" alt=""></span><div><h2>${esc(p.name)}</h2><p>${esc(p.category||p.place||'清华园')}</p></div><span>${legacy.visitedPois[pointKey(p)]?'已探索':'去看看 ›'}</span></button>`).join(''):'<div class="list-empty"><h2>新的故事，等你出发</h2><p>去地图上看看附近的小发现。</p></div>';for(const b of document.querySelectorAll('[data-task-filter]'))b.classList.toggle('active',b.dataset.taskFilter===state.taskFilter);}
function startWalk(){const r=state.routes[state.selected];if(!r||state.context?.revision!==state.revision){toast('请按当前偏好重新规划');return;}const walk={id:newLocalId(),startedAt:Date.now(),route:r,answers:[...state.context.answers],context:state.context,sourceSha256:meta.sourceSha256};if(!persist(KEYS.walk,walk))return;state.walk=walk;renderResults();drawRoute(true);clearInterval(walkTimer);walkTimer=setInterval(updateTimer,1000);}
function updateTimer(){if(!state.walk)return;const seconds=Math.max(0,Math.floor((Date.now()-state.walk.startedAt)/1000));$('walkTimer').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
function updatePhotoPublishState(){
 const locationReady=validPhotoLocation(state.captureLocation);
 const ready=state.photoKind==='walk'?!!state.walk&&(!state.photo||locationReady):!!state.photo&&locationReady;
 document.querySelector('[data-action="save-record"]').disabled=state.photoBusy||state.recordSaving||!ready;
}
function updatePhotoLocationUI(){
 const location=state.captureLocation;
 if(validPhotoLocation(location)){
  $('recordLocation').textContent=location.name;
  $('photoLocationStatus').textContent=location.source==='gps'?`已附定位${Number.isFinite(location.accuracy)?' · 精度约 '+Math.round(location.accuracy)+' 米':''}`:'已确认地图位置';
 }else{
  $('recordLocation').textContent=state.capturePending?'正在获取位置…':'确认照片的位置';
  $('photoLocationStatus').textContent=state.capturePending?'也可以点上方，在地图选点':state.captureError||'拍下这一刻，也留下它的位置';
 }
 updatePhotoPublishState();
}
function requestPhotoGPS(){
 if(state.capturePending)return;
 const draft=state.captureId,request=++captureGeoRequest;
 state.capturePending=true;state.captureError='';updatePhotoLocationUI();
 const failed=()=>{if(draft!==state.captureId||request!==captureGeoRequest)return;state.capturePending=false;state.captureError='定位未开启，请点上方在地图选位置';updatePhotoLocationUI();};
 if(!navigator.geolocation){failed();return;}
 navigator.geolocation.getCurrentPosition(position=>{
  if(draft!==state.captureId||request!==captureGeoRequest)return;
  try{state.captureLocation=locationFromGPS(position,allPoints());state.capturePending=false;state.captureError='';state.position=[state.captureLocation.lng,state.captureLocation.lat];state.positionKind='gps';currentMarker?.setLatLng([state.captureLocation.lat,state.captureLocation.lng]);updatePhotoLocationUI();}catch{failed();}
 },failed,{enableHighAccuracy:true,timeout:10000,maximumAge:0});
}
function clearPhotoMapPick(){
 if(photoPickMarker){map?.removeLayer(photoPickMarker);photoPickMarker=null;}
 photoPickCandidate=null;state.pick=null;$('pickBanner').hidden=true;$('confirmPhotoLocation').hidden=true;$('screen-map').classList.remove('is-picking-photo');
}
function beginPhotoMapPick(){
 closeOverlay();captureGeoRequest++;state.capturePending=false;photoPickCandidate=null;setScreen('map');state.pick='photo';$('screen-map').classList.add('is-picking-photo');$('pickText').textContent='点一下照片所在的位置';$('pickBanner').hidden=false;$('confirmPhotoLocation').hidden=true;
}
function confirmPhotoMapPick(){if(!photoPickCandidate)return;state.captureLocation={...photoPickCandidate};state.captureError='';clearPhotoMapPick();setScreen('photo');updatePhotoLocationUI();}
function cancelMapPick(){if(state.pick==='photo'){clearPhotoMapPick();setScreen('photo');updatePhotoLocationUI();}else{state.pick=null;$('pickBanner').hidden=true;openPreferences();}}
function choosePhotoLocation(){overlay('照片的位置',`<p>附上当前位置，或在地图确认照片拍摄的位置。</p><button class="primary" data-action="photo-use-gps">使用当前位置</button><button class="photo-location-alternative" data-action="photo-pick-location">在地图上选位置 →</button>`);}
function openPhoto(kind='point'){
 state.photoKind=kind;state.photo=null;state.photoBusy=false;state.feedbackMood=null;state.captureLocation=null;state.captureId++;state.captureWalkId=state.walk?.id||null;state.capturePending=false;state.captureError='';state.recordSaving=false;captureGeoRequest++;photoToken++;
 $('photoInput').value='';$('recordNote').value='';$('recordPhoto').removeAttribute('src');$('recordPhoto').hidden=true;$('recordPhoto').alt='你拍下的照片';$('photoPlaceholder').hidden=false;$('sampleLabel').hidden=true;$('recordStatus').textContent='';$('feedbackOptions').hidden=kind!=='walk';$('photoPageTitle').textContent=kind==='walk'?'留下这段漫步':'留下这一刻';$('feedbackVisit').value='partial';$('feedbackFit').value='yes';
 $('feedbackMood').innerHTML=['😞','🙁','😐','🙂','😊'].map((m,i)=>`<button data-feedback-mood="${i+1}" aria-label="心情 ${i+1} 分" aria-pressed="false">${m}</button>`).join('');setScreen('photo');updatePhotoLocationUI();if(kind==='point')requestPhotoGPS();
}
function beginPhotoPoint(){openPhoto('point');$('photoInput').click();}
function choosePhotoFile(){if(!validPhotoLocation(state.captureLocation)&&!state.capturePending)requestPhotoGPS();$('photoInput').click();}
async function selectPhoto(file){
 const token=++photoToken;state.photoBusy=true;$('recordStatus').textContent='正在准备照片…';updatePhotoPublishState();
 try{const photo=await preparePhoto(file);if(token!==photoToken||!photo)return;state.photo=photo;$('recordPhoto').src=photo.dataUrl;$('recordPhoto').hidden=false;$('photoPlaceholder').hidden=true;$('sampleLabel').hidden=true;$('recordStatus').textContent='';if(state.captureLocation?.source==='gps'&&Date.now()-state.captureLocation.timestamp>30000){state.captureLocation=null;requestPhotoGPS();}}
 catch(e){if(token===photoToken){$('recordStatus').textContent=e.message;toast(e.message);}}
 finally{if(token===photoToken){state.photoBusy=false;updatePhotoPublishState();}}
}
function refreshPersonalPhotoPoints(){
 if(!map||!personalPhotoLayer)return;personalPhotoLayer.clearLayers();personalPins.clear();
 for(const record of personalPhotoPoints(getRecords())){
  const marker=L.marker([record.location.lat,record.location.lng],{zIndexOffset:1700,icon:L.divIcon({className:'personal-photo-marker',html:'<span class="street-photo-symbol" aria-hidden="true"></span>',iconSize:[34,34],iconAnchor:[17,17]})}).addTo(personalPhotoLayer);
  marker.on('click',()=>{if(state.pick)applyMapPick([record.location.lng,record.location.lat]);else showPersonalPhoto(record);});
  const el=marker.getElement();el.setAttribute('role','button');el.setAttribute('aria-label',`查看我的照片点位 ${record.title}`);el.dataset.personalPoint=record.id;personalPins.set(record.id,marker);
 }
}
function focusPersonalPhoto(record){
 if(state.screen!=='map')setScreen('map');refreshPersonalPhotoPoints();const ll=[record.location.lat,record.location.lng];
 const coverage=L.latLngBounds([[39.947,116.277],[40.029,116.346]]);const inside=coverage.contains(ll);map.setMaxBounds(L.latLngBounds(coverage.getSouthWest(),coverage.getNorthEast()).extend(ll).pad(.03));map.setView(ll,17,{animate:false});
 if(!inside)$('mapSubtitle').textContent='照片位置 · 此处暂无离线底图';
 const el=personalPins.get(record.id)?.getElement();el?.classList.add('is-new');setTimeout(()=>el?.classList.remove('is-new'),2200);
}
async function showPersonalPhoto(record){
 overlay('我的照片点位',`<article class="personal-photo-view" id="personalPhotoView" data-record-id="${esc(record.id)}"><div class="personal-photo-image"><img id="personalPhotoImage" alt="你保存的点位照片" hidden><p id="personalPhotoLoading">正在打开照片…</p></div><h3>${esc(record.location.name)}</h3>${record.note?`<p class="personal-photo-note">${esc(record.note)}</p>`:''}<small>${new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'long',day:'numeric'}).format(new Date(record.date))} · ${record.location.source==='gps'?'拍摄时定位':'地图确认位置'}</small><button class="street-map-link" data-record-map="${esc(record.id)}">在地图上看 →</button></article>`);
 try{const photo=await readPhoto(record.photoId);if($('personalPhotoView')?.dataset.recordId!==record.id)return;if(!photo)throw Error('照片暂时无法打开');$('personalPhotoImage').src=photo.dataUrl;$('personalPhotoImage').hidden=false;$('personalPhotoLoading').hidden=true;}catch{if($('personalPhotoView')?.dataset.recordId===record.id)$('personalPhotoLoading').textContent='照片暂时无法打开';}
}
function getRecords(){const fresh=recordList(readJSON(localStorage,KEYS.records,[]));const old=recordList(readJSON(localStorage,'lantu.events.v1',[])).filter(e=>e.type==='feedback'&&e.feedback).map(e=>({id:e.eventId,kind:e.target?.kind==='route'?'walk':'point',title:e.target?.name||'以往的漫步',note:e.feedback.note||'',date:e.time,photoId:e.feedback.photoId,visit:e.feedback.visit}));return [...fresh,...old].sort((a,b)=>(b.date||'').localeCompare(a.date||''));}
async function saveRecord(){
 if(state.recordSaving)return;if(state.photoBusy){toast('照片还在准备，稍等一下');return;}
 if(state.photoKind!=='walk'&&!state.photo){toast('先拍一张照片');return;}
 if(state.photo&&!validPhotoLocation(state.captureLocation)){toast('先确认照片的位置');return;}
 const draft=state.captureId,photo=state.photo,location=validPhotoLocation(state.captureLocation)?{...state.captureLocation}:null,note=$('recordNote').value.trim(),walk=state.photoKind==='walk'?state.walk:null,walkId=state.captureWalkId;
 if(state.photoKind==='walk'&&!walk){toast('这段漫步已保存');return;}
 state.recordSaving=true;updatePhotoPublishState();$('recordStatus').textContent='正在保存…';
 try{
  const photoId=photo?await savePhoto(photo):null;
  const record=walk?{id:newLocalId(),kind:'walk',title:routeName(graph,walk.route),date:new Date().toISOString(),note,photoId,location,walkId:walk.id,route:{id:walk.route.id,length:walk.route.length,minutes:walk.route.minutes,answers:walk.answers},elapsedSeconds:Math.max(0,Math.floor((Date.now()-walk.startedAt)/1000)),visit:$('feedbackVisit').value,fit:$('feedbackFit').value,mood:state.feedbackMood}:createPhotoPoint({id:newLocalId(),photoId,location,note,walkId});
  const records=recordList(readJSON(localStorage,KEYS.records,[]));if(!persist(KEYS.records,[record,...records].slice(0,80))){$('recordStatus').textContent='保存失败，请先导出部分记录后重试';return;}
  if(walk&&state.walk?.id===walk.id){localStorage.removeItem(KEYS.walk);state.walk=null;clearInterval(walkTimer);renderResults();}
  refreshPersonalPhotoPoints();
  if(draft===state.captureId){state.photo=null;if(walk)setScreen('records');else{setScreen('map');focusPersonalPhoto(record);}toast(walk?'这次漫步已保存':'照片已加入地图，继续漫游吧');}
 }catch(e){if(draft===state.captureId)$('recordStatus').textContent=e.message||'保存失败，请重试';}
 finally{state.recordSaving=false;updatePhotoPublishState();}
}
async function renderRecords(){const records=getRecords();if(!records.length){$('recordList').innerHTML=`<div class="list-empty"><img src="${A}9df65.svg" width="78" height="105" alt=""><h2>还没有漫步记录</h2><p>去走一段路，或拍下喜欢的一刻。</p><button class="text-button" data-action="preferences">开启第一次漫游 →</button></div>`;return;}$('recordList').innerHTML=records.map(r=>`<article class="record-item">${r.photoId?`<img data-photo-id="${esc(r.photoId)}" alt="你的漫步照片" hidden>`:''}<small>${new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'long',day:'numeric'}).format(new Date(r.date||Date.now()))} · ${r.kind==='walk'?'城市漫步':'留个记录'}</small><h2>${esc(r.title)}</h2>${r.route?`<small>${(r.route.length/1000).toFixed(1)} km · ${r.visit==='completed'?'已走完':r.visit==='partial'?'走过一部分':'还没走过'}</small>`:''}${r.note?`<p>${esc(r.note)}</p>`:''}${r.photoId&&validPhotoLocation(r.location)?`<button class="text-button" data-record-map="${esc(r.id)}">在地图上看 →</button>`:''}</article>`).join('');for(const img of document.querySelectorAll('[data-photo-id]')){try{const p=await readPhoto(img.dataset.photoId);if(p&&img.isConnected){img.src=p.dataUrl;img.hidden=false;}}catch{}}}
async function exportRecords(){const data={exportedAt:new Date().toISOString(),records:getRecords()};for(const r of data.records)if(r.photoId){try{r.photo=await readPhoto(r.photoId);}catch{}}const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='我的岛屿-漫步记录.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);}
function openMenu(){overlay('HahaIsland·城市游乐场',`<div class="menu-list"><button data-action="home">回到小船<span>›</span></button><button data-action="island">我的岛<span>›</span></button><button data-action="preferences">个性化寻路<span>›</span></button><button data-action="tasks">探索清单<span>›</span></button><button data-action="records">漫步记录<span>›</span></button><button data-action="method">这条路怎么来的<span>›</span></button><button data-action="switch-user">切换漫游者<span>›</span></button></div>`);}
function identity(register=false){overlay(register?'给旅程取个名字':'欢迎回来',`<form id="identityForm"><label class="form-label" for="nickname">怎么称呼你？</label><input class="field-input" id="nickname" name="nickname" maxlength="12" required value="${esc(profile.name||'')}" placeholder="你的名字" autocomplete="nickname"><button class="primary" type="submit">登岛</button><p style="font-size:10px;text-align:center;margin-top:12px">在这台设备，开始你的漫游</p></form>`);setTimeout(()=>$('nickname')?.focus(),100);}
function showMethod(){overlay('这条路怎么来的',`<div class="method-copy"><p>你的四个偏好与实时日照，共同决定沿途环境的契合度。</p><details><summary>偏好与路线</summary><p>回游—探新、静谧—活力、修复—激活、可规划—漫游，各占 25%；开启日照权重后融合太阳几何、8 方位建筑遮挡仰角与街景天空开敞度。按道路长度、环境契合和时间预算，在真实步行路网中选路。</p></details><details><summary>地图与环境</summary><p>OpenStreetMap 步行路网；${meta.points.toLocaleString()} 个历史街景评分点。建筑底图完整覆盖海淀南北全域（清华、北大、五道口及中关村、知春路、人民大学片区共 4,553 栋建筑），经三层楼高校准实时投射 2.5D 日照阴影。</p><p>离线底图含 © OpenStreetMap contributors 数据与校园建筑底图。<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">数据署名</a></p></details><details><summary>我的记录</summary><p>照片、心情和文字留在当前浏览器，可在漫步记录中导出。记录漫步不会自动完成地点任务。</p></details></div>`);}
async function locate(){if(!navigator.geolocation){toast('当前浏览器不支持定位，请在地图上选点');return;}toast('正在寻找你的位置…');navigator.geolocation.getCurrentPosition(pos=>{const xy=[pos.coords.longitude,pos.coords.latitude];if(nearestNode(graph,xy).distance>180){toast('你在当前地图范围外，可手动选择起点');return;}state.position=xy;state.positionKind='gps';currentMarker.setLatLng([xy[1],xy[0]]);map.setView([xy[1],xy[0]],17);$('mapSubtitle').textContent='清华园 · 我的位置';if(!state.walk){state.start=[...xy];state.startLabel='我的位置';dirty();}toast('已找到你的位置');},()=>toast('定位未开启，可在地图上选择起点'),{enableHighAccuracy:true,timeout:10000,maximumAge:30000});}
const actions={'toggle-street-panel':()=>setStreetPanel(!streetPanelOpen),'map-photo':beginPhotoPoint,'choose-photo-location':choosePhotoLocation,'photo-use-gps':()=>{closeOverlay();requestPhotoGPS();},'photo-pick-location':beginPhotoMapPick,'confirm-photo-location':confirmPhotoMapPick,'toggle-solar':()=>toggleMapLayer('solar'),'toggle-match':()=>toggleMapLayer('match'),'toggle-photos':()=>toggleMapLayer('photos'),'toggle-heat-mode':toggleHeatMode,'solar-play':toggleSolarPlay,'cycle-solar-mode':cycleSolarMode,'nearest-street':nearestStreetPhoto,'street-show-location':()=>{if(!selectedStreetPoint)return;closeOverlay();map.setView([selectedStreetPoint.xy[1],selectedStreetPoint.xy[0]],17);},'dock-island':()=>voyage?.dock(),login:enterLogin,identity:()=>identity(false),register:()=>identity(true),home:()=>setScreen('home'),island:()=>setScreen('island'),map:()=>setScreen('map'),preferences:openPreferences,menu:openMenu,tasks:()=>setScreen('tasks'),records:()=>setScreen('records'),back:()=>setScreen(['map','island','home'].includes(state.previous)?state.previous:'home'),'close-overlay':closeOverlay,'close-preferences':closePreferences,options:openOptions,generate,places:openPlaces,'pick-start':()=>pickLocation('start'),'pick-end':()=>pickLocation('end'),'cancel-pick':cancelMapPick,'zoom-in':()=>map?.zoomIn(.5),'zoom-out':()=>map?.zoomOut(.5),locate,'enter-island':()=>{setScreen('map');if(state.theme==='art')map.setView([40.001,116.315],16);else map.setView([40.002,116.32],15.75);renderMapPoints();},'sea-zoom-in':()=>voyage?.zoomBy(1),'sea-zoom-out':()=>voyage?.zoomBy(-1),'toggle-results':()=>{$('routeResults').classList.toggle('compact');},'start-walk':startWalk,'finish-walk':()=>openPhoto('walk'),'photo-back':()=>{photoToken++;state.captureId++;captureGeoRequest++;state.photoBusy=false;state.capturePending=false;setScreen('map');},'point-photo':beginPhotoPoint,camera:choosePhotoFile,'save-record':saveRecord,'export-records':exportRecords,'start-task':beginTask,'next-task':()=>{if(state.taskStep<2){state.taskStep++;showTaskStep();}else finishTask();},'simulate-point':()=>{state.position=[taskPoint.lng,taskPoint.lat];state.positionKind='simulated';currentMarker.setLatLng([taskPoint.lat,taskPoint.lng]);$('mapSubtitle').textContent='清华园 · 模拟位置';map.setView([taskPoint.lat,taskPoint.lng],17);openPoint(taskPoint);},'point-notes':showPointNotes,'save-point-note':()=>{const text=$('pointNote').value.trim();if(!text){toast('先留下一点感受');return;}const key=pointKey(taskPoint),next={...legacy.mobileNotes,[key]:[...recordList(legacy.mobileNotes[key]),{text,date:new Date().toISOString()}].slice(-30)};if(persist(KEYS.saved,{...legacy,mobileNotes:next})){legacy.mobileNotes=next;showPointNotes();}},method:showMethod,'switch-user':()=>{closeOverlay();setScreen('login');},mood:()=>{overlay('此刻的心情',`<div class="mood-options">${['低落','有点累','平常','还不错','愉快'].map((v,i)=>`<button data-profile-mood="${v}" aria-label="${v}">${['😞','🙁','😐','🙂','😊'][i]}</button>`).join('')}</div>`);}};
document.addEventListener('click',event=>{const button=event.target.closest('button');if(!button||button.disabled)return;if(button.dataset.recordMap){const record=getRecords().find(r=>r.id===button.dataset.recordMap);if(record&&validPhotoLocation(record.location)){closeOverlay();focusPersonalPhoto(record);}return;}if(button.dataset.solarHour!==undefined){stopSolarPlay();setSolarHour(+button.dataset.solarHour,{replan:true});return;}const action=button.dataset.action;if(action){actions[action]?.();return;}if(button.dataset.theme){state.theme=button.dataset.theme;renderIsland();return;}if(button.dataset.minutes){state.minutes=+button.dataset.minutes;dirty();updateOptionsText();openOptions();return;}if(button.dataset.mode){state.mode=button.dataset.mode;dirty();updateOptionsText();openOptions();return;}if(button.dataset.presetStart){const p=START_PRESETS.find(x=>x.id===button.dataset.presetStart);if(p){state.start=[...p.xy];state.startLabel=p.label;dirty();updateOptionsText();map?.setView([p.xy[1],p.xy[0]],16);openOptions();}return;}if(button.dataset.stay){state.stayMinutes=+button.dataset.stay;dirty();updateOptionsText();openOptions();return;}if(button.dataset.place!==undefined){addPlace(+button.dataset.place);return;}if(button.dataset.removeStop){state.stops=state.stops.filter(p=>p.id!==button.dataset.removeStop);dirty();updateOptionsText();return;}if(button.dataset.route!==undefined){state.selected=+button.dataset.route;renderResults();drawRoute(true);$('routeCards').querySelector(`[data-route="${state.selected}"]`)?.scrollIntoView({block:'nearest',inline:'center'});return;}if(button.dataset.point){const p=allPoints().find(p=>p.id===button.dataset.point);if(p)openPoint(p);return;}if(button.dataset.taskFilter){state.taskFilter=button.dataset.taskFilter;renderTasks();return;}if(button.dataset.feedbackMood){state.feedbackMood=+button.dataset.feedbackMood;for(const b of $('feedbackMood').children){const on=b===button;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));}return;}if(button.dataset.profileMood){profile.mood=button.dataset.profileMood;persist(KEYS.profile,profile);closeOverlay();renderIsland();return;}if(button.dataset.noteTag){const input=$('pointNote');input.value=(input.value+' '+button.dataset.noteTag).trim().slice(0,300);}});
document.addEventListener('input',event=>{if(event.target.id==='solarHourSlider'){stopSolarPlay();setSolarHour(+event.target.value,{replan:false});return;}if(event.target.dataset.preference!==undefined){const i=+event.target.dataset.preference;state.values[i]=+event.target.value/100;event.target.style.setProperty('--fill',event.target.value+'%');const spans=event.target.parentElement.querySelectorAll('span');spans[0].classList.toggle('preferred',state.values[i]<.5);spans[1].classList.toggle('preferred',state.values[i]>.5);event.target.setAttribute('aria-valuetext',`${SLIDER_PAIRS[i][0]} ${100-+event.target.value}，${SLIDER_PAIRS[i][1]} ${event.target.value}`);dirty();$('planStatus').textContent='';}});
document.addEventListener('change',event=>{if(event.target.id==='solarHourSlider'&&state.routes.length&&!state.walk&&state.solar)replanActiveSolar();});
document.addEventListener('submit',event=>{if(event.target.id==='identityForm'){event.preventDefault();const name=$('nickname').value.trim().slice(0,12);if(!name){$('nickname').focus();return;}profile.name=name;if(!persist(KEYS.profile,profile))return;setScreen('home');}});
$('photoInput').addEventListener('change',e=>{if(e.target.files[0])selectPhoto(e.target.files[0]);});
for(const d of [$('overlay'),$('preferencesDialog')])d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});
document.addEventListener('pointerdown',event=>{if(streetPanelOpen&&!$('streetLayerTools').contains(event.target))setStreetPanel(false);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&streetPanelOpen&&!document.querySelector('dialog[open]')){setStreetPanel(false);$('streetLayerToggle').focus();event.preventDefault();}});
window.addEventListener('popstate',()=>{const key=location.hash.slice(1);if(key==='preferences'){setScreen('map',{history:false});openPreferences();}else setScreen(key||'home',{history:false});});
function refreshClock(){$('clock').textContent=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());}refreshClock();setInterval(refreshClock,60000);
async function boot(){try{const files=['./route/data/graph.json','./route/data/map.json','./maps/city-buildings.geojson','./maps/tsinghua-points.json','./route/data/meta.json','./route/data/places.json'];[graph,mapData,buildings,pointData,meta,places]=await Promise.all(files.map(async url=>{const r=await fetch(url);if(!r.ok)throw Error('地图暂时没有载入');return r.json();}));workerReady=new Promise((resolve,reject)=>{worker=new Worker('./route/worker.mjs',{type:'module'});worker.onerror=()=>{reject(Error('路线计算未启动，请刷新重试'));for(const q of requests.values())q.reject(Error('路线计算中断，请刷新重试'));requests.clear();};worker.onmessage=({data})=>{if(data.type==='ready'){resolve();return;}const q=requests.get(data.id);if(!q)return;requests.delete(data.id);if(data.type==='error')q.reject(Error(data.message));else q.resolve(data);};worker.postMessage({type:'init',graph,places:places.places});});workerReady.catch(()=>{});const active=readJSON(localStorage,KEYS.walk,null);if(validActiveWalk(active,graph,meta.sourceSha256)){state.walk=active;state.routes=[active.route];state.context=active.context;state.values=toVisualAnswers(active.answers);state.minutes=active.context.minutes;state.mode=active.context.mode;state.start=[...active.context.start];state.end=active.context.end?[...active.context.end]:null;state.stops=active.context.stops||[];state.stayMinutes=active.context.stayMinutes??5;state.revision=active.context.revision;state.selected=0;walkTimer=setInterval(updateTimer,1000);}const requested=location.hash.slice(1);if(requested==='preferences'){setScreen('map',{history:false});openPreferences();}else if(['home','map','island','records','tasks','login'].includes(requested)){setScreen(requested,{history:false});if(state.walk&&requested==='map')drawRoute(true);}else if(state.screen==='welcome'){setScreen('welcome',{history:false});}updateIdentity();}catch(e){toast(e.message||'载入失败，请刷新页面');$('screen-welcome').querySelector('strong').textContent='点击重新载入';actions.login=()=>location.reload();}}
window.HahaIslandMobile={snapshot:()=>({screen:state.screen,theme:state.theme,values:[...state.values],answers:toEngineAnswers(state.values),minutes:state.minutes,routeCount:state.routes.length,selected:state.selected,walking:!!state.walk,completed:completedCount(),positionKind:state.positionKind,layers:{...mapLayers},matchContext:matchKey,streetPhotoCount:streetPoints?.length||0,voyage:voyage?.snapshot(),personalPhotoCount:personalPins.size,captureLocation:state.captureLocation?{...state.captureLocation}:null})};
voyage=createVoyage({onDock:id=>{state.theme=id;setScreen('island');},onMessage:toast});
boot();
