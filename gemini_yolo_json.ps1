# Script PowerShell para usar Gemini CLI en modo YOLO con un JSON de prompt
# Uso:
#   .\gemini_yolo_json.ps1
# Opcional: puedes pasar la ruta al JSON:
#   .\gemini_yolo_json.ps1 .\prompt.json

Write-Host "[1/5] Iniciando script (YOLO + JSON)..." -ForegroundColor Cyan

# 1. Cargar variables de entorno desde .env si existe
Write-Host "[2/5] Cargando variables de entorno..." -ForegroundColor Cyan
if (Test-Path .env) {
    Write-Host "  -> Archivo .env encontrado, cargando variables..." -ForegroundColor Gray
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^#][^=]*)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
    Write-Host "  -> Variables cargadas correctamente" -ForegroundColor Gray
} else {
    Write-Host "  -> Archivo .env no encontrado, usando variables de entorno del sistema" -ForegroundColor Gray
}

# 2. Verificar API Key
Write-Host "[3/5] Verificando API Key..." -ForegroundColor Cyan
if (-not $env:GEMINI_API_KEY) {
    Write-Host "Error: No se encontró la variable GEMINI_API_KEY" -ForegroundColor Red
    Write-Host "Por favor, crea un archivo .env en la raiz y añade: GEMINI_API_KEY=tu_clave_aqui" -ForegroundColor Yellow
    Write-Host "   O establece la variable: `$env:GEMINI_API_KEY='tu_clave_aqui'" -ForegroundColor Yellow
    exit 1
}
Write-Host "  -> API Key encontrada" -ForegroundColor Gray

# 3. Obtener ruta del JSON
$JsonPath = ".\prompt.json"
if ($args.Count -ge 1) {
    $JsonPath = $args[0]
}

if (-not (Test-Path $JsonPath)) {
    Write-Host "Error: No se encontró el archivo JSON: $JsonPath" -ForegroundColor Red
    exit 1
}

Write-Host "[4/5] Leyendo JSON de prompt..." -ForegroundColor Cyan
Write-Host "  -> Archivo: $JsonPath" -ForegroundColor Gray

try {
    $jsonContent = Get-Content $JsonPath -Raw
    $data = $jsonContent | ConvertFrom-Json
} catch {
    Write-Host "Error al leer o parsear el JSON: $_" -ForegroundColor Red
    exit 1
}

# Soportar:
#  - { "prompt": "texto" }
#  - { "prompts": ["texto1", "texto2", ...] }
$prompts = @()

if ($data.prompts) {
    $prompts = @($data.prompts)
} elseif ($data.prompt) {
    $prompts = @($data.prompt)
} else {
    Write-Host "Error: El JSON debe contener 'prompt' o 'prompts'" -ForegroundColor Red
    exit 1
}

Write-Host "  -> Prompts cargados: $($prompts.Count)" -ForegroundColor Gray
$prompts | ForEach-Object { Write-Host "     - $_" -ForegroundColor DarkGray }
Write-Host ""

# 4. Verificar Gemini CLI
Write-Host "[5/5] Llamando a Gemini en modo YOLO..." -ForegroundColor Cyan
$geminiCmd = Get-Command gemini -ErrorAction SilentlyContinue
if (-not $geminiCmd) {
    Write-Host "Error: Gemini CLI no está instalado" -ForegroundColor Red
    Write-Host "Instala Gemini CLI con: npm install -g @google/gemini-cli" -ForegroundColor Yellow
    exit 1
}
Write-Host "  -> Gemini CLI encontrado en: $($geminiCmd.Source)" -ForegroundColor Gray
Write-Host ""

foreach ($Prompt in $prompts) {
    Write-Host "==================================================" -ForegroundColor DarkGray
    Write-Host "Prompt:" -ForegroundColor Green
    Write-Host $Prompt
    Write-Host "--------------------------------------------------"

    try {
        $ErrorActionPreference = "SilentlyContinue"
        $output = & gemini --yolo "$Prompt" 2>&1 | Out-String
        $ErrorActionPreference = "Continue"

        $cleanOutput = $output.Trim()

        if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq $null) {
            if ($cleanOutput -and $cleanOutput.Length -gt 0) {
                Write-Host $cleanOutput
            } else {
                Write-Host "  (No se recibió respuesta visible)" -ForegroundColor Yellow
            }
            Write-Host ""
            Write-Host "  -> Comando ejecutado exitosamente" -ForegroundColor Green
        } else {
            Write-Host $cleanOutput -ForegroundColor Red
            throw "El comando falló con código de salida: $LASTEXITCODE"
        }
    } catch {
        Write-Host ""
        Write-Host "Error al conectar con Gemini CLI: $_" -ForegroundColor Red
        Write-Host "Verifica que Gemini CLI esté correctamente instalado y configurado" -ForegroundColor Yellow
        Write-Host "   Prueba ejecutar: gemini --help" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "==================================================" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Proceso completado!" -ForegroundColor Green
