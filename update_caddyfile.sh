#!/usr/bin/env bash
set -euo pipefail

echo "==> Atualizando bloco forca.matheus-alves.dev no /etc/caddy/Caddyfile..."

python3 - << 'EOF'
with open('/etc/caddy/Caddyfile', 'r') as f:
    content = f.read()

novo_bloco = """forca.matheus-alves.dev {
	handle /internal/* {
		respond "Acesso Negado: Rota interna privada" 403
	}
	handle /servers/node1-p1/* {
		uri strip_prefix /servers/node1-p1
		reverse_proxy 10.10.10.101:4001
	}
	handle /servers/node1-p2/* {
		uri strip_prefix /servers/node1-p2
		reverse_proxy 10.10.10.101:4002
	}
	handle /servers/node2-p1/* {
		uri strip_prefix /servers/node2-p1
		reverse_proxy 10.10.10.102:4001
	}
	handle /servers/node2-p2/* {
		uri strip_prefix /servers/node2-p2
		reverse_proxy 10.10.10.102:4002
	}
	handle /servers/node3-p1/* {
		uri strip_prefix /servers/node3-p1
		reverse_proxy 10.10.10.103:4001
	}
	handle /servers/node3-p2/* {
		uri strip_prefix /servers/node3-p2
		reverse_proxy 10.10.10.103:4002
	}
	handle /servers/game-server-1/* {
		uri strip_prefix /servers/game-server-1
		reverse_proxy 10.10.10.101:4001
	}
	handle /servers/game-server-2/* {
		uri strip_prefix /servers/game-server-2
		reverse_proxy 10.10.10.101:4002
	}
	handle /servers/game-server-3/* {
		uri strip_prefix /servers/game-server-3
		reverse_proxy 10.10.10.102:4001
	}
	handle /servers/game-server-4/* {
		uri strip_prefix /servers/game-server-4
		reverse_proxy 10.10.10.102:4002
	}
	handle /servers/game-server-5/* {
		uri strip_prefix /servers/game-server-5
		reverse_proxy 10.10.10.103:4001
	}
	handle /servers/game-server-6/* {
		uri strip_prefix /servers/game-server-6
		reverse_proxy 10.10.10.103:4002
	}
	handle {
		reverse_proxy 10.10.10.10:8088 10.10.10.20:8088 {
			lb_policy first
			health_uri /health
			health_interval 3s
			health_timeout 2s
			health_status 2xx
		}
	}
	encode gzip zstd
}"""

import re
padrao = r'forca\.matheus-alves\.dev\s*\{'
m = re.search(padrao, content)
if m:
    start = m.start()
    open_brace = content.find('{', start)
    depth = 1
    idx = open_brace + 1
    while idx < len(content) and depth > 0:
        if content[idx] == '{':
            depth += 1
        elif content[idx] == '}':
            depth -= 1
        idx += 1
    if depth == 0:
        conteudo_atualizado = content[:start] + novo_bloco + content[idx:]
        with open('/etc/caddy/Caddyfile', 'w') as f:
            f.write(conteudo_atualizado)
        print("Bloco substituído com sucesso!")
    else:
        print("Erro: chaves desbalanceadas no Caddyfile!")
else:
    print("Padrão não encontrado!")
EOF

echo "==> Validando e recarregando Caddy..."
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
echo "==> Caddy recarregado com sucesso!"
