#!/usr/bin/env bash
# ==============================================================================
# Fase 2: Criação da Imagem Base (Template Golden) no Incus com DNS Robusto
# Host: 15.204.243.66
# ==============================================================================
set -euo pipefail

TEMPLATE_NAME="template-forca"
IMAGE_ALIAS="forca-base"

echo "==> [1/7] Ajustando DNS upstream na rede incusbr0..."
sudo incus network set incusbr0 raw.dnsmasq "server=8.8.8.8"$'\n'"server=1.1.1.1" || true

echo "==> [2/7] Criando container base Ubuntu 24.04 ($TEMPLATE_NAME)..."
if sudo incus list -c n --format csv | grep -q "^${TEMPLATE_NAME}$"; then
  sudo incus delete "${TEMPLATE_NAME}" --force
fi

sudo incus launch images:ubuntu/24.04 "${TEMPLATE_NAME}" --network incusbr0

echo "==> [3/7] Configurando DNS público dentro do container..."
sleep 3
sudo incus exec "${TEMPLATE_NAME}" -- bash -c "
  rm -f /etc/resolv.conf
  echo 'nameserver 8.8.8.8' > /etc/resolv.conf
  echo 'nameserver 1.1.1.1' >> /etc/resolv.conf
"

# Valida conectividade externa
echo "==> Testando resolução de DNS e conectividade externa..."
sudo incus exec "${TEMPLATE_NAME}" -- ping -c 2 archive.ubuntu.com

echo "==> [4/7] Instalando Node.js 20 LTS e dependências..."
sudo incus exec "${TEMPLATE_NAME}" -- bash -c "
  set -euo pipefail
  apt-get update -y
  apt-get install -y curl git ca-certificates
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
  echo 'Node version:' && node -v
  echo 'NPM version:' && npm -v
"

echo "==> [5/7] Copiando código do projeto Forca para /opt/forca..."
sudo incus exec "${TEMPLATE_NAME}" -- mkdir -p /opt/forca
sudo incus file push -r /home/deploy/forca/. "${TEMPLATE_NAME}/opt/forca/"
sudo incus exec "${TEMPLATE_NAME}" -- bash -c "
  cd /opt/forca
  rm -rf node_modules
  npm install --omit=dev
"

echo "==> [6/7] Instalando Unit Files do systemd para Game Server e Controller..."
sudo incus exec "${TEMPLATE_NAME}" -- bash -c "cat << 'EOF' > /etc/systemd/system/game-server@.service
[Unit]
Description=Forca Game Server on port %i
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/forca
EnvironmentFile=-/etc/default/game-server-%i
ExecStart=/usr/bin/node game-server/server.js
Restart=always
RestartSec=1s
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

cat << 'EOF' > /etc/systemd/system/controller.service
[Unit]
Description=Forca Controller / Orchestrator
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/forca
EnvironmentFile=-/etc/default/forca-controller
ExecStart=/usr/bin/node controller/server.js
Restart=always
RestartSec=1s
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
"

echo "==> [7/7] Gerando imagem de template '$IMAGE_ALIAS'..."
sudo incus stop "${TEMPLATE_NAME}"

if sudo incus image list -c l --format csv | grep -q "^${IMAGE_ALIAS}$"; then
  sudo incus image delete "${IMAGE_ALIAS}"
fi

sudo incus publish "${TEMPLATE_NAME}" --alias "${IMAGE_ALIAS}" description="Template Golden Forca Distribuida v1"
sudo incus delete "${TEMPLATE_NAME}"

echo "==> Imagem '$IMAGE_ALIAS' criada com sucesso!"
sudo incus image list "${IMAGE_ALIAS}"
