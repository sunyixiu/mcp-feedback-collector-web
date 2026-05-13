@echo off
REM ==============================================================
REM MCP Feedback Collector - HTTP (Streamable HTTP / SSE) 模式启动器
REM ==============================================================
REM 独立进程，Cursor 通过 url 连接 http://127.0.0.1:18050/mcp
REM 好处：stdio idle-kill 问题不再复现，前端保活可以真正长时间挂起
REM
REM 切到 HTTP 模式的步骤：
REM   1) 先停 Cursor 里的 stdio 版（在 MCP 面板 disable）
REM   2) 双击运行这个 .bat（或在任务计划程序里配成开机自启）
REM   3) 把 ~/.cursor/mcp.json 里 feedback-collector 块改成：
REM      "mcp-feedback-collector": {
REM        "url": "http://127.0.0.1:5050/mcp"
REM      }
REM   4) Cursor 里重新 enable feedback-collector
REM ==============================================================

cd /d "%~dp0"

set MCP_TRANSPORT_MODE=http
set MCP_WEB_PORT=18050
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
echo === MCP Feedback Collector 启动中（HTTP 模式）===
echo   MCP URL  : http://127.0.0.1:%MCP_WEB_PORT%/mcp
echo   Web UI   : http://127.0.0.1:%MCP_WEB_PORT%/
echo   Timeout  : %MCP_DIALOG_TIMEOUT% 秒
echo.

node "%~dp0dist\cli.js"

echo.
echo 服务已退出。按任意键关闭窗口...
pause > nul
