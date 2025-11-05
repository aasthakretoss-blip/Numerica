$baseUrl = "https://numerica-1.onrender.com"

Write-Host "=== TESTING COMPLETE NUMERICA AWS API ===" -ForegroundColor Green
Write-Host "Base URL: $baseUrl" -ForegroundColor Cyan
Write-Host ""

$endpoints = @(
    @{ Path = "/"; Name = "Root Endpoint" },
    @{ Path = "/health"; Name = "Health Check" },
    @{ Path = "/api/info"; Name = "API Info" },
    @{ Path = "/api/payroll/stats"; Name = "Payroll Stats" },
    @{ Path = "/api/payroll/periodos"; Name = "Available Periods" },
    @{ Path = "/api/payroll/filter-options"; Name = "Filter Options" }
)

$successCount = 0
$totalCount = $endpoints.Count

foreach ($endpoint in $endpoints) {
    Write-Host "$($endpoint.Name)..." -ForegroundColor Blue -NoNewline
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl$($endpoint.Path)" -Method GET -TimeoutSec 30
        if ($response.StatusCode -eq 200) {
            Write-Host " ✅ OK ($($response.StatusCode))" -ForegroundColor Green
            $successCount++
            
            # Show sample data for key endpoints
            if ($endpoint.Path -eq "/api/payroll/stats") {
                $data = $response.Content | ConvertFrom-Json
                if ($data.success -and $data.data) {
                    Write-Host "   📊 Records: $($data.data.totalRecords), Employees: $($data.data.uniqueEmployees), Companies: $($data.data.totalCompanies)" -ForegroundColor Gray
                }
            }
            elseif ($endpoint.Path -eq "/api/payroll/periodos") {
                $data = $response.Content | ConvertFrom-Json
                if ($data.success -and $data.data) {
                    $periodsCount = $data.data.Count
                    $latestPeriod = if ($periodsCount -gt 0) { $data.data[0].periodString } else { "N/A" }
                    Write-Host "   📅 Available periods: $periodsCount, Latest: $latestPeriod" -ForegroundColor Gray
                }
            }
            elseif ($endpoint.Path -eq "/api/payroll/filter-options") {
                $data = $response.Content | ConvertFrom-Json
                if ($data.success -and $data.data) {
                    $sucursales = $data.data.sucursales.Count
                    $puestos = $data.data.puestos.Count
                    Write-Host "   🏢 Filters - Companies: $sucursales, Positions: $puestos" -ForegroundColor Gray
                }
            }
        } else {
            Write-Host " ❌ ERROR ($($response.StatusCode))" -ForegroundColor Red
        }
    } catch {
        Write-Host " ❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== SUMMARY ===" -ForegroundColor Yellow
Write-Host "✅ Working endpoints: $successCount/$totalCount" -ForegroundColor Green
if ($successCount -eq $totalCount) {
    Write-Host "🎉 ALL ENDPOINTS WORKING PERFECTLY!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your Numerica API is LIVE and ready to use 24/7!" -ForegroundColor Cyan
    Write-Host "Frontend can now connect to: $baseUrl" -ForegroundColor Cyan
} else {
    Write-Host "⚠️ Some endpoints need attention" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "=== COMPLETED ===" -ForegroundColor Green
