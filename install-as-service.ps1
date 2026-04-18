# ============================================================
# MCP Feedback Collector - 一键装成 Windows 服务（primary + backup）
# ============================================================
# 使用方法：
#   1) 右键本文件 → "使用 PowerShell 运行"
#      如果不是管理员会自动 UAC 弹窗请求提权
#   2) 装完后两个服务自动启动 + 开机自启，全程无窗口
#   3) 卸载：.\install-as-service.ps1 -Action uninstall
# ============================================================

param(
    [ValidateSet('install','uninstall','restart','status')]
    [string]$Action = 'install'
)

# 自动提权
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "检测到非管理员身份，正在请求提权..." -ForegroundColor Yellow
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit","-ExecutionPolicy","Bypass","-File","`"$PSCommandPath`"","-Action",$Action
    exit
}

$ErrorActionPreference = 'Stop'
$NSSM        = 'C:\tools\nssm\nssm.exe'
$NODE        = 'C:\Program Files\nodejs\node.exe'
$APP_DIR     = 'F:\Project\mcp-feedback-collector-web'
$APP_ENTRY   = "$APP_DIR\dist\cli.js"
$LOG_DIR     = "$APP_DIR\logs"

if (-not (Test-Path $NSSM))      { throw "nssm 不存在: $NSSM" }
if (-not (Test-Path $NODE))      { throw "node 不存在: $NODE" }
if (-not (Test-Path $APP_ENTRY)) { throw "MCP 入口不存在: $APP_ENTRY，请先在 $APP_DIR 下 npm run build" }
New-Item -ItemType Directory -Force -Path $LOG_DIR | Out-Null

$services = @(
    @{
        Name='McpFeedbackCollector'
        DisplayName='MCP Feedback Collector (Primary :5050)'
        Description='Primary MCP feedback collector HTTP server on port 5050.'
        Port=5050
    },
    @{
        Name='McpFeedbackCollectorBackup'
        DisplayName='MCP Feedback Collector (Backup :5051)'
        Description='Backup MCP feedback collector HTTP server on port 5051.'
        Port=5051
    }
)

function Install-McpService($svc) {
    Write-Host "`n[$($svc.Name)] 安装中..." -ForegroundColor Cyan

    $existing = & $NSSM status $svc.Name 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  已存在，先停止并移除..." -ForegroundColor Yellow
        & $NSSM stop   $svc.Name confirm | Out-Null
        & $NSSM remove $svc.Name confirm | Out-Null
    }

    & $NSSM install $svc.Name $NODE $APP_ENTRY | Out-Null
    & $NSSM set $svc.Name AppDirectory $APP_DIR | Out-Null
    & $NSSM set $svc.Name DisplayName  $svc.DisplayName | Out-Null
    & $NSSM set $svc.Name Description  $svc.Description | Out-Null
    & $NSSM set $svc.Name Start SERVICE_AUTO_START | Out-Null

    # 环境变量（与 bat 保持一致）
    $envVars = @(
        "MCP_TRANSPORT_MODE=http"
        "MCP_WEB_PORT=$($svc.Port)"
        "MCP_DIALOG_TIMEOUT=180"
        "MCP_ENABLE_CHAT=false"
        "MCP_ENABLE_IMAGE_TO_TEXT=false"
        "MCP_USE_FIXED_URL=true"
        "MCP_FORCE_PORT=true"
        "MCP_KILL_PORT_PROCESS=true"
        "MCP_CLEANUP_PORT_ON_START=true"
        "MCP_CORS_ORIGIN=*"
        "NODE_ENV=production"
        "LOG_LEVEL=info"
    ) -join "`n"
    & $NSSM set $svc.Name AppEnvironmentExtra $envVars | Out-Null

    # 日志
    & $NSSM set $svc.Name AppStdout "$LOG_DIR\$($svc.Name).out.log" | Out-Null
    & $NSSM set $svc.Name AppStderr "$LOG_DIR\$($svc.Name).err.log" | Out-Null
    & $NSSM set $svc.Name AppRotateFiles   1          | Out-Null
    & $NSSM set $svc.Name AppRotateOnline  1          | Out-Null
    & $NSSM set $svc.Name AppRotateBytes   10485760   | Out-Null

    # 崩溃自动重启
    & $NSSM set $svc.Name AppExit Default Restart   | Out-Null
    & $NSSM set $svc.Name AppRestartDelay 3000      | Out-Null

    & $NSSM start $svc.Name | Out-Null
    Start-Sleep -Seconds 2

    $status = & $NSSM status $svc.Name
    Write-Host "  [$($svc.Name)] 状态: $status" -ForegroundColor Green
}

function Uninstall-McpService($svc) {
    Write-Host "[$($svc.Name)] 卸载..." -ForegroundColor Yellow
    $existing = & $NSSM status $svc.Name 2>$null
    if ($LASTEXITCODE -ne 0) { Write-Host "  不存在，跳过"; return }
    & $NSSM stop   $svc.Name confirm | Out-Null
    & $NSSM remove $svc.Name confirm | Out-Null
    Write-Host "  已移除" -ForegroundColor Green
}

function Restart-McpService($svc) {
    Write-Host "[$($svc.Name)] 重启..." -ForegroundColor Cyan
    & $NSSM restart $svc.Name | Out-Null
    Start-Sleep -Seconds 2
    $status = & $NSSM status $svc.Name
    Write-Host "  状态: $status" -ForegroundColor Green
}

function Show-Status() {
    foreach ($svc in $services) {
        $status = & $NSSM status $svc.Name 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[$($svc.Name)] :$($svc.Port) -> $status" -ForegroundColor Green
        } else {
            Write-Host "[$($svc.Name)] 未安装" -ForegroundColor DarkGray
        }
    }
    Write-Host "`n端口占用检查:"
    foreach ($port in 5050,5051) {
        $line = (netstat -ano | Select-String ":$port\s.*LISTENING")
        if ($line) { Write-Host "  :$port LISTENING" -ForegroundColor Green }
        else       { Write-Host "  :$port 无监听" -ForegroundColor Red }
    }
}

switch ($Action) {
    'install' {
        foreach ($svc in $services) { Install-McpService $svc }
        Write-Host "`n========== 安装完成 ==========" -ForegroundColor Green
        Show-Status
        Write-Host "`n下一步：去 Cursor 的 MCP 面板 Disable 再 Enable 一次 mcp-feedback-collector 让 URL 重连即可。" -ForegroundColor Cyan
    }
    'uninstall' {
        foreach ($svc in $services) { Uninstall-McpService $svc }
    }
    'restart' {
        foreach ($svc in $services) { Restart-McpService $svc }
        Show-Status
    }
    'status' { Show-Status }
}

Write-Host "`n按任意键关闭窗口..." -ForegroundColor DarkGray
$null = [System.Console]::ReadKey($true)
