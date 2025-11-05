# Script para desplegar Lambda con fixes de timeout y query optimizada
$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " DEPLOYMENT LAMBDA - CORRECCIONES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Cambiar al directorio api-deploy
Set-Location -Path "api-deploy"

Write-Host "[1/3] Verificando dependencias..." -ForegroundColor Yellow
npm install

Write-Host ""
Write-Host "[2/3] Desplegando Lambda a AWS..." -ForegroundColor Yellow
Write-Host "  - Timeout aumentado: 30s → 60s" -ForegroundColor Green
Write-Host "  - Memoria aumentada: 512MB → 1024MB" -ForegroundColor Green
Write-Host "  - Query optimizada con CTE" -ForegroundColor Green
Write-Host ""

# Desplegar usando serverless
npx serverless deploy --stage dev --region us-east-1 --verbose

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ ERROR: Deployment falló" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host ""
Write-Host "[3/3] Verificando deployment..." -ForegroundColor Yellow

# Probar el endpoint de stats
$apiUrl = "https://numerica-1.onrender.com/api/payroll/stats"
Write-Host "  Probando: $apiUrl" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri $apiUrl -TimeoutSec 65 -Method GET
    
    if ($response.success) {
        Write-Host ""
        Write-Host "✅ DEPLOYMENT EXITOSO" -ForegroundColor Green
        Write-Host ""
        Write-Host "Estadísticas obtenidas:" -ForegroundColor White
        Write-Host "  • Empleados activos: $($response.data.uniqueEmployees)" -ForegroundColor White
        Write-Host "  • Total nóminas: $($response.data.totalRecords)" -ForegroundColor White
        Write-Host "  • Último período: $($response.data.latestPeriod)" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host "⚠️  API respondió pero con success=false" -ForegroundColor Yellow
        Write-Host "Respuesta: $($response | ConvertTo-Json)" -ForegroundColor Yellow
    }
} catch {
    Write-Host ""
    Write-Host "❌ ERROR: No se pudo verificar el endpoint" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Posibles causas:" -ForegroundColor Yellow
    Write-Host "  1. Lambda todavía tiene timeout (revisa CloudWatch Logs)" -ForegroundColor Yellow
    Write-Host "  2. Falta configurar VPC para acceso a RDS" -ForegroundColor Yellow
    Write-Host "  3. Security Groups no permiten Lambda → RDS" -ForegroundColor Yellow
    Write-Host ""
}

# Volver al directorio raíz
Set-Location ..

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " DEPLOYMENT COMPLETADO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos pasos si el error persiste:" -ForegroundColor Cyan
Write-Host "  1. Crear índices en PostgreSQL (ver README_INDICES.md)" -ForegroundColor White
Write-Host "  2. Verificar logs en CloudWatch" -ForegroundColor White
Write-Host "  3. Configurar VPC si Lambda no tiene acceso a RDS" -ForegroundColor White
Write-Host ""

