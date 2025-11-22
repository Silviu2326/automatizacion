# Eliminar Todos los Jobs

## Opción 1: Eliminar el archivo (Recomendado)

### En la VM (SSH):

```bash
# 1. Detener el servidor temporalmente
pm2 stop gemini-server

# 2. Eliminar el archivo de jobs
rm ~/automatizacion/data/jobs.json

# O si prefieres solo vaciarlo (mantener el archivo pero sin jobs):
echo "[]" > ~/automatizacion/data/jobs.json

# 3. Reiniciar el servidor
pm2 start gemini-server

# 4. Verificar que está vacío
cat ~/automatizacion/data/jobs.json
```

### En tu máquina local (Windows):

```powershell
# 1. Eliminar el archivo
Remove-Item data\jobs.json -ErrorAction SilentlyContinue

# 2. Crear un archivo vacío (opcional)
New-Item -Path data\jobs.json -ItemType File -Force
Set-Content -Path data\jobs.json -Value "[]"

# 3. Reiniciar el servidor (si está corriendo)
# Ctrl+C para detener, luego npm start
```

## Opción 2: Vaciar el archivo sin eliminarlo

### En la VM:

```bash
# Vaciar el archivo (mantener la estructura pero sin jobs)
echo "[]" > ~/automatizacion/data/jobs.json

# Reiniciar PM2 para que cargue el estado vacío
pm2 restart gemini-server
```

### En Windows (PowerShell):

```powershell
Set-Content -Path data\jobs.json -Value "[]"
```

## Opción 3: Eliminar solo jobs completados (mantener activos)

Si solo quieres eliminar jobs completados pero mantener los que están en progreso:

### En la VM:

```bash
# Editar el archivo manualmente
nano ~/automatizacion/data/jobs.json

# Eliminar manualmente los objetos con "status": "completed"
# O usar jq (si está instalado):
# jq '[.[] | select(.status != "completed")]' ~/automatizacion/data/jobs.json > ~/automatizacion/data/jobs.json.tmp && mv ~/automatizacion/data/jobs.json.tmp ~/automatizacion/data/jobs.json
```

## Verificar que se eliminaron

```bash
# Ver el contenido del archivo
cat ~/automatizacion/data/jobs.json

# Debería mostrar: []
```

## Nota Importante

⚠️ **Después de eliminar los jobs, reinicia el servidor (PM2) para que cargue el estado vacío:**

```bash
pm2 restart gemini-server
```

Si no reinicias, el servidor seguirá mostrando los jobs que tenía en memoria.



