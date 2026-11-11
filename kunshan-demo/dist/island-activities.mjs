import {plantTraits,recyclingItems,coastItems,fireflyPatterns,circuit,isCircuitStep,isCircuitComplete,isBudgetValid,advancePattern,activityReady,activitySummary} from './island-play-core.mjs';

const api = window.HahaIsland;
const esc = value => String(value ?? '').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function footer(ctx, label='收藏探索记录') {
  ctx.footer({primaryText:label,primaryDisabled:!activityReady(ctx.key,ctx.data),secondaryText:'重新开始',onPrimary:()=>{
    if (activityReady(ctx.key,ctx.data)) ctx.complete(activitySummary(ctx.key,ctx.data));
  }});
}
function message(ctx,text) { ctx.workspace.querySelector('[data-feedback]').textContent = text; }
function plantJournal(ctx) {
  const {data,workspace} = ctx; data.traits ||= {};
  ctx.guide('看看叶片的轮廓，为三位植物朋友找到对应的观察特征。');
  workspace.innerHTML = `<div class="activity-intro"><small>GREEN FIELD NOTES</small><h3>今天，认识三片叶子</h3><p>选择叶形，收藏一页植物观察手记。</p></div><div class="field-cards">${plantTraits.map((plant,index)=>`<article><span class="field-symbol">${plant.symbol}</span><div><b>${plant.name}</b><p>它的叶子是什么形状？</p><div class="activity-options">${plantTraits.map(item=>`<button type="button" data-plant="${index}" data-trait="${item.trait}" aria-pressed="${data.traits[index]===item.trait}">${item.trait}</button>`).join('')}</div><small data-plant-result="${index}">${data.traits[index] === plant.trait ? '观察正确，已收进手记。' : '等待你的观察'}</small></div></article>`).join('')}</div><p class="activity-feedback" data-feedback role="status"></p>`;
  workspace.querySelectorAll('[data-trait]').forEach(button=>button.addEventListener('click',()=>{
    const index = Number(button.dataset.plant), correct = plantTraits[index].trait === button.dataset.trait;
    if (correct) data.traits[index] = button.dataset.trait;
    message(ctx,correct?'观察正确！这片叶子已经收进手记。':'再看看植物的叶片轮廓，换一种试试。');
    button.closest('.activity-options').querySelectorAll('button').forEach(item=>item.setAttribute('aria-pressed',String(data.traits[index]===item.dataset.trait)));
    workspace.querySelector(`[data-plant-result="${index}"]`).textContent = data.traits[index] ? '观察正确，已收进手记。' : '再观察一下';
    ctx.progress(Object.keys(data.traits).length/3*100,`${Object.keys(data.traits).length} / 3 张植物卡`); footer(ctx);
  }));
  ctx.progress(Object.keys(data.traits).length/3*100,'植物观察手记'); footer(ctx);
}
function sortingGame(ctx,coast=false) {
  const {data,workspace} = ctx, items = coast ? coastItems : recyclingItems; data.sorted ||= {};
  const done = items.filter((item,index)=>data.sorted[index]===item.bin).length;
  ctx.guide(coast?'点选海岸上的散落物，再把它送到合适的收集处。':'材料可以再用一次。选择一件物品，再决定把它送去回收还是堆肥。');
  workspace.innerHTML = `<div class="activity-intro"><small>${coast?'COAST CLEANUP':'CIRCULAR ISLAND'}</small><h3>${coast?'把海风还给干净的海岸':'每件材料，都有下一站'}</h3><p>${done} / ${items.length} 件已归位</p></div><div class="${coast?'coast-board':'sorting-board'}">${items.map((item,index)=>`<button type="button" class="sort-object ${data.sorted[index]?'is-done':''}" data-item="${index}" style="--x:${item.x||20+index*18}%;--y:${item.y||50}%" ${data.sorted[index]?'disabled':''} aria-pressed="${data.selected===index}"><span>${['◈','▱','≈','▧','≋'][index]}</span><b>${item.name}</b>${data.sorted[index]?'<small>已归位 ✓</small>':''}</button>`).join('')}</div><p class="sort-selection">${data.selected == null?'先选一件物品':`当前选择：${items[data.selected].name}`}</p><div class="activity-options sort-bins">${['回收',coast?'其他':'堆肥'].map(bin=>`<button type="button" data-bin="${bin}"><span>${bin==='回收'?'↻':bin==='堆肥'?'♧':'▥'}</span>${bin}</button>`).join('')}</div><p class="activity-feedback" data-feedback role="status"></p>`;
  workspace.querySelectorAll('[data-item]').forEach(button=>button.addEventListener('click',()=>{data.selected=Number(button.dataset.item); sortingGame(ctx,coast);}));
  workspace.querySelectorAll('[data-bin]').forEach(button=>button.addEventListener('click',()=>{
    if (data.selected == null) return message(ctx,'先点选一件物品。');
    if (items[data.selected].bin !== button.dataset.bin) return message(ctx,'这里不是它的下一站，再试一次。');
    data.sorted[data.selected] = button.dataset.bin; data.selected = null; sortingGame(ctx,coast);
    message(ctx,'归位成功，岛屿又整洁了一点。');
  }));
  ctx.progress(done/items.length*100,`${done} / ${items.length} 件已归位`);footer(ctx,coast?'收藏海岸记录':'完成循环挑战');
}
function starPairs(ctx) {
  const {data,workspace} = ctx; data.order ||= [0,1,2,1,0,2]; data.pairs ||= []; data.flipped ||= [];
  const symbols=['☾','✦','☼'];
  ctx.guide('翻开两张相同的星空卡片。找到三组线索，观星台就会亮起来。');
  workspace.innerHTML = `<div class="activity-intro"><small>ANIMAL OBSERVATORY</small><h3>借一点星光，认识新朋友</h3><p>已找到 ${data.pairs.length} / 3 组线索</p></div><div class="star-memory">${data.order.map((pair,index)=>{const open=data.pairs.includes(pair)||data.flipped.includes(index);return `<button type="button" data-star="${index}" class="${open?'is-revealed':''}" ${data.pairs.includes(pair)?'disabled':''} aria-label="星空卡片 ${index+1}${open?' '+symbols[pair]:''}"><span>${open?symbols[pair]:'✧'}</span><small>${data.pairs.includes(pair)?'已点亮':open?'寻找另一半':'翻开星光'}</small></button>`}).join('')}</div><p class="activity-feedback" data-feedback role="status">${data.mismatch?'这两张不同，继续翻开下一张试试。':'轻点一张卡片开始。'}</p>`;
  workspace.querySelectorAll('[data-star]').forEach(button=>button.addEventListener('click',()=>{
    const index=Number(button.dataset.star); if(data.flipped.includes(index))return;
    if(data.flipped.length===2) data.flipped=[];
    data.flipped.push(index); data.mismatch=false;
    if(data.flipped.length===2){const [a,b]=data.flipped;if(data.order[a]===data.order[b]){data.pairs.push(data.order[a]);data.flipped=[];}else data.mismatch=true;}
    starPairs(ctx);
  }));ctx.progress(data.pairs.length/3*100,'星空线索配对');footer(ctx,'点亮观星台');
}
function animalStory(ctx) {
  const {data,workspace}=ctx;
  const stories={猫猫:'它蜷在窗边，尾巴跟着光影轻轻摆动。',小鹿:'它从林间探出头，停下来听了一会儿风。',狐狸:'它把一片落叶带到小屋门口，像一封没有字的信。'};
  ctx.guide('选择一位岛民，读读它的片段，再写下你想留给它的一句话。');
  workspace.innerHTML=`<div class="activity-intro"><small>GOLDEN HOUSE</small><h3>今天想遇见谁？</h3></div><div class="activity-options friend-options">${Object.keys(stories).map(friend=>`<button type="button" data-friend="${friend}" aria-pressed="${data.friend===friend}"><span>${friend==='猫猫'?'🐈':friend==='小鹿'?'🦌':'🦊'}</span>${friend}</button>`).join('')}</div><blockquote class="island-story">${stories[data.friend]||'一位岛民正在金色小屋里等你。'}</blockquote><label class="activity-label" for="friendStory">给新朋友留一句话</label><textarea id="friendStory" maxlength="160" placeholder="记下一段至少 4 个字的见闻……">${esc(data.story||'')}</textarea><p class="activity-feedback" data-feedback role="status">只保存在这台设备的岛民手记里。</p>`;
  workspace.querySelectorAll('[data-friend]').forEach(button=>button.addEventListener('click',()=>{data.friend=button.dataset.friend;animalStory(ctx);}));
  workspace.querySelector('textarea').addEventListener('input',event=>{data.story=event.target.value;footer(ctx,'收藏岛民手记');ctx.progress(activityReady(ctx.key,data)?100:50,'岛民手记');});
  ctx.progress(data.friend?50:0,'选择你的动物朋友');footer(ctx,'收藏岛民手记');
}
function fireflyGame(ctx) {
  const {data,workspace}=ctx;data.round ||= 0;data.input ||= [];
  ctx.guide('四只萤火虫有自己的节奏。按照本轮光点顺序点亮它们，完成三轮夜间合奏。');
  const complete=data.round===fireflyPatterns.length, pattern=fireflyPatterns[Math.min(data.round,2)];
  workspace.innerHTML=`<div class="activity-intro"><small>FIREFLY PIER</small><h3>${complete?'萤火码头，亮了':'把夜色点亮'}</h3><p>第 ${Math.min(data.round+1,3)} / 3 轮 · 按顺序点亮</p></div><div class="firefly-score" aria-label="本轮顺序">${pattern.map(value=>`<span>${value+1}</span>`).join('<i>→</i>')}</div><div class="firefly-field">${[0,1,2,3].map(value=>`<button type="button" data-firefly="${value}" ${complete?'disabled':''} aria-label="萤火虫 ${value+1}"><i></i><b>${value+1}</b></button>`).join('')}</div><p class="activity-feedback" data-feedback role="status">${complete?'三轮合奏完成，可以收藏夜游记录。':`${data.input.length} / ${pattern.length} 个节拍已点亮`}</p>`;
  workspace.querySelectorAll('[data-firefly]').forEach(button=>button.addEventListener('click',()=>{
    const next=advancePattern(pattern,data.input,Number(button.dataset.firefly));data.input=next.input;
    if(next.complete){data.round++;data.input=[];fireflyGame(ctx);}else if(!next.correct){fireflyGame(ctx);message(ctx,'这次节拍有点不同，已从本轮开头重新开始。');}else{message(ctx,`${data.input.length} / ${pattern.length} 个节拍已点亮`);button.classList.remove('is-lit');requestAnimationFrame(()=>button.classList.add('is-lit'));}
  }));ctx.progress(data.round/3*100,`${data.round} / 3 轮完成`);footer(ctx,'收藏萤火夜游');
}
function futureProposal(ctx) {
  const {data,workspace}=ctx;data.features ||= [];
  ctx.guide('把未来校园的一小块交给你：写下设想，再选至少两种空间特点，生成一张未来提案卡。');
  workspace.innerHTML=`<div class="activity-intro"><small>FUTURE CAMPUS / 01</small><h3>下一种校园，由你提案</h3></div><label class="activity-label" for="futureIdea">你的校园设想</label><textarea id="futureIdea" maxlength="180" placeholder="至少 12 个字，例如：让每栋教学楼都连接一条可以看夕阳的空中花园。">${esc(data.idea||'')}</textarea><div class="activity-options future-features">${['自然','安静','开放','无障碍'].map(feature=>`<button type="button" data-feature="${feature}" aria-pressed="${data.features.includes(feature)}">${feature}</button>`).join('')}</div><div class="future-preview"><span>YOUR NEXT ISLAND</span><div class="future-skyline" aria-hidden="true"><i></i><i></i><i></i><i></i></div><b data-idea-preview>${esc(data.idea||'等待你的未来设想')}</b><small data-features>${esc(data.features.join(' · ')||'选择至少两个空间特点')}</small></div>`;
  workspace.querySelector('textarea').addEventListener('input',event=>{data.idea=event.target.value;workspace.querySelector('[data-idea-preview]').textContent=data.idea||'等待你的未来设想';footer(ctx,'封存未来提案');ctx.progress(activityReady(ctx.key,data)?100:35,'未来提案');});
  workspace.querySelectorAll('[data-feature]').forEach(button=>button.addEventListener('click',()=>{const feature=button.dataset.feature;data.features=data.features.includes(feature)?data.features.filter(item=>item!==feature):[...data.features,feature];button.setAttribute('aria-pressed',String(data.features.includes(feature)));workspace.querySelector('[data-features]').textContent=data.features.join(' · ');footer(ctx,'封存未来提案');}));
  ctx.progress(activityReady(ctx.key,data)?100:20,'创建未来提案');footer(ctx,'封存未来提案');
}
function futureLab(ctx) {
  const {data,workspace}=ctx;data.budget ||= [4,3,3];
  ctx.guide('只有 10 格空间预算。把它分给自然、安静和开放，再比较两种空间的体验差异。');
  const used=data.budget.reduce((sum,value)=>sum+value,0);
  workspace.innerHTML=`<div class="activity-intro"><small>BLUE CRYSTAL LAB</small><h3>空间有限，想象可以取舍</h3><p data-budget-count>${used} / 10 格预算</p></div><div class="future-budget">${['自然','安静','开放'].map((name,index)=>`<label><span>${name}<output>${data.budget[index]}</output></span><input type="range" min="1" max="6" step="1" value="${data.budget[index]}" data-budget="${index}" aria-label="${name}预算"></label>`).join('')}</div><div class="scheme-grid">${['庭院','连廊'].map((scheme,index)=>`<button type="button" data-scheme="${scheme}" aria-pressed="${data.scheme===scheme}"><div class="scheme-art ${index?'is-corridor':''}" aria-hidden="true"><i></i><i></i><i></i></div><b>${scheme==='庭院'?'共享庭院':'空中连廊'}</b><p>${index?'视野与交流更开放，安静区域更集中。':'绿意与安静更分散，开放空间围绕中心。'}</p><small data-scheme-score="${index}"></small></button>`).join('')}</div><p class="activity-feedback" data-feedback role="status"></p>`;
  const sync=()=>{const sum=data.budget.reduce((a,b)=>a+b,0);workspace.querySelector('[data-budget-count]').textContent=`${sum} / 10 格预算`;workspace.querySelectorAll('[data-scheme-score]').forEach((item,index)=>{const weights=index?[.8,.7,1.2]:[1.1,1.1,.8];item.textContent=`空间体验值 ${Math.round(data.budget.reduce((value,part,i)=>value+part*weights[i],0)*10)} · 游戏模型`;});message(ctx,sum===10?'预算刚好，选择一个方案就可以收藏。':`请${sum>10?'减少':'补足'} ${Math.abs(10-sum)} 格预算。`);footer(ctx,'收藏空间实验');};
  workspace.querySelectorAll('[data-budget]').forEach(input=>input.addEventListener('input',()=>{data.budget[Number(input.dataset.budget)]=Number(input.value);input.previousElementSibling.querySelector('output').textContent=input.value;sync();}));
  workspace.querySelectorAll('[data-scheme]').forEach(button=>button.addEventListener('click',()=>{data.scheme=button.dataset.scheme;workspace.querySelectorAll('[data-scheme]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));sync();}));sync();ctx.progress(isBudgetValid(data.budget)&&data.scheme?100:40,'10 格空间实验');
}
function coordinateCircuit(ctx) {
  const {data,workspace}=ctx;data.path ||= [circuit.start];
  ctx.guide('从起点接通右下角的传送门。每次只走相邻一格，经过 3 个能量站，避开灰色障碍。点当前节点可以退回一步。');
  workspace.innerHTML=`<div class="activity-intro"><small>MIRROR COORDINATES</small><h3>为下一次传送，接通能量</h3><p>${circuit.checkpoints.filter(node=>data.path.includes(node)).length} / 3 个能量站已接通</p></div><div class="coordinate-circuit" aria-label="四乘四能量线路">${Array.from({length:16},(_,node)=>`<button type="button" data-node="${node}" class="${data.path.includes(node)?'is-connected':''} ${data.path.at(-1)===node?'is-current':''}" ${circuit.blocked.includes(node)?'disabled':''} aria-label="节点 ${node+1}${circuit.blocked.includes(node)?' 障碍':''}"><b>${node===0?'起':node===15?'终':circuit.blocked.includes(node)?'×':circuit.checkpoints.includes(node)?'✦':'·'}</b>${data.path.includes(node)?`<small>${data.path.indexOf(node)+1}</small>`:''}</button>`).join('')}</div><p class="activity-feedback" data-feedback role="status">${isCircuitComplete(data.path)?'能量已接通！可以收藏传送记录。':'点选与当前节点相邻的空格。'}</p>`;
  workspace.querySelectorAll('[data-node]').forEach(button=>button.addEventListener('click',()=>{const next=Number(button.dataset.node);if(next===data.path.at(-1)&&data.path.length>1)data.path.pop();else if(isCircuitStep(data.path,next))data.path.push(next);else return message(ctx,'请走相邻空格，避开障碍和已经经过的节点。');coordinateCircuit(ctx);}));
  ctx.progress(isCircuitComplete(data.path)?100:circuit.checkpoints.filter(node=>data.path.includes(node)).length/3*80,'传送线路校准');footer(ctx,'启动镜面传送');
}
for(const [key,renderer] of Object.entries({
  'green:garden':plantJournal,'green:eye':ctx=>sortingGame(ctx),'green:pier':ctx=>sortingGame(ctx,true),
  'animals:star':starPairs,'animals:home':animalStory,'animals:pier':fireflyGame,
  'scifi:portal':futureProposal,'scifi:lab':futureLab,'scifi:pool':coordinateCircuit
})) api.registerActivity(key,renderer,data=>activityReady(key,data));
