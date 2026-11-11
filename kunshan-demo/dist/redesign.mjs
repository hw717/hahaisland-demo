// Figma v6L3SP6qjCrXOfXKyBLTm2, inspected through its allowed read-only viewer.
// This adapter changes presentation and entry points, never task coordinates.
import './island-activities.mjs';
const api = window.HahaIsland;
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const paths = {
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15m6-12v15"/>',
  island: '<path d="m3 15 9-5 9 5-9 6-9-6Z"/><path d="M12 10V3m0 0 6 2-6 3"/>',
  route: '<circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M6 7v8a4 4 0 0 0 8 0V9a4 4 0 0 1 4-4h3"/>',
  tasks: '<rect x="5" y="4" width="15" height="17" rx="3"/><path d="M9 4V2m7 2V2M9 10h7m-7 5h5"/>',
  layers: '<path d="m3 7 9-4 9 4-9 4-9-4Zm0 5 9 4 9-4M3 17l9 4 9-4"/>',
  menu: '<path d="M5 6h14M5 12h14M5 18h14"/>',
  filter: '<path d="M6 4v16m6-16v16m6-16v16M3 9h6m0 6h6m0-8h6"/>',
  back: '<path d="m14 5-7 7 7 7"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.map}</svg>`;
const date = () => new Intl.DateTimeFormat('zh-CN', {timeZone:'Asia/Shanghai',year:'numeric',month:'long',day:'numeric'}).format(new Date());

const menuButton = document.createElement('button');
menuButton.type = 'button';
menuButton.className = 'redesign-round redesign-menu-button';
menuButton.setAttribute('aria-label', '打开探索菜单');
menuButton.setAttribute('aria-expanded', 'false');
menuButton.setAttribute('aria-controls', 'exploreMenu');
menuButton.innerHTML = icon('menu');
$('.topbar').append(menuButton);

const menu = document.createElement('nav');
menu.id = 'exploreMenu'; menu.className = 'redesign-menu'; menu.hidden = true;
menu.setAttribute('aria-label', '探索菜单');
const menuActions = [
  ['我的岛', 'island', () => openMyIsland()],
  ['岛上活动', 'island', () => {closeMyIsland();api.activities();}],
  ['任务清单', 'tasks', () => api.tasks()],
  ['个人档案', 'island', () => api.profile()],
  ['个性化寻路', 'route', () => api.navigation()],
  ['地图图层', 'layers', () => api.layers()],
  ['虚拟位置', 'map', () => { closeMyIsland(); api.virtualLocation(); }]
];
for (const [label, name, action] of menuActions) {
  const button = document.createElement('button'); button.type = 'button';
  button.innerHTML = `${icon(name)}<span>${label}</span><i aria-hidden="true">›</i>`;
  button.addEventListener('click', () => { closeMenu(); if (api.snapshot()) action(); });
  menu.append(button);
}
document.body.append(menu);
function closeMenu() { menu.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); }
menuButton.addEventListener('click', () => { menu.hidden = !menu.hidden; menuButton.setAttribute('aria-expanded', String(!menu.hidden)); });
document.addEventListener('pointerdown', event => { if (!menu.hidden && !menu.contains(event.target) && !menuButton.contains(event.target)) closeMenu(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !menu.hidden) {closeMenu(); menuButton.focus();} });

const filter = document.createElement('button'); filter.type = 'button';
filter.className = 'redesign-round redesign-filter'; filter.setAttribute('aria-label', '地图图层与显示设置');
filter.innerHTML = icon('filter'); filter.addEventListener('click', () => { if (api.snapshot()) api.layers(); });
$('#mapViewport').append(filter);

const start = document.createElement('button'); start.type = 'button'; start.id = 'beginExploration';
start.className = 'redesign-start'; start.textContent = '开始探索';
start.addEventListener('click', () => { if (!api.snapshot()) return; api.explore(); start.hidden = true; });
$('#mapViewport').append(start);

const nav = $('.side-nav');
const navMap = nav.querySelector('[data-view="map"]');
const navHome = nav.querySelector('[data-view="home"]');
nav.prepend(navMap);
for (const [button, name, label] of [
  [navMap, 'map', '探索地图'], [navHome, 'island', '我的岛'],
  [nav.querySelector('[data-view="route"]'), 'route', '个性化寻路'],
  [nav.querySelector('[data-tip="任务"]'), 'tasks', '任务清单']
]) {
  button.innerHTML = `${icon(name)}<span class="redesign-nav-label">${label}</span>`;
  button.setAttribute('aria-label', label);
}
nav.querySelector('[data-tip="图层"]').hidden = true;

const myIsland = document.createElement('section');
myIsland.className = 'my-island-view'; myIsland.id = 'myIslandView'; myIsland.hidden = true;
myIsland.setAttribute('aria-label', '我的岛');
document.body.append(myIsland);
let selectedIsland = null;
let islandOpener = null;

function storedWalkCount() {
  try { const records = JSON.parse(localStorage.getItem('hahaisland.walks.v1') || '[]'); return Array.isArray(records) ? records.length : 0; }
  catch { return 0; }
}

function renderMyIsland() {
  const snapshot = api.snapshot(); if (!snapshot) return;
  const current = snapshot.islands.find(island => island.id === selectedIsland) || snapshot.islands[0];
  selectedIsland = current.id;
  const visited = snapshot.islands.filter(island => island.completed + island.activityCompleted > 0).length;
  const image = current.id === 'healing' ? './assets/redesign/healing-island.png' : current.image;
  const combinedTotal = snapshot.total + snapshot.activityTotal;
  const combinedDone = snapshot.completed + snapshot.activityCompleted;
  const progress = combinedTotal ? Math.round(combinedDone / combinedTotal * 100) : 0;
  myIsland.innerHTML = `<article class="my-island-page">
    <header class="my-island-header"><button type="button" class="redesign-round" data-island-back aria-label="返回探索地图">${icon('back')}</button><h1>我的岛</h1><button type="button" class="redesign-round" data-island-profile aria-label="查看个人档案">${icon('menu')}</button></header>
    <div class="my-island-identity"><span class="my-island-avatar"><img src="./assets/player-explorer.png" alt=""></span><b>岛屿漫游者</b><span class="my-island-guide">${esc(current.npcName)}带你探索</span></div>
    <div class="my-island-stats"><div><b>${combinedDone}</b><small>探索足迹</small></div><div><b>${visited}</b><small>探索岛屿</small></div><div><b>${storedWalkCount()}</b><small>漫步记录</small></div></div>
    <div class="my-island-progress" role="progressbar" aria-label="探索任务进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><i style="width:${progress}%"></i></div>
    <section class="my-island-feature"><header><h2>${esc(current.name)}</h2><small>${date()} · ${current.total ? `${current.completed} / ${current.total} 个实景任务` : `${current.activityCompleted} / ${current.activityTotal} 个岛上活动`}</small></header><button type="button" class="my-island-art ${current.id === 'healing' ? 'is-source-art' : ''}" data-enter-island aria-label="进入${esc(current.name)}"><img src="${esc(image)}" alt="${esc(current.name)}" draggable="false"></button><p>${esc(current.subtitle)}</p></section>
    <div class="my-island-dots" aria-hidden="true">${snapshot.islands.map(island => `<i class="${island.id === current.id ? 'is-current' : ''}"></i>`).join('')}</div>
    <nav class="my-island-picker" aria-label="选择岛屿">${snapshot.islands.map(island => `<button type="button" data-island-choice="${esc(island.id)}" aria-pressed="${island.id === current.id}"><span><img src="${esc(island.id === 'healing' ? './assets/redesign/healing-island.png' : island.image)}" alt="" draggable="false"></span><b>${esc(island.name.replace(' BASE',''))}</b></button>`).join('')}</nav>
    <button type="button" class="redesign-start my-island-enter" data-enter-island>进入${esc(current.name.replace(' BASE',''))}</button>
    ${current.total?'<button type="button" class="my-island-activity-link" data-open-activities>看看岛上活动与收藏 →</button>':''}
    <button type="button" class="my-island-route" data-island-route>${icon('route')}为下一段通勤，找一条喜欢的路<span>↗</span></button>
  </article>`;
  myIsland.querySelector('[data-island-back]').addEventListener('click', closeMyIsland);
  myIsland.querySelector('[data-island-profile]').addEventListener('click', () => api.profile());
  myIsland.querySelectorAll('[data-island-choice]').forEach(button => button.addEventListener('click', () => {selectedIsland = button.dataset.islandChoice; renderMyIsland();}));
  myIsland.querySelectorAll('[data-enter-island]').forEach(button => button.addEventListener('click', () => {closeMyIsland(); api.visitIsland(selectedIsland);}));
  myIsland.querySelector('[data-open-activities]')?.addEventListener('click',()=>{closeMyIsland();api.activities(selectedIsland);});
  myIsland.querySelector('[data-island-route]').addEventListener('click', () => api.navigation());
  if (!myIsland.hidden) centerIslandPicker();
}

function centerIslandPicker() {
  const picker = myIsland.querySelector('.my-island-picker');
  const active = picker?.querySelector('[aria-pressed="true"]');
  if (!active) return;
  const selectedRect = active.getBoundingClientRect();
  const pickerRect = picker.getBoundingClientRect();
  picker.scrollLeft += selectedRect.left - pickerRect.left - (picker.clientWidth - selectedRect.width) / 2;
}

function openMyIsland() {
  const snapshot = api.snapshot(); if (!snapshot) return;
  closeHub(); closeMenu(); islandOpener = document.activeElement; selectedIsland = snapshot.islandId;
  renderMyIsland(); myIsland.hidden = false;
  myIsland.scrollTop = 0;
  centerIslandPicker();
  document.body.classList.add('is-my-island'); $('#mapViewport').inert = true;
  document.dispatchEvent(new CustomEvent('hahaisland:my-island-visibility', {detail:{open:true}}));
  myIsland.querySelector('[data-island-back]').focus();
}

function closeMyIsland() {
  if (myIsland.hidden) return;
  myIsland.hidden = true; document.body.classList.remove('is-my-island'); $('#mapViewport').inert = false;
  document.dispatchEvent(new CustomEvent('hahaisland:my-island-visibility', {detail:{open:false}}));
  if (islandOpener?.isConnected && islandOpener.getClientRects().length) islandOpener.focus();
  else navHome.focus();
}

function refreshHeader() {
  const snapshot = api.snapshot(); if (!snapshot) return;
  const current = snapshot.islands.find(island => island.id === snapshot.islandId);
  $('.profile-copy strong').textContent = '岛屿漫游者';
  $('.profile-copy small').textContent = `${date()} · ${current?.name || '斓图'}`;
  $('.profile-button').setAttribute('aria-label', '查看漫游者档案');
  const location = $('#locationDebugToggle b'); if (location) location.textContent = '虚拟位置';
  $('#locationDebugToggle').setAttribute('aria-label', '虚拟位置调试');
  $('#referenceMapToggle').setAttribute('aria-label', '展开权威地图对照');
  $('#locateButton').setAttribute('aria-label', '回到当前角色位置');
  const simulation = $('#locationDebugToggle small'); if (simulation) simulation.textContent = '演示';
}

document.documentElement.classList.add('redesign-ready');
document.addEventListener('hahaisland:open-my-island', openMyIsland);
document.addEventListener('hahaisland:map-open', () => {closeMyIsland(); closeHub(); closeMenu(); start.hidden = false; refreshHeader();});
document.addEventListener('keydown', event => {if (!event.defaultPrevented && event.key === 'Escape' && !myIsland.hidden && !$('#playLayer').classList.contains('is-open') && !$('#islandRoutePlanner')?.open) closeMyIsland();});
const hub = document.createElement('section');hub.id='islandActivityHub';hub.className='island-hub-view';hub.hidden=true;hub.setAttribute('aria-label','岛上活动');document.body.append(hub);
let hubIsland = null, hubTab = 'activities';
function renderHub() {
  if(hub.hidden)return;
  const snapshot=api.snapshot(), island=snapshot.islands.find(item=>item.id===hubIsland);if(!island)return;
  const art=island.id==='healing'?'./assets/redesign/healing-island.png':island.image;
  const records=island.activities.filter(activity=>activity.record);
  hub.innerHTML=`<article class="island-hub-page"><header class="my-island-header"><button type="button" class="redesign-round" data-hub-back aria-label="返回我的岛">${icon('back')}</button><h1>${esc(island.name)}</h1><button type="button" class="redesign-round" data-hub-profile aria-label="查看漫游者档案">${icon('menu')}</button></header>
    <div class="hub-hero ${island.id==='healing'?'has-source-art':''}"><img src="${esc(art)}" alt="${esc(island.name)}"><div><small>YOUR ISLAND MOMENT</small><h2>今天，在岛上做点什么？</h2><p>${esc(island.subtitle)}</p></div><span>${island.activityCompleted} / ${island.activityTotal} 已完成</span></div>
    <div class="hub-guide"><img src="${esc(island.npc)}" alt="${esc(island.npcName)}"><div><b>${esc(island.npcName)}</b><p>选一个喜欢的活动，完成后把今天的发现带走。</p></div></div>
    <div class="hub-tabs" role="group" aria-label="岛屿内容"><button type="button" data-hub-tab="activities" aria-pressed="${hubTab==='activities'}">岛上活动 <small>${island.activityTotal}</small></button><button type="button" data-hub-tab="records" aria-pressed="${hubTab==='records'}">我的收藏 <small>${records.length}</small></button></div>
    ${hubTab==='activities'?`<div class="hub-activity-list">${island.activities.map((activity,index)=>`<article class="hub-activity-card ${activity.status==='locked'?'is-locked':''}"><div class="hub-activity-number">${String(index+1).padStart(2,'0')}</div><div class="hub-activity-copy"><small>${activity.status==='completed'?'已完成 ✓':activity.status==='locked'?'等待解锁':'随时开始'} · ${esc(activity.duration)}</small><h3>${esc(activity.title)}</h3><p>${esc(activity.description)}</p><span class="hub-reward">✦ ${esc(activity.reward)}</span>${activity.requires&&activity.status==='locked'?`<p class="hub-unlock">完成「${esc(activity.requires)}」后解锁</p>`:''}<div class="hub-card-actions"><button type="button" data-play-activity="${esc(activity.id)}" ${activity.status==='locked'?'disabled':''}>${activity.status==='completed'?'再体验一次':activity.status==='locked'?'等待解锁':'开始体验'}${activity.status!=='locked'?' ↗':''}</button>${activity.record?`<button type="button" class="hub-record-link" data-view-record="${esc(activity.id)}">查看记录</button>`:''}</div></div></article>`).join('')}</div>`:
      records.length?`<div class="hub-records">${records.map(activity=>`<button type="button" data-view-record="${esc(activity.id)}">${activity.record.artwork?`<img src="${esc(activity.record.artwork)}" alt="${esc(activity.title)}作品">`:'<span class="record-mark">✦</span>'}<div><small>${esc(new Date(activity.record.completedAt).toLocaleDateString('zh-CN'))}</small><b>${esc(activity.title)}</b><p>${esc(activity.record.summary)}</p><em>打开收藏 →</em></div></button>`).join('')}</div>`:'<div class="hub-empty"><span>✧</span><h3>给今天留下一点纪念</h3><p>完成任意岛上活动，这里就会出现你的记录。</p><button type="button" data-go-activities>去选一个活动 →</button></div>'}
    <footer class="hub-footer"><span>活动与收藏保存在这台设备</span><button type="button" data-hub-route>为下一程找条喜欢的路 ↗</button></footer></article>`;
  hub.querySelector('[data-hub-back]').addEventListener('click',openMyIsland);
  hub.querySelector('[data-hub-profile]').addEventListener('click',()=>api.profile());
  hub.querySelectorAll('[data-hub-tab]').forEach(button=>button.addEventListener('click',()=>{hubTab=button.dataset.hubTab;renderHub();}));
  hub.querySelector('[data-go-activities]')?.addEventListener('click',()=>{hubTab='activities';renderHub();});
  hub.querySelectorAll('[data-play-activity]').forEach(button=>button.addEventListener('click',()=>api.playActivity(hubIsland,button.dataset.playActivity)));
  hub.querySelectorAll('[data-play-activity]').forEach(button=>{
    const title=button.closest('article').querySelector('h3').textContent;
    button.setAttribute('aria-label',(button.disabled?'等待解锁':button.textContent.includes('再体验')?'再次体验':'开始体验')+title);
  });
  hub.querySelectorAll('[data-view-record]').forEach(button=>button.addEventListener('click',()=>api.activityRecord(hubIsland,button.dataset.viewRecord)));
  hub.querySelector('[data-hub-route]').addEventListener('click',()=>api.navigation());
}
function openHub(islandId) {
  closeMyIsland();closeMenu();hubIsland=islandId;hubTab='activities';hub.hidden=false;
  document.body.classList.add('is-island-hub');$('#mapViewport').inert=true;
  document.dispatchEvent(new CustomEvent('hahaisland:my-island-visibility',{detail:{open:true}}));
  renderHub();hub.scrollTop=0;hub.querySelector('[data-hub-back]').focus();refreshHeader();
}
function closeHub() {
  if(hub.hidden)return;hub.hidden=true;document.body.classList.remove('is-island-hub');$('#mapViewport').inert=false;
  document.dispatchEvent(new CustomEvent('hahaisland:my-island-visibility',{detail:{open:false}}));
}
document.addEventListener('hahaisland:open-island-activities',event=>openHub(event.detail.islandId));
document.addEventListener('hahaisland:progress-changed',()=>{renderHub();if(!myIsland.hidden)renderMyIsland();});
document.addEventListener('hahaisland:game-closed',()=>{renderHub();if(!hub.hidden&&document.activeElement===document.body)hub.querySelector('[data-hub-back]').focus();});
document.addEventListener('keydown',event=>{if(!event.defaultPrevented&&event.key==='Escape'&&!hub.hidden&&!$('#playLayer').classList.contains('is-open')&&!$('#islandRoutePlanner')?.open)openMyIsland();});
let initialized = false;
function ready() {
  if (initialized || !api.snapshot()) return;
  initialized = true; api.enterIsland(api.snapshot().islandId); refreshHeader();
}
document.addEventListener('hahaisland:ready', ready);
ready();
