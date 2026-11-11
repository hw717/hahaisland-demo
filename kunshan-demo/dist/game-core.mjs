/** Serializable, immutable building state shared by the browser and room server. */
export const TYPES = Object.freeze(['building', 'gray', 'landscape', 'empty']);
export const MODULES = Object.freeze(['cube', 'cylinder', 'cone', 'prism', 'cross']);
export const colors = Object.freeze(['#f7f9f7', '#ff8a25', '#ed72ab', '#e5ee3f', '#67bdc7', '#9ecbad', '#9d96c9', '#d9bd95']);
const MAX_HISTORY = 60;
const clone = value => JSON.parse(JSON.stringify(value));
const structural = layer => layer && (layer.type === 'building' || layer.type === 'gray');
const snapshot = world => ({ cells: clone(world.cells), events: clone(world.events) });

export function createWorld() {
  return { version: 1, size: 6, cells: Array.from({ length: 36 }, (_, i) => ({ x: i % 6, y: Math.floor(i / 6), layers: [] })), history: [], future: [], events: [] };
}

function validLayer(layer) {
  return layer && typeof layer === 'object' && TYPES.includes(layer.type) && layer.type !== 'empty' &&
    MODULES.includes(layer.module) && colors.includes(layer.color) && [0, 90, 180, 270].includes(layer.rotation) &&
    Number.isInteger(layer.window) && layer.window >= 0 && layer.window <= 5 &&
    Number.isInteger(layer.trees) && layer.trees >= 0 && layer.trees <= 5 &&
    (layer.type === 'landscape' ? layer.window === 0 : layer.trees === 0);
}

function validCells(cells) {
  return Array.isArray(cells) && cells.length === 36 && Array.from(cells).every((cell, i) =>
    cell && cell.x === i % 6 && cell.y === Math.floor(i / 6) && Array.isArray(cell.layers) &&
    cell.layers.length <= 2 && Array.from(cell.layers).every(validLayer) &&
    (cell.layers.length !== 2 || (structural(cell.layers[0]) && structural(cell.layers[1]))));
}

function validEvents(events) {
  return Array.isArray(events) && events.length <= 1000 && events.every(event => event &&
    Number.isInteger(event.x) && event.x >= 0 && event.x < 6 && Number.isInteger(event.y) && event.y >= 0 && event.y < 6 &&
    [0, 1].includes(event.floor) && Array.isArray(event.fields) && event.fields.every(field =>
      ['type', 'module', 'window', 'trees', 'color', 'rotation'].includes(field)));
}

export function validateWorld(world) {
  return Boolean(world && world.version === 1 && world.size === 6 && validCells(world.cells) && validEvents(world.events) &&
    ['history', 'future'].every(key => Array.isArray(world[key]) && world[key].length <= MAX_HISTORY &&
      Array.from(world[key]).every(entry => entry && validCells(entry.cells) && validEvents(entry.events))));
}

/** Invalid coordinates or impossible upper floors are rejected, never silently moved. */
export function updateCell(world, x, y, patch, { floor = 0 } = {}) {
  if (!validateWorld(world)) throw new TypeError('无效的空间数据');
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= 6 || y < 0 || y >= 6 || ![0, 1].includes(floor)) throw new RangeError('地块或楼层超出范围');
  if (!patch || typeof patch !== 'object' || Object.keys(patch).some(key => !['type', 'module', 'window', 'trees', 'color', 'rotation'].includes(key))) throw new TypeError('无效的编辑操作');
  const cell = world.cells[y * 6 + x];
  const layers = clone(cell.layers);
  if (patch.type === 'empty') layers.splice(floor);
  else {
    const next = { type: 'building', module: 'cube', window: 0, trees: 0, color: colors[0], rotation: 0, ...layers[floor], ...patch };
    if (next.type === 'landscape') next.window = 0;
    else next.trees = 0;
    if (!validLayer(next)) throw new TypeError('模块、颜色或细节无效');
    if (floor === 1 && (!structural(layers[0]) || !structural(next))) throw new RangeError('第二层只能放在建筑或灰空间上');
    layers[floor] = next;
    if (!structural(next)) layers.splice(1);
  }
  if (JSON.stringify(layers) === JSON.stringify(cell.layers)) return world;
  const next = { ...world, cells: [...world.cells], history: [...world.history, snapshot(world)].slice(-MAX_HISTORY), future: [],
    events: [...world.events, { x, y, floor, fields: Object.keys(patch) }].slice(-1000) };
  next.cells[y * 6 + x] = { x, y, layers };
  return next;
}

export function undoWorld(world) {
  if (!validateWorld(world)) throw new TypeError('无效的空间数据');
  if (!world.history.length) return world;
  const previous = world.history.at(-1);
  return { ...world, cells: clone(previous.cells), events: clone(previous.events), history: world.history.slice(0, -1), future: [...world.future, snapshot(world)].slice(-MAX_HISTORY) };
}

export function redoWorld(world) {
  if (!validateWorld(world)) throw new TypeError('无效的空间数据');
  if (!world.future.length) return world;
  const following = world.future.at(-1);
  return { ...world, cells: clone(following.cells), events: clone(following.events), history: [...world.history, snapshot(world)].slice(-MAX_HISTORY), future: world.future.slice(0, -1) };
}

export function serializeWorld(world) {
  if (!validateWorld(world)) throw new TypeError('无法保存无效空间');
  return JSON.stringify(world);
}

/** Peers need the current build and clues; local undo snapshots stay on the creator's device. */
export function worldForSharing(world) {
  if (!validateWorld(world)) throw new TypeError('无法分享无效空间');
  return { version: 1, size: 6, ...snapshot(world), history: [], future: [] };
}

export function parseWorld(value) {
  try { const result = typeof value === 'string' ? JSON.parse(value) : value; return validateWorld(result) ? clone(result) : createWorld(); }
  catch { return createWorld(); }
}

/** Playful spatial indicators, not a psychological assessment. Values describe actual work. */
export function analyzeWorld(world) {
  if (!validateWorld(world)) throw new TypeError('无效的空间数据');
  const counts = { building: 0, gray: 0, landscape: 0, empty: 0, trees: 0, windows: 0, floors: 0, occupied: 0, edits: world.events.length };
  const modules = new Set(), palette = new Set();
  let edge = 0, matching = 0, adjacencies = 0;
  for (const cell of world.cells) {
    if (!cell.layers.length) counts.empty++;
    else counts.occupied++;
    for (const layer of cell.layers) { counts[layer.type]++; counts.trees += layer.trees; counts.windows += layer.window > 0 ? 1 : 0; counts.floors++; modules.add(layer.module); palette.add(layer.color); }
    if (cell.layers.length && (cell.x === 0 || cell.x === 5 || cell.y === 0 || cell.y === 5)) edge++;
    for (const neighbor of [[cell.x + 1, cell.y], [cell.x, cell.y + 1]]) {
      if (neighbor[0] > 5 || neighbor[1] > 5) continue;
      const a = cell.layers[0], b = world.cells[neighbor[1] * 6 + neighbor[0]].layers[0];
      if (a && b) { adjacencies++; if (a.type === b.type && a.color === b.color && a.module === b.module) matching++; }
    }
  }
  const denominator = counts.floors + 4;
  const clamp = value => Math.max(0, Math.min(1, value));
  const dimensions = [
    clamp((counts.gray + counts.landscape * 0.65 + counts.windows * 0.45 + edge * 0.25 + 2) / denominator),
    clamp((modules.size * 0.75 + Math.max(0, counts.floors - counts.occupied) * 0.6 + palette.size * 0.35 + 1) / (counts.floors * 0.45 + 4)),
    clamp((counts.landscape + counts.trees * 0.3 + counts.windows * 0.2 + 2) / denominator),
    clamp((matching + 2) / (adjacencies + 4)),
  ];
  return { dimensions, type: dimensions.map((value, i) => value >= 0.5 ? ['E', 'N', 'F', 'J'][i] : ['I', 'S', 'T', 'P'][i]).join(''), counts,
    labels: ['开放与交流 E', '变化与想象 N', '自然与感受 F', '秩序与规划 J'],
    description: counts.occupied ? `已布置 ${counts.occupied} 块地块，${counts.floors} 个模块，${counts.trees} 组树木。` : '开始建造后，空间线索会随你的实际选择更新。' };
}
