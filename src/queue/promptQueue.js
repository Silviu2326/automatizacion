import { randomUUID } from 'crypto';
import { executeGeminiPrompt } from '../services/gemini.js';
import { notifyPromptCompleted, notifyJobCompleted } from '../services/webhook.js';
import projectManager from '../services/projectManager.js';

/**
 * Cola secuencial simple para procesar prompts
 */
class PromptQueue {
  constructor() {
    this.jobs = new Map(); // jobId -> job data
    this.processing = false;
  }

  /**
   * Añade un nuevo job a la cola
   * @param {Array<string>} prompts - Array de prompts a ejecutar
   * @param {string} webhookUrl - URL del webhook para notificaciones
   * @param {string} [webhookSecret] - Secret opcional para el webhook
   * @param {string} [projectId] - ID del proyecto donde ejecutar los prompts
   * @returns {string} - ID del job
   */
  addJob(prompts, webhookUrl, webhookSecret = null, projectId = null) {
    const jobId = randomUUID();

    // Obtener el directorio del proyecto si se proporciona un projectId
    let projectDirectory = null;
    if (projectId) {
      const project = projectManager.getProject(projectId);
      if (project) {
        projectDirectory = project.directory;
      } else {
        console.warn(`[Queue] Proyecto ${projectId} no encontrado, ejecutando sin directorio de proyecto`);
      }
    }

    const job = {
      jobId,
      prompts,
      webhookUrl,
      webhookSecret,
      projectId,
      projectDirectory,
      status: 'pending',
      results: [],
      completed: 0,
      failed: 0,
      total: prompts.length,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null
    };

    this.jobs.set(jobId, job);

    // Si no hay nada procesando, empezar a procesar
    if (!this.processing) {
      this.processQueue();
    }

    return jobId;
  }

  /**
   * Obtiene el estado de un job
   * @param {string} jobId - ID del job
   * @returns {Object|null} - Datos del job o null si no existe
   */
  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Procesa la cola de forma secuencial
   */
  async processQueue() {
    if (this.processing) {
      return; // Ya hay un procesador activo
    }

    this.processing = true;

    while (this.jobs.size > 0) {
      // Buscar el primer job pendiente
      let currentJob = null;
      for (const [jobId, job] of this.jobs.entries()) {
        if (job.status === 'pending' || job.status === 'processing') {
          currentJob = job;
          break;
        }
      }

      if (!currentJob) {
        // No hay más jobs para procesar
        break;
      }

      // Procesar el job
      await this.processJob(currentJob.jobId);
    }

    this.processing = false;
  }

  /**
   * Procesa un job específico, ejecutando todos sus prompts secuencialmente
   * @param {string} jobId - ID del job a procesar
   */
  async processJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) {
      return;
    }

    job.status = 'processing';
    job.startedAt = new Date().toISOString();

    console.log(`[Queue] Procesando job ${jobId} con ${job.total} prompts`);

    // Procesar cada prompt secuencialmente
    for (let i = 0; i < job.prompts.length; i++) {
      const prompt = job.prompts[i];
      
      console.log(`[Queue] Ejecutando prompt ${i + 1}/${job.total} del job ${jobId}`);

      try {
        // Ejecutar el prompt con Gemini en el directorio del proyecto si existe
        const result = await executeGeminiPrompt(prompt, job.projectDirectory);

        const promptResult = {
          prompt,
          status: result.success ? 'completed' : 'failed',
          output: result.output,
          error: result.error,
          timestamp: new Date().toISOString(),
          index: i
        };

        job.results.push(promptResult);

        if (result.success) {
          job.completed++;
        } else {
          job.failed++;
        }

        // Enviar webhook para este prompt individual
        try {
          await notifyPromptCompleted(
            job.webhookUrl,
            jobId,
            prompt,
            result,
            job.webhookSecret
          );
        } catch (webhookError) {
          console.error(`[Queue] Error enviando webhook para prompt ${i + 1}:`, webhookError);
          // Continuar aunque el webhook falle
        }

      } catch (error) {
        console.error(`[Queue] Error procesando prompt ${i + 1}:`, error);

        const promptResult = {
          prompt,
          status: 'failed',
          output: '',
          error: error.message || 'Error desconocido',
          timestamp: new Date().toISOString(),
          index: i
        };

        job.results.push(promptResult);
        job.failed++;

        // Enviar webhook de error
        try {
          await notifyPromptCompleted(
            job.webhookUrl,
            jobId,
            prompt,
            { success: false, output: '', error: error.message },
            job.webhookSecret
          );
        } catch (webhookError) {
          console.error(`[Queue] Error enviando webhook de error:`, webhookError);
        }
      }
    }

    // Marcar job como completado
    job.status = 'completed';
    job.completedAt = new Date().toISOString();

    console.log(`[Queue] Job ${jobId} completado. ${job.completed} exitosos, ${job.failed} fallidos`);

    // Enviar webhook final con el resumen
    try {
      await notifyJobCompleted(
        job.webhookUrl,
        jobId,
        {
          total: job.total,
          completed: job.completed,
          failed: job.failed,
          results: job.results
        },
        job.webhookSecret
      );
    } catch (webhookError) {
      console.error(`[Queue] Error enviando webhook final:`, webhookError);
    }

    // El job queda en el Map para consulta posterior, pero ya no se procesa
  }

  /**
   * Limpia jobs antiguos (opcional, para liberar memoria)
   * @param {number} maxAge - Edad máxima en milisegundos (default: 1 hora)
   */
  cleanOldJobs(maxAge = 60 * 60 * 1000) {
    const now = Date.now();
    for (const [jobId, job] of this.jobs.entries()) {
      const jobAge = now - new Date(job.createdAt).getTime();
      if (jobAge > maxAge && job.status === 'completed') {
        this.jobs.delete(jobId);
        console.log(`[Queue] Limpiado job antiguo: ${jobId}`);
      }
    }
  }
}

// Instancia singleton de la cola
const promptQueue = new PromptQueue();

export default promptQueue;
