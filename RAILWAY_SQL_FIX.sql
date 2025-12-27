-- =====================================================
-- SCRIPT PARA CORRIGIR BANCO DE PRODUÇÃO NO RAILWAY
-- Execute este SQL no Railway Dashboard → Postgres → Query
-- =====================================================

-- 1. VERIFICAR ESTADO ATUAL
SELECT
  id,
  slug,
  name,
  price,
  stripe_price_id
FROM subscription_plans
ORDER BY id;

-- 2. CORRIGIR SLUGS (se estiverem em português)
UPDATE subscription_plans
SET slug = 'professional'
WHERE slug = 'profissional' OR name = 'Profissional';

UPDATE subscription_plans
SET slug = 'business'
WHERE slug = 'negocios' OR name = 'Negócios';

-- 3. ATUALIZAR PRICE IDs DO STRIPE
UPDATE subscription_plans
SET stripe_price_id = 'price_1SgbcyLEZwMm7eubPS8SJYsF'
WHERE slug = 'professional';

UPDATE subscription_plans
SET stripe_price_id = 'price_1SgbcyLEZwMm7eubizIikI4Y'
WHERE slug = 'business';

-- 4. VERIFICAR RESULTADO FINAL
SELECT
  id,
  slug,
  name,
  ROUND(price::numeric / 100, 2) as "preço_brl",
  stripe_price_id
FROM subscription_plans
ORDER BY id;

-- =====================================================
-- RESULTADO ESPERADO:
-- | id | slug         | name         | preço_brl | stripe_price_id                  |
-- |----|--------------|--------------|-----------|----------------------------------|
-- | 1  | free         | Gratuito     | 0.00      | NULL                             |
-- | 4  | professional | Profissional | 9.00      | price_1SgbcyLEZwMm7eubPS8SJYsF  |
-- | 5  | business     | Negócios     | 29.90     | price_1SgbcyLEZwMm7eubizIikI4Y  |
-- =====================================================
