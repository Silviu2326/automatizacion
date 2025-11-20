import axios from 'axios';

/**
 * Envía un webhook HTTP POST a la URL especificada
 * @param {string} webhookUrl - URL del webhook
 * @param {Object} payload - Datos a enviar
 * @param {string} [secret] - Secret opcional para firmar el request
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendWebhook(webhookUrl, payload, secret = null) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Gemini-Prompt-Server/1.0.0'
    };

    // Si hay un secret, añadirlo como header (o como signature si prefieres)
    if (secret) {
      headers['X-Webhook-Secret'] = secret;
    }

    console.log(`[Webhook] Enviando a ${webhookUrl}...`);

    const response = await axios.post(webhookUrl, payload, {
      headers,
      timeout: 10000, // 10 segundos de timeout
      validateStatus: (status) => status >= 200 && status < 500 // Aceptar cualquier status < 500
    });

    if (response.status >= 200 && response.status < 300) {
      console.log(`[Webhook] Enviado exitosamente (${response.status})`);
      return {
        success: true
      };
    } else {
      console.warn(`[Webhook] Respuesta no exitosa: ${response.status}`);
      return {
        success: false,
        error: `HTTP ${response.status}`
      };
    }
  } catch (error) {
    if (error.response) {
      // El servidor respondió con un código de error
      console.error(`[Webhook] Error HTTP ${error.response.status}:`, error.response.data);
      return {
        success: false,
        error: `HTTP ${error.response.status}: ${error.message}`
      };
    } else if (error.request) {
      // La petición se hizo pero no hubo respuesta
      console.error(`[Webhook] Sin respuesta del servidor:`, error.message);
      return {
        success: false,
        error: `Sin respuesta del servidor: ${error.message}`
      };
    } else {
      // Algo más falló
      console.error(`[Webhook] Error al configurar la petición:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * Envía webhook cuando un prompt individual se completa
 * @param {string} webhookUrl - URL del webhook
 * @param {string} jobId - ID del job
 * @param {string} prompt - El prompt ejecutado
 * @param {Object} result - Resultado de la ejecución
 * @param {string} [secret] - Secret opcional
 */
export async function notifyPromptCompleted(webhookUrl, jobId, prompt, result, secret = null) {
  const payload = {
    event: 'prompt.completed',
    jobId,
    prompt,
    output: result.output,
    status: result.success ? 'success' : 'failed',
    error: result.error,
    timestamp: new Date().toISOString()
  };

  return await sendWebhook(webhookUrl, payload, secret);
}

/**
 * Envía webhook cuando el job completo termina
 * @param {string} webhookUrl - URL del webhook
 * @param {string} jobId - ID del job
 * @param {Object} summary - Resumen del job
 * @param {string} [secret] - Secret opcional
 */
export async function notifyJobCompleted(webhookUrl, jobId, summary, secret = null) {
  const payload = {
    event: 'job.completed',
    jobId,
    totalPrompts: summary.total,
    completed: summary.completed,
    failed: summary.failed,
    results: summary.results,
    timestamp: new Date().toISOString()
  };

  return await sendWebhook(webhookUrl, payload, secret);
}
