# Script de deployment para Numerica Frontend
param(
    [string]$BucketName = "payroll-employees-845465762708-us-east-1",
    [string]$Region = "us-east-1",
    [string]$CloudFrontDistributionId = "E3JFSGITJTR6NS"
)

Write-Output "INICIANDO DEPLOYMENT DE NUMERICA FRONTEND"
Write-Output "========================================"

# Verificar AWS CLI
try {
    $awsVersion = aws --version 2>$null
    Write-Output "AWS CLI: $awsVersion"
} catch {
    Write-Error "AWS CLI no instalado"
    exit 1
}

# Verificar credenciales AWS
try {
    $awsIdentity = aws sts get-caller-identity --output json | ConvertFrom-Json
    Write-Output "AWS Identity: $($awsIdentity.Arn)"
} catch {
    Write-Error "AWS credentials no configuradas"
    exit 1
}

Write-Output "CONSTRUYENDO APLICACION REACT..."

# Limpiar build anterior
if (Test-Path "build") {
    Remove-Item -Recurse -Force "build"
    Write-Output "Build anterior eliminado"
}

# Construir aplicación React
try {
    npm run build
    Write-Output "Aplicacion construida exitosamente"
} catch {
    Write-Error "Error construyendo la aplicacion"
    exit 1
}

# Verificar que la carpeta build existe
if (-not (Test-Path "build")) {
    Write-Error "Carpeta build no encontrada"
    exit 1
}

Write-Output "SUBIENDO ARCHIVOS A S3..."

# Subir archivos a S3
try {
    aws s3 sync build/ s3://$BucketName --delete --exact-timestamps
    Write-Output "Archivos subidos exitosamente"
} catch {
    Write-Error "Error subiendo archivos"
    exit 1
}

Write-Output "INVALIDANDO CACHE DE CLOUDFRONT..."

try {
    $invalidationResult = aws cloudfront create-invalidation --distribution-id $CloudFrontDistributionId --paths "/*" | ConvertFrom-Json
    Write-Output "Cache invalidado exitosamente"
    Write-Output "ID de Invalidacion: $($invalidationResult.Invalidation.Id)"
} catch {
    Write-Warning "Error invalidando cache de CloudFront"
}

Write-Output ""
Write-Output "DEPLOYMENT COMPLETADO!"
Write-Output "URL: https://d3s6xfijfd78h6.cloudfront.net"
Write-Output "Los cambios pueden tardar 5-15 minutos en propagarse"
