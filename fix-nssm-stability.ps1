# Fix MCP Feedback Collector NSSM service stability.
# Disable KILL_PORT_PROCESS / CLEANUP_PORT_ON_START / FORCE_PORT
# to prevent NSSM services from killing each other (or Cursor MCP) on startup.
#
# How to run: right-click this file -> "Run with PowerShell" as Administrator,
#             or double-click fix-nssm-stability.bat which auto-elevates.

$ErrorActionPreference = 'Stop'
$nssm = 'C:\tools\nssm\nssm.exe'

if (-not (Test-Path $nssm)) {
  Write-Error "NSSM not found at $nssm"
  Read-Host "Press ENTER to close"
  exit 1
}

$env_primary = @"
MCP_TRANSPORT_MODE=http
MCP_WEB_PORT=18050
MCP_DIALOG_TIMEOUT=300
MCP_ENABLE_CHAT=false
MCP_ENABLE_IMAGE_TO_TEXT=false
MCP_USE_FIXED_URL=true
MCP_FORCE_PORT=false
MCP_KILL_PORT_PROCESS=false
MCP_CLEANUP_PORT_ON_START=false
MCP_CORS_ORIGIN=*
NODE_ENV=production
LOG_LEVEL=info
"@

$env_backup = @"
MCP_TRANSPORT_MODE=http
MCP_WEB_PORT=18051
MCP_DIALOG_TIMEOUT=300
MCP_ENABLE_CHAT=false
MCP_ENABLE_IMAGE_TO_TEXT=false
MCP_USE_FIXED_URL=true
MCP_FORCE_PORT=false
MCP_KILL_PORT_PROCESS=false
MCP_CLEANUP_PORT_ON_START=false
MCP_CORS_ORIGIN=*
NODE_ENV=production
LOG_LEVEL=info
"@

Write-Host "[1/4] Updating McpFeedbackCollector env vars..." -ForegroundColor Cyan
& $nssm set McpFeedbackCollector AppEnvironmentExtra $env_primary

Write-Host "[2/4] Updating McpFeedbackCollectorBackup env vars..." -ForegroundColor Cyan
& $nssm set McpFeedbackCollectorBackup AppEnvironmentExtra $env_backup

Write-Host "[3/4] Restarting McpFeedbackCollector..." -ForegroundColor Cyan
Restart-Service -Name McpFeedbackCollector -Force

Write-Host "[4/4] Restarting McpFeedbackCollectorBackup..." -ForegroundColor Cyan
Restart-Service -Name McpFeedbackCollectorBackup -Force

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "=== Verify ===" -ForegroundColor Green
Get-Service McpFeedbackCollector, McpFeedbackCollectorBackup | Select-Object Name, Status, StartType | Format-Table -AutoSize

Write-Host "Primary listening on 18050:" -ForegroundColor Green
Get-NetTCPConnection -LocalPort 18050 -State Listen -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, State, OwningProcess | Format-Table -AutoSize

Write-Host "Backup  listening on 18051:" -ForegroundColor Green
Get-NetTCPConnection -LocalPort 18051 -State Listen -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, State, OwningProcess | Format-Table -AutoSize

Write-Host ""
Write-Host "DONE." -ForegroundColor Green
Read-Host "Press ENTER to close"
