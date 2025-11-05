# Script de deployment simplificado para Numerica Frontend
param(
    [string]$Component = "frontend"
)

$ErrorActionPreference = "Stop"

# Verificar que estamos en el directorio correcto
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

if (-not (Test-Path "package.json")) {
    throw "Error: package.json no encontrado. Asegurate de ejecutar el script desde el directorio raiz del proyecto."
}

# URLs de produccion
$CLOUDFRONT_URL = "https://d3s6xfijfd78h6.cloudfront.net/busqueda-empleados"
$API_URL_CURRENT = "https://ki6h36kbh4.execute-api.us-east-1.amazonaws.com"
$CLOUDFRONT_DISTRIBUTION_ID = "E3JFSGITJTR6NS"
$CLOUDFRONT_BUCKET = "payroll-employees-845465762708-us-east-1"

Write-Output "=== DEPLOYMENT NUMERICA FRONTEND ==="
Write-Output ""
Write-Output "CloudFront URL: $CLOUDFRONT_URL"
Write-Output "Backend API: $API_URL_CURRENT"
Write-Output ""

# Configurar variables de produccion
Write-Output "[1/5] Configurando variables de produccion..."
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    $envContent = $envContent -replace "REACT_APP_API_URL=.*", "REACT_APP_API_URL=https://ki6h36kbh4.execute-api.us-east-1.amazonaws.com"
    $envContent = $envContent -replace "REACT_APP_ENV=.*", "REACT_APP_ENV=production"
    $envContent | Out-File ".env" -Encoding UTF8 -NoNewline
    Write-Output "Variables configuradas correctamente"
} else {
    Write-Output "Archivo .env no encontrado, creando uno nuevo..."
    @"
REACT_APP_API_URL=https://ki6h36kbh4.execute-api.us-east-1.amazonaws.com
REACT_APP_ENV=production
"@ | Out-File ".env" -Encoding UTF8
}

# Construir aplicacion
Write-Output ""
Write-Output "[2/5] Construyendo aplicacion React..."
npm run build

if (-not (Test-Path "build")) {
    throw "Error: Build fallo - no se encontro la carpeta build"
}
Write-Output "Build completado exitosamente"

# Subir a S3
Write-Output ""
Write-Output "[3/5] Subiendo archivos a S3/CloudFront..."
aws s3 sync build/ s3://$CLOUDFRONT_BUCKET --delete --exact-timestamps
Write-Output "Archivos subidos a S3"

# Invalidar cache
Write-Output ""
Write-Output "[4/5] Invalidando cache de CloudFront..."
$invalidation = aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths "/*" --output json | ConvertFrom-Json
$invalidationId = $invalidation.Invalidation.Id
Write-Output "Invalidacion creada: $invalidationId"

# Verificar estado
Write-Output ""
Write-Output "[5/5] Verificando deployment..."

# Verificar backend API
try {
    $response = Invoke-RestMethod "$API_URL_CURRENT/api/payroll/stats" -TimeoutSec 10
    if ($response.success -eq $true) {
        Write-Output "Backend API: OK"
    } else {
        Write-Output "Backend API: WARNING - respuesta inesperada"
    }
} catch {
    Write-Output "Backend API: ERROR - $_"
}

# Verificar frontend
try {
    $frontendResponse = Invoke-WebRequest $CLOUDFRONT_URL -UseBasicParsing -TimeoutSec 10
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Output "Frontend: OK"
    } else {
        Write-Output "Frontend: WARNING - codigo $($frontendResponse.StatusCode)"
    }
} catch {
    Write-Output "Frontend: ERROR - $_"
}

Write-Output ""
Write-Output "=== DEPLOYMENT COMPLETADO ==="
Write-Output ""
Write-Output "URL del dashboard: $CLOUDFRONT_URL"
Write-Output "Backend API: $API_URL_CURRENT"
Write-Output "Invalidacion CloudFront: $invalidationId"
Write-Output ""
Write-Output "Nota: Los cambios pueden tardar 2-5 minutos en propagarse"
Write-Output "      a traves de la red CDN de CloudFront."
