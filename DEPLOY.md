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

## Paso 3: Clonar en la Máquina Virtual

### 3.1. Conectarte a tu máquina virtual
Usa SSH o el método que uses para acceder a tu máquina virtual.

### 3.2. Instalar Git (si no está instalado)
```bash
# En Ubuntu/Debian
sudo apt update
sudo apt install git

# Verificar
git --version
```

### 3.3. Configurar Git en la máquina virtual
```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
```

### 3.4. Clonar el repositorio
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

### 3.5. Instalar dependencias
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

### 3.6. Configurar variables de entorno
```bash
# Crear archivo .env
cp .env.example .env

# Editar .env con tu editor favorito
nano .env
# o
vim .env
```

Agrega tu `GEMINI_API_KEY`:
```env
GEMINI_API_KEY=tu_clave_api_aqui
PORT=3000
```

### 3.7. Instalar Gemini CLI
```bash
npm install -g @google/gemini-cli
```

### 3.8. Iniciar el servidor
```bash
npm start
```

El servidor estará disponible en `http://localhost:3000` (o el puerto que configuraste).

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

