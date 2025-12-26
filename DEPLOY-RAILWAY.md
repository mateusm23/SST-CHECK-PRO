# Deploy SST Check Pro - Railway

Guia objetivo para colocar sua aplicação em produção.

---

## FASE 1: PREPARAÇÃO

### O que você precisa ter antes de começar:

- [ ] Conta no Railway (criar em: railway.app)
- [ ] Conta Google Cloud (console.cloud.google.com)
- [ ] Conta Stripe (dashboard.stripe.com)
- [ ] Repositório no GitHub (você já tem: mateusm23/SST-CHECK-PRO)

### Informações que você vai precisar pegar:

**Google OAuth:**
1. Acesse: https://console.cloud.google.com/apis/credentials
2. Se não tiver projeto, crie um
3. Criar credenciais > ID do cliente OAuth 2.0
4. Tipo: Aplicativo da Web
5. Copie:
   - Client ID (termina com .apps.googleusercontent.com)
   - Client Secret

**Stripe:**
1. Acesse: https://dashboard.stripe.com/test/apikeys
2. Copie (modo TESTE primeiro):
   - Publishable key (começa com pk_test_)
   - Secret key (começa com sk_test_)

---

## FASE 2: RAILWAY - CRIAR PROJETO

### Passo 1: Criar projeto com banco

1. Acesse: https://railway.app
2. Clique em "New Project"
3. Selecione "Deploy PostgreSQL"
4. Aguarde o PostgreSQL subir (1-2 minutos)

### Passo 2: Copiar URL do banco

1. Clique no serviço PostgreSQL criado
2. Aba "Connect"
3. Copie a URL completa (começa com postgresql://)
4. Guarde essa URL - você vai usar daqui a pouco

Exemplo: postgresql://postgres:senha@containers-us-west-123.railway.app:5432/railway

### Passo 3: Adicionar sua aplicação

1. No mesmo projeto, clique "New Service"
2. Selecione "GitHub Repo"
3. Autorize o Railway a acessar seu GitHub (se pedir)
4. Selecione o repositório: mateusm23/SST-CHECK-PRO
5. Railway vai detectar Node.js automaticamente

Como saber se deu certo: Você verá 2 serviços no projeto (PostgreSQL + sua aplicação)

---

## FASE 3: VARIÁVEIS DE AMBIENTE

### Gerar SESSION_SECRET

No seu computador, execute:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copie o valor gerado.

### Adicionar variáveis no Railway

1. Clique no serviço da sua aplicação (não o PostgreSQL)
2. Aba "Variables"
3. Adicione uma por uma:

```
DATABASE_URL=<cole_a_url_do_postgresql_que_voce_copiou>
SESSION_SECRET=<cole_o_secret_que_voce_gerou>
NODE_ENV=production
GOOGLE_CLIENT_ID=<seu_client_id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<seu_client_secret>
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Deixe em branco por enquanto:
- STRIPE_WEBHOOK_SECRET (vai configurar depois)
- GEMINI_API_KEY (opcional)

Como saber se deu certo: As variáveis aparecem na lista

---

## FASE 4: DEPLOY

O Railway faz deploy automático quando detecta as variáveis.

### Acompanhar o deploy:

1. Clique no serviço da aplicação
2. Aba "Deployments"
3. Aguarde o build completar (3-5 minutos)
4. Status deve ficar "Success" (verde)

### Pegar a URL da aplicação:

1. Aba "Settings"
2. Seção "Domains"
3. Clique "Generate Domain"
4. Copie a URL gerada (tipo: sst-check-pro-production.up.railway.app)

Como saber se deu certo:
- Build completo sem erros
- Acessar a URL mostra sua aplicação

---

## FASE 5: MIGRATIONS - CRIAR TABELAS NO BANCO

### Instalar Railway CLI:

```bash
npm install -g @railway/cli
```

### Conectar ao seu projeto:

```bash
railway login
```
(Abre o navegador para autenticar)

```bash
railway link
```
(Selecione seu projeto da lista)

### Criar as tabelas:

```bash
railway run npm run db:push
```

Aguarde a mensagem de sucesso.

### Popular banco com planos de assinatura:

```bash
railway run npx tsx docs/deploy/init-database.ts
```

Você deve ver:
- Plano "Gratuito" criado
- Plano "Starter" criado
- Plano "Pro" criado

Como saber se deu certo: Mensagens de sucesso sem erros

---

## FASE 6: CONFIGURAÇÕES FINAIS

### A) Configurar Google OAuth

Agora você tem a URL do Railway, precisa adicionar no Google:

1. Google Cloud Console: https://console.cloud.google.com/apis/credentials
2. Edite suas credenciais OAuth 2.0
3. Em "URIs de redirecionamento autorizados", adicione:
   ```
   https://SUA-URL-RAILWAY.up.railway.app/api/auth/google/callback
   ```
   (Substitua SUA-URL-RAILWAY pela URL que você copiou)
4. Salvar

Como saber se deu certo: URI aparece na lista

### B) Configurar Stripe Webhook

1. Stripe Dashboard: https://dashboard.stripe.com/test/webhooks
2. Clique "Add endpoint"
3. URL do endpoint:
   ```
   https://SUA-URL-RAILWAY.up.railway.app/api/stripe/webhook
   ```
4. Selecione eventos para ouvir:
   - checkout.session.completed
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_succeeded
5. Clique "Add endpoint"
6. Copie o "Signing secret" (começa com whsec_...)

### Adicionar webhook secret no Railway:

1. Volte no Railway
2. Serviço da aplicação > Variables
3. Adicione:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

Como saber se deu certo: Variável aparece na lista, Railway faz redeploy automático

---

## FASE 7: TESTAR

### Teste 1: Acessar aplicação
- Abra: https://sua-url-railway.up.railway.app
- Deve carregar a página inicial

### Teste 2: Login Google
- Clique em "Login com Google"
- Faça login com sua conta
- Deve redirecionar para o dashboard
- Seu nome deve aparecer

### Teste 3: Stripe (modo teste)
- Vá em Pricing
- Clique em um plano pago
- Use cartão de teste: 4242 4242 4242 4242
- Data: qualquer futura
- CVV: qualquer
- Complete o checkout
- Deve voltar para a aplicação

### Teste 4: Ver logs
```bash
railway logs
```
Não deve ter erros críticos

---

## PROBLEMAS COMUNS

### Login Google não funciona
- Conferir se adicionou o redirect URI no Google Cloud Console
- URL deve ser EXATAMENTE como está no Railway (https, sem barra no final)

### Stripe webhook falha
- Conferir STRIPE_WEBHOOK_SECRET está correto
- Ver logs no Stripe Dashboard > Webhooks > seu endpoint

### Erro de banco
- Conferir DATABASE_URL está correta
- Verificar se executou npm run db:push

### Ver logs de erro
```bash
railway logs
```

---

## COMANDOS ÚTEIS

Ver logs em tempo real:
```bash
railway logs
```

Executar comando no Railway:
```bash
railway run <comando>
```

Conectar ao banco:
```bash
railway connect postgres
```

Ver variáveis:
```bash
railway variables
```

---

## PRÓXIMOS PASSOS

Depois que tudo funcionar:
1. Mudar Stripe para modo produção (chaves reais)
2. Conectar domínio customizado
3. Adicionar storage de fotos (Cloudinary)

---

## CUSTOS

- Primeiro mês: GRÁTIS ($5 de créditos)
- Depois: ~$5-10/mês (PostgreSQL + App)

---

Dúvidas? Anote aqui e vamos resolvendo uma por uma.
