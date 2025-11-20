# Script de prueba para el servidor Gemini Prompt Server
# Uso: .\test_server.ps1

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Prueba del Servidor Gemini Prompt" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Colores para output
$successColor = "Green"
$errorColor = "Red"
$infoColor = "Yellow"

# 1. Verificar que el servidor está corriendo
Write-Host "[1/4] Verificando servidor..." -ForegroundColor $infoColor
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -Method GET -UseBasicParsing
    $healthData = $healthResponse.Content | ConvertFrom-Json
    
    if ($healthData.status -eq "ok") {
        Write-Host "  ✅ Servidor funcionando correctamente" -ForegroundColor $successColor
        Write-Host "  📋 Gemini CLI: $(if ($healthData.gemini.available) { '✅ Disponible' } else { '❌ No disponible - ' + $healthData.gemini.error })" -ForegroundColor $(if ($healthData.gemini.available) { $successColor } else { $errorColor })
    } else {
        Write-Host "  ❌ El servidor no está respondiendo correctamente" -ForegroundColor $errorColor
        exit 1
    }
} catch {
    Write-Host "  ❌ Error: El servidor no está corriendo en http://localhost:3000" -ForegroundColor $errorColor
    Write-Host "  💡 Asegúrate de que el servidor esté iniciado con: npm start" -ForegroundColor $infoColor
    exit 1
}

Write-Host ""

# 2. Pedir webhook URL para las pruebas
Write-Host "[2/4] Configuración de webhook..." -ForegroundColor $infoColor
Write-Host "  💡 Para recibir los resultados en tiempo real, puedes usar:" -ForegroundColor Gray
Write-Host "     - https://webhook.site (abre en tu navegador y copia la URL única)" -ForegroundColor Gray
Write-Host "     - O déjalo vacío si solo quieres ver los resultados en la consola del servidor" -ForegroundColor Gray
Write-Host ""
$webhookUrl = Read-Host "  Ingresa la URL del webhook (o Enter para omitir)"

if ([string]::IsNullOrWhiteSpace($webhookUrl)) {
    $webhookUrl = "https://webhook.site/tu-url-unica"
    Write-Host "  ⚠️  Usando URL de ejemplo. Los webhooks no llegarán." -ForegroundColor Yellow
    Write-Host "  💡 Visita https://webhook.site para obtener una URL real" -ForegroundColor Gray
} else {
    Write-Host "  ✅ Webhook configurado: $webhookUrl" -ForegroundColor $successColor
}

Write-Host ""

# 3. Enviar prompts de prueba
Write-Host "[3/4] Enviando prompts de prueba..." -ForegroundColor $infoColor

$testPrompts = @(
    "Explica qué es Node.js en una frase corta",
    "¿Cuál es la diferencia entre JavaScript y TypeScript?"
)

$requestBody = @{
    prompts = $testPrompts
    webhookUrl = $webhookUrl
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/prompts" -Method POST -Body $requestBody -ContentType "application/json" -UseBasicParsing
    $responseData = $response.Content | ConvertFrom-Json
    
    if ($responseData.status -eq "accepted") {
        $jobId = $responseData.jobId
        Write-Host "  ✅ Job creado exitosamente!" -ForegroundColor $successColor
        Write-Host "  📋 Job ID: $jobId" -ForegroundColor Gray
        Write-Host "  📊 Prompts: $($responseData.promptsCount)" -ForegroundColor Gray
        Write-Host "  ⏱️  Tiempo estimado: $($responseData.estimatedTime)" -ForegroundColor Gray
    } else {
        Write-Host "  ❌ Error al crear el job" -ForegroundColor $errorColor
        exit 1
    }
} catch {
    Write-Host "  ❌ Error al enviar prompts: $_" -ForegroundColor $errorColor
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Detalles: $responseBody" -ForegroundColor $errorColor
    }
    exit 1
}

Write-Host ""

# 4. Monitorear el progreso del job
Write-Host "[4/4] Monitoreando progreso del job..." -ForegroundColor $infoColor
Write-Host "  💡 El servidor procesará los prompts secuencialmente" -ForegroundColor Gray
Write-Host "  💡 Revisa los logs del servidor para ver el progreso en tiempo real" -ForegroundColor Gray
Write-Host "  💡 Los resultados se enviarán al webhook cuando cada prompt se complete" -ForegroundColor Gray
Write-Host ""
Write-Host "  Presiona Enter para consultar el estado del job (o Ctrl+C para salir)" -ForegroundColor $infoColor
Read-Host

# Consultar estado varias veces
$maxAttempts = 10
$attempt = 0

while ($attempt -lt $maxAttempts) {
    $attempt++
    Write-Host ""
    Write-Host "  [Consulta $attempt] Consultando estado..." -ForegroundColor Gray
    
    try {
        $statusResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/jobs/$jobId" -Method GET -UseBasicParsing
        $statusData = $statusResponse.Content | ConvertFrom-Json
        
        Write-Host "  📊 Estado: $($statusData.status)" -ForegroundColor $(if ($statusData.status -eq "completed") { $successColor } else { $infoColor })
        Write-Host "  ✅ Completados: $($statusData.completed)/$($statusData.total)" -ForegroundColor Gray
        Write-Host "  ❌ Fallidos: $($statusData.failed)" -ForegroundColor Gray
        
        if ($statusData.status -eq "completed") {
            Write-Host ""
            Write-Host "  ✅ Job completado!" -ForegroundColor $successColor
            Write-Host "  📋 Resultados:" -ForegroundColor Cyan
            foreach ($result in $statusData.results) {
                $statusEmoji = if ($result.status -eq "completed") { "✅" } else { "❌" }
                Write-Host "    $statusEmoji Prompt $($result.index + 1): $($result.prompt.Substring(0, [Math]::Min(50, $result.prompt.Length)))..." -ForegroundColor Gray
                if ($result.status -eq "completed" -and $result.output) {
                    Write-Host "       Respuesta: $($result.output.Substring(0, [Math]::Min(100, $result.output.Length)))..." -ForegroundColor DarkGray
                }
            }
            break
        }
        
        # Esperar antes de la siguiente consulta
        if ($attempt -lt $maxAttempts) {
            Write-Host "  ⏳ Esperando 3 segundos antes de la siguiente consulta..." -ForegroundColor Gray
            Start-Sleep -Seconds 3
        }
    } catch {
        Write-Host "  ❌ Error al consultar estado: $_" -ForegroundColor $errorColor
        break
    }
}

if ($attempt -eq $maxAttempts -and $statusData.status -ne "completed") {
    Write-Host ""
    Write-Host "  ⏱️  El job aún está procesando. Puedes consultarlo manualmente con:" -ForegroundColor $infoColor
    Write-Host "     GET http://localhost:3000/api/jobs/$jobId" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Prueba completada!" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

