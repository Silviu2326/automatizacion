# Solución de Problemas

## Error: "SyntaxError: Invalid regular expression flags"

Este error ocurre porque **Gemini CLI requiere Node.js 20+** pero estás usando una versión anterior. El flag de regex `/v` solo está disponible en Node.js 20+.

### Solución: Actualizar Node.js a versión 20 o superior (OBLIGATORIO)

```bash
# 1. Detener el servidor
pm2 stop gemini-server

# 2. Actualizar Node.js a versión 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Verificar la versión (debe ser 20.x o superior)
node --version
npm --version

# 4. Reinstalar Gemini CLI
sudo npm uninstall -g @google/gemini-cli
sudo npm cache clean --force
sudo npm install -g @google/gemini-cli@latest

# 5. Verificar que Gemini CLI funciona
gemini --version

# 6. Reinstalar dependencias del proyecto (si es necesario)
cd ~/automatizacion
npm install

# 7. Reiniciar el servidor
pm2 restart gemini-server

# 8. Ver logs
pm2 logs gemini-server
```

### Soluciones Alternativas (si no puedes actualizar Node.js):

#### Solución 1: Actualizar Gemini CLI (puede no funcionar si usa Node 20+)

```bash
# Desinstalar la versión actual
sudo npm uninstall -g @google/gemini-cli

# Limpiar cache de npm
npm cache clean --force

# Instalar la última versión
sudo npm install -g @google/gemini-cli@latest

# Verificar la versión
gemini --version
```

#### Solución 2: Verificar versión de Node.js

Gemini CLI requiere Node.js 18+. Verifica tu versión:

```bash
node --version
```

Si tienes una versión anterior a 18, actualiza:

```bash
# En Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Solución 3: Reinstalar dependencias globales

```bash
# Reinstalar Gemini CLI con versión específica
sudo npm install -g @google/gemini-cli@latest --force

# O intentar con una versión anterior estable
sudo npm install -g @google/gemini-cli@1.0.0
```

#### Solución 4: Usar npx en lugar de instalación global

Si el problema persiste, puedes modificar el código para usar `npx`:

```bash
# En lugar de usar 'gemini' directamente, usar 'npx @google/gemini-cli'
```

## El sistema ahora tiene reintentos automáticos

El código ha sido actualizado para:
- ✅ Detectar automáticamente errores de dependencias
- ✅ Reintentar automáticamente con delays progresivos (2s, 4s, 6s)
- ✅ Mostrar logs más detallados del error
- ✅ Continuar procesando otros prompts aunque uno falle

## Ver logs detallados

```bash
pm2 logs gemini-server --lines 100
```

Busca mensajes como:
- `⚠️ Error de dependencias detectado`
- `Reintentando en Xs...`

## Si el problema persiste

1. **Actualiza Node.js a la versión más reciente:**
   ```bash
   node --version  # Debe ser 18.x o superior
   ```

2. **Reinstala Gemini CLI completamente:**
   ```bash
   sudo npm uninstall -g @google/gemini-cli
   sudo npm install -g @google/gemini-cli@latest
   ```

3. **Verifica que funciona directamente:**
   ```bash
   gemini --version
   gemini --help
   ```

4. **Si sigue fallando, reporta el error completo:**
   ```bash
   pm2 logs gemini-server > error-log.txt
   ```

