import { exec, spawn, execFile } from 'child_process';
import { promisify } from 'util';
import { env } from 'process';

const execAsync = promisify(exec);

/**
 * Gestor de rotación de API keys de Gemini
 * Soporta múltiples keys y cambia automáticamente cuando se alcanza un límite
 */
class ApiKeyManager {
  constructor() {
    this.apiKeys = [];
    this.currentKeyIndex = 0;
    this.initializeKeys();
  }

  /**
   * Inicializa las API keys desde las variables de entorno
   * Soporta:
   * - GEMINI_API_KEYS: múltiples keys separadas por coma
   * - GEMINI_API_KEY: una sola key (compatibilidad hacia atrás)
   */
  initializeKeys() {
    // Primero intentar múltiples keys separadas por coma
    if (env.GEMINI_API_KEYS) {
      this.apiKeys = env.GEMINI_API_KEYS.split(',')
        .map(key => key.trim())
        .filter(key => key.length > 0);
      console.log(`[Gemini] Configuradas ${this.apiKeys.length} API keys para rotación`);
    } else if (env.GEMINI_API_KEY) {
      // Compatibilidad: usar GEMINI_API_KEY si existe
      this.apiKeys = [env.GEMINI_API_KEY.trim()];
      console.log(`[Gemini] Usando una sola API key (modo compatibilidad)`);
    }

    if (this.apiKeys.length === 0) {
      console.warn('[Gemini] Advertencia: No se encontraron API keys configuradas');
    }
  }

  /**
   * Obtiene la API key actual
   */
  getCurrentKey() {
    if (this.apiKeys.length === 0) {
      return null;
    }
    return this.apiKeys[this.currentKeyIndex];
  }

  /**
   * Rota a la siguiente API key
   * @returns {boolean} - True si hay otra key disponible, false si no hay más
   */
  rotateToNextKey() {
    if (this.apiKeys.length <= 1) {
      console.warn('[Gemini] No hay más API keys disponibles para rotar');
      return false;
    }

    const previousIndex = this.currentKeyIndex;
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    
    console.log(`[Gemini] Rotando API key: ${previousIndex} -> ${this.currentKeyIndex} (${this.apiKeys.length} disponibles)`);
    return true;
  }

  /**
   * Verifica si hay más keys disponibles
   */
  hasMoreKeys() {
    return this.apiKeys.length > 1;
  }

  /**
   * Obtiene el número total de keys configuradas
   */
  getTotalKeys() {
    return this.apiKeys.length;
  }

  /**
   * Obtiene el índice de la key actual
   */
  getCurrentKeyIndex() {
    return this.currentKeyIndex;
  }
}

// Instancia singleton del gestor de keys
const apiKeyManager = new ApiKeyManager();

/**
 * Verifica si Gemini CLI está disponible
 * Intenta ejecutar gemini --version para verificar disponibilidad
 */
async function checkGeminiAvailable() {
  try {
    const result = await execAsync('gemini --version', { 
      timeout: 10000,
      maxBuffer: 1024 * 1024 // 1MB
    });
    return true;
  } catch (error) {
    // Si el comando existe pero falla por otra razón, igualmente está disponible
    // Solo fallamos si no encontramos el comando
    if (error.code === 'ENOENT') {
      return false;
    }
    // Para otros errores (como timeout), asumimos que está disponible
    return true;
  }
}

/**
 * Detecta si un error está relacionado con límites de cuota/rate limit
 * @param {string} errorMessage - Mensaje de error a analizar
 * @returns {boolean} - True si es un error de límite/cuota
 */
function isQuotaError(errorMessage) {
  if (!errorMessage) return false;
  
  const lowerError = errorMessage.toLowerCase();
  const quotaIndicators = [
    'quota',
    'rate limit',
    'rate_limit',
    '429',
    'resource_exhausted',
    'limit exceeded',
    'exceeded',
    'too many requests',
    'quota exceeded',
    'daily limit',
    'monthly limit',
    'usage limit'
  ];
  
  return quotaIndicators.some(indicator => lowerError.includes(indicator));
}

/**
 * Ejecuta un prompt usando Gemini CLI en modo YOLO
 * @param {string} prompt - El prompt a ejecutar
 * @param {string} [projectDirectory] - Directorio del proyecto donde ejecutar (opcional)
 * @param {number} [retryAttempt] - Número de intento (para retry interno)
 * @param {number} [timeoutMs] - Timeout en milisegundos (default: 14 minutos = 840000ms)
 * @returns {Promise<{success: boolean, output: string, error?: string, apiKeyIndex?: number, timeout?: boolean}>}
 */
export async function executeGeminiPrompt(prompt, projectDirectory = null, retryAttempt = 0, timeoutMs = 14 * 60 * 1000) {
  // Verificar que hay al menos una API key configurada
  const currentApiKey = apiKeyManager.getCurrentKey();
  if (!currentApiKey) {
    throw new Error('GEMINI_API_KEY o GEMINI_API_KEYS no está configurada en las variables de entorno');
  }

  const maxRetries = apiKeyManager.getTotalKeys(); // Máximo de retries = número de keys
  const currentKeyIndex = apiKeyManager.getCurrentKeyIndex();

  try {
    // Ejecutar gemini --yolo con el prompt
    // Usar execFile o pasar argumentos directamente para evitar problemas con el shell
    const context = projectDirectory ? `en proyecto: ${projectDirectory}` : '';
    const keyInfo = apiKeyManager.getTotalKeys() > 1 
      ? `[Key ${currentKeyIndex + 1}/${apiKeyManager.getTotalKeys()}]` 
      : '';
    console.log(`[Gemini] ${keyInfo} Ejecutando prompt ${context}: ${prompt.substring(0, 50)}...`);

    // Configurar el directorio de trabajo si se proporciona un proyecto
    const execOptions = {
      env: {
        ...env,
        GEMINI_API_KEY: currentApiKey  // Usar la key actual del manager
      },
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer para respuestas largas
    };

    // Si hay un directorio de proyecto, ejecutar el comando en ese directorio
    if (projectDirectory) {
      execOptions.cwd = projectDirectory;
      console.log(`[Gemini] Ejecutando en directorio: ${projectDirectory}`);
    }

    // Construir argumentos para gemini CLI
    // Usar spawn con argumentos separados para evitar problemas con caracteres especiales
    const geminiArgs = ['--yolo'];
    
    // Agregar modelo si está configurado en variables de entorno
    const geminiModel = env.GEMINI_MODEL;
    if (geminiModel && geminiModel.trim().length > 0) {
      geminiArgs.push('--model', geminiModel.trim());
      console.log(`[Gemini] Usando modelo: ${geminiModel.trim()}`);
    }
    
    // Agregar el prompt como último argumento
    // Usar spawn con argumentos separados para evitar problemas con caracteres especiales
    geminiArgs.push(prompt);
    
    // Ejecutar usando spawn con argumentos separados y shell: false
    // Esto evita que el shell interprete caracteres especiales en el prompt
    // Si gemini es un script npm, Node.js debería poder ejecutarlo de todas formas
    let stdout, stderr;
    let timeoutId = null;
    let childProcess = null;
    
    try {
      const result = await new Promise((resolve, reject) => {
        // Crear timeout para cancelar después del tiempo límite
        timeoutId = setTimeout(() => {
          if (childProcess && !childProcess.killed) {
            console.warn(`[Gemini] ⏱️ Timeout de ${timeoutMs / 1000 / 60} minutos alcanzado. Cancelando proceso...`);
            childProcess.kill('SIGTERM');
            // Dar un momento para que termine limpiamente, luego forzar
            setTimeout(() => {
              if (childProcess && !childProcess.killed) {
                childProcess.kill('SIGKILL');
              }
            }, 2000);
            
            const timeoutError = new Error(`Timeout: El prompt excedió el tiempo límite de ${timeoutMs / 1000 / 60} minutos`);
            timeoutError.timeout = true;
            timeoutError.code = 'TIMEOUT';
            reject(timeoutError);
          }
        }, timeoutMs);
        
        childProcess = spawn('gemini', geminiArgs, {
          ...execOptions,
          shell: false // No usar shell para evitar problemas con caracteres especiales
        });
        
        let stdoutData = '';
        let stderrData = '';
        
        childProcess.stdout.on('data', (data) => {
          stdoutData += data.toString();
        });
        
        childProcess.stderr.on('data', (data) => {
          stderrData += data.toString();
        });
        
        childProcess.on('error', (error) => {
          if (timeoutId) clearTimeout(timeoutId);
          // Si el error es ENOENT, gemini puede ser un script npm que necesita shell
          if (error.code === 'ENOENT') {
            // Reintentar con shell: true usando un método más seguro
            // Escapar el prompt correctamente para el shell usando comillas simples
            // Reemplazar comillas simples dentro del prompt con una secuencia de escape
            const promptEscaped = prompt.replace(/'/g, "'\"'\"'");
            const commandParts = ['gemini', '--yolo'];
            if (geminiModel && geminiModel.trim().length > 0) {
              commandParts.push('--model', geminiModel.trim());
            }
            // Envolver el prompt en comillas simples para protegerlo del shell
            commandParts.push(`'${promptEscaped}'`);
            const commandString = commandParts.join(' ');
            
            childProcess = spawn(commandString, {
              ...execOptions,
              shell: true
            });
            
            // Re-aplicar timeout al nuevo proceso
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
              if (childProcess && !childProcess.killed) {
                console.warn(`[Gemini] ⏱️ Timeout de ${timeoutMs / 1000 / 60} minutos alcanzado. Cancelando proceso...`);
                childProcess.kill('SIGTERM');
                setTimeout(() => {
                  if (childProcess && !childProcess.killed) {
                    childProcess.kill('SIGKILL');
                  }
                }, 2000);
                
                const timeoutError = new Error(`Timeout: El prompt excedió el tiempo límite de ${timeoutMs / 1000 / 60} minutos`);
                timeoutError.timeout = true;
                timeoutError.code = 'TIMEOUT';
                reject(timeoutError);
              }
            }, timeoutMs);
            
            let stdoutData2 = '';
            let stderrData2 = '';
            
            childProcess.stdout.on('data', (data) => {
              stdoutData2 += data.toString();
            });
            
            childProcess.stderr.on('data', (data) => {
              stderrData2 += data.toString();
            });
            
            childProcess.on('error', (error2) => {
              if (timeoutId) clearTimeout(timeoutId);
              reject(error2);
            });
            
            childProcess.on('close', (code) => {
              if (timeoutId) clearTimeout(timeoutId);
              if (code === 0) {
                resolve({
                  stdout: stdoutData2,
                  stderr: stderrData2
                });
              } else {
                const error2 = new Error(`Command failed with exit code ${code}`);
                error2.stdout = stdoutData2;
                error2.stderr = stderrData2;
                error2.code = code;
                reject(error2);
              }
            });
          } else {
            if (timeoutId) clearTimeout(timeoutId);
            reject(error);
          }
        });
        
        childProcess.on('close', (code) => {
          if (timeoutId) clearTimeout(timeoutId);
          if (code === 0) {
            resolve({
              stdout: stdoutData,
              stderr: stderrData
            });
          } else {
            const error = new Error(`Command failed with exit code ${code}`);
            error.stdout = stdoutData;
            error.stderr = stderrData;
            error.code = code;
            reject(error);
          }
        });
      });
      
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (execError) {
      // Limpiar timeout si aún está activo
      if (timeoutId) clearTimeout(timeoutId);
      
      // Si es un timeout, lanzarlo directamente
      if (execError.timeout || execError.code === 'TIMEOUT') {
        throw execError;
      }
      
      // Capturar tanto stdout como stderr del error para mejor diagnóstico
      stdout = execError.stdout || '';
      stderr = execError.stderr || '';
      // Relanzar el error para que se maneje en el catch principal
      throw execError;
    }

    const output = (stdout || '').trim();
    const errorOutput = (stderr || '').trim();
    
    // Combinar stdout y stderr para detectar errores de quota
    const fullOutput = (output + ' ' + errorOutput).trim();
    const isQuotaErrorDetected = isQuotaError(fullOutput);

    // Si detectamos un error de quota y hay más keys disponibles, rotar y reintentar
    if (isQuotaErrorDetected && retryAttempt < maxRetries - 1 && apiKeyManager.hasMoreKeys()) {
      console.warn(`[Gemini] ⚠️ Límite de cuota detectado en key ${currentKeyIndex + 1}. Rotando a siguiente key...`);
      console.warn(`[Gemini] Error detectado: ${errorOutput || output}`);
      
      // Rotar a la siguiente key
      const rotated = apiKeyManager.rotateToNextKey();
      
      if (rotated) {
        // Reintentar con la nueva key (máximo 3 segundos de delay)
        await new Promise(resolve => setTimeout(resolve, 1000));
        return executeGeminiPrompt(prompt, projectDirectory, retryAttempt + 1);
      }
    }

    if (output || (!errorOutput && !isQuotaErrorDetected)) {
      return {
        success: true,
        output: output || '(No se recibió respuesta visible)',
        error: errorOutput || undefined,
        apiKeyIndex: currentKeyIndex
      };
    } else {
      // Si es un error de quota y no hay más keys, informar claramente
      if (isQuotaErrorDetected) {
        console.error(`[Gemini] ❌ Límite de cuota alcanzado en todas las API keys configuradas`);
      }
      
      return {
        success: false,
        output: output,
        error: errorOutput || 'Error desconocido al ejecutar Gemini CLI',
        apiKeyIndex: currentKeyIndex,
        isQuotaError: isQuotaErrorDetected
      };
    }
  } catch (error) {
    const errorMessage = error.message || '';
    const errorStack = error.stack || '';
    const fullError = `${errorMessage}\n${errorStack}`;
    
    // Detectar timeout
    const isTimeout = error.timeout || error.code === 'TIMEOUT' || errorMessage.includes('Timeout');
    
    // Si es timeout, retornar inmediatamente sin reintentar
    if (isTimeout) {
      console.error(`[Gemini] ⏱️ Timeout: El prompt excedió ${timeoutMs / 1000 / 60} minutos`);
      return {
        success: false,
        output: '',
        error: `Timeout: El prompt excedió el tiempo límite de ${timeoutMs / 1000 / 60} minutos`,
        apiKeyIndex: currentKeyIndex,
        timeout: true
      };
    }
    
    // Detectar diferentes tipos de errores
    const isQuotaErrorDetected = isQuotaError(fullError);
    const isSyntaxError = errorMessage.includes('SyntaxError') || errorMessage.includes('Invalid regular expression');
    const isDependencyError = errorMessage.includes('string-width') || errorMessage.includes('ink') || errorStack.includes('node_modules');
    
    // Si es un error de dependencias de Gemini CLI, intentar reintentar con delay
    if (isSyntaxError || isDependencyError) {
      const maxRetriesForDependency = 2;
      if (retryAttempt < maxRetriesForDependency) {
        const delay = (retryAttempt + 1) * 2000; // 2s, 4s, 6s...
        console.warn(`[Gemini] ⚠️ Error de dependencias detectado (${errorMessage.substring(0, 100)}). Reintentando en ${delay/1000}s... (intento ${retryAttempt + 1}/${maxRetriesForDependency})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return executeGeminiPrompt(prompt, projectDirectory, retryAttempt + 1);
      } else {
        console.error(`[Gemini] ❌ Error de dependencias persistente después de ${maxRetriesForDependency} intentos. Puede ser un problema con la versión de Node.js o Gemini CLI.`);
        console.error(`[Gemini] Detalles del error:`, errorMessage.substring(0, 200));
      }
    }
    
    // Si es un error de quota y hay más keys, rotar y reintentar
    if (isQuotaErrorDetected && retryAttempt < maxRetries - 1 && apiKeyManager.hasMoreKeys()) {
      console.warn(`[Gemini] ⚠️ Límite de cuota detectado (excepción). Rotando a siguiente key...`);
      
      const rotated = apiKeyManager.rotateToNextKey();
      
      if (rotated) {
        // Reintentar con la nueva key
        await new Promise(resolve => setTimeout(resolve, 1000));
        return executeGeminiPrompt(prompt, projectDirectory, retryAttempt + 1);
      }
    }
    
    // Si hay stderr en el error, extraerlo
    let stderrOutput = '';
    if (error.stderr) {
      stderrOutput = error.stderr.toString().trim();
    }
    if (error.stdout) {
      stderrOutput += (stderrOutput ? '\n' : '') + error.stdout.toString().trim();
    }
    
    console.error(`[Gemini] Error ejecutando prompt:`, errorMessage.substring(0, 300));
    if (stderrOutput) {
      console.error(`[Gemini] Output del comando:`, stderrOutput.substring(0, 500));
    }
    
    return {
      success: false,
      output: '',
      error: stderrOutput || errorMessage || 'Error al conectar con Gemini CLI',
      apiKeyIndex: currentKeyIndex,
      isQuotaError: isQuotaErrorDetected,
      isDependencyError: isSyntaxError || isDependencyError,
      fullError: errorMessage.substring(0, 500) // Primeros 500 caracteres del error
    };
  }
}

/**
 * Verifica que Gemini CLI esté disponible y configurado correctamente
 * @returns {Promise<{available: boolean, error?: string, apiKeysCount?: number}>}
 */
export async function verifyGeminiSetup() {
  // Verificar que hay al menos una API key configurada
  const currentApiKey = apiKeyManager.getCurrentKey();
  if (!currentApiKey) {
    return {
      available: false,
      error: 'GEMINI_API_KEY o GEMINI_API_KEYS no está configurada'
    };
  }
  
  const totalKeys = apiKeyManager.getTotalKeys();

  // Verificar que gemini está instalado
  const geminiAvailable = await checkGeminiAvailable();
  if (!geminiAvailable) {
    return {
      available: false,
      error: 'Gemini CLI no está instalado. Instala con: npm install -g @google/gemini-cli'
    };
  }

  return {
    available: true,
    apiKeysCount: totalKeys,
    currentKeyIndex: apiKeyManager.getCurrentKeyIndex()
  };
}

/**
 * Obtiene información sobre las API keys configuradas
 * @returns {Object} - Información sobre las keys
 */
export function getApiKeyInfo() {
  return {
    totalKeys: apiKeyManager.getTotalKeys(),
    currentKeyIndex: apiKeyManager.getCurrentKeyIndex(),
    hasMultipleKeys: apiKeyManager.hasMoreKeys()
  };
}
