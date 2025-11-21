# Verificar y Configurar el Servidor para Inicio Automático

## Problema: El servidor se detiene al reiniciar la VM

Si el servidor se detiene cuando reinicias la VM o cierras SSH, necesitas configurar PM2 para que inicie automáticamente.

## Pasos para verificar y configurar:

### 1. Conectarte por SSH
```bash
gcloud compute ssh NOMBRE_DE_LA_VM --zone=ZONA
# O
ssh usuario@136.112.69.137
```

### 2. Verificar el estado actual de PM2
```bash
pm2 status
```

**Si el servidor NO está corriendo:**
```bash
cd ~/automatizacion
pm2 start server.js --name gemini-server
pm2 save
```

### 3. Configurar PM2 para iniciar automáticamente al reiniciar la VM
```bash
# Esto creará un script de inicio automático
pm2 startup

# Te mostrará un comando como este (EJECÚTALO):
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u silxarsebcursor --hp /home/silxarsebcursor

# Guardar la lista actual de procesos
pm2 save
```

### 4. Verificar que está configurado correctamente
```bash
# Ver estado
pm2 status

# Ver logs
pm2 logs gemini-server --lines 20

# Verificar que el servicio systemd existe
sudo systemctl status pm2-silxarsebcursor
```

### 5. Probar reiniciando la VM (opcional)
```bash
# Si quieres probar que funciona
sudo reboot
```

Después de reiniciar, el servidor debería iniciar automáticamente.

## Si los jobs desaparecieron

Los jobs están en memoria y se pierden al reiniciar el servidor. Esto es normal:
- Los jobs en progreso se perderán si el servidor se reinicia
- Los jobs completados también desaparecen (están solo en memoria)

**Solución futura:** Los jobs se guardan en memoria del proceso. Si necesitas persistencia, sería necesario guardarlos en base de datos o archivo.

## Verificar que el servidor responde

```bash
# Desde la VM
curl http://localhost:3000/api/health

# O desde tu máquina local
curl http://136.112.69.137:3000/api/health
```

## Comandos útiles de PM2

```bash
# Ver estado
pm2 status

# Reiniciar el servidor
pm2 restart gemini-server

# Ver logs en tiempo real
pm2 logs gemini-server

# Ver solo últimas 50 líneas
pm2 logs gemini-server --lines 50

# Detener el servidor
pm2 stop gemini-server

# Eliminar del PM2 (NO lo hagas a menos que quieras reinstalar)
pm2 delete gemini-server
```

