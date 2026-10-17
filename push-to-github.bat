@echo off
set "PATH=%~dp0..\git\cmd;%PATH%"
cd /d "%~dp0"

echo ========================================================
echo   Pushing Amazon Warehouse Hunter to GitHub
echo   Repository: https://github.com/nirajtimila/amazon.git
echo ========================================================
echo.

git push -u origin main

echo.
echo ========================================================
if %ERRORLEVEL% equ 0 (
    echo [SUCCESS] Code pushed to GitHub!
    echo GitHub Actions will now automatically build the Docker image.
) else (
    echo [NOTICE] If GitHub asked for a password, use a Personal Access Token:
    echo https://github.com/settings/tokens
)
echo ========================================================
pause
