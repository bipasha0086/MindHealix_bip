@echo off
setlocal

echo Stopping local project processes on ports 3000, 5001, and 5000...

call :kill_port 3000
call :kill_port 5001
call :kill_port 5000

echo Done.
endlocal
goto :eof

:kill_port
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%~1" ^| findstr "LISTENING"') do (
  echo [STOP] Killing PID %%p on port %~1
  taskkill /F /PID %%p >nul 2>&1
)
goto :eof
