# Deploy Lambda usando CDK
Write-Host "Desplegando Lambda actualizado con CDK..." -ForegroundColor Cyan

Push-Location $PSScriptRoot

try {
    Write-Host "Instalando dependencias de CDK..." -ForegroundColor Yellow
    npm install --include=dev
    
    Write-Host "Desplegando cambios con CDK..." -ForegroundColor Yellow
    npx cdk deploy --require-approval never
    
    Write-Host "Deployment completado!" -ForegroundColor Green
    Write-Host "API URL: https://numerica-1.onrender.com" -ForegroundColor Cyan
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}

