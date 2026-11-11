export const MOBILE_VERSION = 'figma-10.23/1.0';
export const SLIDER_PAIRS = [['回游','探新'],['静谧','活力'],['修复','激活'],['可规划','漫游']];

// Figma reverses the first three engine axes. Keep visual endpoints and road
// matching consistent, rather than just renaming the old sliders.
export function toEngineAnswers(values) {
  if (!Array.isArray(values) || values.length !== 4 || !values.every(v => Number.isFinite(v) && v >= 0 && v <= 1)) throw Error('请检查四组偏好');
  return [1-values[0], 1-values[1], 1-values[2], values[3]];
}
export function toVisualAnswers(values) { return toEngineAnswers(values); }
export function planningParams(graph, nearestNode, state) {
  const start = nearestNode(graph, state.start);
  const end = state.mode === 'destination' && state.end ? nearestNode(graph, state.end) : null;
  if (state.mode === 'destination' && !end) throw Error('先在地图上选一个终点');
  if (start.distance > 180 || (end && end.distance > 180)) throw Error('请在附近道路上选点');
  if (end?.id === start.id) throw Error('起点和终点需要不同');
  if (!Number.isFinite(state.minutes) || state.minutes < 5 || state.minutes > 120) throw Error('请选择 5–120 分钟');
  if (!Array.isArray(state.stops) || state.stops.length > 2) throw Error('最多加入两处途经点');
  return {start:start.id,end:end?.id??null,minutes:state.minutes,answers:toEngineAnswers(state.values),priority:null,waypoints:state.stops.map(p=>p.node),stayMinutes:state.stayMinutes,...(state.solar?{solar:state.solar}:{})};
}
export function haversine(a,b) {
  if (!a || !b) return Infinity;
  const rad = Math.PI/180, lat=(b[1]-a[1])*rad, lng=(b[0]-a[0])*rad;
  const v=Math.sin(lat/2)**2+Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin(lng/2)**2;
  return 6371000*2*Math.atan2(Math.sqrt(v),Math.sqrt(1-v));
}
export function taskInRange(position,point) { return haversine(position,[point.lng,point.lat]) <= 10; }
export function routeName(graph,route) {
  const names=new Map();
  for(const id of route.edges){const e=graph.edges[id];if(e.name&&e.name!=='步行连接道')names.set(e.name,(names.get(e.name)||0)+e.d);}
  return [...names].sort((a,b)=>b[1]-a[1])[0]?.[0] || '街区小径';
}
export function readJSON(storage,key,fallback) {
  try { const v=JSON.parse(storage.getItem(key)); return v??fallback; } catch { return fallback; }
}
export function recordList(value) { return Array.isArray(value)?value.filter(v=>v&&typeof v==='object'):[]; }
export function validActiveWalk(value,graph,sourceSha256) {
  return !!(value && value.context && ['loop','destination'].includes(value.context.mode) && Number.isFinite(value.context.minutes) && value.context.minutes>=5 && value.context.minutes<=120 && Number.isInteger(value.context.revision) && Array.isArray(value.context.start) && value.context.start.length===2 && value.context.start.every(Number.isFinite) && typeof value.id==='string' && Number.isFinite(value.startedAt) && value.sourceSha256===sourceSha256 && value.route?.nodes?.length>1 && value.route.nodes.every(n=>Number.isInteger(n)&&graph.nodes[n]) && value.route.edges?.every(e=>Number.isInteger(e)&&graph.edges[e]) && value.answers?.length===4 && value.answers.every(v=>Number.isFinite(v)&&v>=0&&v<=1) && Number.isFinite(value.route.length) && value.route.length>0 && Number.isFinite(value.route.minutes) && value.route.minutes>0);
}
