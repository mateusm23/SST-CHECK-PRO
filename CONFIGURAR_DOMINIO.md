# Configurar Domínio Customizado sstcheckpro.com.br

## PARTE 1: Railway (FAÇA ISSO PRIMEIRO)

1. Vá em Railway → Seu projeto SST Check Pro
2. Settings → Networking → Custom Domain
3. Clique em "Add Custom Domain"
4. Digite: `sstcheckpro.com.br`
5. Railway vai mostrar os registros DNS que você precisa configurar
6. **ANOTE ESSES VALORES** (exemplo):
   - Tipo: CNAME
   - Nome: @
   - Valor: `sst-check-pro-production.up.railway.app` (ou similar)

## PARTE 2: GoDaddy DNS

Após Railway gerar os registros DNS:

1. Vá em GoDaddy → Meus Produtos → DNS
2. **Deletar registros A antigos** (se houver)
3. Adicionar novo registro CNAME:
   - **Tipo**: CNAME
   - **Nome**: @ (ou deixe vazio)
   - **Valor**: (o que Railway mostrou)
   - **TTL**: 600 segundos

4. Se Railway pedir registro para `www`, adicione também:
   - **Tipo**: CNAME
   - **Nome**: www
   - **Valor**: (o que Railway mostrou)
   - **TTL**: 600 segundos

## PARTE 3: Aguardar Propagação

- Propagação DNS leva 5-60 minutos (às vezes até 24h)
- Teste em: https://dnschecker.org/#CNAME/sstcheckpro.com.br
- Quando propagar, Railway vai gerar certificado SSL automaticamente

## PARTE 4: Atualizar Integrações (EU FAÇO)

Após domínio funcionar:
- ✅ Atualizar Google OAuth URIs
- ✅ Atualizar Stripe webhook URL
- ✅ Atualizar variável FRONTEND_URL no Railway

---

## Comandos úteis para testar

```bash
# Ver se DNS está apontando corretamente
nslookup sstcheckpro.com.br

# Testar HTTPS
curl -I https://sstcheckpro.com.br
```

## Problemas comuns

**Erro: "DNS_PROBE_FINISHED_NXDOMAIN"**
- DNS ainda não propagou, aguarde mais

**Erro: "NET::ERR_CERT_COMMON_NAME_INVALID"**
- Railway ainda não gerou SSL, aguarde propagação completa

**Erro: "This site can't be reached"**
- Verifique se CNAME está correto na GoDaddy
