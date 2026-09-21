@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\github-bootstrap.ps1" %*
set EXITCODE=%ERRORLEVEL%
if not "%EXITCODE%"=="0" (
  echo.
  echo [ERROR] Bootstrap failed with exit code %EXITCODE%.
  pause
  exit /b %EXITCODE%
)
echo.
echo [OK] Bootstrap completed successfully.
echo You can close this window after checking the URLs above.
pause
exit /b 0
