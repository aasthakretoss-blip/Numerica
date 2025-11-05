# Check Lambda logs
Write-Host "Obteniendo logs de Lambda..." -ForegroundColor Cyan

$logGroup = "/aws/lambda/PayrollStack-PayrollAPILambda"

try {
    Write-Host "Buscando ultimos logs en $logGroup..." -ForegroundColor Yellow
    
    # Get latest log stream
    $streams = aws logs describe-log-streams --log-group-name $logGroup --order-by LastEventTime --descending --max-items 1 --query 'logStreams[0].logStreamName' --output text
    
    if ($streams) {
        Write-Host "Log stream: $streams" -ForegroundColor Cyan
        Write-Host "`nUltimos logs (ultimos 20 eventos):" -ForegroundColor Yellow
        aws logs get-log-events --log-group-name $logGroup --log-stream-name $streams --limit 20 --query 'events[*].[timestamp,message]' --output text
    } else {
        Write-Host "No se encontraron log streams" -ForegroundColor Red
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

