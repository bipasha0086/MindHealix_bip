@echo off
setlocal

set "ROOT=%~dp0"
set "FRONTEND_DIR=%ROOT%frontend"
set "BACKEND_DIR=%ROOT%backend"
set "BACKEND_PY=%BACKEND_DIR%\venv\Scripts\python.exe"
set "BACKEND_PORT=5001"
set "FRONTEND_URL=http://localhost:3000"
set "BACKEND_URL=http://localhost:%BACKEND_PORT%"
set "HEALTH_URL=http://127.0.0.1:%BACKEND_PORT%/api/health"

echo ============================================
echo MindHealix Local Startup
echo ============================================
echo Frontend: %FRONTEND_URL%
echo Backend : %BACKEND_URL%
echo.

if not exist "%FRONTEND_DIR%\package.json" (
  echo [ERROR] Frontend folder is missing: %FRONTEND_DIR%
  goto :end
)

if not exist "%BACKEND_PY%" (
  echo [ERROR] Backend virtual environment is missing: %BACKEND_PY%
  echo [INFO] Create it first from the backend folder with: python -m venv venv
  goto :end
)

call :check_port 3000 FRONTEND_RUNNING
if "%FRONTEND_RUNNING%"=="1" (
  echo [OK] Frontend is already running on %FRONTEND_URL%
) else (
  echo [START] Launching frontend in a new terminal...
  start "MindHealix Frontend" powershell -NoExit -ExecutionPolicy Bypass -Command "Set-Location '%FRONTEND_DIR%'; npm start"
)

call :check_port %BACKEND_PORT% BACKEND_RUNNING
if "%BACKEND_RUNNING%"=="1" (
  echo [OK] Backend is already running on %BACKEND_URL%
) else (
  echo [START] Launching backend in a new terminal...
  start "MindHealix Backend" powershell -NoExit -ExecutionPolicy Bypass -Command "$env:PORT='%BACKEND_PORT%'; Set-Location '%BACKEND_DIR%'; & '.\venv\Scripts\python.exe' app.py"
)

echo.
echo Waiting for services to warm up...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 8"

echo.
echo Status check:
call :check_port 3000 FRONTEND_RUNNING
if "%FRONTEND_RUNNING%"=="1" (
  echo [OK] Frontend is listening on port 3000
) else (
  echo [WARN] Frontend is not listening on port 3000 yet
)

call :check_port %BACKEND_PORT% BACKEND_RUNNING
if "%BACKEND_RUNNING%"=="1" (
  echo [OK] Backend is listening on port %BACKEND_PORT%
) else (
  echo [WARN] Backend is not listening on port %BACKEND_PORT% yet
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $response = Invoke-WebRequest -UseBasicParsing '%HEALTH_URL%'; if ($response.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
if %errorlevel%==0 (
  echo [OK] Backend health endpoint responded successfully
) else (
  echo [WARN] Backend health endpoint did not respond yet
)

echo.
echo Open these URLs in your browser:
echo   Frontend: %FRONTEND_URL%
echo   Backend : %BACKEND_URL%
echo.
echo Notes:
echo   - Frontend uses backend mode from frontend\.env
echo   - Backend reads MongoDB and API settings from backend\.env
echo   - Use STOP_PROJECT.bat to stop local servers
echo.

:end
endlocal
goto :eof

:check_port
set "%~2=0"
netstat -ano | findstr ":%~1" | findstr "LISTENING" >nul
if %errorlevel%==0 set "%~2=1"
goto :eof
