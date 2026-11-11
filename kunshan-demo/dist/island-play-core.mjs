// Game rules are shared by the activity UI and the completion gate.
export const plantTraits = [
  {name:'银杏', trait:'扇形叶', symbol:'◒'},
  {name:'松树', trait:'针状叶', symbol:'♧'},
  {name:'荷花', trait:'圆形叶', symbol:'◉'}
];
export const recyclingItems = [
  {name:'空塑料瓶', bin:'回收'}, {name:'旧报纸', bin:'回收'},
  {name:'果皮', bin:'堆肥'}, {name:'落叶', bin:'堆肥'}
];
export const coastItems = [
  {name:'饮料瓶', bin:'回收', x:16,y:65}, {name:'纸盒', bin:'回收', x:45,y:42},
  {name:'塑料袋', bin:'其他', x:73,y:64}, {name:'碎纸屑', bin:'回收', x:30,y:25},
  {name:'旧纸巾', bin:'其他', x:82,y:25}
];
export const fireflyPatterns = [[0,2,1], [1,3,0,2], [3,1,2,0,3]];
export const circuit = {size:4,start:0,end:15,blocked:[5,9,10],checkpoints:[2,7,11]};

export function isCircuitStep(path, next) {
  if (!Array.isArray(path) || !path.length || !Number.isInteger(next) || next < 0 || next > 15 || circuit.blocked.includes(next) || path.includes(next)) return false;
  const last = path.at(-1);
  return Math.abs(last % 4 - next % 4) + Math.abs(Math.floor(last / 4) - Math.floor(next / 4)) === 1;
}
export function isCircuitComplete(path) {
  return Array.isArray(path) && path[0] === circuit.start && path.at(-1) === circuit.end
    && circuit.checkpoints.every(node => path.includes(node))
    && path.slice(1).every((node,index) => isCircuitStep(path.slice(0,index+1),node));
}
export function isBudgetValid(values) {
  return Array.isArray(values) && values.length === 3 && values.every(value => Number.isInteger(value) && value >= 1 && value <= 6)
    && values.reduce((sum,value) => sum + value,0) === 10;
}
export function advancePattern(pattern, input, next) {
  const values = [...input,next];
  const correct = values.every((value,index) => value === pattern[index]);
  return {input: correct ? values : [], correct, complete:correct && values.length === pattern.length};
}
export function activityReady(key, data = {}) {
  if (key === 'green:garden') return plantTraits.every((plant,index) => data.traits?.[index] === plant.trait);
  if (key === 'green:eye') return recyclingItems.every((item,index) => data.sorted?.[index] === item.bin);
  if (key === 'green:pier') return coastItems.every((item,index) => data.sorted?.[index] === item.bin);
  if (key === 'animals:star') return Array.isArray(data.pairs) && [0,1,2].every(pair => data.pairs.includes(pair));
  if (key === 'animals:home') return ['猫猫','小鹿','狐狸'].includes(data.friend) && typeof data.story === 'string' && data.story.trim().length >= 4;
  if (key === 'animals:pier') return data.round === fireflyPatterns.length;
  if (key === 'scifi:portal') return typeof data.idea === 'string' && data.idea.trim().length >= 12
    && Array.isArray(data.features) && new Set(data.features).size >= 2
    && data.features.every(feature => ['自然','安静','开放','无障碍'].includes(feature));
  if (key === 'scifi:lab') return isBudgetValid(data.budget) && ['庭院','连廊'].includes(data.scheme);
  if (key === 'scifi:pool') return isCircuitComplete(data.path);
  return false;
}
export function activitySummary(key, data) {
  const summaries = {
    'green:garden': () => '辨认银杏、松树和荷花的叶形，收集了 3 张植物观察卡。',
    'green:eye': () => '为 4 种材料找到循环利用的去处。',
    'green:pier': () => '清理并分类了海岸上的 5 件散落物。',
    'animals:star': () => '配对 3 组星空线索，点亮观星台。',
    'animals:home': () => `${data.friend}：${data.story}`,
    'animals:pier': () => '跟随萤火虫完成 3 轮光点节奏。',
    'scifi:portal': () => `${data.idea} · ${data.features.join(' / ')}`,
    'scifi:lab': () => `${data.scheme}方案 · 自然 ${data.budget[0]} / 安静 ${data.budget[1]} / 开放 ${data.budget[2]}`,
    'scifi:pool': () => `接通 ${data.path.length} 个节点，经过全部 3 个能量站。`
  };
  return summaries[key]?.() || '';
}
