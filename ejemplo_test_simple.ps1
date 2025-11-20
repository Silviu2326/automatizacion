# Ejemplo simple de prueba del servidor
# Uso: .\ejemplo_test_simple.ps1

Write-Host "Ejemplo de prueba del servidor Gemini Prompt" -ForegroundColor Cyan
Write-Host ""

# URL del webhook (usa webhook.site para pruebas)
$webhookUrl = "https://webhook.site/tu-url-unica"

# Prompts de prueba
$body = @{
    prompts = @(
        "Explica qué es Node.js en una frase corta",
        "¿Qué es Express.js?"
    )
    webhookUrl = $webhookUrl
} | ConvertTo-Json

Write-Host "Enviando prompts..." -ForegroundColor Yellow

try {
    # Enviar request
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/prompts" `
        -Method POST `
        -Body $body `
        -ContentType "application/json" `
        -UseBasicParsing
    
    $data = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ Job creado!" -ForegroundColor Green
    Write-Host "Job ID: $($data.jobId)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Ahora puedes:" -ForegroundColor Yellow
    Write-Host "1. Consultar el estado con: Invoke-WebRequest http://localhost:3000/api/jobs/$($data.jobId)" -ForegroundColor Gray
    Write-Host "2. Ver los logs del servidor para ver el progreso" -ForegroundColor Gray
    Write-Host "3. Revisar $webhookUrl para ver los webhooks (si usaste webhook.site)" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Detalles: $responseBody" -ForegroundColor Red
    }
}

