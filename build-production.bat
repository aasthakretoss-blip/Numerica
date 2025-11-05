@echo off
echo ====================================
echo  BUILD DE PRODUCCION CON ENV VARS
echo ====================================

echo.
echo [1/3] Configurando variables de entorno...
set NODE_ENV=production
set REACT_APP_ENV=production
set REACT_APP_API_URL=https://ki6h36kbh4.execute-api.us-east-1.amazonaws.com
set REACT_APP_COGNITO_USER_POOL_ID=us-east-1_JwP9gBEvr
set REACT_APP_COGNITO_CLIENT_ID=18l43dor2k5fja5pu0caf64u2f
set REACT_APP_COGNITO_REGION=us-east-1
set GENERATE_SOURCEMAP=false

echo Variables configuradas:
echo NODE_ENV=%NODE_ENV%
echo REACT_APP_ENV=%REACT_APP_ENV%
echo REACT_APP_API_URL=%REACT_APP_API_URL%

echo.
echo [2/3] Limpiando build anterior...
if exist build rmdir /s /q build

echo.
echo [3/3] Construyendo aplicacion...
npm run build

echo.
echo ====================================
echo  BUILD COMPLETADO!
echo  Carpeta build lista para despliegue
echo ====================================

pause
