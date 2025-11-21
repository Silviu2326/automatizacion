import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { executeGeminiPrompt } from '../services/gemini.js';
import { notifyPromptCompleted, notifyJobCompleted } from '../services/webhook.js';
import projectManager from '../services/projectManager.js';

/**
 * Cola secuencial simple para procesar prompts con persistencia en JSON
 */
class PromptQueue {
  constructor() {
    this.jobs = new Map(); // jobId -> job data
    this.processing = false;
    this.jobsDir = join(process.cwd(), 'data');
    this.jobsFile = join(this.jobsDir, 'jobs.json');
    
    // Asegurar que el directorio existe
    this.ensureJobsDir();
    
    // Cargar jobs guardados al iniciar
    this.loadJobs();
    
    // Guardar automáticamente cada 30 segundos
    this.startAutoSave();
    
    // Limpiar jobs antiguos cada hora
    this.startCleanup();
  }

  /**
   * Asegura que el directorio de jobs existe
   */
  ensureJobsDir() {
    if (!existsSync(this.jobsDir)) {
      mkdirSync(this.jobsDir, { recursive: true });
      console.log(`[Queue] Directorio de jobs creado: ${this.jobsDir}`);
    }
  }

  /**
   * Guarda los jobs en el archivo JSON
   */
  saveJobs() {
    try {
      // Convertir Map a Array y guardar solo jobs activos o recientes (últimas 24 horas)
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 horas
      
      const jobsArray = Array.from(this.jobs.values())
        .filter(job => {
          const jobAge = now - new Date(job.createdAt).getTime();
          // Guardar si está en progreso o si es reciente (menos de 24 horas)
          return job.status === 'processing' || 
                 job.status === 'pending' || 
                 (jobAge < maxAge && job.status === 'completed');
        })
        .map(job => {
          // Convertir a objeto plano (sin métodos)
          return {
            jobId: job.jobId,
            prompts: job.prompts,
            webhookUrl: job.webhookUrl,
            webhookSecret: job.webhookSecret || null,
            projectId: job.projectId || null,
            projectDirectory: job.projectDirectory || null,
            status: job.status,
            results: job.results || [],
            completed: job.completed || 0,
            failed: job.failed || 0,
            total: job.total,
            createdAt: job.createdAt,
            startedAt: job.startedAt || null,
            completedAt: job.completedAt || null
          };
        });
      
      writeFileSync(this.jobsFile, JSON.stringify(jobsArray, null, 2), 'utf8');
      console.log(`[Queue] ${jobsArray.length} job(s) guardado(s) en ${this.jobsFile}`);
    } catch (error) {
      console.error('[Queue] Error guardando jobs:', error);
    }
  }

  /**
   * Carga jobs desde el archivo JSON
   */
  loadJobs() {
    try {
      if (!existsSync(this.jobsFile)) {
        console.log('[Queue] No hay jobs guardados, iniciando con cola vacía');
        return;
      }

      const fileContent = readFileSync(this.jobsFile, 'utf8');
      const jobsArray = JSON.parse(fileContent);
      
      let loadedCount = 0;
      let resumedCount = 0;
      
      for (const jobData of jobsArray) {
        // Solo cargar jobs que estén pendientes o en progreso
        if (jobData.status === 'pending' || jobData.status === 'processing') {
          // Si estaba en progreso, marcarlo como pendiente para reintentar
          if (jobData.status === 'processing') {
            jobData.status = 'pending';
            jobData.startedAt = null; // Resetear para reintentar
            resumedCount++;
            console.log(`[Queue] Reanudando job interrumpido: ${jobData.jobId}`);
          }
          
          this.jobs.set(jobData.jobId, jobData);
          loadedCount++;
        } else {
          // Jobs completados también se cargan para historial (solo los recientes)
          this.jobs.set(jobData.jobId, jobData);
          loadedCount++;
        }
      }

      if (loadedCount > 0) {
        console.log(`[Queue] ${loadedCount} job(s) cargado(s) desde ${this.jobsFile}`);
        if (resumedCount > 0) {
          console.log(`[Queue] ${resumedCount} job(s) se reanudarán automáticamente`);
          // Iniciar procesamiento si hay jobs pendientes
          if (!this.processing) {
            this.processQueue();
          }
        }
      }
    } catch (error) {
      console.error('[Queue] Error cargando jobs:', error);
      // Continuar con cola vacía si hay error
    }
  }

  /**
   * Inicia el guardado automático periódico
   */
  startAutoSave() {
    // Guardar cada 30 segundos
    setInterval(() => {
      this.saveJobs();
    }, 30000);
    
    // Guardar al cerrar el proceso
    process.on('SIGINT', () => {
      console.log('[Queue] Guardando jobs antes de cerrar...');
      this.saveJobs();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('[Queue] Guardando jobs antes de cerrar...');
      this.saveJobs();
      process.exit(0);
    });
  }

  /**
   * Inicia la limpieza automática de jobs antiguos
   */
  startCleanup() {
    // Limpiar cada hora
    setInterval(() => {
      this.cleanOldJobs(24 * 60 * 60 * 1000); // 24 horas
      this.saveJobs(); // Guardar después de limpiar
    }, 60 * 60 * 1000);
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
    
    // Guardar inmediatamente al crear un job
    this.saveJobs();

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
    
    // Guardar cambio de estado
    this.saveJobs();

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
        
        // Guardar progreso después de cada prompt
        this.saveJobs();

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
        
        // Guardar progreso después de cada error
        this.saveJobs();

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
    
    // Guardar job completado
    this.saveJobs();

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
    let cleaned = 0;
    for (const [jobId, job] of this.jobs.entries()) {
      const jobAge = now - new Date(job.createdAt).getTime();
      if (jobAge > maxAge && job.status === 'completed') {
        this.jobs.delete(jobId);
        cleaned++;
        console.log(`[Queue] Limpiado job antiguo: ${jobId}`);
      }
    }
    if (cleaned > 0) {
      console.log(`[Queue] Limpiados ${cleaned} job(s) antiguo(s)`);
    }
    return cleaned;
  }
}

// Instancia singleton de la cola
const promptQueue = new PromptQueue();

export default promptQueue;
