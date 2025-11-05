@echo off
echo 🌐 Configurando PostgreSQL en la nube (GRATUITO)...
echo.

echo 📝 Opciones recomendadas para PostgreSQL gratuito:
echo.
echo 1. 🐘 ElephantSQL (20MB gratis) - MAS FACIL
echo    URL: https://www.elephantsql.com/
echo    Plan: Tiny Turtle (gratis)
echo.
echo 2. 🔥 Supabase (500MB + 2 semanas gratis)  
echo    URL: https://supabase.com/
echo    Plan: Free tier
echo.
echo 3. 🗄️ Neon (10GB gratis)
echo    URL: https://neon.tech/
echo    Plan: Free tier
echo.

echo ⭐ RECOMENDACION: Usar ElephantSQL por simplicidad
echo.
pause

echo 📋 Instrucciones para ElephantSQL:
echo.
echo 1. Ir a https://www.elephantsql.com/
echo 2. Click "Get a managed database today"
echo 3. Crear cuenta gratuita
echo 4. Click "Create New Instance"
echo 5. Nombre: payroll-db
echo 6. Plan: Tiny Turtle (Free)
echo 7. Region: US-East-1
echo 8. Click "Review" y "Create instance"
echo 9. Copiar la URL de conexión
echo.

pause

echo.
echo 🔧 Configurando archivo .env.database...
echo.

set /p connection_url="Pega la URL completa de ElephantSQL: "

REM Extraer componentes de la URL
for /f "tokens=1,2 delims=@" %%a in ("%connection_url%") do (
    set "user_pass=%%a"
    set "host_db=%%b"
)

REM Extraer user y password
for /f "tokens=1,2 delims=:" %%c in ("%user_pass:~13%") do (
    set "db_user=%%c"
    set "db_password=%%d"
)

REM Extraer host y database
for /f "tokens=1,2 delims=/" %%e in ("%host_db%") do (
    set "db_host=%%e"
    set "db_name=%%f"
)

(
echo # PostgreSQL Cloud Configuration - ElephantSQL
echo DB_HOST=%db_host%
echo DB_PORT=5432
echo DB_NAME=%db_name%
echo DB_USER=%db_user%
echo DB_PASSWORD=%db_password%
echo NODE_ENV=production
echo SSL_REQUIRED=true
) > .env.database

echo ✅ Archivo .env.database creado
echo.

echo 🧪 Probando conexión...
node test-db-connection.js

echo.
echo 📊 Si la conexión es exitosa, ejecutar el schema:
echo.
echo 📝 Pasos siguientes:
echo 1. Ir al panel de ElephantSQL
echo 2. Click en tu instancia "payroll-db"
echo 3. Ir a la pestaña "Browser"
echo 4. Copiar y pegar el contenido de backend-lambda/seed/schema.sql
echo 5. Click "Execute"
echo.
pause
