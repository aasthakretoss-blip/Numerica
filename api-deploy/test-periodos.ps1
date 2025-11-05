# Test Periodos Endpoint
Write-Host "Testing periodos endpoint..." -ForegroundColor Cyan

$apiUrl = "https://numerica-1.onrender.com/api/payroll/periodos"

try {
    Write-Host "Calling: $apiUrl" -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri $apiUrl -Method Get -ContentType "application/json"
    
    Write-Host "Success! Response received:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 5)
    
    if ($response.data -and $response.data.Count -gt 0) {
        Write-Host "`nFirst 3 periods:" -ForegroundColor Cyan
        $response.data | Select-Object -First 3 | ForEach-Object {
            Write-Host "  - value: $($_.value) | count: $($_.count)" -ForegroundColor White
        }
        
        # Validate format
        $firstPeriod = $response.data[0].value
        if ($firstPeriod -match '^\d{4}-\d{2}$') {
            Write-Host "`nValidation: OK - Format is YYYY-MM" -ForegroundColor Green
        } else {
            Write-Host "`nValidation: FAIL - Format is NOT YYYY-MM, got: $firstPeriod" -ForegroundColor Red
        }
    } else {
        Write-Host "`nNo periods found in response" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

