#!/usr/bin/env bash
set -euo pipefail

echo "==> [1/4] Organizando arquivos em /home/deploy/forca..."
mkdir -p /home/deploy/forca/web-client/public
mv /home/deploy/forca/controller/ops.* /home/deploy/forca/web-client/public/ 2>/dev/null || true
mv /home/deploy/forca/controller/index.html /home/deploy/forca/web-client/public/ 2>/dev/null || true

echo "==> [2/4] Atualizando arquivos no ctrl-primary..."
incus file push /home/deploy/forca/controller/server.js ctrl-primary/opt/forca/controller/server.js
incus file push /home/deploy/forca/controller/incus.js ctrl-primary/opt/forca/controller/incus.js
incus file push /home/deploy/forca/web-client/public/ops.html ctrl-primary/opt/forca/web-client/public/ops.html
incus file push /home/deploy/forca/web-client/public/ops.js ctrl-primary/opt/forca/web-client/public/ops.js
incus file push /home/deploy/forca/web-client/public/ops.css ctrl-primary/opt/forca/web-client/public/ops.css
incus file push /home/deploy/forca/web-client/public/index.html ctrl-primary/opt/forca/web-client/public/index.html

echo "==> [3/4] Atualizando arquivos no ctrl-backup..."
incus file push /home/deploy/forca/controller/server.js ctrl-backup/opt/forca/controller/server.js
incus file push /home/deploy/forca/controller/incus.js ctrl-backup/opt/forca/controller/incus.js
incus file push /home/deploy/forca/web-client/public/ops.html ctrl-backup/opt/forca/web-client/public/ops.html
incus file push /home/deploy/forca/web-client/public/ops.js ctrl-backup/opt/forca/web-client/public/ops.js
incus file push /home/deploy/forca/web-client/public/ops.css ctrl-backup/opt/forca/web-client/public/ops.css
incus file push /home/deploy/forca/web-client/public/index.html ctrl-backup/opt/forca/web-client/public/index.html

echo "==> [4/4] Reiniciando serviços controller nos dois nós..."
incus exec ctrl-primary -- systemctl restart controller
incus exec ctrl-backup -- systemctl restart controller

sleep 3
echo "==> Validando status do ctrl-primary:"
curl -s http://10.10.10.10:8088/health
echo ""
echo "==> Deploy do Painel Ops concluído com sucesso!"
