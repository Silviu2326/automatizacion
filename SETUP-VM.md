# Guía Paso a Paso: Configurar la Máquina Virtual

## ✅ Lo que ya tienes:
- ✅ Máquina virtual creada (Ubuntu 24.04.3 LTS)
- ✅ Regla de firewall creada para el puerto 3000
- ✅ Repositorio en GitHub: https://github.com/Silviu2326/automatizacion.git

## 📋 Pasos a seguir:

### Paso 1: Conectarte a la VM
```bash
# Si usas Google Cloud Platform
gcloud compute ssh NOMBRE_DE_LA_VM --zone=ZONA

# O con SSH tradicional (reemplaza con tu IP pública)
ssh usuario@IP_PUBLICA_DE_LA_VM
```

### Paso 2: Actualizar el sistema
```bash
sudo apt update
sudo apt upgrade -y
```

### Paso 3: Instalar Git
```bash
sudo apt install git -y
git --version
```

### Paso 4: Configurar Git (si no lo has hecho)
```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
```

### Paso 5: Instalar Node.js
```bash
# Instalar Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalación
node --version
npm --version
```

### Paso 6: Clonar el repositorio
```bash
# Ir al directorio home
cd ~

# Clonar el repositorio
git clone https://github.com/Silviu2326/automatizacion.git

# Entrar al directorio
cd automatizacion
```

### Paso 7: Instalar dependencias del proyecto
```bash
npm install
```

### Paso 8: Instalar Gemini CLI
```bash
sudo npm install -g @google/gemini-cli
```

### Paso 9: Configurar variables de entorno
```bash
# Crear archivo .env
nano .env
```

**Contenido del archivo .env:**
```env
GEMINI_API_KEY=tu_clave_api_aqui
PORT=3000
GEMINI_MODEL=gemini-3-pro-preview
```

**Para guardar en nano:** `Ctrl+O`, luego `Enter`, luego `Ctrl+X`

### Paso 10: Obtener la IP pública de la VM
```bash
# Opción 1: Desde la VM
curl ifconfig.me

# Opción 2: Desde Google Cloud Platform
gcloud compute instances describe NOMBRE_DE_LA_VM --zone=ZONA --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

### Paso 11: Iniciar el servidor
```bash
# Opción 1: Inicio simple (se detiene al cerrar SSH)
npm start

# Opción 2: En segundo plano con PM2 (recomendado)
sudo npm install -g pm2
pm2 start server.js --name gemini-server
pm2 save
pm2 startup  # Sigue las instrucciones que te muestre
```

### Paso 12: Verificar que funciona
1. Desde tu navegador local, ve a: `http://IP_PUBLICA_DE_LA_VM:3000`
2. Deberías ver la interfaz web del servidor

## 🔍 Verificar logs (si usas PM2)
```bash
pm2 logs gemini-server
pm2 status
```

## 🛠️ Comandos útiles
```bash
# Reiniciar el servidor (si usas PM2)
pm2 restart gemini-server

# Detener el servidor
pm2 stop gemini-server

# Ver estado
pm2 status

# Ver logs en tiempo real
pm2 logs gemini-server --lines 50
```



