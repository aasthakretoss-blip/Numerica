@echo off
title Sistema de Empleados - Servidor Completo
echo.
echo ===============================================
echo   🎯 SISTEMA DE EMPLEADOS PAYROLL
echo   🔗 Conectado a PostgreSQL AWS Real  
echo ===============================================
echo.

echo 📊 Verificando conexión a base de datos...
npm run db:test
echo.

if errorlevel 1 (
    echo ❌ Error de conexión a base de datos
    echo 💡 Revisa la configuración en .env.database
    pause
    exit /b 1
)

echo ✅ Base de datos OK
echo.

echo 🚀 Iniciando servidor API (Puerto 3001)...
echo ➜ API: http://localhost:3001/api/employees
echo.

REM Ejecutar servidor API en segundo plano
start "API Server" cmd /k "npm run api:start"

echo ⏳ Esperando que el servidor API esté listo...
timeout /t 3 /nobreak >nul

echo.
echo 🎮 Iniciando Dashboard Frontend (Puerto 5173)...  
echo ➜ Dashboard: http://localhost:5173/
echo.
echo 📝 NOTA: El dashboard ahora se conecta directamente a PostgreSQL AWS
echo 📝 NOTA: Ya no usa archivos de prueba, solo datos reales
echo.
echo ⚠️  Para detener: Ctrl+C en ambas ventanas
echo.

REM Cambiar al directorio del frontend e iniciar
cd frontend-react
npm run dev
