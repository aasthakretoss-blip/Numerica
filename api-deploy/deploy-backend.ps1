# Deploy Backend to AWS Lambda
Write-Host "🚀 Desplegando backend a AWS Lambda..." -ForegroundColor Cyan

# Cambiar al directorio api-deploy
Push-Location $PSScriptRoot

try {
    Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow
    npm install
    
    Write-Host "🔧 Desplegando a AWS Lambda (stage: prod)..." -ForegroundColor Yellow
    npx serverless deploy --stage prod --region us-east-1
    
    Write-Host "✅ ¡Deployment completado exitosamente!" -ForegroundColor Green
    Write-Host "🌐 API URL: https://numerica-2.onrender.com" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Error durante el deployment: $_" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}

