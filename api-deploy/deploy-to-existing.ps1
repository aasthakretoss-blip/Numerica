# Deploy Backend to AWS Lambda - Endpoint Existente (ki6h36kbh4)
Write-Host "🚀 Desplegando backend a AWS Lambda (endpoint existente)..." -ForegroundColor Cyan

# Cambiar al directorio api-deploy
Push-Location $PSScriptRoot

try {
    Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow
    npm install
    
    Write-Host "🔧 Desplegando a AWS Lambda (stage: dev - endpoint existente ki6h36kbh4)..." -ForegroundColor Yellow
    npx serverless deploy --stage dev --region us-east-1
    
    Write-Host "✅ ¡Deployment completado exitosamente!" -ForegroundColor Green
    Write-Host "🌐 API URL: https://ki6h36kbh4.execute-api.us-east-1.amazonaws.com" -ForegroundColor Cyan
    Write-Host "📝 Verifica que el endpoint responda correctamente" -ForegroundColor Yellow
} catch {
    Write-Host "❌ Error durante el deployment: $_" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}

