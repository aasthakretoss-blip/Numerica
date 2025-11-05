# Re-deploy script para API de Numerica
# Arregla el error de googleapis faltante en AWS Lambda

Write-Host "Re-deployeando API a produccion..." -ForegroundColor Green

# Instalar dependencias si no existen
if (-not (Test-Path "node_modules")) {
    Write-Host "Instalando dependencias..." -ForegroundColor Yellow
    npm install
}

# Limpiar cache y reinstalar googleapis especificamente
Write-Host "Reinstalando googleapis..." -ForegroundColor Yellow
npm uninstall googleapis
npm install googleapis@^160.0.0

# Re-deploy a produccion
Write-Host "Deployeando a AWS Lambda..." -ForegroundColor Blue
npx serverless deploy --stage prod --verbose

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deploy exitoso! Tu API esta disponible en:" -ForegroundColor Green
    Write-Host "   https://numerica-2.onrender.com" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Probando la API..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-RestMethod -Uri "https://numerica-2.onrender.com/api/health" -Method GET -TimeoutSec 30
        Write-Host "API respondiendo correctamente!" -ForegroundColor Green
        Write-Host "   Status: $($response.status)" -ForegroundColor White
    } catch {
        Write-Host "API deployeada pero no responde a health check. Puede tardar unos minutos." -ForegroundColor Yellow
    }
} else {
    Write-Host "Error en el deploy. Revisa los logs arriba." -ForegroundColor Red
}
