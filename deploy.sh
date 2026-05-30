#!/bin/bash
set -e

echo "=== Verificando Docker ==="
if ! command -v docker >/dev/null 2>&1; then
    echo "Instalando Docker..."
    sudo apt update
    sudo apt install -y docker.io
    sudo systemctl enable --now docker
fi

echo "=== Verificando Docker Compose ==="
if ! docker compose version >/dev/null 2>&1; then
    echo "Instalando Docker Compose plugin..."
    sudo apt install -y docker-compose-plugin
fi

echo "=== Ajustando permisos ==="
sudo chmod +x ./src/BackEnd_Circulo_Lectura/wait-for-mysql.sh

echo "=== Construyendo imágenes ==="
docker compose build

echo "=== Levantando contenedores ==="
docker compose up -d

echo "=== Estado final ==="
docker compose ps

echo "=== Despliegue completado ==="
