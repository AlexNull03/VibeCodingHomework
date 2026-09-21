@echo off
chcp 65001 >nul
setlocal

set HOST=alex@www.alexcn.work
set REMOTE=/home/alex/Work2/Qoder

echo === Creating remote directories ===
ssh %HOST% "mkdir -p %REMOTE%/css %REMOTE%/js"
if errorlevel 1 (
    echo [FAIL] Cannot create remote directories
    pause
    exit /b 1
)

echo === Uploading index.html ===
scp index.html %HOST%:%REMOTE%/
if errorlevel 1 goto :fail

echo === Uploading css/style.css ===
scp css\style.css %HOST%:%REMOTE%/css/
if errorlevel 1 goto :fail

echo === Uploading js files ===
scp js\crypto.js js\stego.js js\app.js %HOST%:%REMOTE%/js/
if errorlevel 1 goto :fail

echo.
echo === Upload complete ===
echo Visit: https://www.alexcn.work/Work2/Qoder
pause
exit /b 0

:fail
echo [FAIL] Upload failed
pause
exit /b 1
