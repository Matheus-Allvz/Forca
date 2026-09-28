#!/usr/bin/env bash
set -euo pipefail

echo "==> [1/5] Pushing to ctrl-primary and ctrl-backup..."
for ctrl in ctrl-primary ctrl-backup; do
  incus file push /home/deploy/forca/controller/server.js "$ctrl/opt/forca/controller/server.js"
  incus file push /home/deploy/forca/controller/incus.js "$ctrl/opt/forca/controller/incus.js"
  incus file push /home/deploy/forca/controller/test_metrics_timeseries.js "$ctrl/opt/forca/controller/test_metrics_timeseries.js"
  incus file push /home/deploy/forca/web-client/public/ops.html "$ctrl/opt/forca/web-client/public/ops.html"
  incus file push /home/deploy/forca/web-client/public/ops.js "$ctrl/opt/forca/web-client/public/ops.js"
  incus file push /home/deploy/forca/web-client/public/ops.css "$ctrl/opt/forca/web-client/public/ops.css"
  incus exec "$ctrl" -- systemctl restart controller
done

echo "==> [2/5] Pushing game-server updates to game nodes..."
for node in game-node-1 game-node-2 game-node-3; do
  if incus info "$node" 2>/dev/null | grep -qi "Status: RUNNING"; then
    echo "  -> Atualizando $node..."
    incus file push /home/deploy/forca/game-server/server.js "$node/opt/forca/game-server/server.js"
    incus exec "$node" -- systemctl restart "game-server@4001" "game-server@4002" || true
  fi
done

echo "==> [3/5] Atualizando regras de borda e rotas no Caddyfile..."
bash /home/deploy/forca/update_caddyfile.sh

echo "==> [4/5] Atualizando enhanced-auto-heal-daemon no host..."
if systemctl is-active forca-auto-heal >/dev/null 2>&1; then
  systemctl restart forca-auto-heal
  echo "  -> forca-auto-heal daemon reiniciado."
fi

echo "==> [5/5] Verificando status dos serviços:"
sleep 2
incus exec ctrl-primary -- systemctl is-active controller
incus exec ctrl-backup -- systemctl is-active controller

echo "==> Deploy de resiliência, segurança e observabilidade concluído com sucesso!"
