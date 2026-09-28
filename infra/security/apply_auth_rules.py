#!/usr/bin/env python3
import sys
import re
import subprocess

caddyfile_path = "/etc/caddy/Caddyfile"

with open(caddyfile_path, "r") as f:
    content = f.read()

ops_rules = """\thandle /ops* {
\t\tforward_auth 127.0.0.1:8099 {
\t\t\turi /api/auth/verify
\t\t\tcopy_headers X-Auth-User X-Auth-Email X-Auth-Role
\t\t}
\t\treverse_proxy 10.10.10.10:8088 10.10.10.20:8088 {
\t\t\tlb_policy first
\t\t\thealth_uri /health
\t\t\thealth_interval 3s
\t\t\thealth_timeout 2s
\t\t\thealth_status 2xx
\t\t}
\t}
\thandle /api/admin/* {
\t\tforward_auth 127.0.0.1:8099 {
\t\t\turi /api/auth/verify
\t\t\tcopy_headers X-Auth-User X-Auth-Email X-Auth-Role
\t\t}
\t\treverse_proxy 10.10.10.10:8088 10.10.10.20:8088 {
\t\t\tlb_policy first
\t\t\thealth_uri /health
\t\t\thealth_interval 3s
\t\t\thealth_timeout 2s
\t\t\thealth_status 2xx
\t\t}
\t}
\thandle {"""

if "handle /ops*" in content:
    print("Regras /ops* já presentes no Caddyfile!")
else:
    # Substitui a ocorrência de '\thandle {' dentro de forca.matheus-alves.dev
    partes = content.split("forca.matheus-alves.dev {")
    if len(partes) > 1:
        sub_bloco = partes[1]
        sub_bloco_novo = sub_bloco.replace("\thandle {", ops_rules, 1)
        novo_conteudo = partes[0] + "forca.matheus-alves.dev {" + sub_bloco_novo
        
        with open("/etc/caddy/Caddyfile.bak_auth", "w") as f_bak:
            f_bak.write(content)
            
        with open(caddyfile_path, "w") as f:
            f.write(novo_conteudo)
            
        print("Caddyfile atualizado com regras de forward_auth!")
    else:
        print("Bloco forca.matheus-alves.dev não localizado!")
        sys.exit(1)

# Valida e recarrega
res = subprocess.run(["caddy", "validate", "--config", caddyfile_path], capture_output=True, text=True)
if res.returncode != 0:
    print("Erro na validação do Caddyfile:", res.stderr)
    sys.exit(1)

res_reload = subprocess.run(["systemctl", "reload", "caddy"], capture_output=True, text=True)
if res_reload.returncode != 0:
    print("Erro ao recarregar o Caddy:", res_reload.stderr)
    sys.exit(1)

print("Caddy validado e recarregado com sucesso!")
