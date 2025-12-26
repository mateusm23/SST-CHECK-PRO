# Configuração de Variáveis no Railway

## AÇÕES NECESSÁRIAS NO RAILWAY

### 1. Rotacionar Senha do PostgreSQL

1. Vá em Railway → PostgreSQL service
2. Settings → Variables
3. Clique em "Regenerate" ou "New Password" na variável POSTGRES_PASSWORD
4. **COPIE a nova DATABASE_URL** que será gerada
5. Atualize a variável DATABASE_URL no service principal (SST Check Pro)

### 2. Adicionar/Atualizar Variáveis de Ambiente

No Railway, vá em seu service principal → Settings → Variables e configure:

**SESSION_SECRET** (NOVO)
```
ef0e05fe2b6217bf4442d6283e476b6790ac2a6630137ef54c1ce78589b2234b521f2c250f6a4267faf9b35de30ebb7c2b9f2cdb1e473937bcfce23165a2e78d
```

**DATABASE_URL**
```
(usar a nova URL gerada após rotacionar a senha do PostgreSQL)
```

**NODE_ENV**
```
production
```

**FRONTEND_URL** (NOVO - para CORS)
```
https://sst-check-pro-production.up.railway.app
```

**Variáveis existentes que devem permanecer:**
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- PORT

### 3. Após configurar

1. Railway vai fazer redeploy automático
2. Aguarde o deploy completar
3. Teste o app

## MUDANÇAS IMPLEMENTADAS NO CÓDIGO

✅ Rate limiting global (100 req/15min)
✅ Rate limiting autenticação (5 req/15min)
✅ Rate limiting checkout (10 req/15min)
✅ Helmet para headers HTTP seguros
✅ CORS configurado adequadamente
✅ .env removido do Git
✅ Novo SESSION_SECRET gerado
