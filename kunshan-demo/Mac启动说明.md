# Mac 启动说明

1. 安装 Node.js 22 或以上版本（[官网下载](https://nodejs.org/)）。
2. 解压整个 Demo，双击「启动本地Demo.command」。浏览器会打开 http://127.0.0.1:4173/ 。
3. 运行期间保留终端窗口；停止时按 Control+C。已经启动时再次双击会重新打开网页。

无需 npm install。若系统不允许双击，打开终端，输入 `cd `（含空格），将解压后的项目文件夹拖入终端，回车后执行：

```sh
npm start
```

修改 route-demo 后执行 `npm run build`；运行检查用 `npm test`。

照片、定位确认和漫游记录保存在当前浏览器。首次打开先点击小船，再输入昵称进入。
