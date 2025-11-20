import { existsSync, mkdirSync, writeFileSync, readdirSync, unlinkSync, renameSync, rmdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Gestor de proyectos
 * Cada proyecto tiene su propio directorio donde Gemini CLI puede crear archivos
 */
class ProjectManager {
  constructor() {
    this.projectsDir = join(process.cwd(), 'projects');
    this.projectsFile = join(this.projectsDir, 'projects.json');
    this.projects = new Map(); // projectId -> project data
    
    // Asegurar que el directorio de proyectos existe
    this.ensureProjectsDir();
    
    // Cargar proyectos existentes desde el archivo JSON
    this.loadProjects();
  }

  /**
   * Asegura que el directorio de proyectos existe
   */
  ensureProjectsDir() {
    if (!existsSync(this.projectsDir)) {
      mkdirSync(this.projectsDir, { recursive: true });
      console.log(`[Projects] Directorio de proyectos creado: ${this.projectsDir}`);
    }
  }

  /**
   * Crea un nuevo proyecto
   * @param {string} name - Nombre del proyecto
   * @param {string} description - Descripción opcional
   * @param {string} githubUrl - URL de GitHub opcional
   * @returns {Object} - Datos del proyecto creado
   */
  createProject(name, description = '', githubUrl = '') {
    const projectId = this.generateProjectId(name);
    const projectDir = join(this.projectsDir, projectId);

    // Crear directorio del proyecto
    if (!existsSync(projectDir)) {
      mkdirSync(projectDir, { recursive: true });
    }

    const project = {
      id: projectId,
      name: name.trim(),
      description: description.trim(),
      githubUrl: githubUrl.trim(),
      directory: projectDir,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      promptsCount: 0
    };

    // Crear un archivo .gitkeep para mantener el directorio en git (opcional)
    try {
      writeFileSync(join(projectDir, '.gitkeep'), '');
    } catch (error) {
      // Ignorar error si no se puede crear el archivo
    }

    this.projects.set(projectId, project);
    console.log(`[Projects] Proyecto creado: ${project.name} (${projectId})`);

    // Guardar en archivo JSON
    this.saveProjects();

    return project;
  }

  /**
   * Genera un ID único para el proyecto basado en el nombre
   * @param {string} name - Nombre del proyecto
   * @returns {string} - ID del proyecto
   */
  generateProjectId(name) {
    const timestamp = Date.now();
    const sanitized = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${sanitized}-${timestamp}`;
  }

  /**
   * Obtiene un proyecto por ID
   * @param {string} projectId - ID del proyecto
   * @returns {Object|null} - Datos del proyecto o null si no existe
   */
  getProject(projectId) {
    return this.projects.get(projectId) || null;
  }

  /**
   * Lista todos los proyectos
   * @returns {Array} - Lista de proyectos
   */
  listProjects() {
    return Array.from(this.projects.values()).sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  /**
   * Actualiza un proyecto
   * @param {string} projectId - ID del proyecto
   * @param {Object} updates - Campos a actualizar
   * @returns {Object|null} - Proyecto actualizado o null si no existe
   */
  updateProject(projectId, updates) {
    const project = this.projects.get(projectId);
    if (!project) {
      return null;
    }

    Object.assign(project, updates, {
      updatedAt: new Date().toISOString()
    });

    this.projects.set(projectId, project);
    
    // Guardar en archivo JSON
    this.saveProjects();
    
    return project;
  }

  /**
   * Elimina un proyecto
   * @param {string} projectId - ID del proyecto
   * @returns {boolean} - True si se eliminó, false si no existía
   */
  deleteProject(projectId) {
    const project = this.projects.get(projectId);
    if (!project) {
      return false;
    }

    this.projects.delete(projectId);
    console.log(`[Projects] Proyecto eliminado: ${project.name} (${projectId})`);
    
    // Guardar en archivo JSON
    this.saveProjects();
    
    return true;
  }

  /**
   * Obtiene la ruta del directorio de un proyecto
   * @param {string} projectId - ID del proyecto
   * @returns {string|null} - Ruta del directorio o null si no existe
   */
  getProjectDirectory(projectId) {
    const project = this.projects.get(projectId);
    return project ? project.directory : null;
  }

  /**
   * Verifica si un proyecto tiene un repositorio git clonado
   * @param {string} projectId - ID del proyecto
   * @returns {boolean} - True si tiene un repositorio git
   */
  hasGitRepository(projectId) {
    const project = this.projects.get(projectId);
    if (!project) {
      return false;
    }

    const gitDir = join(project.directory, '.git');
    return existsSync(gitDir);
  }

  /**
   * Clona un repositorio de GitHub al directorio del proyecto
   * @param {string} projectId - ID del proyecto
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async cloneRepository(projectId) {
    const project = this.projects.get(projectId);
    if (!project) {
      return {
        success: false,
        message: 'Proyecto no encontrado'
      };
    }

    if (!project.githubUrl || project.githubUrl.trim().length === 0) {
      return {
        success: false,
        message: 'El proyecto no tiene una URL de GitHub configurada'
      };
    }

    // Verificar si ya tiene un repositorio git
    if (this.hasGitRepository(projectId)) {
      return {
        success: false,
        message: 'El repositorio ya está clonado en este proyecto'
      };
    }

    try {
      // Verificar que git está instalado
      try {
        await execAsync('git --version');
      } catch (error) {
        return {
          success: false,
          message: 'Git no está instalado. Por favor, instala Git primero.'
        };
      }

      // Clonar el repositorio
      console.log(`[Projects] Clonando repositorio ${project.githubUrl} en ${project.directory}`);
      
      // Verificar si el directorio está vacío (solo tiene .gitkeep o está vacío)
      const files = readdirSync(project.directory).filter(f => f !== '.gitkeep');
      const gitkeepPath = join(project.directory, '.gitkeep');
      
      if (files.length === 0) {
        // Directorio vacío o solo con .gitkeep, clonar directamente
        // Eliminar .gitkeep si existe antes de clonar
        if (existsSync(gitkeepPath)) {
          try {
            unlinkSync(gitkeepPath);
          } catch (e) {
            // Ignorar error si no se puede eliminar
          }
        }
        
        // Clonar directamente en el directorio (debe estar vacío)
        await execAsync(`git clone "${project.githubUrl}" "${project.directory}"`, {
          cwd: process.cwd(),
          timeout: 120000 // 120 segundos timeout para repositorios grandes
        });
      } else {
        // El directorio tiene archivos, clonar en un directorio temporal y mover
        const tempDir = join(project.directory, 'temp-clone-' + Date.now());
        await execAsync(`git clone "${project.githubUrl}" "${tempDir}"`, {
          cwd: process.cwd(),
          timeout: 120000
        });
        
        // Mover el contenido del clone temporal al directorio del proyecto
        const clonedFiles = readdirSync(tempDir);
        
        for (const file of clonedFiles) {
          const sourcePath = join(tempDir, file);
          const destPath = join(project.directory, file);
          // Solo mover si no existe ya
          if (!existsSync(destPath)) {
            renameSync(sourcePath, destPath);
          }
        }
        
        // Eliminar directorio temporal
        try {
          rmdirSync(tempDir);
        } catch (e) {
          // Ignorar error si no se puede eliminar
        }
      }

      console.log(`[Projects] Repositorio clonado exitosamente en ${project.directory}`);
      
      return {
        success: true,
        message: 'Repositorio clonado exitosamente'
      };
    } catch (error) {
      console.error(`[Projects] Error clonando repositorio:`, error);
      return {
        success: false,
        message: `Error al clonar repositorio: ${error.message}`
      };
    }
  }

  /**
   * Sube los cambios del proyecto a GitHub
   * @param {string} projectId - ID del proyecto
   * @param {string} commitMessage - Mensaje del commit (opcional)
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async pushToGitHub(projectId, commitMessage = '') {
    const project = this.projects.get(projectId);
    if (!project) {
      return {
        success: false,
        message: 'Proyecto no encontrado'
      };
    }

    // Verificar si tiene un repositorio git
    if (!this.hasGitRepository(projectId)) {
      return {
        success: false,
        message: 'El proyecto no tiene un repositorio git clonado'
      };
    }

    if (!project.githubUrl || project.githubUrl.trim().length === 0) {
      return {
        success: false,
        message: 'El proyecto no tiene una URL de GitHub configurada'
      };
    }

    try {
      // Verificar que git está instalado
      try {
        await execAsync('git --version');
      } catch (error) {
        return {
          success: false,
          message: 'Git no está instalado. Por favor, instala Git primero.'
        };
      }

      const projectDir = project.directory;
      const defaultCommitMessage = commitMessage.trim() || `Actualización automática - ${new Date().toISOString()}`;

      console.log(`[Projects] Subiendo cambios a GitHub para proyecto ${project.name} (${projectId})`);

      // Verificar si hay cambios para commitear
      try {
        const { stdout: statusOutput } = await execAsync('git status --porcelain', {
          cwd: projectDir,
          timeout: 30000
        });

        if (!statusOutput || statusOutput.trim().length === 0) {
          // Verificar si hay commits locales que no se han subido
          try {
            const { stdout: branchOutput } = await execAsync('git rev-parse --abbrev-ref HEAD', {
              cwd: projectDir,
              timeout: 30000
            });
            const branch = branchOutput.trim();

            const { stdout: aheadOutput } = await execAsync(`git rev-list --count origin/${branch}..HEAD`, {
              cwd: projectDir,
              timeout: 30000
            }).catch(() => ({ stdout: '0' }));

            const aheadCount = parseInt(aheadOutput.trim()) || 0;

            if (aheadCount === 0) {
              return {
                success: true,
                message: 'No hay cambios para subir. El repositorio está actualizado.'
              };
            }
          } catch (error) {
            // Si no hay remote configurado, intentar hacer push de todos modos
            console.log('[Projects] No se pudo verificar commits locales, continuando...');
          }
        }

        // Agregar todos los archivos
        await execAsync('git add -A', {
          cwd: projectDir,
          timeout: 30000
        });

        // Hacer commit
        await execAsync(`git commit -m "${defaultCommitMessage.replace(/"/g, '\\"')}"`, {
          cwd: projectDir,
          timeout: 30000
        }).catch(async (error) => {
          // Si el commit falla porque no hay cambios, verificar si hay commits para push
          if (error.message.includes('nothing to commit')) {
            console.log('[Projects] No hay cambios para commitear, verificando si hay commits para push...');
            // Continuar con el push si hay commits locales
          } else {
            throw error;
          }
        });

        // Obtener la rama actual
        const { stdout: branchOutput } = await execAsync('git rev-parse --abbrev-ref HEAD', {
          cwd: projectDir,
          timeout: 30000
        });
        const branch = branchOutput.trim();

        // Hacer push
        try {
          await execAsync(`git push origin ${branch}`, {
            cwd: projectDir,
            timeout: 120000 // 120 segundos timeout para push
          });

          console.log(`[Projects] Cambios subidos exitosamente a GitHub para proyecto ${project.name}`);
          
          return {
            success: true,
            message: 'Cambios subidos exitosamente a GitHub'
          };
        } catch (pushError) {
          // Manejar errores de autenticación
          const errorMessage = pushError.message || pushError.stderr || '';
          
          if (errorMessage.includes('Authentication failed') || 
              errorMessage.includes('Permission denied') ||
              errorMessage.includes('fatal: could not read Username') ||
              errorMessage.includes('fatal: could not read Password')) {
            return {
              success: false,
              message: 'Error de autenticación con GitHub. Necesitas configurar tus credenciales de Git:\n\n' +
                       '1. Configura tu usuario y email:\n' +
                       '   git config --global user.name "Tu Nombre"\n' +
                       '   git config --global user.email "tu@email.com"\n\n' +
                       '2. Para autenticación, puedes usar:\n' +
                       '   - Personal Access Token (PAT) en la URL del repositorio\n' +
                       '   - SSH keys configuradas\n' +
                       '   - Git Credential Manager\n\n' +
                       'Error: ' + errorMessage
            };
          }
          
          if (errorMessage.includes('remote: Invalid username or password') ||
              errorMessage.includes('remote: Support for password authentication was removed')) {
            return {
              success: false,
              message: 'GitHub ya no acepta contraseñas. Necesitas usar un Personal Access Token (PAT):\n\n' +
                       '1. Ve a GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)\n' +
                       '2. Genera un nuevo token con permisos "repo"\n' +
                       '3. Usa el token como contraseña cuando Git lo solicite, o actualiza la URL del repositorio:\n' +
                       '   https://TU_TOKEN@github.com/usuario/repo.git\n\n' +
                       'Error: ' + errorMessage
            };
          }
          
          throw pushError;
        }
      } catch (error) {
        // Si hay un error específico de git, intentar hacer push de commits existentes
        if (error.message.includes('nothing to commit') || error.message.includes('no changes')) {
          try {
            const { stdout: branchOutput } = await execAsync('git rev-parse --abbrev-ref HEAD', {
              cwd: projectDir,
              timeout: 30000
            });
            const branch = branchOutput.trim();

            await execAsync(`git push origin ${branch}`, {
              cwd: projectDir,
              timeout: 120000
            });

            return {
              success: true,
              message: 'Commits existentes subidos exitosamente a GitHub'
            };
          } catch (pushError) {
            return {
              success: false,
              message: `Error al subir cambios: ${pushError.message}`
            };
          }
        }
        throw error;
      }
    } catch (error) {
      console.error(`[Projects] Error subiendo cambios a GitHub:`, error);
      const errorMessage = error.message || error.stderr || 'Error desconocido';
      return {
        success: false,
        message: `Error al subir cambios a GitHub: ${errorMessage}`
      };
    }
  }

  /**
   * Verifica la configuración de Git (usuario, email)
   * @returns {Promise<{success: boolean, configured: boolean, user?: string, email?: string, message?: string}>}
   */
  async checkGitConfig() {
    try {
      // Verificar que git está instalado
      try {
        await execAsync('git --version');
      } catch (error) {
        return {
          success: false,
          configured: false,
          message: 'Git no está instalado. Por favor, instala Git primero.'
        };
      }

      let userName = '';
      let userEmail = '';

      try {
        const { stdout: nameOutput } = await execAsync('git config --global user.name', {
          timeout: 5000
        });
        userName = nameOutput.trim();
      } catch (error) {
        // Usuario no configurado
      }

      try {
        const { stdout: emailOutput } = await execAsync('git config --global user.email', {
          timeout: 5000
        });
        userEmail = emailOutput.trim();
      } catch (error) {
        // Email no configurado
      }

      const isConfigured = userName.length > 0 && userEmail.length > 0;

      return {
        success: true,
        configured: isConfigured,
        user: userName || null,
        email: userEmail || null,
        message: isConfigured 
          ? `Git configurado: ${userName} <${userEmail}>`
          : 'Git no está completamente configurado. Falta usuario o email.'
      };
    } catch (error) {
      console.error('[Projects] Error verificando configuración de Git:', error);
      return {
        success: false,
        configured: false,
        message: `Error al verificar configuración: ${error.message}`
      };
    }
  }

  /**
   * Guarda los proyectos en un archivo JSON
   */
  saveProjects() {
    try {
      const projectsArray = Array.from(this.projects.values());
      writeFileSync(this.projectsFile, JSON.stringify(projectsArray, null, 2), 'utf8');
      console.log(`[Projects] Proyectos guardados en ${this.projectsFile}`);
    } catch (error) {
      console.error('[Projects] Error guardando proyectos:', error);
    }
  }

  /**
   * Carga proyectos existentes desde el archivo JSON y también busca en directorios
   */
  loadProjects() {
    try {
      let loadedCount = 0;
      
      // Primero, intentar cargar desde el archivo JSON si existe
      if (existsSync(this.projectsFile)) {
        const fileContent = readFileSync(this.projectsFile, 'utf8');
        const projectsArray = JSON.parse(fileContent);
        
        // Cargar proyectos en el Map
        for (const project of projectsArray) {
          // Asegurar que el directorio del proyecto existe
          if (existsSync(project.directory)) {
            this.projects.set(project.id, project);
            loadedCount++;
          } else {
            // Si el directorio no existe, recrearlo
            mkdirSync(project.directory, { recursive: true });
            // Crear .gitkeep si no tiene git
            const gitDir = join(project.directory, '.git');
            if (!existsSync(gitDir)) {
              writeFileSync(join(project.directory, '.gitkeep'), '');
            }
            this.projects.set(project.id, project);
            loadedCount++;
          }
        }
        
        if (loadedCount > 0) {
          console.log(`[Projects] ${loadedCount} proyecto(s) cargado(s) desde ${this.projectsFile}`);
        }
      }
      
      // También buscar proyectos basándose en directorios existentes que no estén en el JSON
      // Esto ayuda a recuperar proyectos si el JSON se perdió
      if (existsSync(this.projectsDir)) {
        const dirs = readdirSync(this.projectsDir, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);
        
        for (const dirName of dirs) {
          const projectDir = join(this.projectsDir, dirName);
          const projectId = dirName;
          
          // Si el proyecto no está ya cargado, intentar reconstruirlo desde el directorio
          if (!this.projects.has(projectId)) {
            // Intentar obtener información del proyecto desde un archivo de metadatos o usar defaults
            const project = {
              id: projectId,
              name: dirName.split('-').slice(0, -1).join('-') || dirName, // Nombre sin timestamp
              description: '',
              githubUrl: '',
              directory: projectDir,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              promptsCount: 0
            };
            
            this.projects.set(projectId, project);
            console.log(`[Projects] Proyecto reconstruido desde directorio: ${project.name} (${projectId})`);
          }
        }
        
        // Guardar todos los proyectos (incluyendo los reconstruidos) en el JSON
        if (this.projects.size > 0) {
          this.saveProjects();
        }
      }
      
      if (this.projects.size === 0) {
        console.log('[Projects] No hay proyectos existentes. Se creará uno nuevo al crear el primer proyecto.');
      }
    } catch (error) {
      console.error('[Projects] Error cargando proyectos:', error);
      // Si hay error, continuar sin proyectos cargados
    }
  }
}

// Instancia singleton
const projectManager = new ProjectManager();

export default projectManager;
