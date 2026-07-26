@echo off
title Imagen Cosmetics
cd /d "%~dp0"
echo Iniciando Imagen Cosmetics, un momento...
start /min cmd /c "npm start"
timeout /t 3 /nobreak >nul
start "" http://localhost:3000
exit
