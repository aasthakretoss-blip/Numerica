# Script de actualización rápida para Numerica Frontend CloudFront
# Actualiza la aplicación React en CloudFront (versión oficial)

$bucketName = "payroll-employees-845465762708-us-east-1"
$distributionId = "E3JFSGITJTR6NS"
$cloudfrontUrl = "https://d3s6xfijfd78h6.cloudfront.net/busqueda-empleados"

Write-Output "🔄 ACTUALIZANDO NUMERICA FRONTEND (CLOUDFRONT)"
Write-Output "=============================================="
Write-Output ""

Write-Output "📦 Construyendo aplicación con las últimas correcciones..."
npm run build --silent

if (Test-Path "build") {
    Write-Output "📤 Subiendo cambios al bucket de CloudFront..."
    aws s3 sync build/ s3://$bucketName --delete --exact-timestamps
    
    Write-Output "🔄 Invalidando caché de CloudFront..."
    $invalidation = aws cloudfront create-invalidation --distribution-id $distributionId --paths "/*" --output json | ConvertFrom-Json
    $invalidationId = $invalidation.Invalidation.Id
    
    Write-Output "✅ ¡Actualización completada!"
    Write-Output ""
    Write-Output "🌍 Tu aplicación está disponible en:"
    Write-Output "   $cloudfrontUrl"
    Write-Output ""
    Write-Output "⏱️ Invalidación iniciada: $invalidationId"
    Write-Output "   La caché se actualizará en 1-5 minutos"
    Write-Output ""
    
    # Opcional: abrir navegador
    Start-Process $cloudfrontUrl
} else {
    Write-Output "❌ Error: No se pudo construir la aplicación"
}
