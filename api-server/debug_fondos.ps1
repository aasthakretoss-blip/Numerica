# Script para debuggear datos de fondos
$response = Invoke-RestMethod -Uri "http://localhost:3001/api/debug/fondos-raw?rfc=AICI7104122N7&limit=5" -Method GET

Write-Host "=== ANÁLISIS DE DATOS DE FONDOS ===" -ForegroundColor Cyan
Write-Host "RFC: $($response.analysis.rfc)" -ForegroundColor Yellow
Write-Host "Registros encontrados: $($response.analysis.recordsFound)" -ForegroundColor Yellow
Write-Host "Campos totales: $($response.analysis.totalFields)" -ForegroundColor Yellow
Write-Host "Candidatos para antigüedad: $($response.analysis.antiguedadCandidates.Count)" -ForegroundColor Yellow

Write-Host "`n=== CANDIDATOS DE ANTIGÜEDAD ===" -ForegroundColor Green
foreach ($candidate in $response.analysis.antiguedadCandidates) {
    Write-Host "Campo: '$($candidate.fieldName)'" -ForegroundColor White
    Write-Host "  Valor: $($candidate.value)" -ForegroundColor Cyan  
    Write-Host "  Tipo: $($candidate.type)" -ForegroundColor Cyan
    Write-Host "  Como float: $($candidate.asFloat)" -ForegroundColor Cyan
    Write-Host "  ---"
}

Write-Host "`n=== CAMPOS NUMÉRICOS ===" -ForegroundColor Green
$response.analysis.numericFields.PSObject.Properties | ForEach-Object {
    Write-Host "Campo: '$($_.Name)'" -ForegroundColor White
    Write-Host "  Valor: $($_.Value.value)" -ForegroundColor Cyan
    Write-Host "  Como float: $($_.Value.asFloat)" -ForegroundColor Cyan
    Write-Host "  Es cero: $($_.Value.isZero)" -ForegroundColor Cyan
    Write-Host "  ---"
}

Write-Host "`n=== TODOS LOS REGISTROS ===" -ForegroundColor Green
for ($i = 0; $i -lt $response.allRecords.Count; $i++) {
    Write-Host "Registro $($i+1):" -ForegroundColor Yellow
    $record = $response.allRecords[$i]
    $record.PSObject.Properties | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Value)" -ForegroundColor White
    }
    Write-Host "  ---"
}
