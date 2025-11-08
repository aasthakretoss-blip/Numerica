# Test simple de la API
$baseUrl = "https://numerica-2.onrender.com"

Write-Host "=== PRUEBAS API NUMERICA ===" -ForegroundColor Green

# 1. Health Check
Write-Host "`n1. Health Check..." -ForegroundColor Blue
try {
    $health = (Invoke-WebRequest -Uri "$baseUrl/health" -Method GET).Content | ConvertFrom-Json
    Write-Host "   Status: $($health.status)" -ForegroundColor Green
    Write-Host "   Environment: $($health.environment)"
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. API Info  
Write-Host "`n2. API Info..." -ForegroundColor Blue
try {
    $info = (Invoke-WebRequest -Uri "$baseUrl/api/info" -Method GET).Content | ConvertFrom-Json
    Write-Host "   API: $($info.name) v$($info.version)" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Busqueda empleados
Write-Host "`n3. Busqueda Empleados..." -ForegroundColor Blue
try {
    $empleados = (Invoke-WebRequest -Uri "$baseUrl/busqueda-empleados?pageSize=3" -Method GET).Content | ConvertFrom-Json
    Write-Host "   Total registros: $($empleados.pagination.total)" -ForegroundColor Green
    Write-Host "   Registros obtenidos: $($empleados.data.Count)"
    Write-Host "   Primer empleado: $($empleados.data[0].nombre)"
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Test endpoint protegido
Write-Host "`n4. Endpoint Protegido (sin auth)..." -ForegroundColor Blue
try {
    Invoke-WebRequest -Uri "$baseUrl/api/nominas/tables" -Method GET -ErrorAction Stop | Out-Null
    Write-Host "   ERROR: Permitio acceso sin auth" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "   OK: Rechazo correctamente (401)" -ForegroundColor Green
    } else {
        Write-Host "   WARN: Codigo inesperado: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    }
}

Write-Host "`n=== PRUEBAS COMPLETADAS ===" -ForegroundColor Green
