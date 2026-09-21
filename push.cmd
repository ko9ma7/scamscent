@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\github-push.ps1" %*
set EXITCODE=%ERRORLEVEL%
if not "%EXITCODE%"=="0" (
  echo.
  echo [ERROR] Push failed with exit code %EXITCODE%.
  pause
  exit /b %EXITCODE%
)
echo.
echo [OK] Build and push completed successfully.
echo GitHub Actions will deploy the latest commit.
pause
exit /b 0
