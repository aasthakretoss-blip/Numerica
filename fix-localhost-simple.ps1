# Script simple para corregir referencias localhost:3001
Write-Host "🔧 Corrigiendo referencias localhost:3001..." -ForegroundColor Yellow

# Buscar archivos con localhost:3001
$files = Get-ChildItem -Path "src" -Recurse -Include "*.js", "*.jsx", "*.ts", "*.tsx" | 
    Where-Object { 
        $_.Name -notlike "*.backup" -and 
        (Get-Content $_.FullName -Raw) -match "localhost:3001"
    }

Write-Host "📁 Encontrados $($files.Count) archivos"

$count = 0
foreach ($file in $files) {
    Write-Host "Procesando: $($file.Name)" -ForegroundColor Green
    
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Reemplazos básicos de localhost:3001 por buildApiUrl()
    $content = $content -replace "http://localhost:3001/api/([^'`""\)]*)", "`${buildApiUrl('/api/`$1')}"
    $content = $content -replace "http://localhost:3001([^'`""\)]*)", "`${buildApiUrl('`$1')}"
    $content = $content -replace "http://localhost:3001", "`${buildApiUrl('')}"
    
    # Si hubo cambios
    if ($content -ne $originalContent) {
        # Verificar si necesita importar buildApiUrl
        if ($content -notmatch "import.*buildApiUrl") {
            # Buscar dónde insertar el import
            $lines = $content -split "`n"
            $insertIndex = 0
            
            # Buscar el último import
            for ($i = 0; $i -lt $lines.Length; $i++) {
                if ($lines[$i] -match "^import ") {
                    $insertIndex = $i + 1
                }
            }
            
            # Determinar ruta relativa
            $relativePath = ""
            $subDirs = ($file.Directory.FullName -replace [regex]::Escape($PWD + "\src"), "").Split("\", [StringSplitOptions]::RemoveEmptyEntries)
            if ($subDirs.Length -eq 0) {
                $relativePath = "./config/apiConfig.js"
            } else {
                $relativePath = ("../" * $subDirs.Length) + "config/apiConfig.js"
            }
            $relativePath = $relativePath -replace "\\", "/"
            
            # Insertar import
            $importLine = "import { buildApiUrl } from '$relativePath';"
            $lines = $lines[0..($insertIndex-1)] + $importLine + $lines[$insertIndex..($lines.Length-1)]
            $content = $lines -join "`n"
            
            Write-Host "  📦 Agregada importación" -ForegroundColor Magenta
        }
        
        # Guardar archivo
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8
        Write-Host "  ✅ Actualizado" -ForegroundColor Blue
        $count++
    } else {
        Write-Host "  ⏭️ Sin cambios" -ForegroundColor Yellow
    }
}

Write-Host "`n📊 Resumen: $count archivos modificados" -ForegroundColor Green
Write-Host "🎉 Completado! Ejecute 'npm run build' para probar" -ForegroundColor Cyan
