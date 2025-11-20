# Test directo sin validaciones complejas
$webhookUrl = "https://webhook.site/83f0e34b-c7b4-4feb-a181-16b78c1647fe"

$body = @{
    prompts = @(
        "Explica que es Node.js en una frase corta"
    )
    webhookUrl = $webhookUrl
} | ConvertTo-Json

Write-Host "Enviando prompt de prueba..." -ForegroundColor Yellow
Write-Host "Webhook: $webhookUrl" -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/prompts" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    
    $data = $response.Content | ConvertFrom-Json
    
    Write-Host "Exito! Job ID: $($data.jobId)" -ForegroundColor Green
    Write-Host "Revisa tu pagina de webhook.site para ver los resultados!" -ForegroundColor Cyan
    Write-Host ""
    
} catch {
    Write-Host "Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response.StatusCode -eq 503) {
        Write-Host ""
        Write-Host "El servidor dice que Gemini CLI no esta disponible." -ForegroundColor Yellow
        Write-Host "Pero si gemini --version funciona, entonces el problema es la verificacion." -ForegroundColor Yellow
        Write-Host "Reinicia el servidor para aplicar los cambios." -ForegroundColor Yellow
    }
}

