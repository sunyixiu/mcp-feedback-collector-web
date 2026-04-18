#Requires -RunAsAdministrator
# One-shot: set MCP_DIALOG_TIMEOUT=180s for Windows NSSM services and restart them.
# Usage: run this script as Administrator.

$ErrorActionPreference = 'Stop'
$NSSM = 'C:\tools\nssm\nssm.exe'
if (-not (Test-Path $NSSM)) { throw "nssm not found: $NSSM" }

$services = @(
    @{ Name = 'McpFeedbackCollector';        Port = 5050 }
    @{ Name = 'McpFeedbackCollectorBackup';  Port = 5051 }
)

foreach ($svc in $services) {
    Write-Host ">>> Updating $($svc.Name) (port $($svc.Port))..." -ForegroundColor Cyan

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

    Write-Host "    Restarting..." -ForegroundColor Yellow
    Restart-Service -Name $svc.Name -Force
    Start-Sleep -Seconds 2

    $status = (Get-Service -Name $svc.Name).Status
    if ($status -eq 'Running') {
        Write-Host "    [OK] $($svc.Name) running." -ForegroundColor Green
    } else {
        Write-Warning "    $($svc.Name) status: $status"
    }
}

Write-Host "`nCurrent environment variables:" -ForegroundColor Cyan
foreach ($svc in $services) {
    Write-Host "--- $($svc.Name) ---" -ForegroundColor DarkGray
    & $NSSM get $svc.Name AppEnvironmentExtra
}

Write-Host "`n[DONE] Timeout set to 180 seconds (3 minutes)." -ForegroundColor Green
