@echo off
setlocal

echo ============================================
echo WellnessHub Local Run (No Mongo Required)
echo ============================================
echo.

set ROOT=%~dp0

REM Check frontend on port 3000
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul
if %errorlevel%==0 (
  echo [OK] Frontend already running on http://localhost:3000
) else (
  echo [START] Starting frontend...
  start "Frontend" powershell -NoExit -Command "cd '%ROOT%frontend'; npm start"
)

REM Check backend on port 5001
netstat -ano | findstr ":5001" | findstr "LISTENING" >nul
if %errorlevel%==0 (
  echo [OK] Backend already running on http://localhost:5001
) else (
  echo [START] Starting backend...
  start "Backend" powershell -NoExit -Command "cd '%ROOT%backend'; .\venv\Scripts\Activate.ps1; python app.py"
)

echo.
echo Waiting a few seconds for services to boot...
timeout /t 5 >nul

echo.
echo Checking services:
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul
if %errorlevel%==0 (
  echo [OK] Frontend listening on port 3000
) else (
  echo [WARN] Frontend not listening yet
)

netstat -ano | findstr ":5001" | findstr "LISTENING" >nul
if %errorlevel%==0 (
  echo [OK] Backend listening on port 5001
) else (
  echo [WARN] Backend not listening yet
)

echo.
echo App URLs:
echo Frontend: http://localhost:3000
echo Backend : http://localhost:5001
echo.
echo Note: Auth is currently localStorage-based (local mode).
echo.
pause
endlocal
