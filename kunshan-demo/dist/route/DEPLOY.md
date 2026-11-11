# 斓图静态网站部署

本版无需应用后端、数据库或在线模型。浏览器通过 Web Worker 运行推荐算法，读取随站点提供的路网、环境评分和地点数据。

## 发布

将部署包解压，将包含 `index.html` 的目录作为网站发布目录，上传到支持静态网站的托管服务（例如 Cloudflare Pages、Netlify 或已有网站服务器）。无需构建命令或安装依赖。部署包根目录可直接作为网站根目录，也支持放在 `/lantu/` 等子目录中；访问子目录时保留末尾 `/`。

线上使用 HTTPS，并确保服务器将 `.mjs` 文件作为 JavaScript 返回（`text/javascript` 或 `application/javascript`），`.json` 作为 JSON 返回。可启用 gzip/Brotli 压缩 JSON、JS 和 CSS 来减少下载量。无需将所有内容内嵌到一个 HTML 文件，街景照片仅在查看时加载。

不要通过双击 `index.html` 的 `file://` 地址运行，因为页面需要读取 JSON 和启动 Worker。可在解压目录运行 `python3 -m http.server 8767 --bind 127.0.0.1`，通过 http://127.0.0.1:8767/ 本地预览；这只是静态文件服务。

## 数据与记录

部署包含演示区域的路网、6,281 个评分点、地点数据和现有街景照片，不含原始构建缓存、测试记录或用户反馈导出文件。OpenStreetMap 数据来源和署名仍在页面中保留，Leaflet 许可证随包提供。

偏好、漫步和反馈保存在访问者当前浏览器的 localStorage，反馈照片保存在 IndexedDB。站点运营者不会收到这些记录。不同设备、浏览器或站点地址不共享记录；需要集中收集反馈或训练模型时，再增加反馈 API 和数据库。

## 重新打包（项目维护者）

在仓库根目录运行 `node scripts/sync-route.mjs`，将 `route-demo/` 同步至 `dist/route/`，包含算法、Worker、路网、离线地图、街景照片与 Leaflet 许可证。`route-demo/` 是维护源文件；不要直接修改生成的 `dist/route/`。

现有站点发布 `dist/` 即可同时提供 HahaIsland 和城市漫步；入口为 `dist/index.html`，路线独立入口为 `dist/route/index.html`。每次修改路线代码或数据后重新同步。算法与嵌入通信验证命令为 `node --test tests/routing.test.mjs`。

## 与 HahaIsland 嵌入通信

主界面使用同源 iframe 加载 `./route/index.html`。路线页仅接受来自同源父窗口的 `hahaisland:route-open` 消息，其中 `nickname` 仅用于显示，不转换或推断用户偏好。四个滑块仍由使用者选择。

路线页向父窗口发送 `hahaisland:route-ready`、`hahaisland:route-selected`、`hahaisland:walk-finished` 和 `hahaisland:route-close`。`route-selected` 包含 `route: {id, length, minutes, groups, coverage}` 和 `answers`；时长单位分钟，长度单位米，四维得分为 0–100 或 null，覆盖率为 0–1。`walk-finished` 另含手动计时秒数、自报完成情况 `visit`、`walkId` 与完成时间，不包含反馈文字或照片。返回按钮在嵌入状态发出关闭消息，独立打开时返回 `../index.html`。收发消息均固定为当前 origin，父窗口也应验证消息来源为对应 iframe。
