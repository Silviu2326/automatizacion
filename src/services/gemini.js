import { exec } from 'child_process';
import { promisify } from 'util';
import { env } from 'process';

const execAsync = promisify(exec);

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
 * Ejecuta un prompt usando Gemini CLI en modo YOLO
 * @param {string} prompt - El prompt a ejecutar
 * @param {string} [projectDirectory] - Directorio del proyecto donde ejecutar (opcional)
 * @returns {Promise<{success: boolean, output: string, error?: string}>}
 */
export async function executeGeminiPrompt(prompt, projectDirectory = null) {
  // Verificar que GEMINI_API_KEY está configurada
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY no está configurada en las variables de entorno');
  }

  try {
    // Ejecutar gemini --yolo con el prompt
    // Usar execFile o pasar argumentos directamente para evitar problemas con el shell
    const context = projectDirectory ? `en proyecto: ${projectDirectory}` : '';
    console.log(`[Gemini] Ejecutando prompt ${context}: ${prompt.substring(0, 50)}...`);

    // Configurar el directorio de trabajo si se proporciona un proyecto
    const execOptions = {
      env: {
        ...env,
        GEMINI_API_KEY: env.GEMINI_API_KEY
      },
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer para respuestas largas
    };

    // Si hay un directorio de proyecto, ejecutar el comando en ese directorio
    if (projectDirectory) {
      execOptions.cwd = projectDirectory;
      console.log(`[Gemini] Ejecutando en directorio: ${projectDirectory}`);
    }

    // Construir el comando con --yolo (necesario para ejecutar comandos)
    // Si GEMINI_MODEL está configurado, usar ese modelo específico
    let geminiCommand = 'gemini --yolo';
    
    // Agregar modelo si está configurado en variables de entorno
    const geminiModel = env.GEMINI_MODEL;
    if (geminiModel && geminiModel.trim().length > 0) {
      geminiCommand += ` --model ${geminiModel.trim()}`;
      console.log(`[Gemini] Usando modelo: ${geminiModel.trim()}`);
    }
    
    geminiCommand += ` ${JSON.stringify(prompt)}`;
    
    // Ejecutar el comando con --yolo para que ejecute comandos y cree archivos
    // Esto evita problemas con caracteres especiales en el prompt
    const { stdout, stderr } = await execAsync(
      geminiCommand,
      execOptions
    );

    const output = (stdout || '').trim();
    const errorOutput = (stderr || '').trim();

    if (output || !errorOutput) {
      return {
        success: true,
        output: output || '(No se recibió respuesta visible)',
        error: errorOutput || undefined
      };
    } else {
      return {
        success: false,
        output: output,
        error: errorOutput || 'Error desconocido al ejecutar Gemini CLI'
      };
    }
  } catch (error) {
    console.error(`[Gemini] Error ejecutando prompt:`, error.message);
    return {
      success: false,
      output: '',
      error: error.message || 'Error al conectar con Gemini CLI'
    };
  }
}

/**
 * Verifica que Gemini CLI esté disponible y configurado correctamente
 * @returns {Promise<{available: boolean, error?: string}>}
 */
export async function verifyGeminiSetup() {
  // Verificar que GEMINI_API_KEY está configurada
  if (!env.GEMINI_API_KEY) {
    return {
      available: false,
      error: 'GEMINI_API_KEY no está configurada'
    };
  }

  // Verificar que gemini está instalado
  const geminiAvailable = await checkGeminiAvailable();
  if (!geminiAvailable) {
    return {
      available: false,
      error: 'Gemini CLI no está instalado. Instala con: npm install -g @google/gemini-cli'
    };
  }

  return {
    available: true
  };
}
