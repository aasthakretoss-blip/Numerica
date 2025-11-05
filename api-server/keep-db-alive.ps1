#!/usr/bin/env pwsh

Write-Host "🔄 Manteniendo base de datos activa..." -ForegroundColor Green

# URL de health check que hará ping a la base de datos
$healthUrl = "https://numerica-2.onrender.com/api/health"

# Función para hacer ping
function Test-DatabaseConnection {
    try {
        $response = Invoke-RestMethod -Uri $healthUrl -Method GET -TimeoutSec 10
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        
        if ($response.status -eq "ok") {
            Write-Host "[$timestamp] ✅ DB activa - Conexión exitosa" -ForegroundColor Green
            return $true
        } else {
            Write-Host "[$timestamp] ⚠️  DB respuesta inesperada: $($response.status)" -ForegroundColor Yellow
            return $false
        }
    } catch {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Write-Host "[$timestamp] ❌ Error de conexión: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Bucle infinito con ping cada 10 minutos
Write-Host "🚀 Iniciando monitoreo cada 10 minutos. Presiona Ctrl+C para detener." -ForegroundColor Cyan
Write-Host ""

$successCount = 0
$errorCount = 0

while ($true) {
    if (Test-DatabaseConnection) {
        $successCount++
    } else {
        $errorCount++
    }
    
    Write-Host "📊 Estadísticas: ✅ $successCount exitosas | ❌ $errorCount errores" -ForegroundColor White
    Write-Host "⏳ Esperando 10 minutos..." -ForegroundColor Gray
    Write-Host ""
    
    # Esperar 10 minutos (600 segundos)
    Start-Sleep -Seconds 600
}
