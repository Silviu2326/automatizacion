import express from 'express';
import projectManager from '../services/projectManager.js';

const router = express.Router();

/**
 * GET /api/projects
 * Lista todos los proyectos
 */
router.get('/projects', (req, res) => {
  try {
    const projects = projectManager.listProjects();
    res.json({
      success: true,
      projects: projects.map(p => {
        const hasGit = projectManager.hasGitRepository(p.id);
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          githubUrl: p.githubUrl,
          directory: p.directory,
          hasGitRepository: hasGit,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          promptsCount: p.promptsCount
        };
      })
    });
  } catch (error) {
    console.error('[API] Error en GET /api/projects:', error);
    res.status(500).json({
      success: false,
      error: 'Error al listar proyectos',
      message: error.message
    });
  }
});

/**
 * GET /api/projects/:projectId
 * Obtiene un proyecto específico
 */
router.get('/projects/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const project = projectManager.getProject(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Proyecto no encontrado'
      });
    }

    res.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        githubUrl: project.githubUrl,
        directory: project.directory,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        promptsCount: project.promptsCount
      }
    });
  } catch (error) {
    console.error('[API] Error en GET /api/projects/:projectId:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener proyecto',
      message: error.message
    });
  }
});

/**
 * POST /api/projects
 * Crea un nuevo proyecto
 */
router.post('/projects', (req, res) => {
  try {
    const { name, description, githubUrl } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del proyecto es requerido'
      });
    }

    // Validar URL de GitHub si se proporciona
    if (githubUrl && githubUrl.trim().length > 0) {
      try {
        const url = new URL(githubUrl.trim());
        if (!url.hostname.includes('github.com')) {
          return res.status(400).json({
            success: false,
            error: 'La URL debe ser de GitHub (github.com)'
          });
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'La URL de GitHub no es válida'
        });
      }
    }

    const project = projectManager.createProject(name, description || '', githubUrl || '');

    res.status(201).json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        githubUrl: project.githubUrl,
        directory: project.directory,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        promptsCount: project.promptsCount
      }
    });
  } catch (error) {
    console.error('[API] Error en POST /api/projects:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear proyecto',
      message: error.message
    });
  }
});

/**
 * PUT /api/projects/:projectId
 * Actualiza un proyecto
 */
router.put('/projects/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description, githubUrl } = req.body;

    const updates = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'El nombre del proyecto debe ser un string no vacío'
        });
      }
      updates.name = name.trim();
    }

    if (description !== undefined) {
      updates.description = typeof description === 'string' ? description.trim() : '';
    }

    if (githubUrl !== undefined) {
      const urlValue = typeof githubUrl === 'string' ? githubUrl.trim() : '';
      if (urlValue.length > 0) {
        try {
          const url = new URL(urlValue);
          if (!url.hostname.includes('github.com')) {
            return res.status(400).json({
              success: false,
              error: 'La URL debe ser de GitHub (github.com)'
            });
          }
        } catch (error) {
          return res.status(400).json({
            success: false,
            error: 'La URL de GitHub no es válida'
          });
        }
      }
      updates.githubUrl = urlValue;
    }

    const project = projectManager.updateProject(projectId, updates);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Proyecto no encontrado'
      });
    }

    res.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        githubUrl: project.githubUrl,
        directory: project.directory,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        promptsCount: project.promptsCount
      }
    });
  } catch (error) {
    console.error('[API] Error en PUT /api/projects/:projectId:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar proyecto',
      message: error.message
    });
  }
});

/**
 * DELETE /api/projects/:projectId
 * Elimina un proyecto
 */
router.delete('/projects/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const deleted = projectManager.deleteProject(projectId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Proyecto no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Proyecto eliminado correctamente'
    });
  } catch (error) {
    console.error('[API] Error en DELETE /api/projects/:projectId:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar proyecto',
      message: error.message
    });
  }
});

/**
 * POST /api/projects/:projectId/clone
 * Clona el repositorio de GitHub al proyecto
 */
router.post('/projects/:projectId/clone', async (req, res) => {
  try {
    const { projectId } = req.params;
    const result = await projectManager.cloneRepository(projectId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.message
      });
    }

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('[API] Error en POST /api/projects/:projectId/clone:', error);
    res.status(500).json({
      success: false,
      error: 'Error al clonar repositorio',
      message: error.message
    });
  }
});

/**
 * GET /api/projects/:projectId/git-status
 * Verifica si el proyecto tiene un repositorio git clonado
 */
router.get('/projects/:projectId/git-status', (req, res) => {
  try {
    const { projectId } = req.params;
    const hasGit = projectManager.hasGitRepository(projectId);

    res.json({
      success: true,
      hasGitRepository: hasGit
    });
  } catch (error) {
    console.error('[API] Error en GET /api/projects/:projectId/git-status:', error);
    res.status(500).json({
      success: false,
      error: 'Error al verificar estado del repositorio',
      message: error.message
    });
  }
});

/**
 * POST /api/projects/:projectId/push
 * Sube los cambios del proyecto a GitHub
 */
router.post('/projects/:projectId/push', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { commitMessage } = req.body;
    
    const result = await projectManager.pushToGitHub(projectId, commitMessage);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.message
      });
    }

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('[API] Error en POST /api/projects/:projectId/push:', error);
    res.status(500).json({
      success: false,
      error: 'Error al subir cambios a GitHub',
      message: error.message
    });
  }
});

/**
 * GET /api/git/config
 * Verifica la configuración de Git (usuario, email)
 */
router.get('/git/config', async (req, res) => {
  try {
    const result = await projectManager.checkGitConfig();
    
    res.json(result);
  } catch (error) {
    console.error('[API] Error en GET /api/git/config:', error);
    res.status(500).json({
      success: false,
      configured: false,
      error: 'Error al verificar configuración de Git',
      message: error.message
    });
  }
});

export default router;

