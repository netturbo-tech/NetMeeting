# Notas de Servidor - NetMeeting

## Servidor

- Host/servidor: `SRV-CT-TurboWS`
- IP observado: `10.250.110.238`
- Pasta do projeto no servidor:

```bash
/opt/DESENVOLVIMENTO_E_TESTE/NetMeeting
```

## Acessar o projeto no servidor

```bash
cd /opt/DESENVOLVIMENTO_E_TESTE/NetMeeting
pwd
ls -lah
```

## Configurar URL da dashboard

O `.env` que veio da maquina de teste pode estar com `localhost`.
No servidor, usar o IP acessivel na rede.

Exemplo esperado:

```env
PORT=3000
DASHBOARD_URL=http://10.250.110.238:3000
```

Editar:

```bash
cd /opt/DESENVOLVIMENTO_E_TESTE/NetMeeting
cp .env ".env.bak.$(date +%Y%m%d-%H%M%S)"
nano .env
```

Depois conferir:

```bash
grep -E "^(PORT|DASHBOARD_URL)=" .env
```

Reiniciar carregando o novo `.env`:

```bash
pm2 restart all --update-env
```

## PM2

Ver processos:

```bash
pm2 status
```

Ver detalhes da dashboard:

```bash
pm2 show netmeet-dashboard
```

Ver logs:

```bash
pm2 logs netmeet-dashboard
pm2 logs netmeet-monitor
```

Reiniciar tudo:

```bash
pm2 restart all --update-env
```

## Testes de acesso

No proprio servidor:

```bash
curl http://localhost:3000
```

Da maquina do usuario, abrir no navegador:

```text
http://10.250.110.238:3000
```

Se nao abrir pela maquina do usuario, verificar se a porta esta escutando:

```bash
ss -tulpn | grep :3000
```

Se estiver escutando localmente mas nao abrir pela rede, pode ser bloqueio de firewall, regra de rede ou porta nao liberada.

## Observacao sobre navegador no servidor

O servidor normalmente fica sem interface grafica. Ele nao precisa abrir navegador.
O correto e manter a dashboard rodando no servidor e acessar pelo navegador de uma maquina da rede usando:

```text
http://10.250.110.238:3000
```

## Links enviados por email

O link de opt-in enviado por email usa a variavel:

```env
DASHBOARD_URL
```

Por isso, se ela ficar como `http://localhost:3000`, os usuarios nao vao conseguir acessar a dashboard a partir das maquinas deles.
No servidor, usar o IP ou nome DNS acessivel na rede.
