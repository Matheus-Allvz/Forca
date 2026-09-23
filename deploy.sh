#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Atualizando codigo (origin/main)..."
git fetch origin main
git reset --hard origin/main

if [ ! -f .env ]; then
  if [ -f .env.vps ]; then
    echo "==> Copiando .env.vps para .env..."
    cp .env.vps .env
  else
    echo "==> Copiando .env.example para .env..."
    cp .env.example .env
  fi
fi

echo "==> Rebuild dos containers (sem cache)..."
docker compose build --no-cache

echo "==> Subindo containers em background..."
docker compose up -d

echo "==> Aguardando inicializacao dos servicos..."
sleep 5

echo "==> Verificando status dos servicos..."
docker compose ps

echo "==> Checando saude do Controller..."
curl -I -s http://127.0.0.1:8088/health || true

echo "==> Deploy concluido: https://forca.matheus-alves.dev"
