@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 请先安装 Node.js 22 或更新版本。
  pause
  exit /b 1
)
start "HahaIsland Local Server" /min cmd /c "node server.mjs --port 4173"
timeout /t 1 /nobreak >nul
start "" "http://127.0.0.1:4173/"
