// Keep the original island game running while the GitHub planner is open.
// Both modules retain their own storage and explicit preference controls.
export function normalizeRouteSummary(value) {
  if (!value || typeof value !== 'object' || typeof value.id !== 'string'
    || !value.id || value.id.length > 200
    || !Number.isFinite(value.length) || value.length <= 0
    || !Number.isFinite(value.minutes) || value.minutes <= 0 || value.minutes > 120
    || !Number.isFinite(value.coverage) || value.coverage < 0 || value.coverage > 1
    || !Array.isArray(value.groups) || value.groups.length !== 4
    || !value.groups.every(score => score === null || Number.isFinite(score) && score >= 0 && score <= 100)) return null;
  return { id: value.id, length: value.length, minutes: value.minutes,
    groups: [...value.groups], coverage: value.coverage };
}

export function normalizeAnswers(value) {
  return Array.isArray(value) && value.length === 4
    && value.every(answer => Number.isFinite(answer) && answer >= 0 && answer <= 1)
    ? [...value] : null;
}

export function createIslandRoutePlanner({ doc = document, win = window } = {}) {
  const dialog = doc.createElement('dialog');
  dialog.id = 'islandRoutePlanner';
  dialog.className = 'island-route-dialog';
  dialog.setAttribute('aria-labelledby', 'islandRouteTitle');
  dialog.innerHTML = `<header class="island-route-header">
    <div><small>斓图 · 奥德赛导航</small><h2 id="islandRouteTitle">个性化寻路</h2></div>
    <button type="button" class="island-route-back">← 返回岛屿</button>
  </header>
  <div class="island-route-body">
    <div class="island-route-loading" role="status"><b>正在准备路线规划…</b><span>道路、偏好与时间预算正在载入</span></div>
  </div>
  <footer class="island-route-footer"><p role="status">选择四维偏好和时间预算，规划适合当下的路线。</p><a href="./route/" target="_blank" rel="noopener">独立打开 ↗</a></footer>`;
  doc.body.append(dialog);
  const body = dialog.querySelector('.island-route-body');
  const status = dialog.querySelector('.island-route-footer p');
  const loading = dialog.querySelector('.island-route-loading');
  let frame = null;
  let opener = null;
  let ready = false;
  const origin = win.location.origin;

  function notifyVisibility(open) {
    doc.querySelectorAll('[aria-controls="islandRoutePlanner"]').forEach(button => {
      button.setAttribute('aria-expanded', String(open));
    });
    doc.dispatchEvent(new win.CustomEvent('hahaisland:planner-visibility', { detail: { open } }));
  }

  function sendContext() {
    frame?.contentWindow?.postMessage({ type: 'hahaisland:route-open', nickname: '岛屿漫游者' }, origin);
  }

  function close() {
    if (!dialog.open) return;
    dialog.close();
  }

  function open() {
    if (!dialog.open) {
      opener = doc.activeElement;
      dialog.showModal();
      notifyVisibility(true);
    }
    if (!frame) {
      frame = doc.createElement('iframe');
      frame.title = '斓图 · 四维偏好与时间预算路线规划';
      frame.src = './route/index.html';
      frame.setAttribute('aria-busy', 'true');
      frame.addEventListener('load', () => { loading.hidden = true; sendContext(); });
      body.append(frame);
    } else {
      sendContext();
      if (ready) frame.focus();
    }
  }

  function receive(event) {
    if (!frame || event.origin !== origin || event.source !== frame.contentWindow) return;
    const message = event.data;
    if (!message || typeof message !== 'object') return;
    if (message.type === 'hahaisland:route-ready') {
      ready = true;
      loading.hidden = true;
      frame.setAttribute('aria-busy', 'false');
      sendContext();
      return;
    }
    if (message.type === 'hahaisland:route-close') { close(); return; }
    if (message.type === 'hahaisland:route-selected') {
      const route = normalizeRouteSummary(message.route);
      const answers = normalizeAnswers(message.answers);
      if (!route || !answers) return;
      try {
        win.localStorage.setItem('hahaisland.lastRoute.v1', JSON.stringify({ route, answers }));
        status.textContent = `已选路线 · ${Math.round(route.length)} 米 · 约 ${Math.round(route.minutes)} 分钟。返回后可继续当前岛屿任务。`;
      } catch { status.textContent = '路线已选中；浏览器存储空间不足，未保存这次选择。'; }
      return;
    }
    if (message.type === 'hahaisland:walk-finished') {
      const route = normalizeRouteSummary(message.route);
      const answers = normalizeAnswers(message.answers);
      if (!route || !answers || typeof message.walkId !== 'string' || !message.walkId || message.walkId.length > 200
        || !['not_visited', 'partial', 'completed'].includes(message.visit)
        || !Number.isFinite(message.elapsedSeconds) || message.elapsedSeconds < 0) return;
      const record = { walkId: message.walkId, route, answers, visit: message.visit,
        elapsedSeconds: message.elapsedSeconds, finishedAt: new Date().toISOString() };
      try {
        let records;
        try { records = JSON.parse(win.localStorage.getItem('hahaisland.walks.v1') || '[]'); } catch { records = []; }
        if (!Array.isArray(records)) records = [];
        records = records.filter(item => item && typeof item.walkId === 'string');
        if (!records.some(item => item.walkId === record.walkId)) {
          win.localStorage.setItem('hahaisland.walks.v1', JSON.stringify([...records, record].slice(-40)));
        }
        status.textContent = '这次漫步体验已保存；图文与评价可在“我的漫步记录”中查看。';
      } catch { status.textContent = '浏览器存储空间不足，漫步摘要未保存。请在路线模块内导出记录。'; }
    }
  }

  function afterClose() {
    notifyVisibility(false);
    const target = opener?.isConnected && opener.getClientRects().length
      ? opener : doc.querySelector('[data-view="route"]');
    target?.focus();
  }

  dialog.querySelector('.island-route-back').addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', afterClose);
  doc.addEventListener('hahaisland:open-planner', open);
  win.addEventListener('message', receive);
  return { open, close, dialog };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  createIslandRoutePlanner();
}
