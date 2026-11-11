#!/bin/zsh
cd -- "${0:A:h}" || exit 1
export PATH="$HOME/.local/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
  echo "找不到 Node.js，请先安装 Node.js 22 或以上版本。"
  read "?按回车关闭…"
  exit 1
fi
if /usr/bin/curl -fsS --max-time 2 http://127.0.0.1:4173/ 2>/dev/null | /usr/bin/grep -q '<title>HahaIsland'; then
  /usr/bin/open http://127.0.0.1:4173/
  exit 0
fi
node scripts/check-assets.mjs || { read "?资源检查失败，按回车关闭…"; exit 1; }
(sleep 1; /usr/bin/open http://127.0.0.1:4173/) &
echo "正在启动 HahaIsland。请保留此窗口，停止时按 Control+C。"
node server.mjs --port 4173
result=$?
if (( result != 0 )); then
  echo "启动失败；如果提示 EADDRINUSE，表示 4173 端口已被其他程序占用。"
  read "?按回车关闭…"
fi
exit $result
