# Cómo Verificar que la Persistencia Funciona

## Pasos para probar:

### 1. Subir los cambios a GitHub (si aún no lo has hecho)
```bash
cd ~/automatizacion
git add .
git commit -m "Agregar persistencia de jobs en JSON"
git push origin main
```

### 2. En la VM, actualizar el código
```bash
cd ~/automatizacion
git pull origin main
```

### 3. Reiniciar el servidor
```bash
pm2 restart gemini-server
```

### 4. Ver los logs para verificar que carga
```bash
pm2 logs gemini-server --lines 30
```

Deberías ver:
- `[Queue] Directorio de jobs creado: ...`
- `[Queue] X job(s) cargado(s) desde ...` (si hay jobs guardados)

### 5. Enviar un job de prueba desde la interfaz web

Ve a `http://136.112.69.137:3000` y envía un prompt simple como:
```
Crear un archivo test.txt con el texto "Hola mundo"
```

### 6. Verificar que se guardó inmediatamente
```bash
# Esperar unos segundos y luego:
cat ~/automatizacion/data/jobs.json

# Deberías ver un array con el job que acabas de crear
```

### 7. Verificar que persiste después de reiniciar
```bash
# Reiniciar el servidor
pm2 restart gemini-server

# Ver logs inmediatamente
pm2 logs gemini-server --lines 20

# Deberías ver:
# "[Queue] X job(s) cargado(s) desde ..."
```

### 8. Ver el contenido del archivo
```bash
# Ver en formato legible
cat ~/automatizacion/data/jobs.json | python3 -m json.tool
```

## Si el archivo sigue vacío:

1. **Verificar que el código se actualizó:**
   ```bash
   cd ~/automatizacion
   git log --oneline -3
   ```

2. **Ver logs en tiempo real mientras envías un job:**
   ```bash
   pm2 logs gemini-server
   ```
   Luego envía un prompt desde la interfaz web y observa los logs.

3. **Verificar que el directorio existe:**
   ```bash
   ls -la ~/automatizacion/data/
   ```

4. **Verificar permisos:**
   ```bash
   ls -l ~/automatizacion/data/jobs.json
   ```

## Debugging:

Si no funciona, agrega más logs:

```bash
# Ver todos los logs recientes
pm2 logs gemini-server --lines 100 | grep -i "queue\|job\|guardado"
```

