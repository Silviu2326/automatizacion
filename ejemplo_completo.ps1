# Ejemplo completo de cómo probar el servidor con webhook.site
# IMPORTANTE: Primero abre https://webhook.site en tu navegador y copia la URL única

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Prueba del Servidor Gemini Prompt" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 INSTRUCCIONES:" -ForegroundColor Yellow
Write-Host "1. Abre https://webhook.site en tu navegador" -ForegroundColor White
Write-Host "2. Copia la URL única que aparece (ej: https://webhook.site/abc123...)" -ForegroundColor White
Write-Host "3. Pégala cuando se te pida abajo" -ForegroundColor White
Write-Host ""

# Solicitar URL del webhook
$webhookUrl = Read-Host "Ingresa la URL del webhook de webhook.site"

if ([string]::IsNullOrWhiteSpace($webhookUrl)) {
    Write-Host "❌ No ingresaste una URL. Saliendo..." -ForegroundColor Red
    exit
}

# Validar que sea una URL válida
try {
    $uri = [System.Uri]$webhookUrl
    if ($uri.Scheme -ne "https" -and $uri.Scheme -ne "http") {
        throw "URL debe comenzar con http:// o https://"
    }
} catch {
    Write-Host "❌ URL inválida: $_" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "✅ URL configurada: $webhookUrl" -ForegroundColor Green
Write-Host ""

# Prompts de prueba
Write-Host "Enviando prompts de prueba..." -ForegroundColor Yellow

$body = @{
    prompts = @(
        "Explica qué es Node.js en una frase corta",
        "¿Qué es Express.js?",
        "Menciona 3 características de TypeScript"
    )
    webhookUrl = $webhookUrl
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/prompts" `
        -Method POST `
        -Body $body `
        -ContentType "application/json" `
        -UseBasicParsing
    
    $data = $response.Content | ConvertFrom-Json
    
    Write-Host ""
    Write-Host "✅ Job creado exitosamente!" -ForegroundColor Green
    Write-Host "📋 Job ID: $($data.jobId)" -ForegroundColor Cyan
    Write-Host "📊 Prompts: $($data.promptsCount)" -ForegroundColor Cyan
    Write-Host "⏱️  Tiempo estimado: $($data.estimatedTime)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "📡 MONITOREO:" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. 🌐 Los resultados llegarán a tu página de webhook.site en tiempo real" -ForegroundColor White
    Write-Host "2. 📝 Revisa los logs del servidor para ver el progreso" -ForegroundColor White
    Write-Host "3. 📊 Puedes consultar el estado con:" -ForegroundColor White
    Write-Host "   Invoke-WebRequest http://localhost:3000/api/jobs/$($data.jobId)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "💡 TIP: Mantén abierta la página de webhook.site para ver los resultados llegar!" -ForegroundColor Yellow
    Write-Host ""
    
    # Esperar un momento y luego consultar estado
    Write-Host "Esperando 5 segundos antes de consultar el estado inicial..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
    
    # Consultar estado
    try {
        $statusResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/jobs/$($data.jobId)" -UseBasicParsing
        $statusData = $statusResponse.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
        
        Write-Host "📊 Estado actual del job:" -ForegroundColor Cyan
        Write-Host $statusData
        Write-Host ""
    } catch {
        Write-Host "⚠️  No se pudo consultar el estado: $_" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ Error al enviar prompts:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host ""
        Write-Host "Detalles del error:" -ForegroundColor Red
        Write-Host $responseBody -ForegroundColor Red
    }
    
    exit 1
}

