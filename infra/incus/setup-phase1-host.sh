#!/usr/bin/env bash
# ==============================================================================
# Fase 1: Preparação do Host e Infraestrutura de Rede Incus na VPS
# Host: 15.204.243.66 (Ubuntu 26.04 LTS)
# ==============================================================================
set -euo pipefail

echo "==> [1/5] Atualizando repositórios e instalando Incus..."
sudo apt-get update -y
sudo apt-get install -y incus incus-client

echo "==> [2/5] Adicionando o usuário deploy ao grupo incus-admin..."
sudo usermod -aG incus-admin deploy || true

echo "==> [3/5] Inicializando Incus com bridge privada (10.10.10.0/24)..."
# Inicializa de forma não interativa se ainda não estiver configurado
if ! sudo incus network show incusbr0 >/dev/null 2>&1; then
  sudo incus admin init --minimal
  
  # Configura a rede incusbr0 na faixa 10.10.10.0/24
  sudo incus network set incusbr0 ipv4.address 10.10.10.1/24
  sudo incus network set incusbr0 ipv4.nat true
  sudo incus network set incusbr0 ipv6.address none
fi

echo "==> [4/5] Configurando diretório compartilhado para Lease Locks (Split-Brain Prevention)..."
sudo mkdir -p /run/forca-cluster
sudo chmod 777 /run/forca-cluster

echo "==> [5/5] Verificando status do daemon e da rede Incus..."
sudo incus version
sudo incus network list

echo "==> Fase 1 concluída com sucesso! Host pronto para receber os containers de sistema."
