@echo off
REM ==============================================================
REM MCP Feedback Collector - 备用实例（端口 5051）
REM ==============================================================
REM 与主实例 start-http-mode.bat 共用同一份代码，仅端口不同
REM 作用：主 MCP (5050) 崩溃时 AI 规则会自动切到这个备用 MCP
REM
REM 用法：和主 bat 一起双击运行，窗口都保留
REM 配套 mcp.json 配置里需要有：
REM   "mcp-feedback-collector-backup": {
REM     "url": "http://127.0.0.1:18051/mcp"
REM   }
REM ==============================================================

cd /d "%~dp0"

set MCP_TRANSPORT_MODE=http
set MCP_WEB_PORT=18051
set MCP_DIALOG_TIMEOUT=300
set MCP_ENABLE_CHAT=false
set MCP_ENABLE_IMAGE_TO_TEXT=false
set MCP_USE_FIXED_URL=true
set MCP_FORCE_PORT=true
set MCP_KILL_PORT_PROCESS=false
set MCP_CLEANUP_PORT_ON_START=true
set MCP_CORS_ORIGIN=*
set NODE_ENV=production
set LOG_LEVEL=info

echo.
echo === MCP Feedback Collector 启动中（HTTP 模式 / 备用实例）===
echo   MCP URL  : http://127.0.0.1:%MCP_WEB_PORT%/mcp
echo   Web UI   : http://127.0.0.1:%MCP_WEB_PORT%/
echo   Timeout  : %MCP_DIALOG_TIMEOUT% 秒
echo   [备用]  当主实例 18050 不可用时，AI 会自动切到这里
echo.

node "%~dp0dist\cli.js"

echo.
echo 服务已退出。按任意键关闭窗口...
pause > nul
