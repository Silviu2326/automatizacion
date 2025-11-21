# Solución: Jobs no se están guardando

## Problema Detectado

Los logs muestran:
- `[Queue] 🔍 Guardando: 0 job(s) en memoria` 
- Esto significa que cuando se llama a `saveJobs()`, el Map está vacío

## Posibles Causas

1. **Múltiples instancias del servidor corriendo** (gemini-s y gemini-server en logs)
2. **El job se elimina antes de guardarse**
3. **Problema de timing**: el guardado se ejecuta antes de que el job se agregue

## Solución Inmediata

### 1. Detener TODAS las instancias del servidor

```bash
# Ver todas las instancias
pm2 list

# Detener todas
pm2 stop all
pm2 delete all
```

### 2. Verificar que no hay procesos Node.js corriendo

```bash
ps aux | grep node
# Si hay procesos, matarlos:
pkill -f "node.*server.js"
```

### 3. Subir el código actualizado y reiniciar

```bash
cd ~/automatizacion
git pull origin main
pm2 start server.js --name gemini-server
pm2 save
pm2 startup  # Ejecutar el comando que te muestre
```

### 4. Verificar que solo hay UNA instancia

```bash
pm2 list
# Debe mostrar solo gemini-server
```

### 5. Probar enviando un job y ver logs

```bash
# En una terminal
pm2 logs gemini-server --lines 0

# En otra terminal o desde el navegador, envía un prompt
# Deberías ver:
# [Queue] 📝 Job XXX agregado correctamente
# [Queue] 💾 Guardando job inmediatamente
# [Queue] ✅ 1 job(s) guardado(s)
```

## Debugging

Si sigue sin funcionar:

```bash
# Ver si el archivo se está creando/modificando
watch -n 1 'ls -lh ~/automatizacion/data/jobs.json'

# O ver el contenido en tiempo real
tail -f ~/automatizacion/data/jobs.json

# Mientras envías un job desde la interfaz web
```

## Verificar el código en la VM

```bash
cd ~/automatizacion
grep -A 5 "this.jobs.set(jobId" src/queue/promptQueue.js
```

Debe mostrar que después de `this.jobs.set()` se llama a `this.saveJobs()` inmediatamente.

