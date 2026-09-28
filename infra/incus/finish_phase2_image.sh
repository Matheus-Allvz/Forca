#!/usr/bin/env bash
set -euo pipefail

TEMPLATE_NAME="template-forca"
IMAGE_ALIAS="forca-base"

echo "==> [1/4] Instalando Node.js 20 LTS e dependências dentro de $TEMPLATE_NAME..."
incus exec "$TEMPLATE_NAME" -- bash -c '
  set -euo pipefail
  apt-get update -y
  apt-get install -y curl git ca-certificates build-essential
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
  echo "Node version: $(node -v)"
  echo "NPM version: $(npm -v)"
'

echo "==> [2/4] Copiando código do projeto Forca para /opt/forca..."
incus exec "$TEMPLATE_NAME" -- mkdir -p /opt/forca
incus file push -r /home/deploy/forca/. "$TEMPLATE_NAME/opt/forca/"
incus exec "$TEMPLATE_NAME" -- bash -c '
  cd /opt/forca
  rm -rf node_modules
  npm install --omit=dev
'

echo "==> [3/4] Instalando Unit Files do systemd para Game Server e Controller..."
incus exec "$TEMPLATE_NAME" -- bash -c 'cat << "EOF" > /etc/systemd/system/game-server@.service
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

cat << "EOF" > /etc/systemd/system/controller.service
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
'

echo "==> [4/4] Publicando imagem '$IMAGE_ALIAS'..."
incus stop "$TEMPLATE_NAME"

if incus image list -c l --format csv | grep -q "^${IMAGE_ALIAS}$"; then
  incus image delete "$IMAGE_ALIAS"
fi

incus publish "$TEMPLATE_NAME" --alias "$IMAGE_ALIAS" description="Template Golden Forca Distribuida v1"
incus delete "$TEMPLATE_NAME"

echo "==> SUCESSO: Imagem '$IMAGE_ALIAS' publicada e pronta para clonagem instantânea!"
incus image list "$IMAGE_ALIAS"
