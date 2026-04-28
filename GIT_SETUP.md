# Subindo o NetMeet Bot no Git da Empresa

## Primeira vez (repositório novo)

```powershell
# 1. Entrar na pasta do projeto
cd "C:\Users\alan.moreira\Documents\00 - 2026\15 - PROJETO IA NETTURBO\08 - RESUMO DE REUNIÕES APP\TESTE"

# 2. Inicializar o repositório
git init

# 3. Configurar identidade (se ainda não configurado)
git config user.name "Alan Moreira"
git config user.email "ti@netturbo.com.br"

# 4. Confirmar o que será commitado (deve excluir .env, node_modules, logs/, data/)
git status

# 5. Adicionar tudo (o .gitignore já exclui os arquivos sensíveis)
git add .

# 6. Primeiro commit
git commit -m "feat: NetMeet Bot v1.3.0 — piloto ativo com 9 usuários

- Monitor contínuo via PM2 (monitor + dashboard)
- Graph API + Entra ID (Client Credentials, sem Azure extra)
- Parser VTT + OpenAI GPT-4o-mini para geração de resumo
- Dashboard Express para opt-in dos participantes
- Fix reuniões recorrentes: filtra transcrição por meetingStartTime
- Application Access Policy aplicada globalmente no tenant"

# 7. Conectar ao repositório remoto da empresa
#    (substitua pela URL real do seu git — GitLab, Gitea, Azure DevOps, etc.)
git remote add origin https://git.netturbo.com.br/ti/netmeet-bot.git

# 8. Enviar
git push -u origin main
```

---

## Depois (atualizações do dia a dia)

```powershell
cd "C:\Users\alan.moreira\Documents\00 - 2026\15 - PROJETO IA NETTURBO\08 - RESUMO DE REUNIÕES APP\TESTE"

# Ver o que mudou
git status
git diff

# Adicionar e commitar
git add .
git commit -m "fix: descrição curta do que foi corrigido"

# Enviar
git push
```

---

## O que NÃO vai para o git (já configurado no .gitignore)

| Ignorado | Motivo |
|----------|--------|
| `.env` | Credenciais — nunca versionar |
| `node_modules/` | Dependências — `npm install` recria |
| `data/` | Estado interno do bot (opt-ins, processados) |
| `logs/` | Logs gerados em runtime |

> ✅ As pastas `data/` e `logs/` são preservadas no repositório via `.gitkeep` — ao clonar, elas existem mas estão vazias.

---

## Ao clonar em um servidor novo

```powershell
# 1. Clonar
git clone https://git.netturbo.com.br/ti/netmeet-bot.git
cd netmeet-bot

# 2. Instalar dependências
npm install

# 3. Criar .env com as credenciais (copiar do .env atual e ajustar DASHBOARD_URL)
#    DASHBOARD_URL=http://<IP-do-servidor>:3000

# 4. Testar
npm run test:auth
npm run test:email

# 5. Instalar PM2 e subir
npm install -g pm2
npm install -g pm2-windows-startup
pm2-startup install
pm2 start ecosystem.config.js
pm2 save
```
