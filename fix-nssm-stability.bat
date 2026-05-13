@echo off
REM 双击运行此 .bat 文件，会弹出 UAC 提示，确认后自动以管理员身份执行修复脚本。

setlocal

set "PS1=%~dp0fix-nssm-stability.ps1"

if not exist "%PS1%" (
  echo [ERROR] 找不到 PowerShell 脚本：%PS1%
  pause
  exit /b 1
)

echo 正在请求管理员权限...
powershell -NoProfile -Command "Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -NoExit -File \"%PS1%\"' -Verb RunAs"

echo.
echo 已弹出 UAC 提示。点 "是" 后会有一个新的管理员 PowerShell 窗口跑修复脚本。
echo （如果没看到 UAC 弹窗，可能被任务栏遮挡了，找一下右下角通知。）
echo.
pause
