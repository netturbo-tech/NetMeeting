# Notas PM2 — Servidor Linux

## Instalação

```bash
npm install -g pm2
```

## Iniciar os processos

```bash
cd /caminho/do/projeto
pm2 start src/monitor.js --name netmeet-monitor
pm2 start src/dashboard.js --name netmeet-dashboard
```

## Salvar os processos

```bash
pm2 save
```

## Configurar startup automático (iniciar com o servidor)

```bash
pm2 startup
```

O comando acima vai gerar um comando específico para o seu Linux — copie e cole o que ele mostrar, algo como:

```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u seu_usuario --hp /home/seu_usuario
```

## Comandos úteis do dia a dia

| Comando | O que faz |
|---|---|
| `pm2 status` | Ver processos rodando |
| `pm2 logs` | Ver logs em tempo real |
| `pm2 logs netmeet-monitor` | Logs de um processo específico |
| `pm2 restart all` | Reiniciar todos os processos |
| `pm2 stop all` | Parar todos os processos |
| `pm2 kill` | Matar o daemon do PM2 |
| `pm2 resurrect` | Restaurar processos salvos anteriormente |

## Windows vs Linux

| | Windows | Linux |
|---|---|---|
| Instalação | `npm install -g pm2` | `npm install -g pm2` |
| Startup automático | `pm2 startup` (limitado) | `pm2 startup` via systemd ✅ |
| Estabilidade em produção | Razoável | Excelente ✅ |

> O Linux é o ambiente ideal para rodar PM2 em produção.
