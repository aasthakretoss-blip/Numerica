@echo off
echo 🐳 Configurando PostgreSQL local con Docker...
echo.

REM Verificar si Docker está instalado
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker no encontrado. Instala Docker Desktop primero.
    echo 💡 Descarga: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo ✅ Docker encontrado
echo.

REM Crear red Docker si no existe
docker network create payroll-network 2>nul

echo 🚀 Iniciando PostgreSQL container...
docker run -d ^
    --name payroll-postgres ^
    --network payroll-network ^
    -e POSTGRES_DB=payroll ^
    -e POSTGRES_USER=postgres ^
    -e POSTGRES_PASSWORD=postgres ^
    -p 5432:5432 ^
    postgres:15

if errorlevel 1 (
    echo ⚠️  Container ya existe, reiniciando...
    docker start payroll-postgres
)

echo ⏳ Esperando que PostgreSQL esté listo...
timeout /t 10 /nobreak >nul

echo.
echo 📋 Información de conexión:
echo    Host: localhost
echo    Puerto: 5432
echo    Base de datos: payroll
echo    Usuario: postgres
echo    Contraseña: postgres
echo.

REM Crear archivo .env.database
echo 🔧 Creando archivo de configuración...
(
echo # Configuración PostgreSQL Local
echo DB_HOST=localhost
echo DB_PORT=5432
echo DB_NAME=payroll
echo DB_USER=postgres
echo DB_PASSWORD=postgres
echo NODE_ENV=development
echo SSL_REQUIRED=false
) > .env.database

echo ✅ Archivo .env.database creado
echo.

echo 🧪 Probando conexión...
node test-db-connection.js

echo.
echo 🎉 PostgreSQL local configurado!
echo.
echo 📝 Próximos pasos:
echo    1. Ejecutar schema: psql -h localhost -U postgres -d payroll -f backend-lambda/seed/schema.sql
echo    2. Cargar datos: python backend-lambda/seed/generate_seed.py 50 ^| psql -h localhost -U postgres -d payroll -c "\copy employees FROM STDIN WITH (FORMAT CSV, HEADER);"
echo.
pause
