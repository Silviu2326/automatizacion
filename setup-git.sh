#!/bin/bash

# Script para inicializar Git y preparar el proyecto para subirlo a GitHub
# Uso: ./setup-git.sh

echo "🚀 Configurando Git para el proyecto..."

# Verificar si Git está instalado
if ! command -v git &> /dev/null; then
    echo "❌ Git no está instalado. Por favor, instálalo primero."
    exit 1
fi

# Verificar si ya existe un repositorio Git
if [ -d ".git" ]; then
    echo "⚠️  Ya existe un repositorio Git en este directorio."
    read -p "¿Deseas continuar de todos modos? (s/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 1
    fi
else
    # Inicializar Git
    echo "📦 Inicializando repositorio Git..."
    git init
fi

# Verificar configuración de Git
echo "🔍 Verificando configuración de Git..."
if [ -z "$(git config --global user.name)" ] || [ -z "$(git config --global user.email)" ]; then
    echo "⚠️  Git no está configurado globalmente."
    read -p "¿Deseas configurarlo ahora? (s/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        read -p "Nombre de usuario: " git_name
        read -p "Email: " git_email
        git config --global user.name "$git_name"
        git config --global user.email "$git_email"
        echo "✅ Git configurado: $git_name <$git_email>"
    fi
fi

# Agregar todos los archivos
echo "📝 Agregando archivos al staging..."
git add .

# Mostrar estado
echo ""
echo "📊 Estado del repositorio:"
git status

echo ""
echo "✅ Preparación completada!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Crea un repositorio en GitHub (https://github.com/new)"
echo "2. Ejecuta estos comandos (reemplaza TU_USUARIO y TU_REPO):"
echo ""
echo "   git remote add origin https://github.com/TU_USUARIO/TU_REPO.git"
echo "   git branch -M main"
echo "   git commit -m 'Initial commit: Gemini Prompt Server'"
echo "   git push -u origin main"
echo ""
echo "📖 Para más detalles, consulta DEPLOY.md"

