# Script de deployment del frontend con configuración correcta
$ErrorActionPreference = "Stop"

# Configuración
$CLOUDFRONT_BUCKET = "payroll-employees-845465762708-us-east-1"
$CLOUDFRONT_DISTRIBUTION_ID = "E3JFSGITJTR6NS"
$API_URL = "http://localhost:3001"

Write-Host "=================================="
Write-Host "  DEPLOYMENT FRONTEND - NUMERICA"
Write-Host "=================================="
Write-Host ""

# Paso 1: Verificar .env.production
Write-Host "[1/4] Verificando .env.production..."
$envContent = Get-Content ".env.production" -Raw
if ($envContent -notmatch "REACT_APP_API_URL=https://numerica-1\.onrender\.com") {
    Write-Host "  ⚠️  Actualizando .env.production con URL correcta..."
    $envContent = $envContent -replace "REACT_APP_API_URL=.*", "REACT_APP_API_URL=$API_URL"
    $envContent | Set-Content ".env.production" -Encoding UTF8
    Write-Host "  ✅ .env.production actualizado"
} else {
    Write-Host "  ✅ .env.production ya tiene la URL correcta"
}
Write-Host ""

# Paso 2: Limpiar build anterior
Write-Host "[2/4] Limpiando build anterior..."
if (Test-Path "build") {
    Remove-Item -Path "build" -Recurse -Force
    Write-Host "  ✅ Build anterior eliminado"
} else {
    Write-Host "  ℹ️  No hay build anterior"
}
Write-Host ""

# Paso 3: Construir aplicación
Write-Host "[3/4] Construyendo aplicación React..."
Write-Host "  (Esto puede tomar algunos minutos...)"
Write-Host ""
$env:NODE_ENV = "production"
npm run build

if (-not (Test-Path "build")) {
    Write-Host ""
    Write-Host "❌ ERROR: Build falló. Revisa los errores arriba."
    exit 1
}
Write-Host ""
Write-Host "  ✅ Build completado exitosamente"
Write-Host ""

# Paso 4: Desplegar a S3 y CloudFront
Write-Host "[4/4] Desplegando a AWS..."
Write-Host "  → Subiendo archivos a S3..."
aws s3 sync build/ s3://$CLOUDFRONT_BUCKET --delete --exact-timestamps

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ ERROR: Falló la subida a S3"
    exit 1
}

Write-Host "  ✅ Archivos subidos a S3"
Write-Host ""
Write-Host "  → Invalidando caché de CloudFront..."
$invalidationResult = aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths "/*" --output json | ConvertFrom-Json

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "⚠️  WARNING: Falló la invalidación de caché. Los cambios pueden tardar en verse."
} else {
    $invalidationId = $invalidationResult.Invalidation.Id
    Write-Host "  ✅ Caché invalidado (ID: $invalidationId)"
}

Write-Host ""
Write-Host "=================================="
Write-Host "  ✅ DEPLOYMENT COMPLETADO!"
Write-Host "=================================="
Write-Host ""
Write-Host "📋 Detalles:"
Write-Host "  • Frontend URL: https://d3s6xfijfd78h6.cloudfront.net/busqueda-empleados"
Write-Host "  • API Backend: $API_URL"
Write-Host ""
Write-Host "⏱️  Los cambios pueden tardar 5-10 minutos en propagarse."
Write-Host ""

