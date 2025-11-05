@echo off
echo ====================================
echo  DESPLEGANDO CAMBIOS A CLOUDFRONT
echo ====================================

echo.
echo [1/5] Navegando al directorio raiz...
cd ..

echo.
echo [2/5] Configurando variables de entorno...
set REACT_APP_ENV=production
set REACT_APP_API_URL=https://ki6h36kbh4.execute-api.us-east-1.amazonaws.com
set NODE_ENV=production

echo.
echo [3/5] Construyendo aplicacion...
npm run build

echo.
echo [4/5] Subiendo archivos a S3...
cd infra-cdk
aws s3 sync ..\build s3://payroll-employees-845465762708-us-east-1 --delete

echo.
echo [5/5] Invalidando cache de CloudFront...
aws cloudfront create-invalidation --distribution-id E3JFSGITJTR6NS --paths "/*"

echo.
echo ====================================
echo  DESPLIEGUE COMPLETADO!
echo  URL: https://d3s6xfijfd78h6.cloudfront.net
echo  Los cambios estaran disponibles en 2-5 minutos
echo ====================================

pause
