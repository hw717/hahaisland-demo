# HahaIsland 微信小程序开发与迁移流程

核查日期：2026-10-25（北京时间）。以下依据微信官方文档，并结合当前仓库 `dist/`、`route-demo/` 的实现判断；尚未申请账号、创建微信项目或提交审核。

## 先决定产品形态

如果主要功能是城市漫步、偏好问卷、地图路线和反馈，适合先评估普通小程序；如果主要玩法是岛屿建造、角色操作、多人共创和结算，应评估微信“小游戏”类目。小游戏是小程序中的游戏类目，但接入、运行环境和发布要求另有指南，不能只把网页改名为小程序就发布。具体类目应按实际功能选择，注册和提审时再核对当前开放范围。[小程序介绍](https://developers.weixin.qq.com/miniprogram/introduction/)、[小游戏接入指南](https://developers.weixin.qq.com/minigame/introduction/guide/index.html)

对本项目的工程判断：先完成可用的网页版本有利于验证 UI 和寻路体验；随后把纯算法提取为共享模块，再分别适配微信界面、地图、存储和账号能力。若最终以建造游戏为主体，应先确定小游戏方向，再决定是否把现实城市导览作为独立入口，避免在确定产品类目前重做全部界面。

## 从注册到上线

1. **注册并确定主体。** 从[微信公众平台注册页](https://mp.weixin.qq.com/wxopen/waregister?action=step1)选择“小程序”，填写邮箱、主体和管理员资料。官方列有个人、企业（含个体工商户）、政府、媒体、其他组织等主体；各主体可用类目与能力不同。先核对是否需要网页容器、真实定位、多人游戏等能力，再选主体。认证材料和费用以实际后台为准。[注册与主体说明](https://developers.weixin.qq.com/miniprogram/introduction/)

2. **取得 AppID，绑定开发者。** 在小程序后台的开发设置中取得小程序 AppID，并在成员管理中添加开发者和体验成员。AppID 不等于公众号 AppID；AppSecret 属于服务器凭据，不能放进前端或提交到公开仓库。仅试验开发时，官方也提供测试号入口。[开始开发](https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/getstart.html)、[网络说明](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)

3. **安装微信开发者工具并建立工程。** 按[官方教程](https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/getstart.html)进入官方下载页，扫码登录，创建项目并填 AppID。原生普通小程序由 `app.js`、`app.json`、`app.wxss` 和页面文件组成；每页通常有 `.wxml`、`.wxss`、`.js`、`.json`，项目配置为 `project.config.json`。页面状态通过 `Page` 与 `setData` 驱动。[代码构成](https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/code.html)

4. **配置接口、域名与隐私。** 完善名称、图标、介绍、实际服务类目；配置必要的服务器域名，申请需要开通的接口权限，填写与实际采集行为一致的《用户隐私保护指引》。定位、照片等接口的隐私声明及用户同意应在功能调用前处理，并测试拒绝后的可用流程。[隐私填写说明](https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/)、[隐私协议开发指南](https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/PrivacyAuthorize.html)

5. **编译、预览和真机验证。** 在开发者工具编译后扫码预览，测试 iOS、Android 的触摸、地图、性能、前后台切换、定位拒绝和弱网。最后关闭“不校验合法域名”等调试豁免再测，模拟器正常不能代替正式环境验证。[开始开发](https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/getstart.html)、[网络说明](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)

6. **上传开发版，设置体验版。** 在工具里上传代码并填写版本号、说明，到后台“版本管理”查看开发版；选择稳定版本设为体验版，让已添加的体验成员验证完整流程。[协同与发布](https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/release.html)

7. **办理备案并准备提审。** 官方备案入口在小程序后台首页或设置中的“小程序备案”。流程包括信息填写、平台初审、工信部短信核验、通管局审核、备案成功；资料包括主体及负责人证件，特定业务还可能需前置审批材料。按后台要求准备，不把备案等同于代码审核。官方小游戏指南明确要求发布前完成版本审核和备案流程。[备案操作指引](https://developers.weixin.qq.com/miniprogram/product/record_guidelines.html)、[小游戏接入指南](https://developers.weixin.qq.com/minigame/introduction/guide/index.html)

8. **提交审核并发布。** 在后台从开发版本提交审核，按真实功能填写页面与类目信息，并确保审核人员能完成必要的体验流程。审核通过后再执行发布；官方提供全量及分阶段发布，审核通过本身不等于已上线。[协同与发布](https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/release.html)

## 现有实现能复用多少

| 当前实现 | 微信原生迁移方式 | 主要工作 |
|---|---|---|
| Figma 对应的 HTML/CSS 界面、DOM 事件 | WXML/WXSS、组件、页面事件与 `setData` | 复用设计规范和素材，重写页面绑定；不是直接复制 HTML |
| `route-demo/core.mjs`、`places.mjs` 的偏好评分和路网计算 | 平台无关 JS 模块；计算量大时使用小程序 Worker | 保留算法及验证样例，适配模块组织、消息入口和数据加载 |
| `new Worker('worker.mjs', {type:'module'})`、`self.onmessage` | `wx.createWorker`、`worker.onMessage` / `postMessage` | 配置 `app.json` 的 workers；主线程负责加载数据与平台 API |
| Leaflet 地图及网页图层 | 原生 `map` 的 markers、polyline、覆盖物，或另行评估游戏 Canvas | 重写地图交互、路线及热点显示，验证坐标系与性能 |
| `localStorage` 保存偏好、漫步记录 | `wx.setStorage` / `wx.getStorage` 等 | 建立存储适配层与版本迁移；微信缓存不自动继承浏览器数据 |
| IndexedDB 中的照片反馈 | 小程序文件能力及明确的本地/后端存储方案 | 重写照片读写与生命周期；不能假设浏览器数据库直接可用 |
| 本地 `fetch` JSON 与远程资源 | 工程资源或 `wx.request` / 文件、分包等机制 | 按包体和内存预算拆分路网、点位、图片，验证网络权限 |

上表是结合源码的迁移判断。官方说明小程序逻辑层不能直接调用 DOM/BOM，因此依赖浏览器界面的代码和 Leaflet 不能原样运行。当前路由入口确实使用网页 DOM、ES module Worker、`localStorage`；检查时 `graph.json` 约 4.85 MB、`points.json` 约 2.15 MB，应单独设计数据分块、缓存与加载方案，不能把所有数据直接塞进首包。[小程序与网页的区别](https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/)、[Worker](https://developers.weixin.qq.com/miniprogram/dev/framework/workers.html)、[存储](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/storage.html)

小程序 Worker 官方限制包括最多并发 1 个、不能调用 `wx` 系列 API、只能引用所配置 Worker 目录中的文件；主线程与 Worker 消息是复制而非共享。大路网初始化、重复复制及设备内存要在真机测量。[Worker](https://developers.weixin.qq.com/miniprogram/dev/framework/workers.html)

## 地图、定位、网络和多人能力

- **地图与坐标：** 官方 `map` 支持标记、折线、点线面覆盖和视野控制；路线算法输出可转为 `polyline`。组件使用 GCJ-02，调用 `wx.getLocation` 时应按文档指定 `gcj02`。当前 `route-demo/data/meta.json` 将输入坐标假定为 WGS-84，并明确原始采集基准尚未独立核验；移植前需核查、转换并校验控制点，否则路线可能错位。地图服务、KEY 和定制样式应按对应能力文档及账户授权核对。[map](https://developers.weixin.qq.com/miniprogram/dev/component/map.html)、[getLocation](https://developers.weixin.qq.com/miniprogram/dev/api/location/wx.getLocation.html)

- **定位权限：** `wx.getLocation` 需要用户授权、配置声明，并受到服务类目及接口申请开通限制，不能因为页面含地图就假定有权限。先核对实际主体、类目是否满足接口开放条件；未开通或用户拒绝时，可保留手动选择起点的流程，地图选点不等于获取用户真实位置。[getLocation](https://developers.weixin.qq.com/miniprogram/dev/api/location/wx.getLocation.html)

- **网络与安全：** 小程序网络 API 需配置通讯域名，普通请求/上传/下载使用 HTTPS，WebSocket 使用 WSS；官方要求相应服务器域名经过 ICP 备案。前端不放 AppSecret，服务端接口还需做身份和数据校验。网页中的 OSM 瓦片地址不会因能在浏览器访问就自动成为小程序可用服务。[网络](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)

- **账号与多人：** 本地昵称、头像和房间界面本身不能完成跨设备同步。本轮网页代码新增了轻量 Node 局域网房间服务；微信端仍需接入正式身份、持久状态和重连机制。若使用微信身份，客户端 `wx.login` 取得一次性 code，由服务器调用 `code2Session` 建立自定义会话；`session_key` 不应下发到客户端。微信身份接入属于后续适配，本轮未实现。[小程序登录](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/login.html)

## 能否先用 web-view 包装现有网页

可作为符合条件账号的候选方案，但须实际验证。官方 `web-view` **不支持个人类型小程序**，普通网页需配置业务域名；每页只能有一个，容器铺满页面并覆盖其他组件。网页与小程序的通信局限于官方 JSSDK，`postMessage` 在后退、销毁、分享等特定时机触发，不能据此设计实时建造状态或连续定位桥接。[web-view](https://developers.weixin.qq.com/miniprogram/dev/component/web-view.html)

因此不能承诺把当前静态网站地址放进去就能上线。采用这条路径仍需处理账号能力、业务域名、HTTPS、网页内第三方资源、微信真机兼容性、隐私声明和审核；原生与 H5 的存储、登录态及导航边界也要测试。游戏主体应先按小游戏接入指南核对技术与类目，不能用网页容器推断游戏发布资格。

建议下一步先确定“现实路线工具”还是“建造游戏”为微信版本的主产品，再申请匹配主体和类目的正式 AppID；技术上优先共享现有寻路核心，单独实现微信端界面与平台适配层。此报告完成了流程查询，不表示本轮已完成微信移植、备案或上线。
