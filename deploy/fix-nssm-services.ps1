# ==============================================================
# MCP Feedback Collector — NSSM 服务一键修复脚本
# ==============================================================
# 解决的三个问题：
# 1. 浏览器弹窗：把 ObjectName 从 LocalSystem 改成当前登录用户，
#    服务就跑在用户 session 里，open 包才能触达用户桌面
# 2. 开机 PAUSED：加大 AppThrottle + AppRestartDelay，启用 MCP_KILL_PORT_PROCESS
# 3. 重启后"Server already initialized"：kill 掉旧 node，让 NSSM 用新编译的 dist 重启
#
# 必须以管理员权限运行：
#   PowerShell 右键「以管理员身份运行」 → cd 到本文件目录 → .\fix-nssm-services.ps1
# ==============================================================

[CmdletBinding()]
param(
    [string]$UserName = "$env:USERDOMAIN\$env:USERNAME",
    [string]$Password = ''
)

$ErrorActionPreference = 'Stop'
$NSSM = 'C:\tools\nssm\nssm.exe'

if (-not (Test-Path $NSSM)) {
    Write-Host "[x] 找不到 nssm: $NSSM" -ForegroundColor Red
    exit 1
}

# 确认管理员身份
$me = [Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $me.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)) {
    Write-Host "[x] 必须用管理员 PowerShell 运行本脚本" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== [1/5] 询问当前用户密码 ===" -ForegroundColor Cyan
Write-Host "为了让服务跑在用户 session（浏览器才能弹出），需要把 ObjectName 改成 $UserName"
Write-Host "这是 Windows 本机账户密码（用于服务 logon as），不会上传任何地方"
if (-not $Password) {
    $sec = Read-Host "请输入 $UserName 的 Windows 登录密码" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
    $Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
}

$services = @('McpFeedbackCollector', 'McpFeedbackCollectorBackup')
$ports = @{ 'McpFeedbackCollector' = 5050; 'McpFeedbackCollectorBackup' = 5051 }

Write-Host "`n=== [2/5] 停止旧服务 ===" -ForegroundColor Cyan
foreach ($s in $services) {
    Write-Host "  stopping $s ..."
    & $NSSM stop $s confirm 2>&1 | Out-Null
}
Start-Sleep -Seconds 2

Write-Host "`n=== [3/5] 配置服务（ObjectName + AppExit + Throttle + Env） ===" -ForegroundColor Cyan
foreach ($s in $services) {
    $port = $ports[$s]
    Write-Host "  --- $s (port $port) ---"

    # 3a. ObjectName = 当前用户（服务跑在用户 session，允许浏览器弹窗）
    & $NSSM set $s ObjectName $UserName $Password 2>&1 | Out-Null

    # 3b. 失败重启策略（解决开机 PAUSED）
    & $NSSM set $s AppExit Default Restart          2>&1 | Out-Null
    & $NSSM set $s AppRestartDelay 5000             2>&1 | Out-Null   # 失败后 5s 重试
    & $NSSM set $s AppThrottle 10000                2>&1 | Out-Null   # 启动 10s 内 exit 才算 crash
    & $NSSM set $s AppStopMethodConsole 5000        2>&1 | Out-Null

    # 3c. 开机启动方式：DELAYED AUTO（等 Cursor 等抢端口进程起完）
    & $NSSM set $s Start SERVICE_DELAYED_AUTO_START 2>&1 | Out-Null

    # 3d. 启用端口冲突自动清理（MCP_KILL_PORT_PROCESS=true）
    $envLines = @(
        'MCP_TRANSPORT_MODE=http'
        "MCP_WEB_PORT=$port"
        'MCP_DIALOG_TIMEOUT=300'
        'MCP_ENABLE_CHAT=false'
        'MCP_ENABLE_IMAGE_TO_TEXT=false'
        'MCP_USE_FIXED_URL=true'
        'MCP_FORCE_PORT=true'
        'MCP_KILL_PORT_PROCESS=true'
        'MCP_CLEANUP_PORT_ON_START=true'
        'MCP_CORS_ORIGIN=*'
        'NODE_ENV=production'
        'LOG_LEVEL=info'
    )
    & $NSSM set $s AppEnvironmentExtra ($envLines -join "`r`n") 2>&1 | Out-Null
}

Write-Host "`n=== [4/5] 启动服务 ===" -ForegroundColor Cyan
foreach ($s in $services) {
    & $NSSM start $s 2>&1 | Out-Null
    Start-Sleep -Milliseconds 800
}
Start-Sleep -Seconds 3

Write-Host "`n=== [5/5] 验证 ===" -ForegroundColor Cyan
foreach ($s in $services) {
    $st = & $NSSM status $s 2>&1
    Write-Host "  $s -> $st"
}
netstat -ano | Select-String ":505[01]\s.*LISTENING" | ForEach-Object { "  $_" }

Write-Host "`n[√] 修复完成。请重启 Cursor 后观察 MCP 是否自动连通 + 调用 collect_feedback 是否弹浏览器。" -ForegroundColor Green
