# Prueba rapida con webhook.site
# Usa la URL base de webhook.site (sin #!/view/)

# Extraer la URL base de la URL que te dio webhook.site
# Si tienes: https://webhook.site/#!/view/83f0e34b-c7b4-4feb-a181-16b78c1647fe
# Usa: https://webhook.site/83f0e34b-c7b4-4feb-a181-16b78c1647fe

$webhookUrl = "https://webhook.site/83f0e34b-c7b4-4feb-a181-16b78c1647fe"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Prueba Rapida del Servidor" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Webhook URL: $webhookUrl" -ForegroundColor Yellow
Write-Host ""

# Prompts de prueba
$body = @{
    prompts = @(
        "Explica que es Node.js en una frase corta",
        "Que es Express.js?",
        "Menciona 3 caracteristicas de TypeScript"
    )
    webhookUrl = $webhookUrl
} | ConvertTo-Json

Write-Host "Enviando 3 prompts al servidor..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/prompts" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    
    $data = $response.Content | ConvertFrom-Json
    
    Write-Host ""
    Write-Host "Job creado exitosamente!" -ForegroundColor Green
    Write-Host "Job ID: $($data.jobId)" -ForegroundColor Cyan
    Write-Host "Prompts: $($data.promptsCount)" -ForegroundColor Cyan
    Write-Host "Tiempo estimado: $($data.estimatedTime)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "MONITOREO:" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Ve a tu pagina de webhook.site para ver los resultados llegar en tiempo real!" -ForegroundColor White
    Write-Host "   $webhookUrl" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Tambien puedes revisar los logs del servidor para ver el progreso" -ForegroundColor White
    Write-Host ""
    Write-Host "Los webhooks llegaran cuando cada prompt se complete" -ForegroundColor Yellow
    Write-Host ""
    
    # Consultar estado después de esperar
    Write-Host "Esperando 5 segundos..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
    
    $statusResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/jobs/$($data.jobId)" -UseBasicParsing
    $statusData = $statusResponse.Content | ConvertFrom-Json
    
    Write-Host "Estado: $($statusData.status)" -ForegroundColor Cyan
    Write-Host "Completados: $($statusData.completed)/$($statusData.total)" -ForegroundColor Green
    Write-Host "Fallidos: $($statusData.failed)" -ForegroundColor $(if ($statusData.failed -eq 0) { "Green" } else { "Red" })
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host ""
        Write-Host "Detalles:" -ForegroundColor Red
        Write-Host $responseBody -ForegroundColor Red
    }
}
