# HahaIsland 个性化寻路

算法和数据的维护目录。当前界面已并入手机 Demo，仓库根目录运行 `npm start`，打开 http://127.0.0.1:4173/route/ 将进入新版偏好面板。

修改此目录后运行 `npm run build` 同步至 `dist/route/`。四维匹配、预算约束、路网连续性、目的地和有序途经点由 `core.mjs` 与 `worker.mjs` 提供；新版主界面在 `dist/mobile.mjs`。

路网及绿地来源 OpenStreetMap contributors，ODbL。街景为历史采样；入口与开放情况未现场核验。记录留在当前浏览器。
