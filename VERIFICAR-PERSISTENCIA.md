# Verificar que la Persistencia de Jobs Funciona

## Pasos para verificar:

### 1. Verificar que el código se actualizó
```bash
cd ~/automatizacion
git log --oneline -5  # Ver los últimos commits
```

### 2. Reiniciar el servidor para cargar los cambios
```bash
pm2 restart gemini-server
```

### 3. Verificar que el directorio `data/` se creó
```bash
ls -la ~/automatizacion/data/
# Deberías ver: jobs.json
```

### 4. Ver los logs para confirmar
```bash
pm2 logs gemini-server --lines 30
```

Deberías ver mensajes como:
- `[Queue] Directorio de jobs creado: ...`
- `[Queue] X job(s) cargado(s) desde ...`
- `[Queue] X job(s) guardado(s) en ...`

### 5. Probar creando un job
1. Ve a `http://136.112.69.137:3000`
2. Envía un prompt de prueba
3. Verifica que se guarda:
```bash
cat ~/automatizacion/data/jobs.json
```

### 6. Probar que persiste después de reiniciar
```bash
# Reiniciar el servidor
pm2 restart gemini-server

# Ver logs
pm2 logs gemini-server --lines 20

# Deberías ver que carga los jobs guardados:
# "[Queue] X job(s) cargado(s) desde ..."
```

## Verificar el archivo de jobs

```bash
# Ver el contenido del archivo
cat ~/automatizacion/data/jobs.json

# Ver en formato legible
cat ~/automatizacion/data/jobs.json | python3 -m json.tool

# Ver tamaño del archivo
ls -lh ~/automatizacion/data/jobs.json
```

## Si no funciona

1. **Verificar que el código se actualizó:**
   ```bash
   cd ~/automatizacion
   git status
   git pull origin main
   ```

2. **Verificar que el servidor se reinició:**
   ```bash
   pm2 restart gemini-server
   pm2 logs gemini-server
   ```

3. **Verificar permisos:**
   ```bash
   ls -la ~/automatizacion/data/
   # Si no existe, crearlo manualmente:
   mkdir -p ~/automatizacion/data
   chmod 755 ~/automatizacion/data
   ```

