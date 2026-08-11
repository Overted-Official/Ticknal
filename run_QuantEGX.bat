@echo off
echo Checking for existing servers on port 3000...

:: Find the PID of the process listening on port 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    echo Terminating process with PID %%a...
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo Starting QuantEGX dev server...
:: Start the Next.js dev server in a new command window so it runs independently
start "QuantEGX Server" cmd /k "npm run dev"

:: Wait 5 seconds to ensure the server is ready to accept connections
timeout /t 5 /nobreak >nul

echo Launching browser...
start http://localhost:3000
