# Instruções do Agente de IA para SST Check Pro

## Visão Geral do Projeto
**SST Check Pro** é uma plataforma SaaS freemium para inspeções de segurança no trabalho no Brasil. Permite que profissionais de segurança realizem inspeções, documentem não-conformidades com fotos, gerem planos de ação com IA por NR (Normas Regulamentadoras) e gerenciem tiers de assinatura.

**Domínio Principal**: Inspeção de segurança + conformidade regulatória (Brasil) + recomendações geradas por IA

---

## Arquitetura e Fluxo de Dados

### Arquitetura de Três Camadas
1. **Frontend** (`client/src/`): React 18 + TypeScript, focado em UI, gerencia roteamento e autenticação
2. **Backend** (`server/`): Express + Node.js, gerencia APIs, integrações de IA, faturamento
3. **Shared** (`shared/`): Schemas Zod, definições de rotas, modelos de domínio (fonte única da verdade)

### Padrão Crítico: Definições de Rotas Compartilhadas
- Todas as rotas da API são definidas em `shared/routes.ts` com schemas Zod explícitos para requisição/resposta
- Frontend usa esses schemas via React Query (caching, lógica de retry)
- Backend implementa handlers que correspondem às assinaturas das rotas
- Isso previne desajustes de tipo entre cliente e servidor

**Exemplo de fluxo**: Criação de inspeção
1. Frontend valida formulário com schema Zod de `shared/routes.ts`
2. Chama `/api/inspections/create` (definido em shared)
3. Handler do backend usa o mesmo schema, armazena em PostgreSQL via Drizzle ORM
4. Resposta cacheada por React Query para acesso offline

### Camada de Banco de Dados (Drizzle ORM)
- Schema reside em `shared/schema.ts` e `shared/models/`
- Tipos gerados para inserts (`InsertInspection`) e selects (`Inspection`)
- Todas as queries passam pela interface `storage.ts` (ponto único de acesso)
- Migrações: `npm run db:push` sincroniza schema com PostgreSQL

**Tabelas Principais**:
- `users`, `sessions`: Autenticação (Google OAuth)
- `subscriptions_plans`, `user_subscriptions`: Tiers SaaS, integração Stripe
- `companies`: Marca do cliente (upload de logo restrito por assinatura)
- `inspections`: Entidade principal, armazena respostas do checklist como JSONB
- `inspection_photos`: Fotos de evidência, exclusão em cascata com inspeção
- `action_plans`: Tarefas de remediação geradas por IA
- `nr_checklists`: Templates de perguntas regulatórias

---

## Autenticação & Autorização

### Fluxo de Autenticação (Google OAuth)
- Usa Passport.js com estratégia Google OAuth 2.0
- Sessões persistidas em PostgreSQL via `connect-pg-simple`
- Objeto de usuário anexado ao `req.user` do Express após autenticação
- Logout redireciona para `/api/logout`

### Hook de Autenticação do Frontend
```typescript
// client/src/hooks/use-auth.ts
const { user, isLoading, isAuthenticated, logout } = useAuth();
```
- Busca `/api/auth/user` no carregamento da app, cacheado por 5 minutos
- Se 401, redireciona para `/api/auth/google`
- Rotas protegidas envolvidas em `<ProtectedRoute>` ou renderização condicional

### Sistema VIP
- Lista de emails VIP em `server/routes.ts` ignora limites de assinatura
- Usuários VIP obtêm inspeções ilimitadas + upload de logo
- Consulte o email do usuário antes de verificar a assinatura

---

## Assinatura & Faturamento (Stripe)

### Fluxo
1. **Seleção de Plano**: Buscar planos de `/api/subscription/plans`
2. **Checkout**: POST para `/api/subscription/checkout/{planSlug}` → redireciona para sessão do Stripe
3. **Webhook**: Stripe dispara eventos para `/api/stripe/webhook`, atualiza tabela `user_subscriptions`
4. **Rastreamento de Uso**: Criação de inspeção verifica `subscriptions.monthlyLimit` vs `getInspectionsCountThisMonth(userId)`

### Implementação Chave
- Clientes do Stripe criados/sincronizados ao banco de dados para idempotência
- Limites mensais resetam por ciclo de faturamento (`currentPeriodStart` / `currentPeriodEnd`)
- Tier grátis tem limite `-1` (ilimitado para testes)

---

## Integração de IA (Google Gemini)

### Configuração
- **Provedor**: Google Gemini
- **Modelos**:
  - `gemini-2.5-flash`: Rápido, padrão para planos de ação
  - `gemini-2.5-pro`: Pesado em raciocínio (não utilizado atualmente)
  - `gemini-2.5-flash-image`: Análise de imagem (análise de fotos)
- **Config**: Via variáveis de ambiente (`GEMINI_API_KEY`)

### Uso Atual
- **Planos de Ação**: `generateActionPlans(checklistData, observations, location)` em `server/geminiService.ts`
  - Prompt em português, retorna array JSON de issue/recomendação/prioridade/prazo
  - Usado quando usuário clica em "Gerar Recomendações de IA"
- **Análise de Fotos**: `analyzeInspectionPhoto(photoBase64, context)` - para sugestões de comentários (WIP)

### Importante
- Prompts estão em português (português brasileiro)
- Sempre validar saída JSON da IA antes de salvar
- Considerar rate limiting para operações em lote

---

## Build & Implantação

### Desenvolvimento
```bash
npm run dev          # Inicia servidor Express + dev server Vite (modo watch)
npm run check        # Verificação de tipo tsc
```

### Build de Produção
```bash
npm run build        # Vite client → `dist/public/`, esbuild server → `dist/index.cjs`
npm start            # Executa `dist/index.cjs` com NODE_ENV=production
```

### Deploy no Railway
1. Conectar repositório GitHub ao Railway
2. Configurar variáveis de ambiente:
   - `DATABASE_URL`: URL do PostgreSQL
   - `SESSION_SECRET`: Segredo para sessões
   - `GOOGLE_CLIENT_ID`: ID do cliente Google OAuth
   - `GOOGLE_CLIENT_SECRET`: Segredo do cliente Google OAuth
   - `STRIPE_SECRET_KEY`: Chave secreta do Stripe
   - `STRIPE_PUBLISHABLE_KEY`: Chave pública do Stripe
   - `STRIPE_WEBHOOK_SECRET`: Segredo do webhook do Stripe
   - `GEMINI_API_KEY`: Chave da API do Google Gemini
3. Build automático: `npm run build`
4. Start: `npm start`

---

## Padrões de UI & Biblioteca de Componentes

### shadcn/ui + Radix UI
- Todos os componentes de UI em `client/src/components/ui/`
- Estilizados com Tailwind CSS, variáveis CSS para tematização
- Modo claro/escuro via `<ThemeProvider>` em `lib/theme-provider.tsx`

### Padrões Comuns
- Formulários usam React Hook Form + validação Zod (`@hookform/resolvers`)
- Diálogos/modais via componentes controlados do Radix UI
- Toasts via hook `useToast()`
- Navegação com Wouter (`<Route>`, `<Switch>`, `useLocation()`)

### Páginas Principais
- `pages/landing.tsx`: Pública, não autenticada
- `pages/dashboard.tsx`: Lista principal de inspeções + ações rápidas
- `pages/inspection.tsx`: Criar/editar inspeção + upload de foto
- `pages/inspection-view.tsx`: Relatório somente visualização + exportação PDF (WIP)

---

## Roteamento & Segurança de Tipo

### Sistema de Rotas Compartilhadas
Exemplo de `shared/routes.ts`:
```typescript
export const api = {
  inspections: {
    create: {
      method: 'POST' as const,
      path: '/api/inspections/create',
      body: insertInspectionSchema,
      responses: {
        201: inspectionSchema,
        400: errorSchemas.validation,
      }
    }
  }
};
```

### Uso
- **Frontend**: `fetch(api.inspections.create.path, { body: JSON.stringify(data) })`
- **Backend**: Extrair path do objeto `api`, validar body com schema
- **Mudanças**: Atualizar schema uma vez → inferência de tipo automática em ambos os lados

---

## Tarefas Comuns de Desenvolvimento

### Adicionando um Novo Endpoint da API
1. Definir em `shared/routes.ts` com schemas Zod
2. Implementar handler em `server/routes.ts` usando path extraído + schemas
3. Chamar do frontend usando path extraído, validar resposta com schema
4. Adicionar hook React Query para caching (exemplo: `useGetInspections()`)

### Modificando Banco de Dados
1. Atualizar schema em `shared/schema.ts` (adicionar/remover colunas)
2. Executar `npm run db:push` para aplicar migração
3. Atualizar tipos na camada de storage (`server/storage.ts`)
4. Atualizar schemas de rota se a superfície da API mudou

### Estilizando Novo Componente
- Use classes Tailwind + variáveis CSS para considerar tema
- Sobrescreva cores do tema via variáveis CSS em modo claro/escuro
- Exemplo: `className="bg-background text-foreground"` (usa fallback de CSS var)

### Debugando Problemas de Autenticação
- Verificar se `req.user.claims.sub` (ID de usuário) existe
- Verificar se tabela de sessão tem linhas não expiradas
- Garantir que `/api/logout` retorna redirect válido

---

## Referência de Arquivos Chave

| Propósito | Arquivos |
|---------|-------|
| Schema & Tipos | `shared/schema.ts`, `shared/models/` |
| Rotas da API | `shared/routes.ts`, `server/routes.ts` |
| Componentes de UI | `client/src/components/ui/`, `client/src/pages/` |
| Autenticação | `server/auth/`, `client/src/hooks/use-auth.ts` |
| Storage | `server/storage.ts` (interface), `server/db.ts` (conexão Drizzle) |
| Serviços de IA | `server/geminiService.ts` |
| Config de Build | `script/build.ts`, `vite.config.ts` |

---

## Convenções & Anti-Padrões

### FAÇA
✅ Validar todas as entradas da API com schemas Zod de `shared/routes.ts`
✅ Usar métodos `storage.*` para todas as queries de BD (ponto único de acesso)
✅ Cache de respostas em React Query com `staleTime` sensível
✅ Registrar erros com contexto para debugging (timestamp + fonte)
✅ Manter prompts em português consistentes (terminologia NR, referências regulatórias)

### NÃO FAÇA
❌ Contornar schemas de rota compartilhados (segurança de tipo quebra)
❌ Queryar banco de dados diretamente, contornando interface `storage.ts`
❌ Cache de dados sensíveis indefinidamente (tokens de auth, emails)
❌ Ignorar limites de assinatura ao criar inspeções

---

## Dependências Externas
- **Stripe**: Integração de faturamento, eventos de webhook
- **Google Gemini**: Planos de ação de IA + análise de fotos
- **PostgreSQL**: Armazenamento de dados principal
- **Google OAuth**: Provedor de autenticação
- **shadcn/ui**: Componentes pré-construídos acessíveis
- **TanStack React Query**: State do servidor + caching

Todas as integrações configuradas via variáveis de ambiente.
