# Script para buscar y reemplazar referencias a localhost:3001 en archivos del frontend

$sourceFiles = Get-ChildItem -Path "src" -Include "*.jsx", "*.tsx", "*.js", "*.ts" -Recurse

foreach ($file in $sourceFiles) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $originalContent = $content
    
    # Buscar si el archivo contiene referencias a localhost:3001
    if ($content -match "localhost:3001") {
        Write-Host "Procesando: $($file.FullName)" -ForegroundColor Yellow
        
        # Verificar si ya tiene la importación de buildApiUrl
        $hasImport = $content -match "import.*buildApiUrl.*from.*['`"]\.\.?/.*config/apiConfig['`"]"
        
        if (-not $hasImport) {
            # Buscar líneas de import existentes para agregar la nueva importación
            if ($content -match "import.*from.*['`"][^'`"]*['`"]") {
                # Encontrar la última línea de import
                $lines = $content -split "`r?`n"
                $lastImportIndex = -1
                for ($i = 0; $i -lt $lines.Length; $i++) {
                    if ($lines[$i] -match "^import.*from") {
                        $lastImportIndex = $i
                    }
                }
                
                if ($lastImportIndex -ge 0) {
                    # Insertar la importación después de la última importación existente
                    $newImport = "import { buildApiUrl } from '../config/apiConfig'"
                    $lines = $lines[0..$lastImportIndex] + $newImport + $lines[($lastImportIndex + 1)..($lines.Length - 1)]
                    $content = $lines -join "`r`n"
                    Write-Host "  - Agregada importación de buildApiUrl" -ForegroundColor Green
                }
            }
        }
        
        # Reemplazar todas las referencias a localhost:3001
        $content = $content -replace "http://localhost:3001", '${buildApiUrl()}'
        $content = $content -replace "'http://localhost:3001", '`${buildApiUrl()}'
        $content = $content -replace '"http://localhost:3001', '${buildApiUrl()}'
        $content = $content -replace "localhost:3001", 'buildApiUrl().replace("http://", "").replace("https://", "")'
        
        # Solo escribir si hubo cambios
        if ($content -ne $originalContent) {
            Set-Content -Path $file.FullName -Value $content -Encoding UTF8
            Write-Host "  - Archivo actualizado" -ForegroundColor Green
        }
    }
}

Write-Host "`nProceso completado. Ejecutando build..." -ForegroundColor Cyan
npm run build
