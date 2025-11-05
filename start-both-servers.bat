@echo off
title Numerica - Sistema Completo
echo.
echo ===============================================
echo   🚀 INICIANDO NUMERICA - SISTEMA COMPLETO
echo   📊 API Server + React Frontend
echo ===============================================
echo.

echo 🔧 Deteniendo procesos previos...
taskkill /f /im node.exe >nul 2>&1

echo 📊 Iniciando API Server en puerto 3001...
start "API Server" cmd /k "node api-server-complete.js"

echo ⏳ Esperando que el API server se inicie...
timeout /t 5 /nobreak >nul

echo 🎮 Iniciando React Frontend en puerto 3000...
start "React App" cmd /k "npm start"

echo.
echo ✅ AMBOS SERVIDORES INICIADOS
echo.
echo 📊 API Server: http://localhost:3001
echo 🎮 React App: http://localhost:3000  
echo.
echo 💡 Mantén ambas ventanas abiertas para que funcione correctamente
echo ⚠️  Para detener: Cierra ambas ventanas de comando
echo.
pause
