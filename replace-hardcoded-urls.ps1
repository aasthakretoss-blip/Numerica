# Script para reemplazar todas las URLs hardcodeadas en el codigo fuente
# URLs a reemplazar:
# - http://localhost:3001
# - https://n4xman7i5l.execute-api.us-east-1.amazonaws.com
# Nueva URL: https://numerica-1.onrender.com

Write-Host "Buscando archivos con URLs hardcodeadas..." -ForegroundColor Cyan

$files = Get-ChildItem -Path "src" -Recurse -File -Include "*.jsx","*.js","*.tsx","*.ts"
$oldUrl1 = "http://localhost:3001"
$oldUrl2 = "https://n4xman7i5l.execute-api.us-east-1.amazonaws.com"  # Old endpoint, no longer used
$newUrl = "hhttps://numerica-2.onrender.com"
$filesChanged = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $modified = $false
    
    if ($content -match [regex]::Escape($oldUrl1)) {
        Write-Host "  Actualizando (localhost): $($file.FullName)" -ForegroundColor Yellow
        $content = $content -replace [regex]::Escape($oldUrl1), $newUrl
        $modified = $true
    }
    
    if ($content -match [regex]::Escape($oldUrl2)) {
        Write-Host "  Encontrado endpoint antiguo (n4xman7i5l): $($file.FullName)" -ForegroundColor Yellow
        Write-Host "    (Este endpoint ya no está en uso, el actual es numerica-1.onrender.com)" -ForegroundColor Gray
        $content = $content -replace [regex]::Escape($oldUrl2), $newUrl
        $modified = $true
    }
    
    if ($modified) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $filesChanged++
    }
}

Write-Host ""
Write-Host "Proceso completado!" -ForegroundColor Green
Write-Host "Archivos modificados: $filesChanged" -ForegroundColor Green

