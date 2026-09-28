#!/usr/bin/env bash
set -euo pipefail

TEMPLATE_NAME="template-forca"
IMAGE_ALIAS="forca-base"

echo "==> 1. Configurando regras permanentes de iptables para incusbr0..."
iptables -I FORWARD -i incusbr0 -j ACCEPT || true
iptables -I FORWARD -o incusbr0 -j ACCEPT || true
iptables -t nat -I POSTROUTING -s 10.10.10.0/24 ! -d 10.10.10.0/24 -j MASQUERADE || true

echo "==> 2. Removendo container antigo se houver..."
incus delete "$TEMPLATE_NAME" --force || true

echo "==> 3. Criando container $TEMPLATE_NAME..."
incus launch images:ubuntu/24.04 "$TEMPLATE_NAME" --network incusbr0

echo "==> 4. Configurando IP estático e DNS no container..."
# Atribui IP estático no Incus
incus config device set "$TEMPLATE_NAME" eth0 ipv4.address 10.10.10.2

# Reinicia container para aplicar rede com IP garantido
incus restart "$TEMPLATE_NAME"
sleep 3

# Configura DNS dentro do container
incus exec "$TEMPLATE_NAME" -- bash -c '
  echo "nameserver 8.8.8.8" > /etc/resolv.conf
  echo "nameserver 1.1.1.1" >> /etc/resolv.conf
'

echo "==> 5. Testando conectividade externa do container..."
incus exec "$TEMPLATE_NAME" -- ping -c 3 8.8.8.8
incus exec "$TEMPLATE_NAME" -- ping -c 3 archive.ubuntu.com

echo "==> Conectividade OK! Instalando Node.js 20 e dependências..."
incus exec "$TEMPLATE_NAME" -- bash -c '
  set -euo pipefail
  apt-get update -y
  apt-get install -y curl git ca-certificates
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
  echo "Node version:" && node -v
  echo "NPM version:" && npm -v
'

echo "==> 6. Copiando código do projeto Forca para /opt/forca..."
incus exec "$TEMPLATE_NAME" -- mkdir -p /opt/forca
incus file push -r /home/deploy/forca/. "$TEMPLATE_NAME/opt/forca/"
incus exec "$TEMPLATE_NAME" -- bash -c '
  cd /opt/forca
  rm -rf node_modules
  npm install --omit=dev
'

echo "==> 7. Instalando Unit Files do systemd para Game Server e Controller..."
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

echo "==> 8. Gerando imagem de template \"$IMAGE_ALIAS\"..."
incus stop "$TEMPLATE_NAME"

if incus image list -c l --format csv | grep -q "^${IMAGE_ALIAS}$"; then
  incus image delete "$IMAGE_ALIAS"
fi

incus publish "$TEMPLATE_NAME" --alias "$IMAGE_ALIAS" description="Template Golden Forca Distribuida v1"
incus delete "$TEMPLATE_NAME"

echo "==> Imagem \"$IMAGE_ALIAS\" criada com sucesso!"
incus image list "$IMAGE_ALIAS"
