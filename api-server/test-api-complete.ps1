# Script de Prueba Completa de la API Numerica
# Asegurate de que el servidor este ejecutandose: npm start

$baseUrl = "http://localhost:3001"

Write-Host "=== INICIANDO PRUEBAS DE API NUMERICA ===" -ForegroundColor Green
Write-Host ""

# 1. Health Check
Write-Host "1. Testing Health Check..." -ForegroundColor Blue
try {
    $health = (Invoke-WebRequest -Uri "$baseUrl/health" -Method GET).Content | ConvertFrom-Json
    if ($health.status -eq "OK") {
        Write-Host "   OK Health check: OK" -ForegroundColor Green
        $nominasStatus = if ($health.connections.nominas.success) { 'OK' } else { 'ERROR' }
        $fondosStatus = if ($health.connections.fondos.success) { 'OK' } else { 'ERROR' }
        Write-Host "   Conexiones - Nominas: $nominasStatus, Fondos: $fondosStatus"
    } else {
        Write-Host "   ERROR Health check: FAILED" -ForegroundColor Red
    }
} catch {
    Write-Host "   ERROR al conectar con la API" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 2. API Info
Write-Host "2️⃣  Testing API Info..." -ForegroundColor Blue
try {
    $info = (Invoke-WebRequest -Uri "$baseUrl/api/info" -Method GET).Content | ConvertFrom-Json
    Write-Host "   ✅ API Info: $($info.name) v$($info.version)" -ForegroundColor Green
    Write-Host "   📝 Descripción: $($info.description)"
} catch {
    Write-Host "   ❌ Error obteniendo info de API" -ForegroundColor Red
}

Write-Host ""

# 3. Búsqueda básica de empleados
Write-Host "3️⃣  Testing Búsqueda de Empleados (Básica)..." -ForegroundColor Blue
try {
    $empleados = (Invoke-WebRequest -Uri "$baseUrl/busqueda-empleados?pageSize=5&page=1" -Method GET).Content | ConvertFrom-Json
    if ($empleados.success) {
        Write-Host "   ✅ Búsqueda básica exitosa" -ForegroundColor Green
        Write-Host "   📊 Total de registros: $($empleados.pagination.total)"
        Write-Host "   👥 Registros devueltos: $($empleados.data.Count)"
        Write-Host "   🧑‍💼 Primer empleado: $($empleados.data[0].nombre) - $($empleados.data[0].puesto)"
    } else {
        Write-Host "   ❌ Error en búsqueda básica" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Error en búsqueda básica" -ForegroundColor Red
}

Write-Host ""

# 4. Búsqueda con filtros
Write-Host "4️⃣  Testing Búsqueda con Filtros..." -ForegroundColor Blue
try {
    $filtrada = (Invoke-WebRequest -Uri "$baseUrl/busqueda-empleados?pageSize=3&page=1&status=A&search=MANAGER" -Method GET).Content | ConvertFrom-Json
    if ($filtrada.success) {
        Write-Host "   ✅ Búsqueda con filtros exitosa" -ForegroundColor Green
        Write-Host "   🔍 Resultados filtrados: $($filtrada.pagination.total) registros"
        Write-Host "   📄 Página devuelta: $($filtrada.data.Count) registros"
    }
} catch {
    Write-Host "   ❌ Error en búsqueda con filtros" -ForegroundColor Red
}

Write-Host ""

# 5. Test de ordenamiento
Write-Host "5️⃣  Testing Ordenamiento..." -ForegroundColor Blue
try {
    $ordenado = (Invoke-WebRequest -Uri "$baseUrl/busqueda-empleados?pageSize=3&orderBy=sueldo&orderDirection=DESC" -Method GET).Content | ConvertFrom-Json
    if ($ordenado.success) {
        Write-Host "   ✅ Ordenamiento exitoso" -ForegroundColor Green
        Write-Host "   💰 Primeros sueldos (DESC): $($ordenado.data[0].sueldo), $($ordenado.data[1].sueldo), $($ordenado.data[2].sueldo)"
    }
} catch {
    Write-Host "   ❌ Error en ordenamiento" -ForegroundColor Red
}

Write-Host ""

# 6. Test de endpoints protegidos (sin auth)
Write-Host "6️⃣  Testing Endpoints Protegidos (sin auth)..." -ForegroundColor Blue
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/nominas/tables" -Method GET -ErrorAction Stop
    Write-Host "   ❌ Endpoint protegido permitió acceso sin auth" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "   ✅ Endpoint protegido rechazó correctamente (401 Unauthorized)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Endpoint protegido devolvió código inesperado: $statusCode" -ForegroundColor Yellow
    }
}

Write-Host ""

# 7. Test de performance básica
Write-Host "7️⃣  Testing Performance Básica..." -ForegroundColor Blue
try {
    $start = Get-Date
    $perf = (Invoke-WebRequest -Uri "$baseUrl/busqueda-empleados?pageSize=100" -Method GET).Content | ConvertFrom-Json
    $elapsed = ((Get-Date) - $start).TotalMilliseconds
    
    Write-Host "   ⏱️  Consulta de 100 registros tomó: $($elapsed)ms" -ForegroundColor Green
    if ($elapsed -lt 2000) {
        Write-Host "   ✅ Performance: BUENA (<2s)" -ForegroundColor Green
    } elseif ($elapsed -lt 5000) {
        Write-Host "   ⚠️  Performance: REGULAR (2-5s)" -ForegroundColor Yellow
    } else {
        Write-Host "   ❌ Performance: LENTA (>5s)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Error en test de performance" -ForegroundColor Red
}

Write-Host ""

# 8. Resumen de Categorías de Puestos
Write-Host "8️⃣  Testing Categorización de Puestos..." -ForegroundColor Blue
try {
    $categorias = (Invoke-WebRequest -Uri "$baseUrl/busqueda-empleados?pageSize=50" -Method GET).Content | ConvertFrom-Json
    $categoriasUnicas = $categorias.data | Select-Object -Property puestoCategorizado -Unique
    Write-Host "   ✅ Categorías encontradas: $($categoriasUnicas.Count)" -ForegroundColor Green
    $categoriasUnicas | ForEach-Object { Write-Host "      - $($_.puestoCategorizado)" }
} catch {
    Write-Host "   ❌ Error obteniendo categorías" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 === PRUEBAS COMPLETADAS ===" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Para probar endpoints protegidos, necesitarás un JWT token de AWS Cognito." -ForegroundColor Yellow
Write-Host "   Ejemplo: Invoke-WebRequest -Uri '$baseUrl/api/nominas/tables' -Headers @{'Authorization'='Bearer YOUR_JWT_TOKEN'}"
