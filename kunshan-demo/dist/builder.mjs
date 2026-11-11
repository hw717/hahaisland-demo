import { createWorld, updateCell, undoWorld, redoWorld, analyzeWorld, parseWorld, colors, MODULES } from './game-core.mjs';

const ASSET = './assets/figma/';
const typeLabels = { building: '建筑', gray: '灰空间', landscape: '景观', empty: '空地' };
const moduleLabels = { cube: '立方体', cylinder: '圆柱', cone: '圆锥', prism: '三棱柱', cross: '其他构筑物' };
const moduleCodes = ['A01', 'B01', 'C01', 'D01', 'E01'];
const thumbnails = ['1ff6e.svg', 'bd12b.svg', 'c8f49.svg', '245b2.svg', '670a3.svg'];
const windowLabels = ['实体', '单窗', '横向长窗', '落地玻璃', '圆拱', '双窗'];
const landscapeLabels = ['草地', '步道', '水面', '花园', '铺装', '休憩'];
const esc = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const defaults = () => ({ type: 'building', module: 'cube', window: 0, trees: 0, color: colors[0], rotation: 0 });
const button = (label, action, extra = '') => `<button type="button" data-action="${action}" ${extra}>${label}</button>`;

function shade(hex, multiplier) {
  return `#${hex.slice(1).match(/../g).map(part => Math.min(255, Math.round(parseInt(part, 16) * multiplier)).toString(16).padStart(2, '0')).join('')}`;
}

function moduleSvg(layer, { scale = 1, outline = false } = {}) {
  const rotation = layer.rotation * Math.PI / 180;
  const rotate = ([u, v, z]) => [u * Math.cos(rotation) - v * Math.sin(rotation), u * Math.sin(rotation) + v * Math.cos(rotation), z];
  const project = vertex => { const [u, v, z] = rotate(vertex); return [(u - v) * 48 * scale, ((u + v) * 24 - z * 72) * scale]; };
  const points = vertices => vertices.map(vertex => project(vertex).join(',')).join(' ');
  const face = (vertices, fill, extra = '') => `<polygon points="${points(vertices)}" fill="${fill}" ${extra}/>`;
  const fill = layer.type === 'gray' ? '#d9e9df' : layer.color;
  let markup = '';
  if (layer.type === 'landscape') {
    const tones = ['#c6dda0', '#e4dac2', '#a4d7dc', '#d5dda4', '#e7d9c4', '#c8d9ab'];
    markup += face([[-.45,-.45,0],[.45,-.45,0],[.45,.45,0],[-.45,.45,0]], layer.color === colors[0] ? tones[MODULES.indexOf(layer.module)] : layer.color);
    if (layer.module === 'cylinder') markup += face([[-.4,-.14,.01],[.4,-.14,.01],[.4,.14,.01],[-.4,.14,.01]], '#f8f4e7');
    if (layer.module === 'cone') markup += `<ellipse cx="0" cy="0" rx="${31*scale}" ry="${12*scale}" fill="#91c8d1" stroke="none"/>`;
    const treePositions = [[0,0],[-.24,-.21],[.23,.2],[-.2,.24],[.25,-.23]];
    for (let index = 0; index < layer.trees; index++) {
      const [x,y] = project([...treePositions[index],0]);
      markup += `<path d="M${x} ${y}v${-38*scale}" stroke="#6c917a" stroke-width="${2*scale}"/><ellipse cx="${x}" cy="${y-36*scale}" rx="${13*scale}" ry="${23*scale}" fill="#a0ceb1" stroke="none"/><path d="M${x} ${y-14*scale}v${-37*scale}m0 ${21*scale}l${-8*scale} ${-9*scale}m${8*scale} ${2*scale}l${8*scale} ${-10*scale}" stroke="#79ad91" stroke-width="${scale}"/>`;
    }
  } else if (layer.module === 'cylinder' || layer.module === 'cone') {
    const radius = .38, height = layer.module === 'cone' ? .78 : .72;
    const ring = Array.from({ length: 20 }, (_, i) => [Math.cos(i*Math.PI/10)*radius, Math.sin(i*Math.PI/10)*radius, 0]);
    const visible = ring.map((vertex, i) => ({ a: vertex, b: ring[(i+1)%20] })).filter(edge => {
      const a = rotate(edge.a), b = rotate(edge.b); return a[0]+a[1]+b[0]+b[1] > 0;
    }).sort((a,b) => project(a.a)[1] - project(b.a)[1]);
    for (const edge of visible) markup += face(layer.module === 'cone' ? [edge.a,edge.b,[0,0,height]] : [edge.a,edge.b,[edge.b[0],edge.b[1],height],[edge.a[0],edge.a[1],height]], shade(fill,.92), 'stroke-width=".65"');
    if (layer.module === 'cylinder') markup += face(ring.map(vertex => [vertex[0],vertex[1],height]), fill);
    if (layer.window) {
      const ranges = layer.window===5 ? [[-.58,-.12],[.12,.58]] : [layer.window===2 ? [-.9,.9] : layer.window===3 ? [-.7,.7] : [-.38,.38]];
      for (const [left,right] of ranges) {
        const bottom=layer.window===3?.04:.19, top=layer.window===2?.37:layer.module==='cone'?.43:.57;
        const surface=(angle,z)=>{const r=radius*(layer.module==='cone'?1-z/height:1)*1.008;return[Math.cos(angle)*r,Math.sin(angle)*r,z];};
        for (let i=0;i<10;i++) {
          const a=Math.PI/4+left+(right-left)*i/10,b=Math.PI/4+left+(right-left)*(i+1)/10;
          if(Math.cos((a+b)/2+rotation)+Math.sin((a+b)/2+rotation)<=0)continue;
          const za=layer.window===4?.28+(top-.28)*Math.sin(Math.PI*i/10):top;
          const zb=layer.window===4?.28+(top-.28)*Math.sin(Math.PI*(i+1)/10):top;
          markup+=face([surface(a,bottom),surface(b,bottom),surface(b,zb),surface(a,za)],'#b7dfe0','stroke="#729d9d" stroke-width=".35"');
        }
      }
    }
  } else if (layer.module === 'prism') {
    const vertices = [[-.42,-.42,0],[.42,-.42,0],[.42,.42,0],[-.42,.42,0],[-.42,0,.8],[.42,0,.8]];
    const faces = [[0,1,5,4],[3,2,5,4],[1,2,5],[0,3,4]];
    markup += faces.map((ids,i) => ({ids,i,depth:ids.reduce((n,j)=>n+project(vertices[j])[1],0)/ids.length})).sort((a,b)=>a.depth-b.depth).map(({ids,i}) => face(ids.map(i=>vertices[i]), shade(fill,[1,.93,.84,.9][i]))).join('');
    if(layer.window) {
      const normal=rotate([1,0,0]);
      if(normal[0]+normal[1]>.01) {
        const ranges=layer.window===5?[[-.23,-.05],[.05,.23]]:[layer.window===2?[-.27,.27]:[-.16,.16]];
        for(const[left,right]of ranges) {
          const low=layer.window===3?.035:.12,high=layer.window===2?.25:layer.window===3?.49:.44;
          if(layer.window===4) {
            const p=[[.424,left,low],[.424,right,low],[.424,right,.32],[.424,0,.7],[.424,left,.32]].map(project);
            markup+=`<path d="M${p[0]}L${p[1]}L${p[2]}Q${p[3]} ${p[4]}Z" fill="#b7dfe0" stroke="#729d9d" stroke-width=".7"/>`;
          } else markup+=face([[.424,left,low],[.424,right,low],[.424,right,high],[.424,left,high]],'#b7dfe0','stroke="#729d9d" stroke-width=".7"');
        }
      }
    }
  } else if (layer.module === 'cross') {
    for (const vertices of [[[-.43,0,0],[.43,0,0],[.43,0,.8],[-.43,0,.8]],[[0,-.43,0],[0,.43,0],[0,.43,.8],[0,-.43,.8]]]) markup += face(vertices, shade(fill,.95));
    if(layer.window) {
      const ranges=layer.window===5?[[-.32,-.12],[.12,.32]]:layer.window===2?[[-.35,.35]]:layer.window===3?[[-.28,.28]]:[[.08,.32]];
      const low=layer.window===3?.04:.24,high=layer.window===2?.4:layer.window===3?.73:.55;
      for(const[left,right]of ranges) {
        if(layer.window===4) {
          const p=[[left,.002,low],[right,.002,low],[right,.002,.46],[(left+right)/2,.002,.8],[left,.002,.46]].map(project);
          markup+=`<path d="M${p[0]}L${p[1]}L${p[2]}Q${p[3]} ${p[4]}Z" fill="#b7dfe0" stroke="#729d9d" stroke-width=".7"/>`;
        } else markup+=face([[left,.002,low],[right,.002,low],[right,.002,high],[left,.002,high]],'#b7dfe0','stroke="#729d9d" stroke-width=".7"');
      }
    }
  } else {
    const h = .77;
    markup += face([[-.43,-.43,h],[.43,-.43,h],[.43,.43,h],[-.43,.43,h]], fill);
    const walls = [
      { v: [[.43,-.43,0],[.43,.43,0],[.43,.43,h],[.43,-.43,h]], n:[1,0,0], shade:.9 },
      { v: [[-.43,.43,0],[.43,.43,0],[.43,.43,h],[-.43,.43,h]], n:[0,1,0], shade:.96 },
      { v: [[-.43,-.43,0],[-.43,.43,0],[-.43,.43,h],[-.43,-.43,h]], n:[-1,0,0], shade:.9 },
      { v: [[-.43,-.43,0],[.43,-.43,0],[.43,-.43,h],[-.43,-.43,h]], n:[0,-1,0], shade:.96 },
    ];
    for (const [index, wall] of walls.entries()) {
      const normal = rotate(wall.n);
      if (normal[0]+normal[1] < .01) continue;
      markup += face(wall.v, layer.type === 'gray' ? '#e8f2ed99' : shade(fill,wall.shade));
      if (layer.window && (index === 0 || index === 1)) {
        const [a,b] = wall.v;
        const plane = (t,z) => [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,z];
        const windows = layer.window === 5 ? [[.17,.43],[.57,.83]] : [layer.window === 2 ? [.12,.88] : layer.window === 3 ? [.1,.9] : [.3,.7]];
        for (const [left,right] of windows) {
          const low = layer.window === 3 ? .06 : .2, high = layer.window === 2 ? .48 : .62;
          if(layer.window===4) {
            const coords=[project(plane(left,low)),project(plane(right,low)),project(plane(right,.44)),project(plane((left+right)/2,.8)),project(plane(left,.44))];
            markup+=`<path d="M${coords[0]}L${coords[1]}L${coords[2]}Q${coords[3]} ${coords[4]}Z" fill="#648780" stroke="#729d9d" stroke-width=".7"/>`;
          } else markup += face([plane(left,low),plane(right,low),plane(right,high),plane(left,high)], '#b7dfe0', 'stroke="#729d9d" stroke-width=".7"');
        }
      }
    }
  }
  return `<g stroke="${outline ? '#ff861f' : '#618783'}" stroke-width="${outline ? 2.2 : .9}" stroke-linejoin="round">${markup}</g>`;
}

export function renderWorldSvg(world, { selected = null, interactive = false, floor = 0, label = '我的空间', id = 'world' } = {}) {
  const cells = [...world.cells].sort((a,b) => a.x+a.y-b.x-b.y || a.y-b.y);
  const base = `<path d="M162 270L450 414L738 270V294L450 438L162 294Z" fill="#b4c6b8"/><path d="M450 414L738 270V294L450 438Z" fill="#9caf9f"/>`;
  const tiles = cells.map(cell => {
    const x = 450+(cell.x-cell.y)*48, y = 150+(cell.x+cell.y)*24;
    const chosen = selected && selected.x === cell.x && selected.y === cell.y;
    return `<g transform="translate(${x} ${y})" class="b-cell${chosen?' is-selected':''}" ${interactive?`role="button" tabindex="0" data-cell="${cell.x},${cell.y}" aria-label="地块 ${cell.x+1} 行 ${cell.y+1} 列${cell.layers.length ? '，'+typeLabels[cell.layers[0].type] : '，空地'}"`:''}><polygon points="0,-24 48,0 0,24 -48,0" fill="${chosen?'#ffd87d':cell.layers.length?'#ffb55c':'#ff9b43'}" stroke="#fff5df" stroke-width="1.3"/>${cell.layers.map((layer,index) => `<g transform="translate(0 ${-index*59})" opacity="${floor===0&&index===1?.92:1}">${moduleSvg(layer,{outline:chosen&&index===floor})}</g>`).join('')}${interactive?`<polygon class="b-cell-hit" points="0,-24 48,0 0,24 -48,0" fill="transparent"/>`:''}</g>`;
  }).join('');
  return `<svg class="b-world-svg" viewBox="0 0 900 520" role="img" aria-label="${esc(label)}，六乘六可编辑地块" data-world="${esc(id)}"><ellipse cx="450" cy="438" rx="332" ry="34" fill="#e3e7d9"/>${base}${tiles}</svg>`;
}

export function mountBuilder(container, options = {}) {
  let world = parseWorld(options.world || createWorld());
  let selected = { x: 2, y: 3 }, floor = 0, tool = 'select', editor = null, notice = '';
  let viewing = null;
  let lastCellClick = null;
  let players = Array.isArray(options.players) ? options.players : [];
  const startedAt = Date.now();
  const root = document.createElement('section');
  root.className = 'island-builder';
  container.replaceChildren(root);
  let toastTimer;
  const isSelf = player => options.playerId
    ? player.id===options.playerId || player.playerId===options.playerId
    : Boolean(options.nickname && player.nickname===options.nickname);

  function announce(message) {
    notice = message;
    const status = root.querySelector('.b-notice');
    if (status) { status.textContent = message; status.classList.add('is-visible'); }
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { notice=''; root.querySelector('.b-notice')?.classList.remove('is-visible'); }, 2600);
  }

  function change(next) {
    if (next === world) return;
    world = next;
    options.onChange?.(world);
    render();
  }

  function apply(patch, targetFloor = floor) {
    try {
      const next=updateCell(world, selected.x, selected.y, patch, { floor: targetFloor });
      if(next===world)render();else change(next);
      return true;
    }
    catch (error) { announce(error.message); return false; }
  }

  function openEditor(step = 1, type) {
    const cell = world.cells[selected.y*6+selected.x];
    const current = cell.layers[floor];
    editor = { step, draft: { ...defaults(), ...current, ...(type?{type}:{}) } };
    if (editor.draft.type === 'landscape') { editor.draft.window=0; editor.draft.trees=Math.max(0,editor.draft.trees); }
    render();
  }

  function statusMarkup() {
    const multiplayer = options.mode === 'coop' || options.mode === 'co-create' || options.mode === 'multi';
    const capacity = Number.isInteger(options.capacity) && options.capacity>0 ? options.capacity : 8;
    return `<div class="b-session"><strong data-clock>已用 00:00</strong><span>${multiplayer?`● ${players.filter(p=>p.online!==false).length || 1} / ${capacity} 在线`:'自由建造 · 自动保存'}</span></div>`;
  }

  function render() {
    if (editor) { renderEditor(); return; }
    const cell = world.cells[selected.y*6+selected.x];
    const peers = players.filter(player => !isSelf(player));
    const analysis = analyzeWorld(world);
    root.innerHTML = `<header class="b-heading"><h1>${viewing?esc(viewing.nickname || viewing.name || '伙伴')+'的空间':'我的空间'}</h1><p>${viewing?'观察模式':`${esc(options.nickname || '我的')} · 橙色地块`} · 6 × 6 · 最多两层</p></header>${statusMarkup()}
      ${button('i','help','class="b-help" aria-label="建造说明"')}
      <aside class="b-tools"><h2>建造工具</h2>${button('建筑 / 开窗','building')}${button('景观 / 草地','landscape')}${button('树木组合','trees')}${button('八色色环','colors')}${button('↶ 撤销','undo',world.history.length?'':'disabled')}${button('↷ 重做','redo',world.future.length?'':'disabled')}</aside>
      <div class="b-scene">${renderWorldSvg(viewing?parseWorld(viewing.world):world,{selected:viewing?null:selected,interactive:!viewing,floor,label:viewing?.nickname || '我的空间'})}<div class="b-space-label">${viewing?'只读观察':`${selected.x+1}${String.fromCharCode(65+selected.y)} · ${cell.layers[floor]?typeLabels[cell.layers[floor].type]:'空格'} / 第 ${floor+1} 层`}</div></div>
      <aside class="b-observe"><div class="b-preview"><img src="${ASSET}a8f44.svg" alt="Figma 共创街区参考模型" width="1440" height="900"/></div>${button(viewing?'返回我的空间':'观察其他空间','observe')}<small>${peers.length?`${peers.length} 位伙伴的空间`:'共享街区参考模型'}</small></aside>
      <div class="b-floor-control">${button('第 1 层','floor-0',`aria-pressed="${floor===0}"`)}${button('↑ 第 2 层','floor-1',`aria-pressed="${floor===1}"`)}</div>
      <div class="b-indicators"><p>每次修改，都会成为空间行为线索。</p><small>${analysis.counts.occupied} / 36 地块 · ${analysis.counts.floors} 个模块</small></div>
      <div class="b-palette" aria-label="放置体块">${['building','gray','landscape','empty'].map((type,index) => button(`<img src="${ASSET}${['c3857.svg','e82ec.svg','0cef0.svg','e2290.svg'][index]}" alt="" width="48" height="42"/><span>${typeLabels[type]}</span>`,`place-${type}`,`aria-pressed="${tool===type}"`)).join('')}</div>
      <div class="b-hint"><b>${tool==='select'?'选择一种体块，放进这个位置':'点击地块放置'+typeLabels[tool]}</b><small>双击地块精细编辑 · Esc 取消 · D 编辑选中地块</small></div>
      ${button('← 返回','back','class="b-back"')}${button('完成建造，开始互猜 →','finish','class="b-finish"')}
      <div class="b-notice${notice?' is-visible':''}" role="status">${esc(notice)}</div>
      ${viewing?'<div class="b-viewing">正在观察真实的伙伴空间 · '+button('返回我的空间','observe')+'</div>':''}`;
    updateClock();
  }

  function draftPreview(draft) {
    // Preserve the exact Figma static preview for its canonical state. All edited states are data-rendered.
    const canonical = draft.type === 'building' && draft.module === 'cube' && !draft.window && draft.color === colors[0] && draft.rotation === 0;
    if (canonical) return `<div class="b-canonical-preview"><img class="b-canonical-model" src="${ASSET}6d2c8.svg" alt="立方体" width="291.664" height="309.425"/><img class="b-canonical-outline" src="${ASSET}a4493.svg" alt="" width="356.796" height="336.6"/></div>`;
    return `<svg class="b-draft-svg" viewBox="-65 -95 130 130" aria-label="${esc(typeLabels[draft.type])}实时模型预览">${moduleSvg(draft,{outline:true})}</svg>`;
  }

  function renderEditor() {
    const {step,draft} = editor;
    const landscape = draft.type === 'landscape';
    const headings = ['选择地块用途',landscape?'选择景观模块':'选择建筑类型',landscape?'选择树木组合':'选择开窗方式','选择空间颜色'];
    const subtitles = ['四类体块 · 从一个空间开始',landscape?'五种景观 · 为街区留一处自然':'五类基本体量 · 点选缩略图进入',landscape?'六种疏密 · 即时更新预览':'六种立面 · 随朝向旋转','八种颜色 · 让空间有自己的表情'];
    const title = step===0?typeLabels[draft.type]:step===1?(landscape?landscapeLabels[MODULES.indexOf(draft.module)]:moduleLabels[draft.module]):step===2?(landscape?`${draft.trees} 组树木`:windowLabels[draft.window]):'空间配色';
    root.innerHTML = `<div class="b-editor"><header class="b-editor-top"><h1>街区${options.mode==='solo'?'自创':'共创'}</h1><p>${selected.x+1}${String.fromCharCode(65+selected.y)} / 第 ${floor+1} 层 / 6 × 6 地块</p>${button('退出','close-editor')}</header>
      <nav class="b-editor-steps" aria-label="编辑步骤">${['选择用途','选择模块','开窗 / 种树','选择颜色'].map((label,i)=>button(`<span>0${i+1}</span> ${label}${step===i?`<img src="${ASSET}be28d.svg" alt="当前步骤" width="6" height="6"/>`:''}`,`step-${i}`,`aria-current="${step===i?'step':'false'}"`)).join('')}</nav>
      <div class="b-editor-preview"><p>${moduleCodes[MODULES.indexOf(draft.module)]}</p><h2>${esc(title)}</h2><div class="b-model-stage">${draftPreview(draft)}${button('←','rotate-left','class="b-rotate b-rotate-left" aria-label="向左旋转90度"')}${button('→','rotate-right','class="b-rotate b-rotate-right" aria-label="向右旋转90度"')}</div><small>每次旋转 90° · 当前 ${draft.rotation}°</small></div>
      <div class="b-editor-options"><h2>${headings[step]}</h2><p>${subtitles[step]}</p>${step===1&&!landscape?moduleDisk(draft):optionDisk(step,draft)}</div>
      <div class="b-editor-shortcuts">D 进入地块　 Esc 返回街区</div><div class="b-editor-actions">${button(step===0?'返回街区':'上一步','previous')}${button(step===3?'确认放置':'下一步','next','class="b-editor-primary"')}</div>
      <div class="b-notice${notice?' is-visible':''}" role="status">${esc(notice)}</div></div>`;
  }

  function moduleDisk(draft) {
    const positions = [[362.79,54.87],[440.53,294.13],[237,442],[33.47,294.13],[111.21,54.87]];
    return `<div class="b-disk"><img class="b-disk-shadow" src="${ASSET}1420a.svg" alt="" width="660" height="660"/>${['f9ea8.svg','2b932.svg','7ceec.svg','0b938.svg','fb280.svg'].map(name=>`<img class="b-disk-slice" src="${ASSET}${name}" alt="" width="580" height="580"/>`).join('')}<img class="b-disk-center" src="${ASSET}0d084.svg" alt="" width="268" height="268"/>${MODULES.map((module,i)=>button(`<span class="b-disk-thumbnail"><img src="${ASSET}${thumbnails[i]}" alt="${moduleLabels[module]}"/></span><small>${moduleCodes[i]}</small><b>${moduleLabels[module]}</b>`,`module-${module}`,`class="b-disk-choice${draft.module===module?' is-selected':''}" style="left:${positions[i][0]}px;top:${positions[i][1]}px" aria-pressed="${draft.module===module}"`)).join('')}</div>`;
  }

  function optionDisk(step,draft) {
    let values;
    if (step===0) values = ['building','gray','landscape','empty'].map((type,i) => ({action:`type-${type}`,label:typeLabels[type],active:draft.type===type,body:`<img src="${ASSET}${['c3857.svg','e82ec.svg','0cef0.svg','e2290.svg'][i]}" alt="" width="48" height="42"/>`}));
    if (step===1) values = MODULES.map((module,i) => ({action:`module-${module}`,label:landscapeLabels[i],active:draft.module===module,body:`<svg viewBox="-60 -90 120 120">${moduleSvg({...draft,module,trees:Math.max(1,draft.trees)})}</svg>`}));
    if (step===2) values = Array.from({length:6},(_,i)=>({action:`detail-${i}`,label:draft.type==='landscape'?`${i} 组树木`:windowLabels[i],active:(draft.type==='landscape'?draft.trees:draft.window)===i,body:`<svg viewBox="-60 -90 120 120">${moduleSvg({...draft,...(draft.type==='landscape'?{trees:i}:{window:i})})}</svg>`}));
    if (step===3) values = colors.map((color,i)=>({action:`color-${i}`,label:['云白','日落橙','樱花粉','柠檬黄','湖水蓝','鼠尾草绿','雾紫','暖沙'][i],active:draft.color===color,body:`<span class="b-color-swatch" style="background:${color}"></span>`}));
    const radius = step===3?214:207;
    return `<div class="b-choice-disk"><div class="b-choice-hole">${step===3?'色彩<br/>让空间发声':'小小选择<br/>组成你的空间'}</div>${values.map((value,i)=>{const angle=-Math.PI/2+i*Math.PI*2/values.length;return button(`${value.body}<b>${value.label}</b>`,value.action,`class="b-choice${value.active?' is-selected':''}" style="left:${290+Math.cos(angle)*radius}px;top:${290+Math.sin(angle)*radius}px" aria-pressed="${value.active}"`);}).join('')}</div>`;
  }

  function selectCell(x,y,edit=false) {
    if (viewing) return;
    selected = {x,y};
    const existing = world.cells[y*6+x].layers[floor];
    if (edit) { openEditor(1); return; }
    if (tool !== 'select') {
      if (tool === 'empty') apply({type:'empty'});
      else apply({type:tool,...(tool==='landscape'?{trees:1,color:colors[5]}:{color:tool==='gray'?colors[4]:colors[0]})});
    } else { render(); if (!existing) announce('已选中地块，选择下方体块开始建造'); }
  }

  function handleClick(event) {
    const cellElement = event.target.closest('[data-cell]');
    if (cellElement && !editor) {
      const [x,y]=cellElement.dataset.cell.split(',').map(Number), now=Date.now();
      // Delegated click timing survives a first-click SVG redraw, unlike native dblclick targeting.
      if(lastCellClick&&lastCellClick.x===x&&lastCellClick.y===y&&now-lastCellClick.at<400) {
        lastCellClick=null;selected={x,y};openEditor(1);return;
      }
      lastCellClick={x,y,at:now};selectCell(x,y);return;
    }
    const control = event.target.closest('[data-action]');
    if (!control || control.disabled) return;
    lastCellClick=null;
    const action = control.dataset.action;
    if (editor) {
      if (action==='close-editor') { editor=null; render(); return; }
      if (action==='rotate-left'||action==='rotate-right') editor.draft.rotation=(editor.draft.rotation+(action==='rotate-left'?270:90))%360;
      else if (action==='next') {
        if (editor.draft.type==='empty') { editor=null; apply({type:'empty'}); return; }
        if (editor.step===3) { const pending=editor; editor=null; if(!apply(pending.draft)){editor=pending;render();} return; }
        editor.step++;
      } else if (action==='previous') { if (editor.step===0) {editor=null;render();return;} editor.step--; }
      else if (action.startsWith('step-')) editor.step=Number(action.slice(5));
      else if (action.startsWith('module-')) editor.draft.module=action.slice(7);
      else if (action.startsWith('type-')) { editor.draft.type=action.slice(5); if (editor.draft.type==='landscape')editor.draft.window=0;else editor.draft.trees=0; }
      else if (action.startsWith('detail-')) editor.draft[editor.draft.type==='landscape'?'trees':'window']=Number(action.slice(7));
      else if (action.startsWith('color-')) editor.draft.color=colors[Number(action.slice(6))];
      render(); return;
    }
    if (action.startsWith('place-')) { viewing=null; tool=action.slice(6); render(); announce('已选择'+typeLabels[tool]+'，点击地块放置'); }
    else if (action==='building') { viewing=null;openEditor(1,'building'); }
    else if (action==='landscape') { viewing=null;openEditor(1,'landscape'); }
    else if (action==='trees') { viewing=null;openEditor(2,'landscape'); }
    else if (action==='colors') { viewing=null;openEditor(3); }
    else if (action==='undo') change(undoWorld(world));
    else if (action==='redo') change(redoWorld(world));
    else if (action.startsWith('floor-')) { floor=Number(action.slice(6));render();if(floor===1)announce('第二层需要下方有建筑或灰空间支撑'); }
    else if (action==='back') options.onBack?.();
    else if (action==='finish') { if(!analysisReady())return; options.onFinish?.(world); }
    else if (action==='help') { if(options.onHelp)options.onHelp();else announce('先选体块再点地块；双击可开窗、种树、转向和配色。Ctrl+Z 撤销。'); }
    else if (action==='observe') {
      if(viewing){viewing=null;render();return;}
      const available=players.filter(player=>player.world&&!isSelf(player));
      if(available.length)showPeers();
      else showReference();
    } else if(action.startsWith('peer-')) {viewing=players[Number(action.slice(5))];render();}
    else if(action==='close-reference') {root.querySelector('.b-reference-overlay')?.remove();}
  }

  function analysisReady() { if(analyzeWorld(world).counts.occupied===0){announce('先放置至少一个体块，再生成空间档案');return false;} return true; }

  function showReference() {
    const overlay=document.createElement('div');overlay.className='b-reference-overlay';
    overlay.innerHTML=`<section role="dialog" aria-modal="true" aria-labelledby="b-reference-title"><header><div><h2 id="b-reference-title">共创街区参考</h2><p>这是设计稿示意；伙伴加入并建造后可观察其真实空间。</p></div>${button('关闭','close-reference')}</header><div class="b-reference-scene"><img src="${ASSET}a8f44.svg" alt="四片彩色地块构成的共创十字岛" width="1440" height="900"/></div></section>`;
    root.append(overlay);
    overlay.querySelector('button').focus();
  }

  function showPeers() {
    const overlay=document.createElement('div');overlay.className='b-reference-overlay';
    overlay.innerHTML=`<section role="dialog" aria-modal="true" aria-labelledby="b-peers-title"><header><div><h2 id="b-peers-title">观察其他空间</h2><p>看看同一房间里伙伴们正在搭建的真实空间。</p></div>${button('关闭','close-reference')}</header><div class="b-peer-grid">${players.map((player,index)=>player.world&&!isSelf(player)?button(`${renderWorldSvg(parseWorld(player.world),{label:player.nickname||'伙伴'})}<b>${esc(player.nickname||player.name||'伙伴')}</b>`,`peer-${index}`,'class="b-peer-card"'):'').join('')}</div></section>`;
    root.append(overlay);overlay.querySelector('button').focus();
  }

  function handleDoubleClick(event) { const cell=event.target.closest('[data-cell]');if(cell&&!viewing&&!editor){const[x,y]=cell.dataset.cell.split(',').map(Number);selected={x,y};openEditor(1);} }
  function handleKey(event) {
    if (event.target.matches('input,textarea,select')) return;
    const cell=event.target.closest?.('[data-cell]');
    if(cell&&(event.key==='Enter'||event.key===' ')){event.preventDefault();const[x,y]=cell.dataset.cell.split(',').map(Number);selectCell(x,y,event.key==='Enter');return;}
    if(event.key==='Escape'){if(root.querySelector('.b-reference-overlay'))root.querySelector('.b-reference-overlay').remove();else if(editor){editor=null;render();}else{tool='select';viewing=null;render();}}
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();editor=null;change(event.shiftKey?redoWorld(world):undoWorld(world));}
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='y'){event.preventDefault();editor=null;change(redoWorld(world));}
    if(event.key.toLowerCase()==='d'&&!editor&&!viewing)openEditor(1);
  }
  function updateClock() { const target=root.querySelector('[data-clock]');if(target){const seconds=Math.floor((Date.now()-startedAt)/1000);target.textContent=`已用 ${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;} }
  root.addEventListener('click',handleClick);
  root.addEventListener('dblclick',handleDoubleClick);
  document.addEventListener('keydown',handleKey);
  const clock=setInterval(updateClock,1000);
  render();
  const cleanup = () => {clearInterval(clock);clearTimeout(toastTimer);document.removeEventListener('keydown',handleKey);root.remove();};
  cleanup.updatePlayers = nextPlayers => {
    players=Array.isArray(nextPlayers)?nextPlayers:[];
    if(viewing) {
      const id=viewing.id??viewing.playerId;
      viewing=players.find(player=>id?(player.id??player.playerId)===id:player.nickname===viewing.nickname)||null;
    }
    if(!editor&&!root.querySelector('.b-reference-overlay'))render();
  };
  cleanup.updateWorld = nextWorld => { world=parseWorld(nextWorld);if(!editor)render(); };
  cleanup.getWorld = () => world;
  return cleanup;
}
