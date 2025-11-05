# Deployment Frontend - Numerica
# Este script construye y despliega el frontend con la configuracion correcta

$ErrorActionPreference = "Stop"

$CLOUDFRONT_BUCKET = "payroll-employees-845465762708-us-east-1"
$CLOUDFRONT_DISTRIBUTION_ID = "E3JFSGITJTR6NS"
$API_URL = "https://ki6h36kbh4.execute-api.us-east-1.amazonaws.com"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT FRONTEND - NUMERICA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Paso 1: Verificar .env.production
Write-Host "[1/4] Verificando .env.production..." -ForegroundColor Yellow
$envContent = Get-Content ".env.production" -Raw
if ($envContent -notmatch "ki6h36kbh4") {
    Write-Host "    Actualizando .env.production con URL correcta..." -ForegroundColor Yellow
    $envContent = $envContent -replace "REACT_APP_API_URL=.*", "REACT_APP_API_URL=$API_URL"
    $envContent | Set-Content ".env.production" -Encoding UTF8
    Write-Host "    OK - .env.production actualizado" -ForegroundColor Green
}
else {
    Write-Host "    OK - .env.production ya tiene la URL correcta" -ForegroundColor Green
}
Write-Host ""

# Paso 2: Limpiar build anterior
Write-Host "[2/4] Limpiando build anterior..." -ForegroundColor Yellow
if (Test-Path "build") {
    Remove-Item -Path "build" -Recurse -Force
    Write-Host "    OK - Build anterior eliminado" -ForegroundColor Green
}
else {
    Write-Host "    OK - No hay build anterior" -ForegroundColor Green
}
Write-Host ""

# Paso 3: Construir aplicacion
Write-Host "[3/4] Construyendo aplicacion React..." -ForegroundColor Yellow
Write-Host "    Esto puede tomar algunos minutos..." -ForegroundColor Gray
Write-Host ""
$env:NODE_ENV = "production"
npm run build

if (-not (Test-Path "build")) {
    Write-Host ""
    Write-Host "ERROR: Build fallo. Revisa los errores arriba." -ForegroundColor Red
    exit 1
}
Write-Host ""
Write-Host "    OK - Build completado exitosamente" -ForegroundColor Green
Write-Host ""

# Paso 4: Desplegar a S3 y CloudFront
Write-Host "[4/4] Desplegando a AWS..." -ForegroundColor Yellow
Write-Host "    Subiendo archivos a S3..." -ForegroundColor Gray
aws s3 sync build/ s3://$CLOUDFRONT_BUCKET --delete --exact-timestamps

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Fallo la subida a S3" -ForegroundColor Red
    exit 1
}

Write-Host "    OK - Archivos subidos a S3" -ForegroundColor Green
Write-Host ""
Write-Host "    Invalidando cache de CloudFront..." -ForegroundColor Gray
$invalidationResult = aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths "/*" --output json | ConvertFrom-Json

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "WARNING: Fallo la invalidacion de cache" -ForegroundColor Yellow
}
else {
    $invalidationId = $invalidationResult.Invalidation.Id
    Write-Host "    OK - Cache invalidado (ID: $invalidationId)" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT COMPLETADO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Detalles:"
Write-Host "  Frontend URL: https://d3s6xfijfd78h6.cloudfront.net/busqueda-empleados"
Write-Host "  API Backend: $API_URL"
Write-Host ""
Write-Host "Los cambios pueden tardar 5-10 minutos en propagarse." -ForegroundColor Gray
Write-Host ""

