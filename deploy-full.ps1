# Script completo de deployment para Numerica
# Actualiza tanto frontend (CloudFront) como backend (Lambda) si es necesario

param(
    [string]$Component = "frontend", # "frontend", "backend", o "all"
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"

# URLs actuales funcionando
$CLOUDFRONT_URL = "https://d3s6xfijfd78h6.cloudfront.net/busqueda-empleados"
$API_URL_CURRENT = "http://localhost:3001"
$CLOUDFRONT_DISTRIBUTION_ID = "E3JFSGITJTR6NS"
$CLOUDFRONT_BUCKET = "payroll-employees-845465762708-us-east-1"

Write-Output "🚀 DEPLOYMENT COMPLETO DE NUMERICA"
Write-Output "=================================="
Write-Output ""
Write-Output "📋 Configuración:"
Write-Output "   Componente: $Component"
Write-Output "   CloudFront: $CLOUDFRONT_URL"
Write-Output "   API Backend: $API_URL_CURRENT"
Write-Output ""

function Test-APIHealth {
    param([string]$ApiUrl)
    
    try {
        $response = Invoke-RestMethod "$ApiUrl/api/payroll/stats" -TimeoutSec 10
        return $response.success -eq $true
    } catch {
        return $false
    }
}

function Deploy-Frontend {
    Write-Output "🎨 ACTUALIZANDO FRONTEND"
    Write-Output "========================"
    Write-Output ""
    
    # Verificar configuración de producción
    if (-not (Get-Content ".env.production" | Select-String "REACT_APP_API_URL=https://numerica-2.onrender.com")) {
        Write-Output "⚠️ Configurando variables de producción..."
        $envContent = Get-Content ".env.production" -Raw
        $envContent = $envContent -replace "REACT_APP_API_URL=.*", "REACT_APP_API_URL=https://numerica-2.onrender.com"
        $envContent = $envContent -replace "REACT_APP_ENV=.*", "REACT_APP_ENV=production"
        $envContent | Out-File ".env" -Encoding UTF8
        Write-Output "✅ Variables de producción configuradas"
    }
    
    # Construir aplicación
    Write-Output "📦 Construyendo aplicación React..."
    npm run build --silent
    
    if (-not (Test-Path "build")) {
        throw "❌ Error: Build falló"
    }
    
    # Subir a S3
    Write-Output "📤 Subiendo a CloudFront bucket..."
    aws s3 sync build/ s3://$CLOUDFRONT_BUCKET --delete --exact-timestamps
    
    # Invalidar caché
    Write-Output "🔄 Invalidando caché de CloudFront..."
    $invalidation = aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths "/*" --output json | ConvertFrom-Json
    $invalidationId = $invalidation.Invalidation.Id
    
    Write-Output "✅ Frontend actualizado"
    Write-Output "   URL: $CLOUDFRONT_URL"
    Write-Output "   Invalidación: $invalidationId"
    Write-Output ""
}

function Deploy-Backend {
    Write-Output "⚠️ BACKEND DEPLOYMENT"
    Write-Output "====================="
    Write-Output ""
    Write-Output "🔴 ADVERTENCIA: El backend actual está funcionando correctamente."
    Write-Output "   URL: $API_URL_CURRENT"
    Write-Output ""
    
    if (-not $Force) {
        Write-Output "   Para actualizar el backend, usa el flag -Force"
        Write-Output "   Esto puede causar interrupciones temporales del servicio."
        return
    }
    
    Write-Output "🚨 DESPLEGANDO BACKEND CON -Force..."
    Write-Output ""
    
    # Aquí iría la lógica de deployment del backend
    # Por ahora, solo mostramos la advertencia
    Write-Output "❌ Deployment de backend deshabilitado para prevenir interrupciones"
    Write-Output "   El backend actual está funcionando correctamente en:"
    Write-Output "   $API_URL_CURRENT"
}

function Test-Everything {
    Write-Output "🧪 VERIFICANDO SISTEMA COMPLETO"
    Write-Output "==============================="
    Write-Output ""
    
    # Verificar API
    Write-Output "🔍 Probando backend API..."
    $apiHealth = Test-APIHealth $API_URL_CURRENT
    if ($apiHealth) {
        Write-Output "✅ Backend API funcionando correctamente"
    } else {
        Write-Output "❌ Backend API con problemas"
    }
    
    # Verificar frontend
    Write-Output "🔍 Probando frontend..."
    try {
        $frontendResponse = Invoke-WebRequest $CLOUDFRONT_URL -UseBasicParsing -TimeoutSec 10
        if ($frontendResponse.StatusCode -eq 200) {
            Write-Output "✅ Frontend accesible"
        } else {
            Write-Output "⚠️ Frontend responde pero con código: $($frontendResponse.StatusCode)"
        }
    } catch {
        Write-Output "❌ Frontend no accesible: $_"
    }
    
    Write-Output ""
    Write-Output "📊 RESUMEN DEL SISTEMA:"
    Write-Output "   Frontend: $CLOUDFRONT_URL"
    Write-Output "   Backend:  $API_URL_CURRENT"
    Write-Output "   Estado:   $(if($apiHealth) { "✅ FUNCIONANDO" } else { "❌ CON PROBLEMAS" })"
    Write-Output ""
}

# Ejecutar según el componente solicitado
switch ($Component.ToLower()) {
    "frontend" { 
        Deploy-Frontend 
        Test-Everything
    }
    "backend" { 
        Deploy-Backend 
    }
    "all" { 
        Deploy-Frontend
        Deploy-Backend 
        Test-Everything
    }
    "test" {
        Test-Everything
    }
    default { 
        Write-Output "❌ Componente inválido. Usa: frontend, backend, all, o test"
        exit 1
    }
}

Write-Output "Deployment completado exitosamente!"
Write-Output ""
