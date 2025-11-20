# Guía para Subir el Proyecto a GitHub y Desplegarlo en la Máquina Virtual

Esta guía te ayudará a subir el proyecto a GitHub y luego clonarlo en tu máquina virtual.

## Paso 1: Preparar el Proyecto Localmente

### 1.1. Verificar que Git está instalado
```bash
git --version
```

Si no está instalado, instálalo desde [git-scm.com](https://git-scm.com/)

### 1.2. Configurar Git (si no lo has hecho)
```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
```

### 1.3. Inicializar el repositorio Git
```bash
# En la raíz del proyecto (maquinavirtual)
git init
```

### 1.4. Agregar todos los archivos
```bash
git add .
```

### 1.5. Hacer el primer commit
```bash
git commit -m "Initial commit: Gemini Prompt Server con gestión de proyectos"
```

## Paso 2: Crear el Repositorio en GitHub

### 2.1. Crear un nuevo repositorio
1. Ve a [GitHub.com](https://github.com) e inicia sesión
2. Haz clic en el botón **"+"** (arriba a la derecha) → **"New repository"**
3. Nombre del repositorio: `gemini-prompt-server` (o el que prefieras)
4. Descripción: "Servidor Node.js para ejecutar prompts con Gemini CLI"
5. Elige **Público** o **Privado** según prefieras
6. **NO** marques "Initialize with README" (ya tenemos archivos)
7. Haz clic en **"Create repository"**

### 2.2. Conectar el repositorio local con GitHub
GitHub te mostrará comandos. Usa estos (reemplaza `TU_USUARIO` y `TU_REPO`):

```bash
# Agregar el remote
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git

# O si prefieres usar SSH (requiere configurar SSH keys):
# git remote add origin git@github.com:TU_USUARIO/TU_REPO.git
```

### 2.3. Subir el código
```bash
# Cambiar a la rama main (si estás en master)
git branch -M main

# Subir el código
git push -u origin main
```

**Nota sobre autenticación:**
- Si GitHub te pide usuario y contraseña, usa tu **Personal Access Token (PAT)** como contraseña
- Para crear un PAT: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
- Permisos necesarios: `repo` (acceso completo a repositorios)

## Paso 3: Configurar la Máquina Virtual

### 3.1. Recomendaciones de Configuración de la VM

**Sistema Operativo:**
- **Ubuntu 24.04 LTS (Noble Numbat)** - **RECOMENDADO** ⭐
  - Versión más reciente LTS (soporte hasta 2029)
  - Mejor rendimiento y seguridad
  - Compatible con Node.js 18+
  
- **Ubuntu 22.04 LTS (Jammy Jellyfish)** - Alternativa
  - Muy estable y probada
  - Soporte hasta 2027
  
- **Versión:** Elige **"Ubuntu 24.04 Minimal"** o **"Ubuntu Server"** (sin interfaz gráfica)
  - Solo línea de comandos (CLI)
  - Menor consumo de recursos
  - Ideal para servidores

**Especificaciones Recomendadas:**
- **RAM:** Mínimo 2 GB, recomendado 4 GB
- **Disco:** Mínimo 20 GB, recomendado 100 GB (para proyectos y dependencias)
- **CPU:** 1-2 vCPUs es suficiente para desarrollo
- **Red:** IP pública o configuración de NAT para acceso externo

**Configuración de Red:**
- Asegúrate de que la VM tenga una **IP pública** o configura **port forwarding**
- Si usas Google Cloud Platform, configura una **regla de firewall** para permitir tráfico HTTP/HTTPS en el puerto que uses (ej: 3000)

### 3.2. Configuración de Redes en la Consola

Al crear la VM, en la sección **"Redes"** (Networks), configura lo siguiente:

**Firewall:**
- ✅ **Marca "Permitir tráfico HTTP"** - Esto permite acceso desde Internet al puerto 80
- ✅ **Marca "Permitir tráfico HTTPS"** - Esto permite acceso al puerto 443 (útil si más adelante usas SSL)
- ⚠️ **Nota:** Estas reglas solo permiten puertos 80 y 443. Para el puerto 3000, necesitarás crear una regla personalizada después (ver sección 3.9)

**Interfaces de red:**
- Deja la configuración por defecto (nic0 con la red "default")
- Asegúrate de que tenga **"IPv4"** habilitado
- Si quieres una IP pública estática, puedes configurarla después en la sección de IPs externas

**Otras opciones:**
- **Etiquetas de red:** Déjalo vacío (opcional, para organización)
- **Nombre de host:** Déjalo por defecto o pon un nombre personalizado (ej: `gemini-server`)
- **Reenvío de IP:** No marques (solo si necesitas que la VM actúe como router)

### 3.2. Conectarte a tu máquina virtual
Usa SSH para acceder a tu máquina virtual:

```bash
# Ejemplo con Google Cloud Platform
gcloud compute ssh NOMBRE_DE_LA_VM --zone=ZONA

# O con SSH tradicional
ssh usuario@IP_PUBLICA_DE_LA_VM
```

### 3.3. Instalar Git (si no está instalado)
```bash
# En Ubuntu/Debian
sudo apt update
sudo apt install git

# Verificar
git --version
```

### 3.4. Configurar Git en la máquina virtual
```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
```

### 3.5. Clonar el repositorio
```bash
# Navegar al directorio donde quieres clonar (ej: ~/proyectos)
cd ~/proyectos

# Clonar el repositorio
git clone https://github.com/TU_USUARIO/TU_REPO.git

# O con SSH:
# git clone git@github.com:TU_USUARIO/TU_REPO.git

# Entrar al directorio
cd TU_REPO
```

### 3.6. Instalar dependencias
```bash
# Instalar Node.js si no está instalado
# En Ubuntu/Debian:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalación
node --version
npm --version

# Instalar dependencias del proyecto
npm install
```

### 3.7. Configurar variables de entorno
```bash
# Crear archivo .env
cp .env.example .env

# Editar .env con tu editor favorito
nano .env
# o
vim .env
```

Agrega tu configuración (mínimo `GEMINI_API_KEY`):
```env
GEMINI_API_KEY=tu_clave_api_aqui
PORT=3000

# Opcional: Especificar modelo de Gemini
# Si quieres usar gemini-3-pro-preview u otro modelo específico:
GEMINI_MODEL=gemini-3-pro-preview
```

**Nota sobre GEMINI_MODEL:**
- Si no especificas `GEMINI_MODEL`, se usará el modelo por defecto de Gemini CLI
- Si quieres usar un modelo específico como `gemini-3-pro-preview`, agrégalo al `.env`
- El sistema siempre usa `--yolo` para ejecutar comandos y crear archivos

### 3.8. Instalar Gemini CLI
```bash
npm install -g @google/gemini-cli
```

### 3.8. Configurar Firewall para Acceso Externo

Para poder acceder al frontend desde tu máquina local, necesitas abrir el puerto en el firewall:

**En Google Cloud Platform:**
```bash
# Crear regla de firewall para permitir tráfico HTTP en el puerto 3000
gcloud compute firewall-rules create allow-gemini-server \
    --allow tcp:3000 \
    --source-ranges 0.0.0.0/0 \
    --description "Permitir acceso al servidor Gemini Prompt"
```

**O desde la consola web de GCP:**
1. Ve a **VPC network** → **Firewall**
2. Clic en **Create Firewall Rule**
3. Nombre: `allow-gemini-server`
4. Direction: **Ingress**
5. Targets: **All instances in the network**
6. Source IP ranges: `0.0.0.0/0` (o tu IP específica para más seguridad)
7. Protocols and ports: **TCP** → `3000`
8. Crear

**En otras plataformas (AWS, Azure, etc.):**
- Configura las reglas de seguridad del grupo/NSG para permitir tráfico entrante en el puerto 3000 (o el que uses)

### 3.9. Iniciar el servidor

```bash
npm start
```

El servidor estará disponible en:
- **Localmente en la VM:** `http://localhost:3000`
- **Desde tu máquina local:** `http://IP_PUBLICA_DE_LA_VM:3000`

**Obtener la IP pública de tu VM:**
```bash
# En Google Cloud Platform
gcloud compute instances describe NOMBRE_DE_LA_VM --zone=ZONA --format='get(networkInterfaces[0].accessConfigs[0].natIP)'

# O desde la consola web de GCP, ve a Compute Engine → VM instances
```

### 3.10. Ejecutar el servidor en segundo plano (Opcional)

Para que el servidor siga ejecutándose después de cerrar la sesión SSH:

**Opción 1: Usar `nohup`**
```bash
nohup npm start > server.log 2>&1 &
```

**Opción 2: Usar `screen` o `tmux`**
```bash
# Instalar screen
sudo apt install screen

# Crear una sesión screen
screen -S gemini-server

# Iniciar el servidor
npm start

# Desconectar: Ctrl+A, luego D
# Reconectar: screen -r gemini-server
```

**Opción 3: Usar PM2 (Recomendado para producción)**
```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Iniciar el servidor con PM2
pm2 start server.js --name gemini-server

# Ver estado
pm2 status

# Ver logs
pm2 logs gemini-server

# Reiniciar
pm2 restart gemini-server

# Detener
pm2 stop gemini-server

# Configurar para iniciar automáticamente al reiniciar la VM
pm2 startup
pm2 save
```

## Paso 4: Actualizar el Proyecto en la Máquina Virtual

Cuando hagas cambios en tu máquina local y los subas a GitHub:

```bash
# En tu máquina local
git add .
git commit -m "Descripción de los cambios"
git push origin main
```

Luego en la máquina virtual:

```bash
# En la máquina virtual
cd ~/proyectos/TU_REPO
git pull origin main
npm install  # Si hay nuevas dependencias
npm start    # Reiniciar el servidor
```

## Solución de Problemas

### Error: "Permission denied" al hacer push
- Verifica que estás usando un Personal Access Token (PAT) como contraseña
- O configura SSH keys en GitHub

### Error: "Git no está instalado" en la máquina virtual
```bash
sudo apt update && sudo apt install git
```

### Error: "Node.js no está instalado" en la máquina virtual
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### El servidor no inicia
- Verifica que el puerto no esté en uso: `lsof -i :3000`
- Verifica que el archivo `.env` existe y tiene `GEMINI_API_KEY`
- Revisa los logs del servidor

## Alternativa: Usar Script de Despliegue

Puedes crear un script `deploy.sh` en la máquina virtual:

```bash
#!/bin/bash
cd ~/proyectos/TU_REPO
git pull origin main
npm install
npm start
```

Hazlo ejecutable:
```bash
chmod +x deploy.sh
```

Y ejecútalo cuando quieras actualizar:
```bash
./deploy.sh
```

