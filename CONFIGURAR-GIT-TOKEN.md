# Configurar Personal Access Token (PAT) para GitHub

## Problema
GitHub ya no acepta contraseñas para autenticación. Necesitas usar un **Personal Access Token (PAT)**.

## Solución Rápida

### Paso 1: Crear un Personal Access Token en GitHub

1. Ve a GitHub.com e inicia sesión
2. Haz clic en tu **avatar** (arriba derecha) → **Settings**
3. En el menú lateral izquierdo, ve a **Developer settings** (al final)
4. Haz clic en **Personal access tokens** → **Tokens (classic)**
5. Haz clic en **Generate new token** → **Generate new token (classic)**
6. Configura el token:
   - **Note:** `Git Push Token` (o el nombre que prefieras)
   - **Expiration:** Elige una fecha (ej: 90 días, 1 año, o sin expiración)
   - **Scopes:** Marca **`repo`** (esto da acceso completo a repositorios)
7. Haz clic en **Generate token** (abajo)
8. **⚠️ IMPORTANTE:** Copia el token inmediatamente (ej: `ghp_xxxxxxxxxxxxxxxxxxxx`). No podrás verlo de nuevo.

### Paso 2: Configurar Git en la VM para usar el token

Tienes **3 opciones**:

#### Opción A: Actualizar la URL del remote con el token (Más fácil)

```bash
# En el directorio del proyecto clonado
cd ~/automatizacion/projects/https-github-com-silviu2326-crmcompleto-git-1

# Ver la URL actual
git remote -v

# Actualizar la URL para incluir el token
git remote set-url origin https://TU_TOKEN@github.com/Silviu2326/crmcompleto.git

# Reemplaza TU_TOKEN con tu token real (ej: ghp_xxxxxxxxxxxx)
# Ejemplo:
# git remote set-url origin https://ghp_abc123xyz@github.com/Silviu2326/crmcompleto.git
```

**Ventaja:** No necesitas escribir credenciales cada vez.

**Desventaja:** El token queda visible en la configuración de Git (aunque solo en la VM).

#### Opción B: Usar Git Credential Helper (Recomendado)

```bash
# Configurar Git para almacenar credenciales
git config --global credential.helper store

# Ahora cuando hagas push, Git te pedirá:
# Username: silviu2326
# Password: [PEGA TU TOKEN AQUÍ]

# Git guardará las credenciales automáticamente
git push origin main
```

**Ventaja:** Más seguro, el token se guarda encriptado.

**Desventaja:** Necesitas escribir el token una vez.

#### Opción C: Usar SSH Keys (Más seguro, pero más complejo)

```bash
# Generar una clave SSH
ssh-keygen -t ed25519 -C "tu@email.com"
# Presiona Enter para usar la ubicación por defecto
# Opcional: pon una contraseña para la clave

# Ver la clave pública
cat ~/.ssh/id_ed25519.pub

# Copia el contenido completo (empieza con ssh-ed25519...)

# En GitHub:
# 1. Settings → SSH and GPG keys
# 2. New SSH key
# 3. Pega la clave pública
# 4. Guarda

# Cambiar la URL del remote a SSH
git remote set-url origin git@github.com:Silviu2326/crmcompleto.git

# Ahora puedes hacer push sin token
git push origin main
```

**Ventaja:** Más seguro, no necesitas tokens.

**Desventaja:** Requiere configurar SSH keys.

### Paso 3: Probar el push

```bash
# Verificar que la configuración está bien
git remote -v

# Intentar hacer push
git push origin main
```

Si usaste la **Opción A**, el push debería funcionar automáticamente.

Si usaste la **Opción B**, Git te pedirá usuario y contraseña:
- **Username:** `silviu2326`
- **Password:** Pega tu token (no tu contraseña de GitHub)

## Para el botón "Subir cambios" en el frontend

El código ya detecta errores de autenticación y muestra mensajes útiles. Si configuras el token usando la **Opción A** o **Opción B**, el botón del frontend también funcionará automáticamente.

## Notas de Seguridad

- ⚠️ **Nunca compartas tu token** con nadie
- ⚠️ **No subas el token a GitHub** (no lo pongas en código)
- ⚠️ Si el token se compromete, revócalo inmediatamente en GitHub → Settings → Developer settings → Personal access tokens
- ✅ Usa tokens con expiración cuando sea posible
- ✅ Usa el scope mínimo necesario (`repo` para push/pull)

## Solución de Problemas

### Error: "remote: Invalid username or token"
- Verifica que el token tiene el scope `repo`
- Verifica que copiaste el token completo (empieza con `ghp_`)

### Error: "fatal: Authentication failed"
- Si usaste la Opción A, verifica que la URL tiene el formato correcto: `https://TOKEN@github.com/usuario/repo.git`
- Si usaste la Opción B, borra las credenciales guardadas y vuelve a intentar:
  ```bash
  git config --global --unset credential.helper
  git config --global credential.helper store
  ```

### El token expiró
- Genera un nuevo token en GitHub
- Actualiza la configuración con el nuevo token (Opción A) o vuelve a hacer push (Opción B)


