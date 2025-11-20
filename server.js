import express from 'express';
import dotenv from 'dotenv';
import promptsRouter from './src/routes/prompts.js';
import projectsRouter from './src/routes/projects.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON
app.use(express.json());

// Servir archivos estáticos desde la carpeta public
app.use(express.static('public'));

// Middleware de logging básico
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Rutas de la API
app.use('/api', promptsRouter);
app.use('/api', projectsRouter);
console.log('[Server] Todas las rutas cargadas');

// Ruta raíz - redirigir a la interfaz web si existe, sino mostrar JSON
app.get('/', (req, res) => {
  // Si hay un archivo index.html, Express lo servirá automáticamente
  // Sino, devolver JSON con la información de la API
  res.json({
    name: 'Gemini Prompt Server',
    version: '1.0.0',
    description: 'Servidor para ejecutar prompts con Gemini CLI y notificar resultados via webhooks',
    webInterface: '/index.html',
    endpoints: {
      'POST /api/prompts': 'Añade prompts a la cola de procesamiento',
      'GET /api/jobs/:jobId': 'Obtiene el estado de un job',
      'GET /api/health': 'Verifica el estado del servidor y Gemini CLI'
    }
  });
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    path: req.path
  });
});

// Manejo de errores globales
app.use((err, req, res, next) => {
  console.error('[Server] Error no manejado:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: err.message
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('🚀 Gemini Prompt Server iniciado');
  console.log('========================================');
  console.log(`📍 Puerto: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📋 API: http://localhost:${PORT}/api`);
  console.log(`💚 Health: http://localhost:${PORT}/api/health`);
  console.log('========================================');
  console.log('');

  // Verificar configuración de Gemini al iniciar
  (async () => {
    try {
      const { verifyGeminiSetup } = await import('./src/services/gemini.js');
      const status = await verifyGeminiSetup();
      
      if (status.available) {
        console.log('✅ Gemini CLI configurado correctamente');
      } else {
        console.warn('⚠️  Advertencia: Gemini CLI no está disponible');
        console.warn(`   ${status.error}`);
        console.warn('   El servidor está funcionando, pero los jobs pueden fallar');
      }
      console.log('');
    } catch (error) {
      console.warn('⚠️  Error al verificar Gemini CLI:', error.message);
      console.log('');
    }
  })();
});
