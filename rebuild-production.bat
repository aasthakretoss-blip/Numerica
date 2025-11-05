@echo off
echo ========================================
echo REBUILD DE PRODUCCION - NUMERICA
echo ========================================
echo.

echo [1/4] Limpiando build anterior...
if exist build (
    rmdir /s /q build
    echo Build anterior eliminado
) else (
    echo No habia build anterior
)
echo.

echo [2/4] Verificando .env.production...
type .env.production
echo.

echo [3/4] Construyendo para produccion...
echo Ejecutando: npm run build
call npm run build
if errorlevel 1 (
    echo ERROR: El build fallo
    pause
    exit /b 1
)
echo Build completado exitosamente
echo.

echo [4/4] Verificando URL en el build...
echo Buscando URL del API Gateway en archivos JavaScript...
findstr /S /C:"execute-api" build\static\js\*.js
echo.

echo ========================================
echo BUILD COMPLETADO
echo ========================================
echo.
echo Proximos pasos:
echo 1. Revisar que la URL correcta aparezca arriba
echo 2. Hacer deploy a S3: aws s3 sync build/ s3://TU-BUCKET --delete
echo 3. Invalidar cache CloudFront: aws cloudfront create-invalidation --distribution-id TU-DIST-ID --paths "/*"
echo.
pause

