import express from 'express';
import promptQueue from '../queue/promptQueue.js';
import { verifyGeminiSetup, getApiKeyInfo } from '../services/gemini.js';
import projectManager from '../services/projectManager.js';

const router = express.Router();

/**
 * POST /api/prompts
 * Recibe un listado de prompts y los añade a la cola de procesamiento
 */
router.post('/prompts', async (req, res) => {
  try {
    const { prompts, webhookUrl, webhookSecret, projectId } = req.body;

    // Validar que prompts existe y es un array
    if (!prompts || !Array.isArray(prompts)) {
      return res.status(400).json({
        error: 'El campo "prompts" es requerido y debe ser un array',
        example: {
          prompts: ['prompt1', 'prompt2'],
          webhookUrl: 'https://example.com/webhook',
          webhookSecret: 'opcional'
        }
      });
    }

    // Validar que el array no esté vacío
    if (prompts.length === 0) {
      return res.status(400).json({
        error: 'El array "prompts" no puede estar vacío'
      });
    }

    // Validar que todos los prompts sean strings
    if (!prompts.every(p => typeof p === 'string' && p.trim().length > 0)) {
      return res.status(400).json({
        error: 'Todos los prompts deben ser strings no vacíos'
      });
    }

    // Validar webhookUrl (es opcional, pero si se proporciona debe ser válida)
    if (webhookUrl !== undefined && webhookUrl !== null && webhookUrl !== '') {
      if (typeof webhookUrl !== 'string') {
        return res.status(400).json({
          error: 'El campo "webhookUrl" debe ser una cadena de texto'
        });
      }

      try {
        new URL(webhookUrl.trim()); // Validar que sea una URL válida
      } catch (error) {
        return res.status(400).json({
          error: 'El campo "webhookUrl" debe ser una URL válida'
        });
      }
    }

    // Verificar que Gemini está configurado
    const geminiStatus = await verifyGeminiSetup();
    if (!geminiStatus.available) {
      return res.status(503).json({
        error: 'Gemini CLI no está disponible',
        details: geminiStatus.error
      });
    }

    // Validar projectId si se proporciona
    if (projectId !== undefined && projectId !== null && projectId !== '') {
      const project = projectManager.getProject(projectId);
      if (!project) {
        return res.status(400).json({
          error: `Proyecto con ID "${projectId}" no encontrado`
        });
      }
    }

    // Añadir job a la cola
    const jobId = promptQueue.addJob(prompts, webhookUrl, webhookSecret, projectId || null);

    // Calcular tiempo estimado (asumiendo ~30 segundos por prompt)
    const estimatedSeconds = prompts.length * 30;
    const estimatedMinutes = Math.ceil(estimatedSeconds / 60);

    res.status(202).json({
      jobId,
      status: 'accepted',
      promptsCount: prompts.length,
      estimatedTime: `~${estimatedMinutes} minuto${estimatedMinutes !== 1 ? 's' : ''}`,
      message: 'Job añadido a la cola de procesamiento'
    });

    console.log(`[API] Nuevo job creado: ${jobId} con ${prompts.length} prompts`);
  } catch (error) {
    console.error('[API] Error en POST /api/prompts:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

/**
 * GET /api/jobs
 * Obtiene todos los jobs (historial completo)
 */
router.get('/jobs', (req, res) => {
  try {
    const allJobs = promptQueue.getAllJobs();
    
    // Ordenar por fecha de creación (más recientes primero)
    allJobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({
      success: true,
      jobs: allJobs,
      total: allJobs.length
    });
  } catch (error) {
    console.error('[API] Error en GET /api/jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

/**
 * GET /api/jobs/:jobId
 * Obtiene el estado y resultados de un job
 */
router.get('/jobs/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({
        error: 'jobId es requerido'
      });
    }

    const job = promptQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        error: 'Job no encontrado',
        jobId
      });
    }

    // Retornar información del job (sin exponer el secret)
    const jobResponse = {
      jobId: job.jobId,
      status: job.status,
      total: job.total,
      completed: job.completed,
      failed: job.failed,
      results: job.results,
      projectId: job.projectId || null,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt
    };

    res.json(jobResponse);
  } catch (error) {
    console.error('[API] Error en GET /api/jobs/:jobId:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

/**
 * GET /api/health
 * Endpoint de salud para verificar que el servidor está funcionando
 */
router.get('/health', async (req, res) => {
  try {
    const geminiStatus = await verifyGeminiSetup();
    const apiKeyInfo = getApiKeyInfo();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      gemini: {
        available: geminiStatus.available,
        error: geminiStatus.error || undefined,
        apiKeys: {
          total: apiKeyInfo.totalKeys,
          currentIndex: apiKeyInfo.currentKeyIndex + 1, // 1-indexed para mostrar al usuario
          hasMultipleKeys: apiKeyInfo.hasMultipleKeys,
          rotationEnabled: apiKeyInfo.hasMultipleKeys
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

export default router;
