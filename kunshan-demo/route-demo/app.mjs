import {match,distance,nearestNode,GROUPS,MATCH_VERSION,ROUTING_VERSION,aggregate,compatibility,matchColor,computeSunPosition,evaluateSolar,solarContext,blendSolar,bestSolarWindow,projectBuildingShadowRing} from './core.mjs';
import {PLACES_RANK_VERSION} from './places.mjs';
import {preparePhoto,savePhoto,readPhoto} from './experience.mjs';
import {connectIslandBridge,routeSummary} from './bridge.mjs';
import {newLocalId} from './id.mjs';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=1)=>Number.isFinite(n)?n.toFixed(d):'—';
const ll=xy=>[xy[1],xy[0]];
const STARTS={zhongguancun:[116.313,39.983],chengfu:[116.326,39.9916],yiheyuan:[116.2983,39.9961]};
const ENDS={south:[116.31865,39.9829],north:[116.315,39.9914],west:[116.30224,39.97786]};
const state={answers:[0,.85,.9,1],priority:null,tripType:'loop',stops:[],stayMinutes:5,minutes:30,solar:{hour:15,dayOfYear:319,weight:.4,mode:'warm'},startXY:STARTS.zhongguancun,endXY:ENDS.south,routes:[],selected:0,revision:0,picking:null,ready:false,busy:false,context:null,moodBefore:null,activeWalk:null};
const islandBridge=connectIslandBridge(window,{onOpen:({nickname})=>{
  $('island-walker').textContent=nickname?`${nickname}的城市漫步`:'HahaIsland · 城市漫步';
}});
document.body.classList.toggle('island-embedded',islandBridge.embedded);
$('route-home').addEventListener('click',event=>{
  if(islandBridge.embedded){event.preventDefault();islandBridge.emit('hahaisland:route-close');}
});
let graph,points,mapData,meta,buildingsData,map,roads,heat,pointLayer,routeLayer,markers,labelLayer,shadowLayer,shadowRenderer,worker,currentPoint,activeId,toastTimer;
let routeRenderer,directionLayer,routeFocus=true,placeLayer,placesData,placeSuggestions=[],placesTimer,placesRequestId,placeSuggestionsRevision=-1;
let pointTab='environment',feedbackTarget=null,feedbackPhoto=null,photoRevision=0,photoBusy=false,moodAfter=null,walkTimer=null,feedbackSaving=false;
let savedPreferences=null;try{savedPreferences=JSON.parse(localStorage.getItem('lantu.preferences.v1'));if(savedPreferences)match(null,savedPreferences.answers);}catch{savedPreferences=null;}
try{const w=JSON.parse(localStorage.getItem('lantu.activeWalk.v1'));if(w?.route?.nodes?.length&&w?.context&&Number.isFinite(w.startedAt))state.activeWalk=w;}catch{}
let events=[];try{const stored=JSON.parse(localStorage.getItem('lantu.events.v1')||'[]');if(Array.isArray(stored))events=stored.filter(x=>x&&typeof x==='object').slice(-80);}catch{}
function toast(s){if($('feedback-dialog').open){let status=$('feedback-status');if(!status){status=document.createElement('p');status.id='feedback-status';status.setAttribute('role','status');$('save-feedback').before(status);}status.textContent=s;status.hidden=false;return;}$('toast').textContent=s;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}
function log(type,payload={}){
  const e={eventId:newLocalId(),time:new Date().toISOString(),type,...payload},next=[...events,e].slice(-80);
  try{localStorage.setItem('lantu.events.v1',JSON.stringify(next));events=next;updateHistoryCount();return true;}
  catch{toast('浏览器存储空间不足，记录未保存。请先导出已有记录。');return false;}
}
function updateHistoryCount(){$('history-count').textContent=events.filter(e=>e.type==='feedback').length;}
function routePayload(r){return {id:r.id,edges:r.edges,nodes:r.nodes,length:r.length,minutes:r.minutes,groups:r.groups,coverage:r.coverage,repeat:r.repeat,waypoints:r.waypoints??[],walkingMinutes:r.walkingMinutes??r.minutes,stayMinutes:r.stayMinutes??0};}
const color=score=>matchColor(Number.isFinite(score)?Math.round(score):null);
function groupScore(env,solar=null){const ctx=state.activeWalk?.context;const base=compatibility(env,state.answers,ctx?.priority??null,ctx?.matchingVersion??MATCH_VERSION);return blendSolar(base,solar,solarContext(ctx?.solar??state.solar));}
let previewFrame;
function scheduleMatchPreview(){
  cancelAnimationFrame(previewFrame);
  previewFrame=requestAnimationFrame(()=>{renderHeat();if(currentPoint)renderPointScores();});
}
function markDirty(){
  setStage('preference');state.revision++;$('profile-kind').textContent='本次偏好';
  document.querySelectorAll('.preset').forEach(b=>b.classList.remove('active'));
  $('route-cards').classList.add('stale');$('route-detail').classList.add('stale');
  $('map').classList.remove('route-focused');routeLayer.clearLayers();directionLayer.clearLayers();$('route-map-summary').hidden=true;$('results-caption').textContent='颜色已按当前偏好预览，生成后更新路线';
  $('map-match-context').textContent='当前偏好预览 · 生成后更新路线';
  if(state.ready&&!state.busy)$('generate').innerHTML='<span>生成我的漫步路线</span><span>↗</span>';
  scheduleMatchPreview();schedulePlaces();syncLocationControls();
}
function refreshControls(){
  const pairs=[['探新','回游'],['热闹','安静'],['激活','修复'],['规划','漫游']];
  const terms=[];
  ['interest','atmosphere','emotion','mode'].forEach((id,i)=>{
    const u=state.answers[i],v=Math.round(u*100),[left,right]=pairs[i];$(id).value=v;
    const label=u===.5?'两者均衡':`偏${u<.5?left:right}`;
    $(id+'-value').textContent=label;
    $(id).setAttribute('aria-valuetext',`${left} ${100-v}，${right} ${v}`);
    terms.push(label);
  });
  $('duration').value=state.minutes;$('duration-value').innerHTML=`${state.minutes} <small>分钟</small>`;
  $('trip-type').value=state.tripType;$('destination-wrap').hidden=state.tripType!=='destination';
  $('preference-summary').textContent=terms.join(' · ');
  $('priority-hint').textContent='四个偏好共同参与推荐：道路越偏橙，越契合当前需求；越偏蓝，契合度越低。';
  $('reuse-preferences').hidden=!savedPreferences;$('stay-minutes').value=state.stayMinutes;
}
function stopPayload(p){return {id:p.id,name:p.name,node:p.node,xy:p.xy,kind:p.kind,sourceUrl:p.sourceUrl,targetKind:p.targetKind};}
function schedulePlaces(){
  clearTimeout(placesTimer);if(!state.ready||state.activeWalk)return;
  $('place-cards').classList.add('stale');$('places-status').textContent='正在按当前偏好与预算筛选…';
  placesTimer=setTimeout(()=>{
    placesRequestId=newLocalId();
    worker.postMessage({type:'places',id:placesRequestId,revision:state.revision,params:{start:nearestNode(graph,state.startXY).id,end:state.tripType==='destination'?nearestNode(graph,state.endXY).id:null,minutes:state.minutes,answers:[...state.answers],stayMinutes:state.stayMinutes,solar:state.solar}});
  },180);
}
function togglePlace(id){
  if(state.activeWalk||state.busy)return;
  const index=state.stops.findIndex(p=>p.id===id);
  if(index>=0)state.stops.splice(index,1);
  else{
    if(state.stops.length>=2){toast('本次最多选择两处地点，可先移除一处。');return;}
    const place=placeSuggestions.find(p=>p.id===id);if(!place||placeSuggestionsRevision!==state.revision)return;
    if(state.stops.some(p=>p.node===place.node)){toast('这两处地点对应同一附近道路位置，选择其中一处即可。');return;}
    if(!place.fitsBudget){state.minutes=place.requiredMinutes;refreshControls();}
    state.stops.push(stopPayload(place));
  }
  markDirty();renderPlaces();
  log('places_selected',{answers:[...state.answers],stops:state.stops.map(stopPayload),stayMinutes:state.stayMinutes,placesVersion:placesData.version,candidates:placeSuggestions.map(p=>({id:p.id,score:p.score,soloMinutes:p.soloMinutes,fitsBudget:p.fitsBudget})),minutes:state.minutes});
}
function renderPlaceMarkers(){
  if(!placeLayer)return;placeLayer.clearLayers();
  const list=state.activeWalk?state.stops:[...state.stops,...placeSuggestions.filter(p=>!state.stops.some(s=>s.id===p.id))];
  list.forEach(p=>{
    const index=state.stops.findIndex(s=>s.id===p.id),selected=index>=0;
    const marker=L.marker(ll(p.xy),{pane:selected?'markerPane':'surroundings',zIndexOffset:selected?700:0,icon:L.divIcon({className:'',html:`<span class="place-pin ${selected?'chosen':''}">${selected?index+1:'＋'}</span>`,iconSize:[26,26],iconAnchor:[13,13]})});
    marker.bindTooltip(`${esc(p.name)}附近${selected?' · 途经 '+(index+1):' · 点击加入'}`,{direction:'top'});
    marker.on('click',()=>{if(state.picking){setLocation(p.xy,state.picking);return;}togglePlace(p.id);});marker.addTo(placeLayer);
  });
}
function renderPlaces(){
  $('place-cards').classList.toggle('stale',placeSuggestionsRevision!==state.revision&&!state.activeWalk);
  $('places-status').textContent=state.activeWalk?'本次地点已锁定':`${placeSuggestions.filter(p=>p.fitsBudget).length} 处在预算内 · 已选 ${state.stops.length}/2`;
  $('place-cards').innerHTML=placeSuggestions.length?placeSuggestions.map(p=>{
    const chosen=state.stops.some(s=>s.id===p.id);
    return `<article class="place-card ${chosen?'chosen':''}"><div class="place-category">${esc(p.kind)} · 地点附近 <a class="place-source" href="${esc(p.sourceUrl)}" target="_blank" rel="noopener" aria-label="查看${esc(p.name)}的 OSM 来源">OSM ↗</a></div><h3>${esc(p.name)}</h3><div class="place-metrics"><strong>${p.score==null?'暂无评分':fmt(p.score)+' 分'}</strong><span>附近环境契合度</span></div><p>${p.fitsBudget?'预算内 · ':'需增加时间 · '}只选此处至少约 ${Math.ceil(p.soloMinutes)} 分钟<br>含${state.tripType==='loop'?'往返':'起终点之间的'}步行及 ${state.stayMinutes} 分钟停留</p><div class="place-actions"><button data-place="${esc(p.id)}" aria-pressed="${chosen}">${chosen?'已加入 · 移除':p.fitsBudget?'加入漫步 ＋':`改为 ${p.requiredMinutes} 分钟并加入`}</button><button data-locate-place="${esc(p.id)}" aria-label="在地图查看${esc(p.name)}">地图查看 ↗</button></div></article>`;
  }).join(''):(state.activeWalk?'<div class="places-empty">漫步进行中，地点已按下方行程锁定。结束后可重新选择。</div>':'<div class="places-empty">附近暂时没有可推荐的地点。可以调整起点，或直接生成不指定地点的漫步路线。</div>');
  $('place-cards').querySelectorAll('[data-place]').forEach(b=>b.onclick=()=>togglePlace(b.dataset.place));
  $('place-cards').querySelectorAll('[data-locate-place]').forEach(b=>b.onclick=()=>{const p=placeSuggestions.find(p=>p.id===b.dataset.locatePlace);map.setView(ll(p.xy),17);$('map').scrollIntoView({behavior:'smooth',block:'center'});});
  $('selected-places').hidden=!state.stops.length;
  $('place-itinerary').innerHTML=state.stops.map((p,i)=>`<span><b>${i+1}</b>${esc(p.name)}<button data-remove-place="${esc(p.id)}" aria-label="移除${esc(p.name)}">×</button></span>`).join('<i>→</i>');
  $('place-itinerary').querySelectorAll('[data-remove-place]').forEach(b=>b.onclick=()=>togglePlace(b.dataset.removePlace));
  renderPlaceMarkers();
}
function setPick(kind){
  if(kind&&(!state.ready||state.busy||state.activeWalk))return;
  state.picking=kind;document.body.classList.toggle('is-picking',!!kind);$('map-instruction').hidden=!kind;
  $('pick-map-start').setAttribute('aria-pressed',String(kind==='start'));
  if(kind){
    $('point-card').hidden=true;
    $('map-instruction').firstChild.textContent=kind==='start'?'点击道路设置起点，也可拖动「起」标记 ':'点击地图设置目的地 ';
    map.panTo(ll(kind==='start'?state.startXY:state.endXY),{animate:false});
    $('map').scrollIntoView({behavior:'smooth',block:'center'});
  }
}
function setLocation(xy,kind){
  if(state.activeWalk){toast('漫步正在记录中，请结束后再更换起点或目的地。');return false;}
  if(!state.ready||state.busy)return false;
  const snap=nearestNode(graph,xy);if(snap.distance>180){toast('这里距离可用步行路网较远，请在道路附近选点。');return false;}
  state[kind==='start'?'startXY':'endXY']=graph.nodes[snap.id];const sel=$(kind==='start'?'start-select':'end-select');sel.querySelector('[value="custom"]').hidden=false;sel.value='custom';markDirty();renderMarkers();setPick(null);toast(`已选择${kind==='start'?'起点':'目的地'}，生成路线即可更新。`);return true;
}
function syncLocationControls(){
  const locked=!state.ready||state.busy||!!state.activeWalk;
  $('pick-map-start').disabled=locked;$('plan-from-map').disabled=locked;
  $('location-hint').textContent=state.activeWalk?'漫步进行中，起点已锁定':state.busy?'正在规划路线…':state.context?.revision===state.revision?'点选起点或拖动「起」标记，再规划路线':'起点或偏好已更新，点击规划路线';
  markers?.eachLayer(m=>{if(m.options.locationKind==='start'){
    if(locked)m.dragging.disable();else m.dragging.enable();
    m.getElement()?.classList.toggle('start-draggable',!locked);
  }});
}
function renderMarkers(){
  if(!markers)return;markers.clearLayers();
  for(const [xy,label,kind] of [[state.startXY,'起','start'],...(state.tripType==='destination'?[[state.endXY,'终','end']]:[])]){
    const snapped=graph.nodes[nearestNode(graph,xy).id];
    const marker=L.marker(ll(snapped),{locationKind:kind,draggable:kind==='start'&&!state.activeWalk&&!state.busy,autoPan:true,zIndexOffset:1000,
      alt:kind==='start'?'路线起点，可拖动调整位置':'目的地',
      icon:L.divIcon({className:`location-marker location-${kind}`,html:`<div class="route-marker ${kind==='end'?'end':''}">${label}</div>`,iconSize:[44,44],iconAnchor:[22,22]})
    }).bindTooltip(kind==='start'?'起点 · 拖动调整':'目的地').addTo(markers);
    if(kind==='start'){
      marker.on('dragstart',()=>{marker.closeTooltip();$('point-card').hidden=true;});
      marker.on('dragend',()=>{
        const p=marker.getLatLng();
        if(!setLocation([p.lng,p.lat],'start')){marker.setLatLng(ll(snapped));if(marker.getTooltip()?.options.permanent)marker.openTooltip();}
      });
    }
  }
  syncLocationControls();
}
function renderLabels(){
  if(!map||!mapData)return;labelLayer.clearLayers();const occupied=[];const zoom=map.getZoom();
  for(const p of mapData.labels){if(zoom<15&&!['primary','secondary','tertiary'].includes(p.kind))continue;if(!map.getBounds().contains(ll(p.xy)))continue;const screen=map.latLngToContainerPoint(ll(p.xy));if(occupied.some(q=>Math.abs(q.x-screen.x)<95&&Math.abs(q.y-screen.y)<30))continue;occupied.push(screen);L.marker(ll(p.xy),{pane:'surroundings',interactive:false,icon:L.divIcon({className:'road-label',html:esc(p.name),iconSize:[110,15],iconAnchor:[55,7]})}).addTo(labelLayer);}
}
function inspectStreet(xy){
  if(state.picking){setLocation(xy,state.picking);return;}
  let best=null,d=Infinity;
  for(const p of points){const v=distance(p.xy,xy);if(v<d){best=p;d=v;}}
  if(best&&d<=100)showPoint(best);else toast('这段道路附近暂无街景评分。');
}
function renderHeat(){
  $('map').classList.toggle('route-focused',!!(routeFocus&&state.routes[state.selected]&&state.context?.revision===state.revision));
  heat.clearLayers();if(!$('show-all-scores').checked)return;
  const buckets=Array.from({length:102},()=>[]);
  for(const e of graph.edges){const s=groupScore(e.s,e.solar),i=s===null?101:Math.round(s);buckets[i].push([ll(graph.nodes[e.a]),ll(graph.nodes[e.b])]);}
  buckets.forEach((lines,i)=>{if(!lines.length)return;
    L.polyline(lines,{color:color(i===101?null:i),weight:routeFocus&&state.routes.length>0&&state.context?.revision===state.revision?2.5:4,opacity:(routeFocus&&state.routes.length>0&&state.context?.revision===state.revision)?.28:.82,bubblingMouseEvents:false})
      .bindTooltip(i===101?'暂无环境评分':`道路契合度约 ${i} / 100 · ${state.activeWalk?.context.priority!=null?'原漫步优先维度':'四维偏好等权匹配'}`,{sticky:true})
      .on('click',e=>inspectStreet([e.latlng.lng,e.latlng.lat])).addTo(heat);
  });
}
function showPoint(p){currentPoint=p;$('point-card').hidden=false;$('point-image').innerHTML=p.image?`<img src="images/${encodeURIComponent(p.image)}" alt="采样点 ${esc(p.id)} 的历史全景照片">`:'<div class="photo-placeholder">该点位暂无本地照片</div>';$('point-date').textContent=`街景采样 · ${p.date||'年份未知'}`;
  renderPointScores();
  $('point-description').textContent=`点位 ${p.id} · ${p.flag?'图像质量有标记，不用于路段评分':'历史街景感知预测'}。绿意与安静是环境线索，不是现场绿视率或实测噪声。`;
  renderPointCommunity();
}
function renderPointScores(){
  if(!currentPoint)return;
  $('tab-environment').classList.toggle('active',pointTab==='environment');$('tab-match').classList.toggle('active',pointTab==='match');
  $('tab-environment').setAttribute('aria-pressed',pointTab==='environment');$('tab-match').setAttribute('aria-pressed',pointTab==='match');
  const solarOpt=state.activeWalk?.context?.solar??state.solar;
  const sun=computeSunPosition(solarOpt?.hour??15,solarOpt?.dayOfYear??319);
  const ev=currentPoint.solar?evaluateSolar(currentPoint.solar,sun,solarOpt?.mode??'warm'):null;
  const win=currentPoint.solar?bestSolarWindow(currentPoint.solar,solarOpt?.mode??'warm',sun.dayOfYear):null;
  const solarRow=ev?`<div class="point-score"><span>☀️ 实时光照 (${esc(ev.tag)})</span><strong>${ev.light} / 100 · 最佳 ${win}</strong></div>`:'';
  if(pointTab==='environment'){
    const names=['步行感知','骑行感知','愉悦感知','绿意感知','感知安全'];
    $('point-scores').innerHTML='<div class="point-subtitle">来自历史街景的模型估计 · 1–5 分</div>'+currentPoint.raw.map((v,i)=>`<div class="point-score"><span>${names[i]}</span><strong>${fmt(v)} / 5</strong></div>`).join('')+solarRow;
  }else{
    const scores=match(currentPoint.env,state.answers,state.activeWalk?.context.matchingVersion??MATCH_VERSION);
    $('point-scores').innerHTML='<div class="point-subtitle">按当前偏好计算 · 0–100 分</div>'+scores.map((m,i)=>`<div class="point-score"><span>${GROUPS[i]}${state.activeWalk&&i===state.activeWalk.context.priority?' · 优先':''}</span><strong>${fmt(m.score)}</strong></div>`).join('')+solarRow;
  }
}
function renderPointCommunity(){
  if(!currentPoint)return;const notes=events.filter(e=>e.type==='feedback'&&e.target?.kind==='point'&&e.target.id===currentPoint.id&&e.feedback?.visit!=='not_visited');
  const counts=new Map();notes.forEach(e=>(e.feedback.tags||[]).forEach(t=>counts.set(t,(counts.get(t)||0)+1)));
  $('point-community').innerHTML=`<div class="point-subtitle">我的环境记录 · ${notes.length} 条</div>`+(counts.size?`<div class="record-tags">${[...counts].map(([t,n])=>`<span>${esc(t)} · ${n}</span>`).join('')}</div>`:'<p>还没有在这里留下体验。</p>');
}
function refreshBuildingShadows(){
  if(!map||!shadowLayer||!buildingsData?.buildings)return;
  shadowLayer.clearLayers();
  const solarOpt=state.activeWalk?.context?.solar??state.solar;
  if(!solarOpt)return;
  const sun=computeSunPosition(solarOpt.hour??15,solarOpt.dayOfYear??319);
  if(sun.isNight||sun.altitudeDeg<=1)return;
  const bounds=map.getBounds().pad(.16),rings=[];
  for(const b of buildingsData.buildings){
    const ring=b.ring;if(!ring?.length)continue;
    const [lng0,lat0]=ring[0];if(!bounds.contains([lat0,lng0]))continue;
    const shadow=projectBuildingShadowRing(ring,b.h??16,sun);
    if(shadow)rings.push(shadow.map(ll));
  }
  if(rings.length)L.polygon(rings,{renderer:shadowRenderer,stroke:false,fillColor:'#1e293b',fillOpacity:sun.isGoldenHour?.28:.20,interactive:false}).addTo(shadowLayer);
}

function initMap(){
  map=L.map('map',{zoomControl:false,preferCanvas:true,zoomSnap:.25,minZoom:13,maxZoom:19,maxBounds:[[39.947,116.277],[40.029,116.346]],maxBoundsViscosity:.8}).setView([39.985,116.312],15);
  L.control.zoom({position:'bottomright'}).addTo(map);L.control.scale({imperial:false,maxWidth:80}).addTo(map);map.attributionControl.setPrefix(false);map.attributionControl.addAttribution('© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> · 本地路网与全域建筑');
  L.geoJSON({type:'FeatureCollection',features:mapData.parks},{style:f=>({color:f.properties.water?'#bbd8d2':'#d5dfc4',fillColor:f.properties.water?'#c6ded8':'#dae5cc',fillOpacity:.8,weight:1}),interactive:false}).addTo(map);
  if(buildingsData?.buildings?.length){
    L.polygon(buildingsData.buildings.map(b=>b.ring.map(ll)),{color:'#d8ddd4',fillColor:'#e2e6de',fillOpacity:.92,weight:.6,interactive:false}).addTo(map);
  }
  const lines=graph.edges.map(e=>[ll(graph.nodes[e.a]),ll(graph.nodes[e.b])]);
  L.polyline(lines,{color:'#d9dfd1',weight:6,opacity:1,interactive:false}).addTo(map);
  roads=L.polyline(lines,{color:'#fffef8',weight:3.8,opacity:1,interactive:false}).addTo(map);
  map.createPane('building-shadows').style.zIndex=415;map.getPane('building-shadows').style.pointerEvents='none';
  shadowRenderer=L.canvas({pane:'building-shadows',padding:.35});shadowLayer=L.layerGroup().addTo(map);
  map.createPane('surroundings').style.zIndex=430;
  map.createPane('route-shade').style.zIndex=440;
  // The shade covers the bounded city view; routes and selected markers sit above it.
  L.rectangle([[38,114],[42,119]],{renderer:L.canvas({pane:'route-shade'}),stroke:false,fillColor:'#172b28',fillOpacity:1,interactive:false}).addTo(map);
  map.createPane('selected-route').style.zIndex=450;routeRenderer=L.canvas({pane:'selected-route'});
  map.createPane('route-directions').style.zIndex=460;map.getPane('route-directions').style.pointerEvents='none';
  directionLayer=L.layerGroup().addTo(map);placeLayer=L.layerGroup().addTo(map);
  heat=L.layerGroup().addTo(map);pointLayer=L.layerGroup();if($('show-points').checked)pointLayer.addTo(map);labelLayer=L.layerGroup().addTo(map);routeLayer=L.layerGroup().addTo(map);markers=L.layerGroup().addTo(map);
  // All supplied points remain inspectable; photos get a distinct marker.
  points.forEach(p=>{
    const marker=L.circleMarker(ll(p.xy),{radius:p.image?4:2,color:p.flag?'#c19e87':'#90a27d',weight:0,fillColor:p.image?'#70966b':'#98ac88',fillOpacity:p.image?.85:.38});marker.on('click',e=>{if(state.picking){setLocation(p.xy,state.picking);return;}showPoint(p);});marker.addTo(pointLayer);
  });
  map.on('resize',fitRoute);map.on('moveend',()=>{renderLabels();renderDirections();positionEndpointLabels();refreshBuildingShadows();});map.on('click',e=>{if(state.picking)setLocation([e.latlng.lng,e.latlng.lat],state.picking);});renderLabels();renderMarkers();refreshBuildingShadows();
}
function routeName(r){const names=new Map();r.edges.forEach(i=>{const e=graph.edges[i];if(e.name!=='步行连接道')names.set(e.name,(names.get(e.name)||0)+e.d);});return [...names].sort((a,b)=>b[1]-a[1])[0]?.[0]||'街区小径';}
function positionEndpointLabels(){
  markers.eachLayer(m=>{
    const tip=m.getTooltip();if(tip?.options.className!=='route-endpoint-label')return;
    const x=map.latLngToContainerPoint(m.getLatLng()).x,w=map.getSize().x;
    if(x<0||x>w)return;
    const dx=Math.max(60-x,Math.min(0,w-60-x));tip.options.offset=L.point(dx,-16);tip.update();
  });
}
function renderDirections(){
  directionLayer.clearLayers();const r=state.routes[state.selected];
  if(!r||state.context?.revision!==state.revision)return;
  let walked=0,next=48;const placed=[];
  for(let i=1;i<r.nodes.length;i++){
    const a=map.latLngToLayerPoint(ll(graph.nodes[r.nodes[i-1]])),b=map.latLngToLayerPoint(ll(graph.nodes[r.nodes[i]]));
    const length=a.distanceTo(b);if(!length)continue;
    while(next<walked+length){
      const f=(next-walked)/length,p=L.point(a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f);
      if(placed.every(q=>p.distanceTo(q)>32)){
        const angle=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
        L.marker(map.layerPointToLatLng(p),{pane:'route-directions',interactive:false,keyboard:false,
          icon:L.divIcon({className:'route-direction',iconSize:[18,18],iconAnchor:[9,9],html:`<svg viewBox="0 0 18 18" aria-hidden="true" style="transform:rotate(${angle}deg)"><path d="M6 4l5 5-5 5"/></svg>`})}).addTo(directionLayer);
        placed.push(p);
      }
      next+=88;
    }
    walked+=length;
  }
}
function renderRoutes(){
  routeLayer.clearLayers();directionLayer.clearLayers();const selected=state.routes[state.selected];if(!selected)return;
  const line=selected.nodes.map(n=>ll(graph.nodes[n]));
  if(!routeFocus)state.routes.forEach((r,i)=>{if(i===state.selected)return;L.polyline(r.nodes.map(n=>ll(graph.nodes[n])),{color:'#708198',weight:3,opacity:.6,dashArray:'5 7',renderer:routeRenderer}).on('click',e=>{if(state.picking)inspectStreet([e.latlng.lng,e.latlng.lat]);else selectRoute(i);}).addTo(routeLayer);});
  L.polyline(line,{color:'#fff',weight:19,opacity:1,interactive:false,renderer:routeRenderer}).addTo(routeLayer);
  L.polyline(line,{color:'#253f57',weight:14,opacity:1,interactive:false,renderer:routeRenderer}).addTo(routeLayer);
  const routeSolar=solarContext(state.context?.solar??state.solar);
  for(const ei of selected.edges){
    const e=graph.edges[ei],score=blendSolar(compatibility(e.s,state.context.answers,state.context.priority??null,state.context.matchingVersion),e.solar,routeSolar);
    L.polyline([ll(graph.nodes[e.a]),ll(graph.nodes[e.b])],{color:color(score),weight:8,opacity:1,bubblingMouseEvents:false,renderer:routeRenderer})
      .bindTooltip(`路线 ${state.selected+1} · ${score===null?'暂无评分':`契合度 ${fmt(score)} / 100`}`,{sticky:true})
      .on('click',e=>inspectStreet([e.latlng.lng,e.latlng.lat])).addTo(routeLayer);
  }
  renderDirections();renderMarkers();renderPlaceMarkers();
  const loop=selected.nodes[0]===selected.nodes.at(-1);
  markers.eachLayer(m=>{
    m.setZIndexOffset(1000);
    const isStart=m.getLatLng().equals(ll(graph.nodes[selected.nodes[0]]));
    m.unbindTooltip().bindTooltip(isStart?(loop?'起点 · 回到这里':'起点'):'终点',{permanent:true,direction:'top',offset:[0,-16],className:'route-endpoint-label'});
  });
  positionEndpointLabels();$('route-map-summary').hidden=false;
  $('route-map-label').innerHTML=`<b>路线 ${String(state.selected+1).padStart(2,'0')}</b><span>${fmt(selected.minutes,0)} 分钟 · ${fmt(selected.length/1000)} 公里 · ${loop?'回到起点':'到达目的地'}</span>`;
  $('focus-route').setAttribute('aria-pressed',String(routeFocus));
  $('focus-route').textContent=routeFocus?'查看街区全貌':'突出这条路线';
}
function fitRoute(){const r=state.routes[state.selected];if(r&&state.context?.revision===state.revision)map.fitBounds(r.nodes.map(n=>ll(graph.nodes[n])),{paddingTopLeft:[55,map.getSize().x<500?150:110],paddingBottomRight:[45,115],maxZoom:17,animate:false});else map.panTo(ll(state.startXY));}
function selectRoute(i,record=true){
  if(state.activeWalk&&record){toast('请先结束当前漫步，再换一条路线。');return;}
  state.selected=i;const r=state.routes[i];renderHeat();renderRoutes();
  document.querySelectorAll('.route-card').forEach((b,j)=>b.classList.toggle('selected',j===i));
  const ctx=state.context;const labels=['兴趣','环境','心情','游逛'];
  $('route-reason').textContent=`${ctx.end===null?'绕行后返回起点':'前往选定目的地'} · ${ctx.priority==null?'综合四个偏好匹配':`以${labels[ctx.priority]}匹配为重点`}，结合步行成本与数据覆盖筛选。`;
  $('group-scores').innerHTML=r.groups.map((v,j)=>`<div class="group-score ${j===ctx.priority?'primary':''}"><div><span>${GROUPS[j]}${j===ctx.priority?' · 优先':''}</span><strong>${fmt(v)}</strong></div><i><b style="width:${v??0}%"></b></i></div>`).join('');
  const stops=ctx.stops??[];$('route-stops').hidden=!stops.length;
  $('route-stops').innerHTML=stops.length?`<strong>本次行程</strong><span>起点 → ${stops.map(p=>esc(p.name)+'附近').join(' → ')} → ${ctx.end===null?'回到起点':'目的地'}</span><small>步行约 ${fmt(r.walkingMinutes??r.minutes,0)} 分钟 + 停留 ${fmt(r.stayMinutes??0,0)} 分钟 = 全程约 ${fmt(r.minutes,0)} 分钟</small>`:'';
  $('route-footnote').textContent=`环境数据覆盖 ${fmt(r.coverage*100,0)}% · 重复路段 ${fmt(r.repeat*100,0)}% · 按 4.5 km/h 估算步行时长${stops.length?'，已计所选停留时间':'，未计停留时间'}，未计过街等待。${ctx.priority==null?'综合契合度为四维均分；各维度分别展示。':'这是旧版漫步，沿用开始时的优先维度。'}`;
  $('route-detail').hidden=false;if(record){setStage('route');log('route_selected',{requestId:ctx.requestId,context:ctx,route:routePayload(r)});}
  if(record||ctx.inputSource==='user_confirmed'||state.activeWalk)islandBridge.emit('hahaisland:route-selected',{route:routeSummary(r),answers:[...ctx.answers]});
}
function paintResults(){
  syncLocationControls();
  setStage(state.activeWalk?'experience':state.context.inputSource==='scenario_example'?'preference':'route');
  $('route-cards').classList.remove('stale');$('route-detail').classList.remove('stale');$('results-title').textContent=state.context.stops?.length?'经过你选的地点，再慢慢走。':state.context.end===null?'不用想终点，选一段喜欢的路。':'目的地之外，也有值得走的风景。';
  $('results-caption').textContent=`${state.routes.length} 条候选 · ${state.context.priority==null?'四维综合匹配':GROUPS[state.context.priority]+'优先'}`;
  if(!state.routes.length){$('route-cards').innerHTML=state.context.stops?.length?'<div class="empty-state">所选地点与停留时间下，没有找到预算内的路线。<br>试试增加时间、减少停留，或移除一个地点。已保留你的选择。</div>':'<div class="empty-state">当前条件下，没有找到合适的路线。<br>试试增加时间、调整起点，或换一个目的地。</div>';$('route-detail').hidden=true;routeLayer.clearLayers();directionLayer.clearLayers();$('route-map-summary').hidden=true;return;}
  $('route-cards').innerHTML=state.routes.map((r,i)=>`<button class="route-card ${i===0?'selected':''}" data-index="${i}" aria-label="选择路线 ${i+1} ${esc(routeName(r))}"><div class="route-card-top"><span class="route-number">0${i+1}</span><span class="route-tag">${i===0?'本次首选':r.baseline?'距离基线':'另一种走法'}</span></div><h3>${esc(routeName(r))} · ${state.context.end===null?'绕行一圈':'沿途慢走'}</h3><div class="route-stats"><span><strong>${fmt(r.minutes,0)}</strong>分钟</span><span><strong>${fmt(r.length/1000)}</strong>公里</span></div><div class="route-match"><span>${state.context.priority==null?'综合契合度':'重点匹配'}</span><i><b style="width:${r.score??0}%"></b></i><span>${fmt(r.score)}</span></div></button>`).join('');
  $('route-cards').querySelectorAll('button').forEach(b=>b.onclick=()=>{selectRoute(+b.dataset.index);fitRoute();});selectRoute(0,false);fitRoute();
}
function generate(exampleOnly=false){
  if(!state.ready||state.busy||state.activeWalk)return;
  setPick(null);
  state.priority=null;
  const start=nearestNode(graph,state.startXY),end=state.tripType==='destination'?nearestNode(graph,state.endXY):null;
  if(start.distance>180||(end&&end.distance>180)){toast('选点距离路网较远，请重新选择。');return;}
  if(end&&end.id===start.id){toast('起点与终点相同，请选择漫游，或更换目的地。');return;}
  $('point-card').hidden=true;state.busy=true;$('generate-places').disabled=true;$('generate').disabled=true;$('generate').innerHTML='<span>正在寻找合适的路线…</span><span>↗</span>';$('loading-overlay').hidden=false;
  syncLocationControls();
  activeId=newLocalId();state.pending={requestId:activeId,revision:state.revision,start:start.id,end:end?.id??null,minutes:state.minutes,answers:[...state.answers],priority:null,weights:[.25,.25,.25,.25],tripType:state.tripType,waypoints:state.stops.map(p=>p.node),stops:state.stops.map(stopPayload),stayMinutes:state.stayMinutes,solar:state.solar,placesVersion:placesData.version,placesRankVersion:PLACES_RANK_VERSION,inputSource:exampleOnly?'scenario_example':'user_confirmed',moodBefore:state.moodBefore,matchingVersion:MATCH_VERSION,mappingVersion:meta.mappingVersion,routingVersion:ROUTING_VERSION,sourceSha256:meta.sourceSha256,osmDate:meta.osmDate};
  if(!exampleOnly){savedPreferences={answers:[...state.answers],tripType:state.tripType,minutes:state.minutes,matchingVersion:MATCH_VERSION};try{localStorage.setItem('lantu.preferences.v1',JSON.stringify(savedPreferences));}catch{}refreshControls();}
  worker.postMessage({type:'recommend',id:activeId,params:state.pending});
}
function finishBusy(){state.busy=false;$('generate-places').disabled=!!state.activeWalk;$('generate').disabled=!!state.activeWalk;$('generate').innerHTML='<span>生成我的漫步路线</span><span>↗</span>';$('loading-overlay').hidden=true;syncLocationControls();}
function wireUI(){
  for(const [index,id] of ['interest','atmosphere','emotion','mode'].entries())$(id).oninput=e=>{state.answers[index]=+e.target.value/100;markDirty();refreshControls();};
  $('duration').oninput=e=>{state.minutes=+e.target.value;markDirty();refreshControls();};
  $('trip-type').onchange=e=>{state.tripType=e.target.value;markDirty();refreshControls();renderMarkers();};
  $('start-select').onchange=e=>{if(STARTS[e.target.value]){state.startXY=STARTS[e.target.value];markDirty();renderMarkers();}};
  $('end-select').onchange=e=>{if(ENDS[e.target.value]){state.endXY=ENDS[e.target.value];markDirty();renderMarkers();}};
  document.querySelectorAll('.preset').forEach(b=>b.onclick=()=>{state.answers=b.dataset.preset==='restore'?[0,.85,.9,1]:b.dataset.preset==='explore'?[0,.15,.15,1]:[1,.5,.5,0];state.stops=[];state.stayMinutes=5;renderPlaces();state.priority=null;state.tripType=b.dataset.preset==='plan'?'destination':'loop';state.minutes=30;markDirty();b.classList.add('active');$('profile-kind').textContent='示例偏好';refreshControls();renderMarkers();generate(true);});
  $('generate-places').onclick=()=>generate(false);$('stay-minutes').onchange=e=>{state.stayMinutes=+e.target.value;markDirty();renderPlaces();};
  $('generate').onclick=()=>generate(false);$('pick-start').onclick=()=>setPick('start');$('pick-end').onclick=()=>setPick('end');$('cancel-pick').onclick=()=>setPick(null);
  $('pick-map-start').onclick=()=>setPick(state.picking==='start'?null:'start');$('plan-from-map').onclick=()=>generate(false);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.picking)setPick(null);});
  $('focus-route').onclick=()=>{routeFocus=!routeFocus;renderHeat();renderRoutes();};
  $('show-points').onchange=e=>e.target.checked?pointLayer.addTo(map):map.removeLayer(pointLayer);$('show-all-scores').onchange=renderHeat;$('reset-view').onclick=fitRoute;
  $('preview-photo').onclick=()=>{const r=state.routes[state.selected];let best=null,dist=Infinity;for(const p of points.filter(p=>p.image)){const d=r?Math.min(...r.nodes.map(n=>distance(p.xy,graph.nodes[n]))):distance(p.xy,state.startXY);if(d<dist){best=p;dist=d;}}if(best){showPoint(best);$('point-description').textContent=`距选中路线最近采样节点约 ${Math.round(dist)} 米的街区参考照片，不代表路线全程。拍摄于 ${best.date}，当前环境可能已变化。`;map.panTo(ll(best.xy));}};
  $('close-point').onclick=()=>$('point-card').hidden=true;$('point-start').onclick=()=>{if(currentPoint&&setLocation(currentPoint.xy,'start'))$('point-card').hidden=true;};
  $('method-button').onclick=()=>$('info-dialog').showModal();document.querySelectorAll('.dialog-close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
  $('feedback-button').onclick=()=>openFeedback('route');
  $('point-feedback').onclick=()=>openFeedback('point');
  $('feedback-form').onsubmit=submitFeedback;
  $('feedback-form').elements.visit.onchange=refreshFeedbackVisit;
  $('feedback-tags').querySelectorAll('button').forEach(b=>b.onclick=()=>{const on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(on));b.classList.toggle('active',on);});
  $('mood-before').querySelectorAll('button').forEach(b=>b.onclick=()=>{state.moodBefore=state.moodBefore===+b.dataset.value?null:+b.dataset.value;renderMood('mood-before',state.moodBefore);});
  $('mood-after').querySelectorAll('button').forEach(b=>b.onclick=()=>{moodAfter=moodAfter===+b.dataset.value?null:+b.dataset.value;renderMood('mood-after',moodAfter);updateMoodComparison();});
  $('feedback-photo').onchange=async e=>{const rev=++photoRevision;feedbackPhoto=null;photoBusy=true;$('save-feedback').disabled=true;$('feedback-photo-preview').hidden=true;try{const photo=await preparePhoto(e.target.files[0]);if(rev!==photoRevision)return;feedbackPhoto=photo;if(photo){$('feedback-photo-preview').querySelector('img').src=photo.dataUrl;$('feedback-photo-preview').hidden=false;}}catch(err){if(rev===photoRevision){e.target.value='';toast(err.message);}}finally{if(rev===photoRevision){photoBusy=false;$('save-feedback').disabled=false;}}};
  $('remove-feedback-photo').onclick=()=>{photoRevision++;photoBusy=false;feedbackPhoto=null;$('feedback-photo').value='';$('feedback-photo-preview').hidden=true;$('save-feedback').disabled=false;};
  $('tab-environment').onclick=()=>{pointTab='environment';renderPointScores();};$('tab-match').onclick=()=>{pointTab='match';renderPointScores();};
  $('start-walk').onclick=startWalk;$('finish-walk').onclick=()=>openFeedback('route',true);
  $('reuse-preferences').onclick=()=>{if(!savedPreferences)return;state.answers=[...savedPreferences.answers];state.priority=null;state.tripType=savedPreferences.tripType??(savedPreferences.answers[3]===0?'destination':'loop');state.minutes=savedPreferences.minutes;markDirty();refreshControls();renderMarkers();toast('已填入上次偏好，可继续调整后生成路线。');};
  $('history-button').onclick=showHistory;
  $('export-history').onclick=exportHistory;

  updateHistoryCount();
}
async function init(){
  try{
    [graph,points,mapData,meta,placesData,buildingsData]=await Promise.all(['graph','points','map','meta','places','buildings'].map(async n=>{const r=await fetch(`data/${n}.json`);if(!r.ok)throw Error(`无法读取 ${n} 数据`);return r.json();}));
    initMap();wireUI();refreshControls();
    $('map-status').textContent=`真实路网 · ${meta.points.toLocaleString()} 个街景评分点`;
    $('data-summary').textContent=`${meta.points.toLocaleString()} 个评分点 · ${meta.photos} 张本地街景 · 地图可离线浏览`;
    $('method-content').innerHTML=`<div class="method-block"><strong>01 · 环境来自历史街景</strong><p>${meta.points.toLocaleString()} 个评分点，${meta.photos} 张本地照片。原始五项是 SVI Percept 的感知预测，八项支持分按提供的 v0.3 规则计算。绿意感知不是像素绿视率，静谧与修复共用一个代理。${meta.excludedQuality} 条图像质量标记记录未用于道路评分。</p></div><div class="method-block"><strong>02 · 偏好与环境分开</strong><p>四个滑块都按左右倾向线性匹配：每组得分 = (1 − 右侧倾向) × 左侧环境分 + 右侧倾向 × 右侧环境分。四组再各占 25% 得到综合契合度，用于道路颜色和寻路。等权是当前 Demo 的明确假设，尚未通过用户数据拟合。探新/回游、规划/漫游已从旧版开关规则升级为连续插值；回游尚未接入真实到访历史。路线形式单独指定，不随滑块切换。</p></div><div class="method-block"><strong>03 · 在道路上找路</strong><p>OpenStreetMap 路网快照：${meta.osmDate}。使用最大连通分量，过滤明确禁行及私人通行限制。道路中点关联 100 米内至多 3 个不同采样位置，整体覆盖 ${fmt(meta.coverage*100,0)}%。缺失数据另作惩罚，不填为中性分。漫游使用途经点与返回路径搜索；它是近似解，不保证全局最优。也可以先选最多两处公园/花园附近的位置，按选择顺序串联路线；停留时间计入总预算。地点来源可在卡片中查看，目标是附近道路，未核验实际入口。</p></div><div class="method-block"><strong>04 · 反馈分别积累</strong><p>记录推荐曝光、路线选择、需求匹配及环境准确性；支持手动开始/结束漫步、前后心情自评、环境标签与图文记录，保存在当前浏览器并可导出。地点体验与路线体验分别关联。情绪自评变化不等同于路线造成的效果。尚未接入面部识别、自动评价词云或模型训练。</p></div>`;
    worker=new Worker('worker.mjs',{type:'module'});
    worker.onerror=()=>{state.ready=false;finishBusy();$('generate').disabled=true;toast('路线计算未能启动，请刷新页面重试。');};
    worker.onmessage=({data})=>{
      if(data.type==='ready'){state.ready=true;islandBridge.emit('hahaisland:route-ready');$('generate').disabled=false;if(state.activeWalk)restoreWalk();else generate(true);schedulePlaces();return;}
      if(data.type==='places-result'){
        if(data.id!==placesRequestId||data.revision!==state.revision)return;
        placeSuggestions=data.places;placeSuggestionsRevision=data.revision;renderPlaces();return;
      }
      if(data.type==='error'&&data.requestType==='places'){
        if(data.id===placesRequestId){$('places-status').textContent='地点暂时未能加载，可以直接生成路线';$('place-cards').classList.remove('stale');}return;
      }
      if(data.id!==activeId)return;finishBusy();
      if(data.type==='error'){toast(data.message);return;}
      if(state.pending.revision!==state.revision){toast('偏好已变化，请重新生成路线。');return;}
      state.context={...state.pending};$('map-match-context').textContent=state.context.inputSource==='scenario_example'?'示例偏好 · 四维等权匹配':'本次偏好 · 四维等权匹配';state.routes=data.routes.map(r=>({...r,id:`${activeId}:${r.id}`}));state.selected=0;
      log('recommendation_exposed',{requestId:activeId,context:state.context,routes:state.routes.map(routePayload)});renderHeat();paintResults();
    };
    worker.postMessage({type:'init',graph,places:placesData.places});
  }catch(e){$('loading-overlay').innerHTML=`<strong>暂时无法加载 Demo</strong><span>${esc(e.message)}</span><span>请使用本地服务地址打开，并检查数据文件。</span>`;$('map-status').textContent='数据加载未完成';console.error(e);}
}
function setStage(stage){
  const stages=['preference','route','experience'],index=stages.indexOf(stage);
  stages.forEach((s,i)=>{const el=$(`step-${s}`);el.classList.toggle('current',i===index);el.classList.toggle('done',i<index);});
}
function renderMood(id,value){$(id).querySelectorAll('button').forEach(b=>{const on=+b.dataset.value===value;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});}
function updateMoodComparison(){const before=feedbackTarget?.moodBefore;const text=before==null?'出发前未记录心情':`出发前自评 ${before} / 5`;$('mood-comparison').textContent=text+(moodAfter==null?'':`，体验后 ${moodAfter} / 5。仅记录你的感受变化。`);}
function updateWalkUI(){
  const active=!!state.activeWalk;$('walk-banner').hidden=!active;document.querySelector('.sidebar').inert=active;$('route-cards').inert=active;$('places-section').inert=active;$('generate-places').disabled=active||state.busy;
  $('start-walk').disabled=active;$('start-walk').textContent=active?'漫步进行中':'开始这段漫步 ↗';$('feedback-button').hidden=active;$('generate').disabled=active||state.busy;
  $('point-start').disabled=active;if(active)setPick(null);syncLocationControls();renderPlaceMarkers();
  if(!active){renderPlaces();schedulePlaces();}
  if(walkTimer)clearInterval(walkTimer);
  if(active){$('walk-title').textContent=`正在记录 · ${state.activeWalk.name}`;setStage('experience');const tick=()=>{const sec=Math.max(0,Math.floor((Date.now()-state.activeWalk.startedAt)/1000));$('walk-elapsed').textContent=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;};tick();walkTimer=setInterval(tick,1000);}
}
function startWalk(){
  const route=state.routes[state.selected];if(!route||state.activeWalk||state.context.revision!==state.revision)return;
  const walk={id:newLocalId(),startedAt:Date.now(),name:routeName(route),route:routePayload(route),context:structuredClone(state.context),moodBefore:state.moodBefore};
  if(!log('walk_started',{walkId:walk.id,requestId:walk.context.requestId,context:walk.context,route:walk.route,moodBefore:walk.moodBefore,tracking:'manual_no_gps'}))return;
  state.activeWalk=walk;try{localStorage.setItem('lantu.activeWalk.v1',JSON.stringify(walk));}catch{toast('本次计时仅在当前页面有效，关闭页面后无法恢复。');}updateWalkUI();$('walk-banner').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function restoreWalk(){
  const w=state.activeWalk;
  if(w.context.sourceSha256!==meta.sourceSha256||w.route.nodes.some(n=>!graph.nodes[n])){state.activeWalk=null;localStorage.removeItem('lantu.activeWalk.v1');toast('保存的漫步使用了不同数据，请重新生成路线。');generate(true);return;}
  state.context=w.context;state.revision=w.context.revision;state.answers=[...w.context.answers];state.priority=w.context.priority??null;state.tripType=w.context.end===null?'loop':'destination';state.minutes=w.context.minutes;state.moodBefore=w.moodBefore;state.stops=w.context.stops??[];state.stayMinutes=w.context.stayMinutes??5;renderPlaces();
  state.startXY=graph.nodes[w.context.start];if(w.context.end!==null)state.endXY=graph.nodes[w.context.end];
  for(const id of ['start-select','end-select']){$(id).querySelector('[value="custom"]').hidden=false;$(id).value='custom';}
  state.routes=[{...w.route,score:aggregate(w.route.groups,w.context.priority??null)}];state.selected=0;refreshControls();renderMood('mood-before',state.moodBefore);renderMarkers();renderHeat();paintResults();finishBusy();updateWalkUI();$('map-match-context').textContent=w.context.priority==null?'本次漫步 · 四维等权匹配':'原漫步 · 沿用开始时的优先维度';
}
function openFeedback(kind,finishing=false){
  const route=finishing?state.activeWalk?.route:state.routes[state.selected];
  if(kind==='point'&&!currentPoint||kind==='route'&&!route)return;
  const context=kind==='point'?{answers:[...state.answers],priority:null,weights:[.25,.25,.25,.25],mappingVersion:meta.mappingVersion,matchingVersion:MATCH_VERSION,sourceSha256:meta.sourceSha256,inputSource:'point_feedback'}:structuredClone(finishing?state.activeWalk.context:state.context);
  feedbackTarget={kind,finishing,context,route:kind==='route'?routePayload(route):null,moodBefore:kind==='route'?(finishing?state.activeWalk.moodBefore:state.moodBefore):null,
    target:kind==='point'?{kind:'point',id:currentPoint.id,xy:[...currentPoint.xy],imageDate:currentPoint.date}:{kind:'route',id:route.id},
    name:kind==='point'?`街景点位 ${currentPoint.id}`:finishing?state.activeWalk.name:routeName(route)};
  $('feedback-form').reset();moodAfter=null;feedbackPhoto=null;photoRevision++;photoBusy=false;$('save-feedback').disabled=false;$('feedback-photo-preview').hidden=true;
  if($('feedback-status'))$('feedback-status').hidden=true;
  $('feedback-tags').querySelectorAll('button').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false');});renderMood('mood-after',null);
  $('feedback-title').textContent=kind==='point'?'这段环境，给你什么感受？':finishing?'走完之后，感觉怎么样？':'这条推荐，符合你的期待吗？';
  $('feedback-target').textContent=feedbackTarget.name+(kind==='route'?` · 预计 ${fmt(route.minutes,0)} 分钟`:' · 评价会关联到这个位置');
  $('fit-label').textContent=kind==='point'?'这里符合你的活动需求吗？':'这条推荐符合你的需求吗？';
  // Finishing a timer does not prove route completion. Ask for the user's report.
  $('feedback-form').elements.visit.value=finishing?'partial':'not_visited';refreshFeedbackVisit();$('feedback-dialog').showModal();
}
function refreshFeedbackVisit(){const visited=$('feedback-form').elements.visit.value!=='not_visited';$('visited-fields').hidden=!visited;updateMoodComparison();}
async function submitFeedback(e){
  e.preventDefault();if(!feedbackTarget||photoBusy||feedbackSaving)return;feedbackSaving=true;const button=$('save-feedback');button.disabled=true;
  const target=structuredClone(feedbackTarget),f=new FormData(e.target),visit=f.get('visit'),visited=visit!=='not_visited';
  const feedback={fit:f.get('fit'),visit,accuracy:visited?f.get('accuracy'):'not_visited',note:f.get('note'),moodBefore:target.moodBefore,moodAfter:visited?moodAfter:null,
    tags:visited?[...$('feedback-tags').querySelectorAll('[aria-pressed="true"]')].map(b=>b.textContent):[],photoId:null};
  e.target.inert=true;$('feedback-dialog').querySelector('.dialog-close').disabled=true;
  try{
    feedback.photoId=feedbackPhoto?await savePhoto(feedbackPhoto):null;
    const active=target.finishing?state.activeWalk:null;
    const saved=log('feedback',{requestId:target.context.requestId??null,context:target.context,route:target.route,target:target.target,targetName:target.name,
      ...(active?{walkId:active.id,elapsedSeconds:Math.max(0,Math.floor((Date.now()-active.startedAt)/1000)),tracking:'manual_no_gps'}:{}),feedback});
    if(!saved)return;
    if(active){
      log('walk_ended',{walkId:active.id,requestId:active.context.requestId,selfReportedVisit:visit});
      islandBridge.emit('hahaisland:walk-finished',{walkId:active.id,route:routeSummary(active.route),answers:[...active.context.answers],elapsedSeconds:Math.max(0,Math.floor((Date.now()-active.startedAt)/1000)),visit,finishedAt:new Date().toISOString()});
      state.activeWalk=null;localStorage.removeItem('lantu.activeWalk.v1');updateWalkUI();if(active.context.matchingVersion!==MATCH_VERSION){state.priority=null;markDirty();}
    }
    $('feedback-dialog').close();renderPointCommunity();setStage('experience');toast('体验已保存，可在「我的漫步记录」查看图文与心情。');
  }catch(err){toast(`未能保存照片或体验：${err.message}`);}finally{button.disabled=false;feedbackSaving=false;e.target.inert=false;$('feedback-dialog').querySelector('.dialog-close').disabled=false;}
}
async function showHistory(){
  const entries=events.filter(e=>e.type==='feedback').reverse();
  $('history-list').innerHTML=entries.length?entries.map(e=>{
    const f=e.feedback||{},hasMood=f.moodBefore!=null||f.moodAfter!=null;
    return `<article class="history-item"><small>${esc(new Date(e.time).toLocaleString('zh-CN'))} · ${e.target?.kind==='point'?'地点体验':'路线体验'}${e.route?` · 预计 ${fmt(e.route.minutes,0)} 分钟`:''}</small><strong>${esc(e.targetName||'一次漫步反馈')}</strong><div class="history-status">${({yes:'符合当次需求',partly:'部分符合需求',no:'不符合当次需求'})[f.fit]||'已记录反馈'} · ${({not_visited:'还未体验',partial:'体验了一部分',completed:'自报已走完'})[f.visit]||(f.accuracy==='not_visited'?'还未体验':'已评价')}</div>${hasMood?`<div class="mood-record">心情自评：${f.moodBefore??'未填'} → ${f.moodAfter??'未填'} <span>/ 5</span></div>`:''}${f.tags?.length?`<div class="record-tags">${f.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div>`:''}<p>${esc(f.note||'没有补充文字')}</p>${f.photoId?`<img class="journal-photo" data-photo-id="${esc(f.photoId)}" alt="这次体验的照片" hidden>`:''}${e.elapsedSeconds!=null?`<small>手动记录时长 ${Math.floor(e.elapsedSeconds/60)} 分 ${e.elapsedSeconds%60} 秒，不代表实际行走距离。</small>`:''}</article>`;
  }).join(''):'<div class="empty-state">还没有体验记录。<br>选一条路线开始漫步，或给街景点位留下一点感受。</div>';
  $('history-dialog').showModal();
  for(const img of $('history-list').querySelectorAll('[data-photo-id]')){try{const p=await readPhoto(img.dataset.photoId);if(p){img.src=p.dataUrl;img.hidden=false;}else img.replaceWith(document.createTextNode('照片已不可用'));}catch{img.replaceWith(document.createTextNode('照片暂时无法读取'));}}
}
async function exportHistory(){
  const button=$('export-history');button.disabled=true;
  try{const ids=[...new Set(events.flatMap(e=>e.feedback?.photoId?[e.feedback.photoId]:[]))];const photos=(await Promise.all(ids.map(readPhoto))).filter(Boolean);
    const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),meta,events,photos},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='lantu-walk-feedback.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch{toast('导出未完成，请稍后重试。');}finally{button.disabled=false;}
}
init();
