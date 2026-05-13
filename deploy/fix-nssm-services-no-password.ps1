# ==============================================================
# MCP Feedback Collector — 最小修复版（不改 ObjectName，不要密码）
# ==============================================================
# 能解决：
# - 本次的 "Server already initialized" bug（stop+start 让服务加载新 dist）
# - PAUSED：AppThrottle / AppRestartDelay / MCP_KILL_PORT_PROCESS
#
# 不能解决：
# - 浏览器自动弹窗（服务仍跑 LocalSystem，在 session 0 打不到用户桌面）
#
# 必须以管理员权限运行
# ==============================================================

$ErrorActionPreference = 'Stop'
$NSSM = 'C:\tools\nssm\nssm.exe'

$me = [Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $me.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)) {
    Write-Host "[x] 必须用管理员 PowerShell 运行" -ForegroundColor Red
    exit 1
}

$services = @('McpFeedbackCollector', 'McpFeedbackCollectorBackup')
$ports = @{ 'McpFeedbackCollector' = 18050; 'McpFeedbackCollectorBackup' = 18051 }

Write-Host "`n[1/4] 停服务..." -ForegroundColor Cyan
foreach ($s in $services) { & $NSSM stop $s confirm 2>&1 | Out-Null }
Start-Sleep -Seconds 2

Write-Host "[2/4] 调失败重启策略 + 环境变量..." -ForegroundColor Cyan
foreach ($s in $services) {
    $port = $ports[$s]
    & $NSSM set $s AppExit Default Restart          2>&1 | Out-Null
    & $NSSM set $s AppRestartDelay 5000             2>&1 | Out-Null
    & $NSSM set $s AppThrottle 10000                2>&1 | Out-Null
    & $NSSM set $s Start SERVICE_DELAYED_AUTO_START 2>&1 | Out-Null

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

Write-Host "[3/4] 启动..." -ForegroundColor Cyan
foreach ($s in $services) { & $NSSM start $s 2>&1 | Out-Null; Start-Sleep -Milliseconds 800 }
Start-Sleep -Seconds 3

Write-Host "[4/4] 验证：" -ForegroundColor Cyan
foreach ($s in $services) {
    $st = & $NSSM status $s 2>&1
    Write-Host "  $s -> $st"
}
netstat -ano | Select-String ":1805[01]\s.*LISTENING" | ForEach-Object { "  $_" }
Write-Host "`n[√] OK. 重启 Cursor 后 HTTP 三条腿应该都绿。" -ForegroundColor Green
