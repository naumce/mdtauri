@echo off
echo Adding Node.js to system PATH permanently...
setx PATH "%PATH%;C:\Program Files\nodejs\" /M
echo.
echo PATH updated! Please restart your PowerShell/Command Prompt.
echo.
echo After restart, you can use:
echo   npm run dev
echo   npx tauri dev
echo.
pause

