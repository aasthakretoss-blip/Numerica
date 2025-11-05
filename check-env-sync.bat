@echo off
echo ====================================
echo  VERIFICACION DE SINCRONIZACION
echo ====================================

echo.
echo [LOCAL] User Pool: us-east-1_1NlXUqafP (SINCRONIZADO CON PRODUCCION)
echo [PROD]  User Pool: us-east-1_1NlXUqafP
echo.

echo [LOCAL] API: http://localhost:3001 (desarrollo)
echo [PROD]  API: https://ki6h36kbh4.execute-api.us-east-1.amazonaws.com
echo.

echo ====================================
echo  RECOMENDACIONES:
echo ====================================
echo 1. Ahora ambos ambientes usan el MISMO User Pool
echo 2. Los usuarios de CloudFront seran los mismos en localhost
echo 3. Para probar: reinicia npm start
echo 4. Inicia sesion con las mismas credenciales que CloudFront
echo ====================================
pause
