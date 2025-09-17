@echo off
echo Starting MD Creator Tauri App...
echo.
cd /d "E:\Synami\MD Creator 2\mdtauri"
set PATH=C:\Program Files\nodejs\;%PATH%
echo Starting Tauri development server...
npx tauri dev
pause

