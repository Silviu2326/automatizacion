# Gemini Prompt Server

Servidor Node.js para ejecutar prompts con Gemini CLI y notificar resultados mediante webhooks.

## Características

- ✅ API REST para recibir listados de prompts
- ✅ **Interfaz web moderna** para enviar prompts y ver el estado en tiempo real
- ✅ Procesamiento secuencial de prompts
- ✅ Notificaciones via webhooks cuando cada prompt se completa
- ✅ Consulta del estado de jobs en tiempo real
- ✅ Manejo robusto de errores
- ✅ Logging detallado

## Requisitos Previos

1. **Node.js** (v18 o superior)
2. **Gemini CLI** instalado globalmente:
   ```bash
   npm install -g @google/gemini-cli
   ```
3. **API Key de Gemini**: Obtén tu clave en [Google AI Studio](https://makersuite.google.com/app/apikey)

## Instalación

### Opción 1: Clonar desde GitHub

```bash
git clone https://github.com/TU_USUARIO/TU_REPO.git
cd TU_REPO
```

### Opción 2: Descargar el proyecto

Descarga el proyecto y descomprímelo en tu directorio preferido.

### Continuar con la instalación

1. Instala las dependencias:
   ```bash
   npm install
   ```

3. Configura las variables de entorno:
   ```bash
   cp .env.example .env
   ```
   
   Edita `.env` y añade tu `GEMINI_API_KEY`:
   ```env
   GEMINI_API_KEY=tu_clave_api_aqui
   PORT=3000
   ```

## Uso

### Iniciar el servidor

```bash
npm start
```

O en modo desarrollo (con auto-reload):
```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3000`

### Interfaz Web

Una vez iniciado el servidor, abre tu navegador en:

**🌐 http://localhost:3000**

La interfaz web incluye:
- 📝 Formulario para enviar múltiples prompts
- 📊 Vista en tiempo real del estado de los jobs
- ✅ Visualización de resultados cuando cada prompt se completa
- 🔄 Actualización automática cada 2 segundos
- 📡 Opción de configurar webhook URL para recibir notificaciones externas

**Características de la interfaz:**
- Agrega múltiples prompts (uno por línea)
- Ve la lista de prompts antes de enviar
- Elimina prompts individuales del formulario
- Haz clic en un job para ver los detalles y resultados
- Monitora el progreso con barras de progreso visuales

### Endpoints de la API

#### POST /api/prompts

Envía un listado de prompts para procesar.

**Request:**
```bash
curl -X POST http://localhost:3000/api/prompts \
  -H "Content-Type: application/json" \
  -d '{
    "prompts": [
      "Explica qué es JavaScript",
      "¿Cuáles son las ventajas de TypeScript?"
    ],
    "webhookUrl": "https://tu-webhook.com/recibir-resultados",
    "webhookSecret": "opcional-secret-123"
  }'
```

**Response:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "accepted",
  "promptsCount": 2,
  "estimatedTime": "~1 minuto",
  "message": "Job añadido a la cola de procesamiento"
}
```

#### GET /api/jobs/:jobId

Consulta el estado de un job.

**Request:**
```bash
curl http://localhost:3000/api/jobs/550e8400-e29b-41d4-a716-446655440000
```

**Response:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "total": 2,
  "completed": 1,
  "failed": 0,
  "results": [
    {
      "prompt": "Explica qué es JavaScript",
      "status": "completed",
      "output": "JavaScript es un lenguaje de programación...",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "index": 0
    }
  ],
  "createdAt": "2024-01-15T10:29:45.000Z",
  "startedAt": "2024-01-15T10:29:46.000Z"
}
```

#### GET /api/health

Verifica el estado del servidor y la configuración de Gemini CLI.

**Request:**
```bash
curl http://localhost:3000/api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "gemini": {
    "available": true
  }
}
```

## Webhooks

Cuando envías prompts al servidor, recibirás notificaciones en la URL especificada en `webhookUrl`.

### Notificación cuando un prompt se completa

```json
{
  "event": "prompt.completed",
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "prompt": "Explica qué es JavaScript",
  "output": "JavaScript es un lenguaje de programación...",
  "status": "success",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

Si el prompt falla:
```json
{
  "event": "prompt.completed",
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "prompt": "Prompt con error",
  "output": "",
  "status": "failed",
  "error": "Error message aquí",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Notificación cuando el job completo termina

```json
{
  "event": "job.completed",
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "totalPrompts": 2,
  "completed": 2,
  "failed": 0,
  "results": [
    {
      "prompt": "Explica qué es JavaScript",
      "status": "completed",
      "output": "...",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "index": 0
    },
    {
      "prompt": "¿Cuáles son las ventajas de TypeScript?",
      "status": "completed",
      "output": "...",
      "timestamp": "2024-01-15T10:30:30.000Z",
      "index": 1
    }
  ],
  "timestamp": "2024-01-15T10:30:30.000Z"
}
```

### Probar webhooks localmente

Puedes usar servicios como:
- [webhook.site](https://webhook.site) - Genera una URL temporal para recibir webhooks
- [ngrok](https://ngrok.com) - Crea un túnel a tu servidor local

Ejemplo con webhook.site:
1. Ve a https://webhook.site y copia la URL única
2. Usa esa URL en `webhookUrl` cuando hagas POST a `/api/prompts`
3. Verás los webhooks llegar en tiempo real en la página

## Ejemplo Completo

```bash
# 1. Iniciar el servidor
npm start

# 2. En otra terminal, enviar prompts
curl -X POST http://localhost:3000/api/prompts \
  -H "Content-Type: application/json" \
  -d '{
    "prompts": [
      "Explica qué es Node.js",
      "¿Qué es Express.js?"
    ],
    "webhookUrl": "https://webhook.site/tu-url-unica"
  }'

# 3. Obtener el jobId de la respuesta y consultar estado
curl http://localhost:3000/api/jobs/550e8400-e29b-41d4-a716-446655440000
```

## Estructura del Proyecto

```
/
├── server.js              # Servidor Express principal
├── package.json           # Dependencias Node.js
├── .env.example          # Plantilla de variables de entorno
├── src/
│   ├── routes/
│   │   └── prompts.js    # Endpoints de la API
│   ├── services/
│   │   ├── gemini.js     # Ejecutor de Gemini CLI
│   │   └── webhook.js    # Enviador de webhooks
│   └── queue/
│       └── promptQueue.js # Cola secuencial de prompts
└── README.md             # Este archivo
```

## Variables de Entorno

| Variable | Descripción | Requerido | Default |
|----------|-------------|-----------|---------|
| `PORT` | Puerto del servidor | No | 3000 |
| `GEMINI_API_KEY` | API Key de Gemini | Sí | - |
| `NODE_ENV` | Entorno (development/production) | No | development |

## Solución de Problemas

### Error: "GEMINI_API_KEY no está configurada"

Asegúrate de crear un archivo `.env` con tu API key:
```bash
cp .env.example .env
# Edita .env y añade tu clave
```

### Error: "Gemini CLI no está instalado"

Instala Gemini CLI globalmente:
```bash
npm install -g @google/gemini-cli
```

### Los webhooks no llegan

- Verifica que la URL del webhook sea accesible públicamente
- Usa [webhook.site](https://webhook.site) para pruebas
- Revisa los logs del servidor para ver errores de conexión

## Despliegue en Máquina Virtual

Para subir este proyecto a GitHub y desplegarlo en una máquina virtual, consulta la guía completa en **[DEPLOY.md](DEPLOY.md)**.

**Resumen rápido:**
1. Inicializa Git: `git init`
2. Crea un repositorio en GitHub
3. Sube el código: `git push origin main`
4. En la máquina virtual: `git clone https://github.com/TU_USUARIO/TU_REPO.git`
5. Sigue los pasos de instalación normales

## Características Adicionales

### Gestión de Proyectos
- ✅ Crear y gestionar múltiples proyectos
- ✅ Clonar repositorios de GitHub en proyectos
- ✅ Subir cambios a GitHub desde la interfaz web
- ✅ Cargar prompts desde archivos JSON

### Subir Prompts desde JSON
Puedes subir múltiples prompts desde un archivo JSON con el formato:
```json
{
  "prompts": [
    "Prompt 1",
    "Prompt 2",
    "Prompt 3"
  ]
}
```

## Licencia

MIT
