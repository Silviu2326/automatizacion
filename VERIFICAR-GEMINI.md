# Verificar Gemini CLI en la VM

## Problema
El frontend muestra: **"Error: Gemini CLI no está disponible"**

## Pasos para verificar

### 1. Verificar que Gemini CLI está instalado

```bash
# Conectarte a la VM por SSH
ssh silxarsebcursor@136.112.69.137

# Verificar si gemini está instalado
gemini --version

# Si no funciona, verificar dónde está instalado Node.js
which node
which npm

# Si npm está disponible, instalar Gemini CLI
sudo npm install -g @google/gemini-cli

# Verificar la instalación
gemini --version
```

### 2. Verificar que el PATH está configurado correctamente

```bash
# Ver el PATH actual
echo $PATH

# Si node/npm están en un directorio diferente, agregar al PATH
# Por ejemplo, si están en /usr/local/bin:
export PATH=$PATH:/usr/local/bin

# Verificar que ahora funciona
gemini --version
```

### 3. Verificar variables de entorno

```bash
# Ver si las API keys están configuradas
echo $GEMINI_API_KEY
echo $GEMINI_API_KEYS

# Si no están configuradas, configurarlas:
nano ~/.bashrc

# Agregar al final del archivo:
export GEMINI_API_KEY="tu-api-key-aqui"
# O para múltiples keys:
export GEMINI_API_KEYS="key1,key2,key3"

# Si también quieres usar un modelo específico:
export GEMINI_MODEL="gemini-2.0-flash-exp"

# Guardar (Ctrl+O, Enter, Ctrl+X)
# Recargar las variables:
source ~/.bashrc

# Verificar que ahora están configuradas
echo $GEMINI_API_KEY
```

### 4. Configurar PM2 para usar las variables de entorno

```bash
# Ver el archivo de configuración actual de PM2
pm2 env 0

# Si las variables no están, necesitas reiniciar PM2 con las variables:
# Primero detener el servidor
pm2 stop gemini-server
pm2 delete gemini-server

# Reiniciar con las variables de entorno
cd ~/automatizacion
pm2 start server.js --name gemini-server --update-env
pm2 save

# Verificar que ahora tiene las variables
pm2 env 0
```

### 5. Verificar desde el código del servidor

```bash
# Ver los logs del servidor para ver qué error específico está reportando
pm2 logs gemini-server --lines 50

# Buscar mensajes como:
# - "[Gemini] Usando una sola API key"
# - "[Gemini] Configuradas X API keys"
# - "[Gemini] Advertencia: No se encontraron API keys"
# - "Gemini CLI no está instalado"
```

### 6. Probar manualmente desde la VM

```bash
# Probar ejecutar gemini manualmente con tu API key
export GEMINI_API_KEY="tu-api-key"
gemini --yolo "Hola, esto es una prueba"

# Si funciona, el problema es que PM2 no tiene acceso a las variables de entorno
# Si no funciona, el problema es con la instalación de Gemini CLI
```

## Solución rápida (si nada funciona)

```bash
# 1. Instalar Gemini CLI globalmente
sudo npm install -g @google/gemini-cli

# 2. Configurar variables de entorno en ~/.bashrc
nano ~/.bashrc
# Agregar:
export GEMINI_API_KEY="tu-api-key"
export GEMINI_API_KEYS="key1,key2"  # opcional
export GEMINI_MODEL="gemini-2.0-flash-exp"  # opcional
source ~/.bashrc

# 3. Reiniciar PM2 completamente
cd ~/automatizacion
pm2 delete all
pm2 start server.js --name gemini-server --update-env
pm2 save
pm2 startup  # Ejecutar el comando que te muestre

# 4. Verificar
pm2 logs gemini-server --lines 20
```

## Verificar desde el navegador

1. Ve a `http://136.112.69.137:3000`
2. Abre la consola del navegador (F12)
3. Haz clic en "Verificar servidor" o envia un prompt
4. Verás el error específico en la consola

## Comandos útiles

```bash
# Ver todas las variables de entorno del proceso PM2
pm2 env 0 | grep GEMINI

# Ver el PATH del proceso PM2
pm2 env 0 | grep PATH

# Ver si gemini está en el PATH
which gemini

# Ver la versión de Node.js
node --version

# Ver la versión de npm
npm --version
```



