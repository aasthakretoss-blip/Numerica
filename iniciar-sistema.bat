@echo off
title Sistema de Empleados Payroll - Numerica
color 0A

echo.
echo  ===================================================
echo   🎯 SISTEMA DE EMPLEADOS PAYROLL - NUMERICA
echo  ===================================================
echo.
echo  📍 Ubicacion: %CD%
echo  🗓️ Fecha: %DATE% %TIME%
echo  👤 Usuario AWS: numerica-dev-user
echo.

echo  📋 OPCIONES DISPONIBLES:
echo.
echo  1. 🚀 Iniciar Frontend (Dashboard)
echo  2. 🗃️ Configurar Base de Datos PostgreSQL
echo  3. 🧪 Probar Conexion a BD
echo  4. 📊 Ver Estado AWS
echo  5. 📖 Ver Documentacion
echo  6. 🛠️ Diagnostico Completo
echo  0. ❌ Salir
echo.

set /p opcion="Selecciona una opcion (0-6): "

if "%opcion%"=="1" goto :frontend
if "%opcion%"=="2" goto :database
if "%opcion%"=="3" goto :test_db
if "%opcion%"=="4" goto :aws_status
if "%opcion%"=="5" goto :docs
if "%opcion%"=="6" goto :diagnostics
if "%opcion%"=="0" goto :exit
goto :invalid

:frontend
echo.
echo 🚀 Iniciando Dashboard de Empleados...
echo ➜ Se abrira en: http://localhost:5173/
echo ➜ Presiona Ctrl+C para detener
echo.
cd frontend-react
npm run dev
pause
goto :menu

:database
echo.
echo 🗃️ Configurando Base de Datos PostgreSQL...
echo.
npm run db:setup-cloud
pause
goto :menu

:test_db
echo.
echo 🧪 Probando conexion a PostgreSQL...
echo.
npm run db:test
pause
goto :menu

:aws_status
echo.
echo 📊 Estado de AWS...
echo.
echo Usuario AWS:
aws sts get-caller-identity
echo.
echo Configuracion:
aws configure list
echo.
echo Region actual: %AWS_REGION%
pause
goto :menu

:docs
echo.
echo 📖 Abriendo documentacion...
echo.
echo Archivos disponibles:
echo - SISTEMA_EMPLEADOS.md (Guia completa)
echo - DATABASE_SETUP.md (Setup de BD)
echo - DEPLOYMENT.md (Deploy AWS)
echo - QUICK_START.md (Inicio rapido)
echo.
if exist "SISTEMA_EMPLEADOS.md" (
    notepad SISTEMA_EMPLEADOS.md
) else (
    echo ⚠️  Archivo no encontrado
)
pause
goto :menu

:diagnostics
echo.
echo 🛠️ Ejecutando diagnostico completo...
echo.

echo ✅ Verificando Node.js...
node --version
echo.

echo ✅ Verificando NPM...
npm --version
echo.

echo ✅ Verificando dependencias frontend...
if exist "frontend-react\package.json" (
    echo Frontend: OK
) else (
    echo Frontend: FALTA
)
echo.

echo ✅ Verificando backend...
if exist "backend-lambda\src\main.py" (
    echo Backend: OK
) else (
    echo Backend: FALTA
)
echo.

echo ✅ Verificando infraestructura...
if exist "infra-cdk\lib\infra-cdk-stack.ts" (
    echo CDK: OK
) else (
    echo CDK: FALTA
)
echo.

echo ✅ Verificando AWS CLI...
aws --version
echo.

echo ✅ Probando conexion PostgreSQL...
node test-db-connection.js
echo.

echo ✅ Verificando archivos de configuracion...
if exist ".env.database" (
    echo BD Config: OK
) else (
    echo BD Config: Usar 'npm run db:setup-cloud'
)
echo.

echo 🎯 DIAGNOSTICO COMPLETO
pause
goto :menu

:invalid
echo.
echo ❌ Opcion invalida. Intenta de nuevo.
timeout /t 2 >nul
goto :menu

:menu
cls
goto :start

:exit
echo.
echo 👋 ¡Hasta luego!
echo.
timeout /t 2 >nul
exit

:start
goto :menu
