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
    this.reviewFile = join(this.jobsDir, 'jobs-review.json'); // Archivo para jobs que necesitan revisión
    this.instanceId = `Queue-${Date.now()}`; // ID único para esta instancia
    this.TIMEOUT_MS = 14 * 60 * 1000; // 14 minutos en milisegundos
    
    console.log(`[Queue] 🚀 Inicializando cola de jobs (instancia: ${this.instanceId})`);
    console.log(`[Queue] ⏱️ Timeout por tarea: ${this.TIMEOUT_MS / 1000 / 60} minutos`);
    
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
      
      const allJobs = Array.from(this.jobs.values());
      
      // Debug: mostrar qué jobs hay en memoria
      if (allJobs.length > 0) {
        console.log(`[Queue] 🔍 Guardando: ${allJobs.length} job(s) en memoria [${this.instanceId}]`);
        allJobs.forEach(job => {
          console.log(`[Queue]   - Job ${job.jobId?.substring(0, 8)}... status: ${job.status}, createdAt: ${job.createdAt}`);
        });
      } else {
        // Solo loguear si realmente está vacío (no cada 30 segundos del auto-save)
        const stackTrace = new Error().stack;
        const isAutoSave = stackTrace.includes('setInterval') || stackTrace.includes('startAutoSave');
        if (!isAutoSave) {
          console.log(`[Queue] 🔍 Guardando: 0 job(s) en memoria (Map vacío) [${this.instanceId}]`);
          console.log(`[Queue] ⚠️ Stack trace:`, stackTrace.split('\n').slice(1, 4).join('\n'));
        }
      }
      
      const jobsArray = allJobs
        .filter(job => {
          if (!job || !job.createdAt) {
            console.warn(`[Queue] ⚠️ Job sin createdAt detectado:`, job?.jobId || 'desconocido');
            return false; // Ignorar jobs sin fecha
          }
          const jobAge = now - new Date(job.createdAt).getTime();
          // Guardar si está en progreso, pendiente o si es reciente (menos de 24 horas)
          const shouldSave = job.status === 'processing' || 
                            job.status === 'pending' || 
                            (jobAge < maxAge && job.status === 'completed');
          if (!shouldSave && job.status === 'completed') {
            console.log(`[Queue] ⏭️ Job ${job.jobId} completado hace ${Math.floor(jobAge / 3600000)}h, no guardado (>24h)`);
          }
          return shouldSave;
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
      
      // Guardar siempre (incluso si está vacío)
      const jobsJson = JSON.stringify(jobsArray, null, 2);
      writeFileSync(this.jobsFile, jobsJson, 'utf8');
      
      if (jobsArray.length > 0) {
        console.log(`[Queue] ✅ ${jobsArray.length} job(s) guardado(s) en ${this.jobsFile} (${this.jobs.size} total en memoria) [${this.instanceId}]`);
      } else if (this.jobs.size > 0) {
        // Si hay jobs en memoria pero no se guardaron (filtrados por fecha), avisar
        console.log(`[Queue] ⚠️ ${this.jobs.size} job(s) en memoria, pero todos antiguos (>24h, no guardados) [${this.instanceId}]`);
      } else {
        // Solo loguear si realmente no hay jobs (no cada 30 segundos)
        if (allJobs.length === 0 && this.jobs.size === 0) {
          // No loguear cada 30 segundos si está vacío, solo cuando hay cambios
        }
      }
    } catch (error) {
      console.error('[Queue] ❌ Error guardando jobs:', error.message);
      console.error('[Queue] Detalles:', error.stack);
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

      const fileContent = readFileSync(this.jobsFile, 'utf8').trim();
      
      // Si el archivo está vacío o solo tiene [], no hay jobs
      if (!fileContent || fileContent === '[]' || fileContent === '') {
        console.log('[Queue] Archivo de jobs vacío, iniciando con cola vacía');
        return;
      }
      
      const jobsArray = JSON.parse(fileContent);
      
      // Validar que es un array
      if (!Array.isArray(jobsArray)) {
        console.warn('[Queue] El archivo jobs.json no contiene un array válido');
        return;
      }
      
      let loadedCount = 0;
      let resumedCount = 0;
      
      for (const jobData of jobsArray) {
        // Validar que el job tiene los campos mínimos
        if (!jobData.jobId || !jobData.status) {
          console.warn('[Queue] Job inválido encontrado, saltando:', jobData);
          continue;
        }
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

    // Agregar el job al Map
    this.jobs.set(jobId, job);
    
    // Verificar inmediatamente que el job se agregó correctamente
    const verifyJob = this.jobs.get(jobId);
    const mapSize = this.jobs.size;
    
    if (!verifyJob) {
      console.error(`[Queue] ❌ Error: Job ${jobId} no se pudo agregar al Map`);
      throw new Error(`No se pudo agregar el job al Map`);
    }
    
    console.log(`[Queue] 📝 Job ${jobId} agregado correctamente (total: ${mapSize} job(s)) [${this.instanceId}]`);
    console.log(`[Queue] 🔍 Verificación: Map tiene ${this.jobs.size} job(s), job ${jobId} existe: ${this.jobs.has(jobId)}`);
    
    // Guardar inmediatamente al crear un job (sincrónicamente)
    // Verificar antes de guardar que el job está en el Map
    const beforeSaveSize = this.jobs.size;
    const beforeSaveHasJob = this.jobs.has(jobId);
    
    if (beforeSaveHasJob && beforeSaveSize > 0) {
      console.log(`[Queue] 💾 Guardando job inmediatamente (${beforeSaveSize} job(s) en Map, job existe: ${beforeSaveHasJob}) [${this.instanceId}]`);
      this.saveJobs();
      
      // Verificar después de guardar
      const afterSaveSize = this.jobs.size;
      const afterSaveHasJob = this.jobs.has(jobId);
      console.log(`[Queue] 🔍 Después de guardar: Map tiene ${afterSaveSize} job(s), job ${jobId} existe: ${afterSaveHasJob} [${this.instanceId}]`);
    } else {
      console.error(`[Queue] ❌ Error: Job no está en el Map o Map está vacío antes de guardar`);
      console.error(`[Queue]   - Map size: ${beforeSaveSize}, has job: ${beforeSaveHasJob}`);
      // Intentar guardar de todas formas
      this.saveJobs();
    }

    // Si no hay nada procesando, empezar a procesar
    // IMPORTANTE: Esperar un momento antes de procesar para asegurar que el guardado se complete
    if (!this.processing) {
      // Usar setImmediate para asegurar que el guardado se complete antes de procesar
      setImmediate(() => {
        console.log(`[Queue] 🚀 Iniciando procesamiento de cola (${this.jobs.size} job(s) pendientes) [${this.instanceId}]`);
        this.processQueue();
      });
    } else {
      console.log(`[Queue] ⏳ Ya hay un procesador activo, job ${jobId} esperará en cola [${this.instanceId}]`);
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
   * Obtiene todos los jobs (para mostrar historial)
   * @returns {Array<Object>} - Array con todos los jobs
   */
  getAllJobs() {
    return Array.from(this.jobs.values()).map(job => ({
      jobId: job.jobId,
      status: job.status,
      total: job.total,
      completed: job.completed,
      failed: job.failed,
      results: job.results || [],
      projectId: job.projectId || null,
      createdAt: job.createdAt,
      startedAt: job.startedAt || null,
      completedAt: job.completedAt || null
    }));
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
      const promptStartTime = Date.now();
      
      console.log(`[Queue] Ejecutando prompt ${i + 1}/${job.total} del job ${jobId} (timeout: ${this.TIMEOUT_MS / 1000 / 60} min)`);

      try {
        // Ejecutar el prompt con Gemini en el directorio del proyecto si existe
        // Pasar el timeout de 14 minutos
        const result = await executeGeminiPrompt(prompt, job.projectDirectory, 0, this.TIMEOUT_MS);
        
        const promptDuration = ((Date.now() - promptStartTime) / 1000 / 60).toFixed(2);
        console.log(`[Queue] ✅ Prompt ${i + 1}/${job.total} completado en ${promptDuration} minutos`);

        // Verificar si fue un timeout
        if (result.timeout) {
          console.warn(`[Queue] ⏱️ Prompt ${i + 1}/${job.total} excedió el timeout de ${this.TIMEOUT_MS / 1000 / 60} minutos`);
          
          // Guardar en archivo de revisión
          this.savePromptForReview(job, prompt, i);
          
          const promptResult = {
            prompt,
            status: 'timeout',
            output: '',
            error: result.error || `Timeout: El prompt excedió el tiempo límite de ${this.TIMEOUT_MS / 1000 / 60} minutos`,
            timestamp: new Date().toISOString(),
            index: i,
            timeout: true,
            duration: promptDuration
          };

          job.results.push(promptResult);
          job.failed++;
          
          // Guardar progreso después del timeout
          this.saveJobs();

          // Enviar webhook de timeout
          try {
            await notifyPromptCompleted(
              job.webhookUrl,
              jobId,
              prompt,
              { success: false, output: '', error: result.error, timeout: true },
              job.webhookSecret
            );
          } catch (webhookError) {
            console.error(`[Queue] Error enviando webhook de timeout:`, webhookError);
          }
          
          // Continuar con el siguiente prompt (no lanzar error)
          continue;
        }

        const promptResult = {
          prompt,
          status: result.success ? 'completed' : 'failed',
          output: result.output,
          error: result.error,
          timestamp: new Date().toISOString(),
          index: i,
          duration: ((Date.now() - promptStartTime) / 1000 / 60).toFixed(2)
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
        const promptDuration = ((Date.now() - promptStartTime) / 1000 / 60).toFixed(2);
        console.error(`[Queue] Error procesando prompt ${i + 1} (duración: ${promptDuration} min):`, error);

        // Verificar si el error es un timeout
        const isTimeout = error.timeout || error.code === 'TIMEOUT' || error.message?.includes('Timeout');
        
        if (isTimeout) {
          console.warn(`[Queue] ⏱️ Prompt ${i + 1}/${job.total} excedió el timeout (capturado en catch)`);
          
          // Guardar en archivo de revisión
          this.savePromptForReview(job, prompt, i);
        }

        const promptResult = {
          prompt,
          status: isTimeout ? 'timeout' : 'failed',
          output: '',
          error: error.message || 'Error desconocido',
          timestamp: new Date().toISOString(),
          index: i,
          timeout: isTimeout,
          duration: promptDuration
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
            { success: false, output: '', error: error.message, timeout: isTimeout },
            job.webhookSecret
          );
        } catch (webhookError) {
          console.error(`[Queue] Error enviando webhook de error:`, webhookError);
        }
        
        // Continuar con el siguiente prompt (no lanzar error para no detener el job)
        // Solo loguear y continuar
      }
    }

    // Marcar job como completado
    job.status = 'completed';
    job.completedAt = new Date().toISOString();
    
    console.log(`[Queue] 💾 Guardando job ${jobId} completado (${this.jobs.size} job(s) en Map) [${this.instanceId}]`);
    
    // Guardar job completado
    this.saveJobs();
    
    console.log(`[Queue] ✅ Job ${jobId} guardado después de completarse [${this.instanceId}]`);
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
   * Guarda un prompt que necesita revisión (por timeout) en el archivo de revisión
   * @param {Object} job - El job completo
   * @param {string} prompt - El prompt que falló por timeout
   * @param {number} index - Índice del prompt en el array
   */
  savePromptForReview(job, prompt, index) {
    try {
      let reviewJobs = [];
      
      // Cargar jobs existentes si el archivo existe
      if (existsSync(this.reviewFile)) {
        const fileContent = readFileSync(this.reviewFile, 'utf8').trim();
        if (fileContent && fileContent !== '[]' && fileContent !== '') {
          reviewJobs = JSON.parse(fileContent);
        }
      }
      
      // Crear entrada de revisión
      const reviewEntry = {
        jobId: job.jobId,
        prompt: prompt,
        promptIndex: index,
        projectId: job.projectId || null,
        projectDirectory: job.projectDirectory || null,
        webhookUrl: job.webhookUrl,
        status: 'timeout',
        reason: `Timeout: El prompt excedió el tiempo límite de ${this.TIMEOUT_MS / 1000 / 60} minutos`,
        createdAt: new Date().toISOString(),
        jobCreatedAt: job.createdAt,
        totalPromptsInJob: job.total,
        completedBeforeTimeout: job.completed || 0
      };
      
      // Agregar a la lista (evitar duplicados)
      const exists = reviewJobs.some(
        entry => entry.jobId === reviewEntry.jobId && entry.promptIndex === reviewEntry.promptIndex
      );
      
      if (!exists) {
        reviewJobs.push(reviewEntry);
        
        // Guardar en el archivo
        const reviewJson = JSON.stringify(reviewJobs, null, 2);
        writeFileSync(this.reviewFile, reviewJson, 'utf8');
        
        console.log(`[Queue] 📋 Prompt guardado para revisión en ${this.reviewFile}`);
        console.log(`[Queue]   Job: ${job.jobId.substring(0, 8)}..., Prompt ${index + 1}/${job.total}`);
      }
    } catch (error) {
      console.error('[Queue] ❌ Error guardando prompt para revisión:', error);
    }
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
