#!/usr/bin/env bash
set -euo pipefail

TEMPLATE_NAME="template-forca"
IMAGE_ALIAS="forca-base"

echo "==> 1. Ajustando caminhos do projeto dentro do template..."
incus exec "$TEMPLATE_NAME" -- bash -c '
  if [ -d /opt/forca/forca ]; then
    cp -r /opt/forca/forca/. /opt/forca/
    rm -rf /opt/forca/forca
  fi
  cd /opt/forca
  npm install --omit=dev
  echo "Node modules instalados com sucesso!"
'

echo "==> 2. Instalando Unit Files do systemd para Game Server e Controller..."
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

echo "==> 3. Parando container e publicando imagem '$IMAGE_ALIAS'..."
incus stop "$TEMPLATE_NAME"

if incus image list -c l --format csv | grep -q "^${IMAGE_ALIAS}$"; then
  incus image delete "$IMAGE_ALIAS"
fi

incus publish "$TEMPLATE_NAME" --alias "$IMAGE_ALIAS" description="Template Golden Forca Distribuida v1"
incus delete "$TEMPLATE_NAME"

echo "==> 4. Concluído! Imagem '$IMAGE_ALIAS' pronta no Incus:"
incus image list "$IMAGE_ALIAS"
