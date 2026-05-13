@echo off
REM ============================================================
REM Restart MCP Feedback Collector NSSM services (admin required)
REM Ports: Primary :18050, Backup :18051 (high ports)
REM ============================================================

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Need admin rights, requesting UAC...
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

echo.
echo === Restarting McpFeedbackCollector (Primary :18050) ===
net stop  McpFeedbackCollector
timeout /t 2 /nobreak >nul
net start McpFeedbackCollector

echo.
echo === Restarting McpFeedbackCollectorBackup (Backup :18051) ===
net stop  McpFeedbackCollectorBackup
timeout /t 2 /nobreak >nul
net start McpFeedbackCollectorBackup

echo.
echo === Service status ===
sc query McpFeedbackCollector       | findstr /R "STATE"
sc query McpFeedbackCollectorBackup | findstr /R "STATE"

echo.
echo === Listening ports (should see 18050, 18051) ===
powershell -NoProfile -Command "Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in 18050,18051,18052 } | Select-Object LocalPort,OwningProcess | Format-Table -AutoSize"

echo.
echo Done. Press ENTER to close.
pause >nul
