$baseUrl = "https://numerica-1.onrender.com"

Write-Host "=== TESTING PRODUCTION API ===" -ForegroundColor Green

# 1. Test root endpoint
Write-Host "`n1. Root endpoint..." -ForegroundColor Blue
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/" -Method GET -TimeoutSec 30
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 3
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "   Status Code: $($_.Exception.Response.StatusCode.value__)"
        Write-Host "   Status Description: $($_.Exception.Response.StatusDescription)"
    }
}

# 2. Test API info
Write-Host "`n2. API Info..." -ForegroundColor Blue
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/info" -Method GET -TimeoutSec 30
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green  
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 3
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Test health
Write-Host "`n3. Health Check..." -ForegroundColor Blue
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/health" -Method GET -TimeoutSec 30
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 3
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== COMPLETED ===" -ForegroundColor Green
