# Script mejorado para corregir referencias hardcodeadas a localhost:3001
Write-Host "🔧 Iniciando corrección de referencias localhost:3001..." -ForegroundColor Yellow

# Función para verificar si un archivo ya tiene la importación de buildApiUrl
function Test-HasBuildApiUrlImport {
    param($content)
    return $content -match "import.*buildApiUrl.*from.*['""].*config/apiConfig.*['""]" -or 
           $content -match "import.*\{.*buildApiUrl.*\}.*from.*['""].*config/apiConfig.*['""]"
}

# Función para obtener ruta relativa hacia apiConfig.js
function Get-RelativePath {
    param($filePath)
    
    $fileDir = Split-Path $filePath -Parent
    $srcRoot = Resolve-Path "src"
    
    # Calcular niveles para subir desde el archivo hasta src/
    $relativePath = [System.IO.Path]::GetRelativePath($fileDir, $srcRoot.Path)
    
    # Si estamos en src directamente
    if ($relativePath -eq ".") {
        return "./config/apiConfig.js"
    }
    
    # Contar cuántos niveles necesitamos subir
    $levels = ($relativePath -split [regex]::Escape([System.IO.Path]::DirectorySeparatorChar) | Where-Object { $_ -ne "" }).Length
    $upLevels = "../" * $levels
    
    return ($upLevels + "config/apiConfig.js").Replace('\', '/')
}

# Función para agregar la importación de buildApiUrl
function Add-BuildApiUrlImport {
    param($content, $filePath)
    
    $relativePath = Get-RelativePath $filePath
    $importLine = "import { buildApiUrl } from '$relativePath';"
    
    # Buscar el último import para insertar después
    $lines = $content -split "`r?`n"
    $lastImportIndex = -1
    
    for ($i = 0; $i -lt $lines.Length; $i++) {
        if ($lines[$i] -match "^import\s+.*from\s+['""][^'""]*['""];?\s*$") {
            $lastImportIndex = $i
        }
    }
    
    if ($lastImportIndex -ge 0) {
        # Insertar después del último import
        $newLines = @()
        $newLines += $lines[0..$lastImportIndex]
        $newLines += $importLine
        $newLines += $lines[($lastImportIndex + 1)..($lines.Length - 1)]
        return $newLines -join "`r`n"
    } else {
        # No hay imports, agregar al principio
        return $importLine + "`r`n" + $content
    }
}

# Buscar archivos con referencias a localhost:3001
$files = Get-ChildItem -Path "src" -Recurse -Include "*.js", "*.jsx", "*.ts", "*.tsx" | 
    Where-Object { 
        $_.Name -notlike "*.backup" -and 
        (Get-Content $_.FullName -Raw -Encoding UTF8) -match "localhost:3001"
    }

Write-Host "📁 Encontrados $($files.Count) archivos con referencias localhost:3001" -ForegroundColor Cyan

$processedFiles = 0
$skippedFiles = 0

foreach ($file in $files) {
    Write-Host "`n🔍 Procesando: $($file.Name)" -ForegroundColor Green
    
    try {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        $originalContent = $content
        $hasChanges = $false
        
        # Verificar si ya tiene la importación
        $needsImport = -not (Test-HasBuildApiUrlImport $content)
        
        # Lista de patrones y reemplazos
        $replacements = @(
            # Para llamadas fetch con diferentes tipos de comillas
            @{ 
                Pattern = "fetch\s*\(\s*`http://localhost:3001(/[^`]*)`\s*\)"
                Replacement = "fetch(`${buildApiUrl('$1')}`)"
            },
            @{
                Pattern = "fetch\s*\(\s*'http://localhost:3001(/[^']*)'\s*\)"
                Replacement = "fetch(`${buildApiUrl('$1')}`)"
            },
            @{
                Pattern = 'fetch\s*\(\s*"http://localhost:3001(/[^"]*)"\s*\)'
                Replacement = "fetch(`${buildApiUrl('$1')}`)"
            },
            
            # Para URLs en template literals
            @{
                Pattern = "`http://localhost:3001/api/([^`]*)`"
                Replacement = "`${buildApiUrl('/api/$1')}`"
            },
            @{
                Pattern = "`http://localhost:3001([^`]*)`"
                Replacement = "`${buildApiUrl('$1')}`"
            },
            
            # Para URLs en strings con comillas simples
            @{
                Pattern = "'http://localhost:3001/api/([^']*)'"
                Replacement = "`${buildApiUrl('/api/$1')}`"
            },
            @{
                Pattern = "'http://localhost:3001([^']*)'"
                Replacement = "`${buildApiUrl('$1')}`"
            },
            
            # Para URLs en strings con comillas dobles
            @{
                Pattern = '"http://localhost:3001/api/([^"]*)"'
                Replacement = "`${buildApiUrl('/api/$1')}`"
            },
            @{
                Pattern = '"http://localhost:3001([^"]*)"'
                Replacement = "`${buildApiUrl('$1')}`"
            },
            
            # Para configuraciones específicas
            @{
                Pattern = "baseURL:\s*[`'\""]http://localhost:3001[`'\""]"
                Replacement = "baseURL: buildApiUrl('')"
            },
            @{
                Pattern = "url:\s*[`'\""]http://localhost:3001/api/([^`'\"]*)[`'\""]"
                Replacement = "url: buildApiUrl('/api/$1')"
            },
            @{
                Pattern = "url:\s*[`'\""]http://localhost:3001([^`'\"]*)[`'\""]" 
                Replacement = "url: buildApiUrl('$1')"
            }
        )
        
        # Aplicar cada reemplazo
        foreach ($replacement in $replacements) {
            $newContent = [regex]::Replace($content, $replacement.Pattern, $replacement.Replacement)
            if ($newContent -ne $content) {
                $content = $newContent
                $hasChanges = $true
                Write-Host "  ✅ Aplicado patrón: $($replacement.Pattern)" -ForegroundColor Blue
            }
        }
        
        # Agregar importación si es necesario y hay cambios
        if ($hasChanges -and $needsImport) {
            $content = Add-BuildApiUrlImport $content $file.FullName
            Write-Host "  📦 Agregada importación de buildApiUrl" -ForegroundColor Magenta
        }
        
        # Guardar archivo si hubo cambios
        if ($hasChanges) {
            Set-Content -Path $file.FullName -Value $content -Encoding UTF8
            Write-Host "  💾 Archivo actualizado exitosamente" -ForegroundColor Green
            $processedFiles++
        } else {
            Write-Host "  ⏭️  No se encontraron patrones para reemplazar" -ForegroundColor Yellow
            $skippedFiles++
        }
        
    } catch {
        Write-Host "  ❌ Error procesando archivo: $($_.Exception.Message)" -ForegroundColor Red
        $skippedFiles++
    }
}

Write-Host "`n📊 Resumen:" -ForegroundColor Yellow
Write-Host "  ✅ Archivos procesados: $processedFiles" -ForegroundColor Green
Write-Host "  ⏭️  Archivos omitidos: $skippedFiles" -ForegroundColor Yellow
Write-Host "  📁 Total archivos revisados: $($files.Count)" -ForegroundColor Cyan

Write-Host "`n🎉 Proceso completado. Ejecute 'npm run build' para verificar los cambios." -ForegroundColor Green
