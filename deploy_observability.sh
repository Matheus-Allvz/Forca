#!/usr/bin/env bash
set -euo pipefail

echo "==> [1/3] Pushing to ctrl-primary..."
incus file push /home/deploy/forca/controller/server.js ctrl-primary/opt/forca/controller/server.js
incus file push /home/deploy/forca/controller/incus.js ctrl-primary/opt/forca/controller/incus.js
incus file push /home/deploy/forca/controller/test_metrics_timeseries.js ctrl-primary/opt/forca/controller/test_metrics_timeseries.js
incus file push /home/deploy/forca/web-client/public/ops.html ctrl-primary/opt/forca/web-client/public/ops.html
incus file push /home/deploy/forca/web-client/public/ops.js ctrl-primary/opt/forca/web-client/public/ops.js
incus file push /home/deploy/forca/web-client/public/ops.css ctrl-primary/opt/forca/web-client/public/ops.css

echo "==> [2/3] Pushing to ctrl-backup..."
incus file push /home/deploy/forca/controller/server.js ctrl-backup/opt/forca/controller/server.js
incus file push /home/deploy/forca/controller/incus.js ctrl-backup/opt/forca/controller/incus.js
incus file push /home/deploy/forca/controller/test_metrics_timeseries.js ctrl-backup/opt/forca/controller/test_metrics_timeseries.js
incus file push /home/deploy/forca/web-client/public/ops.html ctrl-backup/opt/forca/web-client/public/ops.html
incus file push /home/deploy/forca/web-client/public/ops.js ctrl-backup/opt/forca/web-client/public/ops.js
incus file push /home/deploy/forca/web-client/public/ops.css ctrl-backup/opt/forca/web-client/public/ops.css

echo "==> [3/3] Reiniciando controller no ctrl-primary e ctrl-backup..."
incus exec ctrl-primary -- systemctl restart controller
incus exec ctrl-backup -- systemctl restart controller

sleep 3
echo "==> Verificando status dos serviços:"
incus exec ctrl-primary -- systemctl is-active controller
incus exec ctrl-backup -- systemctl is-active controller

echo "==> Deploy da suite de métricas e observabilidade concluído com sucesso!"
