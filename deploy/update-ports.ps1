# Update MCP service ports to 18050 / 18051
# Run as Administrator
$ErrorActionPreference = 'Continue'
$NSSM = 'C:\tools\nssm\nssm.exe'

$me = [Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $me.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)) {
    Write-Host "[x] Run as Administrator!" -ForegroundColor Red; exit 1
}

$config = @(
    @{ Name = 'McpFeedbackCollector';       Port = 18050 },
    @{ Name = 'McpFeedbackCollectorBackup'; Port = 18051 }
)

Write-Host "[1/3] Stopping services..." -ForegroundColor Cyan
foreach ($s in $config) {
    $st = (& $NSSM status $s.Name 2>$null)
    if ($st -match 'RUNNING') {
        & $NSSM stop $s.Name confirm 2>$null | Out-Null
        $waited = 0
        do { Start-Sleep -Milliseconds 500; $waited++ } while (
            (& $NSSM status $s.Name 2>$null) -notmatch 'STOPPED' -and $waited -lt 20
        )
    }
    Write-Host "  $($s.Name) stopped." -ForegroundColor Yellow
}

Write-Host "[2/3] Updating env vars (ports)..." -ForegroundColor Cyan
foreach ($s in $config) {
    $envLines = @(
        'MCP_TRANSPORT_MODE=http'
        "MCP_WEB_PORT=$($s.Port)"
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
    ) -join "`r`n"
    & $NSSM set $s.Name AppEnvironmentExtra $envLines 2>$null | Out-Null
    Write-Host "  $($s.Name) -> port $($s.Port)" -ForegroundColor Yellow
}

Write-Host "[3/3] Starting services..." -ForegroundColor Cyan
foreach ($s in $config) {
    & $NSSM start $s.Name 2>$null | Out-Null
    Start-Sleep -Seconds 1
}
Start-Sleep -Seconds 4

Write-Host "`n=== Result ===" -ForegroundColor Green
foreach ($s in $config) {
    $st = & $NSSM status $s.Name 2>$null
    Write-Host "  $($s.Name) -> $st"
}
netstat -ano | Select-String ":1805[01]\s.*LISTENING" | ForEach-Object { Write-Host "  $_" -ForegroundColor Green }
Write-Host "`n[OK] Done!" -ForegroundColor Green
Write-Host "Press any key to close..."
$null = [System.Console]::ReadKey($true)
