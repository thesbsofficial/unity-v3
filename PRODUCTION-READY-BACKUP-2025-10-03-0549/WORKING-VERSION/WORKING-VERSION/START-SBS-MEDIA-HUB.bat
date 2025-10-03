@echo off
title SBS Media Hub - Unified Launcher
color 0A
cls
echo.
echo  ████████╗ ███████╗ ██████╗  ███████╗
echo  ██╔════╝ ██╔════╝ ██╔══██╗ ██╔════╝
echo  ███████╗ ███████╗ ██████╔╝ ███████╗
echo  ╚════██║ ╚════██║ ██╔══██╗ ╚════██║
echo  ████████║ ███████║ ██████╔╝ ███████║
echo  ╚═══════╝ ╚══════╝ ╚═════╝  ╚══════╝
echo.
echo  🎮 SBS MEDIA HUB - UNIFIED LAUNCHER
echo  ═══════════════════════════════════════════
echo.
echo  🚀 Features included:
echo     • CORS-free local server (Port 9500)
echo     • Auto-opens in Brave browser
echo     • System Inspector in Help menu
echo     • Local Storage viewer
echo     • Activity logging
echo     • Database connection testing
echo.
echo  ⚠️  KEEP THIS WINDOW OPEN while using the Media Hub
echo  🛑 Close this window to stop all services
echo.
echo  📡 Initializing services...
timeout /t 2 >nul

REM Load Cloudflare credentials from optional env file
set CF_ENV_FILE=data\cloudflare.env
if exist "%CF_ENV_FILE%" (
    for /f "usebackq tokens=1,* delims==" %%A in ("%CF_ENV_FILE%") do (
        if /I "%%A"=="CF_ACCOUNT_ID" set CF_ACCOUNT_ID=%%B
        if /I "%%A"=="CF_API_TOKEN" set CF_API_TOKEN=%%B
    )
)

if "%CF_ACCOUNT_ID%"=="" (
    echo  ❌ Missing Cloudflare Account ID. Set CF_ACCOUNT_ID in the environment or in %CF_ENV_FILE%.
    goto :END
)

if "%CF_API_TOKEN%"=="" (
    echo  ❌ Missing Cloudflare API token. Set CF_API_TOKEN in the environment or in %CF_ENV_FILE%.
    goto :END
)

REM Clean up any existing processes
echo  🧹 Cleaning up ports...
netsh http delete urlreservation url=http://localhost:9500/ >nul 2>&1
netsh http delete urlreservation url=http://localhost:9600/ >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":9500 "') do (
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":9600 "') do (
    taskkill /PID %%a /F >nul 2>&1
)

REM Use standard ports
set MAIN_PORT=9500
set API_PORT=9600

REM Start the API proxy server in background
echo  🔧 Starting API proxy server (Port %API_PORT%)...
start /B powershell.exe -ExecutionPolicy Bypass -File "api-server-minimal.ps1" -Port %API_PORT%

REM Wait a moment for API server to initialize
timeout /t 2 >nul

REM Start main server with browser auto-open
echo  📡 Starting main server (Port %MAIN_PORT%)...
echo  🌐 Opening Media Hub in Brave browser...
echo.
echo  ✅ All systems operational!
echo     • Main Hub: http://localhost:%MAIN_PORT%
echo     • API Proxy: http://localhost:%API_PORT%
echo     • Help Menu: Click (?) for System Inspector
echo.

powershell -Command "Add-Type -AssemblyName System.Web; $listener = New-Object System.Net.HttpListener; $listener.Prefixes.Add('http://localhost:%MAIN_PORT%/'); $listener.Start(); Write-Host ' 🟢 UNIFIED SERVER RUNNING on localhost:%MAIN_PORT%' -ForegroundColor Green; Write-Host ' 🔧 API Proxy active on localhost:%API_PORT%' -ForegroundColor Cyan; Write-Host ' 🚀 Opening SBS Media Hub...' -ForegroundColor Yellow; Start-Process 'C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe' -ArgumentList '--disable-web-security --disable-features=VizDisplayCompositor --user-data-dir=C:\temp\brave-sbs-unified http://localhost:%MAIN_PORT%/sbs-media-hub-FINAL.html'; while ($listener.IsListening) { $context = $listener.GetContext(); $response = $context.Response; $request = $context.Request; $path = $request.Url.LocalPath.TrimStart('/'); if ($path -eq '') { $path = 'sbs-media-hub-FINAL.html' }; $fullPath = Join-Path (Get-Location) $path; if (Test-Path $fullPath) { $content = Get-Content $fullPath -Raw -Encoding UTF8; $response.Headers.Add('Access-Control-Allow-Origin', '*'); $response.Headers.Add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'); $response.Headers.Add('Access-Control-Allow-Headers', '*'); $response.ContentType = if ($path -like '*.html') { 'text/html; charset=utf-8' } elseif ($path -like '*.js') { 'application/javascript' } elseif ($path -like '*.css') { 'text/css' } else { 'text/plain' }; $buffer = [System.Text.Encoding]::UTF8.GetBytes($content); $response.ContentLength64 = $buffer.Length; $response.OutputStream.Write($buffer, 0, $buffer.Length); } else { $response.StatusCode = 404; }; $response.Close(); }"

echo.
echo  🛑 All services stopped.
echo  📝 Thank you for using SBS Media Hub!
echo.
pause
goto :EOF

:END
echo.
echo  ℹ️  Create %CF_ENV_FILE% with lines like:
echo       CF_ACCOUNT_ID=your_account_id
echo       CF_API_TOKEN=your_api_token
echo  or set the variables in the parent environment before launching.
echo.
pause