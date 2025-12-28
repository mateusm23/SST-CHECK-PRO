/**
 * Script de diagnóstico para identificar problema no checkout
 * Execute: npm run stripe:diagnose
 */

import 'dotenv/config';
import { db } from '../server/db';
import { subscriptionPlans } from '../shared/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

async function diagnoseCheckout() {
  console.log('🔍 DIAGNÓSTICO DO CHECKOUT\n');
  console.log('═'.repeat(60));

  // 1. Verificar variáveis de ambiente
  console.log('\n1️⃣ VARIÁVEIS DE AMBIENTE\n');

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error('❌ STRIPE_SECRET_KEY não encontrada!');
    return;
  }

  const keyType = secretKey.startsWith('sk_live') ? 'LIVE' :
                  secretKey.startsWith('sk_test') ? 'TEST' : 'UNKNOWN';
  console.log(`✅ STRIPE_SECRET_KEY encontrada (${keyType})`);
  console.log(`   Início: ${secretKey.substring(0, 20)}...`);

  const profPriceId = process.env.STRIPE_PROFESSIONAL_PRICE_ID;
  const bizPriceId = process.env.STRIPE_BUSINESS_PRICE_ID;

  console.log(`✅ STRIPE_PROFESSIONAL_PRICE_ID: ${profPriceId}`);
  console.log(`✅ STRIPE_BUSINESS_PRICE_ID: ${bizPriceId}`);

  // 2. Testar conexão com Stripe
  console.log('\n2️⃣ CONEXÃO COM STRIPE\n');

  try {
    const stripe = new Stripe(secretKey, {
      apiVersion: '2025-04-30.basil' as any
    });

    // Tentar listar produtos para ver se a chave funciona
    const products = await stripe.products.list({ limit: 1 });
    console.log('✅ Conexão com Stripe OK');
    console.log(`   Mode: ${secretKey.startsWith('sk_live') ? 'LIVE MODE' : 'TEST MODE'}`);
  } catch (error: any) {
    console.error('❌ Erro ao conectar no Stripe:', error.message);
    return;
  }

  // 3. Verificar planos no banco de dados
  console.log('\n3️⃣ PLANOS NO BANCO DE DADOS\n');

  const plans = await db.select().from(subscriptionPlans);

  console.table(plans.map(plan => ({
    'ID': plan.id,
    'Slug': plan.slug,
    'Nome': plan.name,
    'Preço': `R$ ${((plan.price || 0) / 100).toFixed(2)}`,
    'Stripe Price ID': plan.stripePriceId || '❌ NULL'
  })));

  // 4. Verificar se os Price IDs existem no Stripe
  console.log('\n4️⃣ VALIDAR PRICE IDs NO STRIPE\n');

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-04-30.basil' as any
  });

  for (const plan of plans) {
    if (plan.stripePriceId && plan.slug !== 'free') {
      try {
        const price = await stripe.prices.retrieve(plan.stripePriceId);
        console.log(`✅ ${plan.slug}: Price ID válido`);
        console.log(`   └─ Produto: ${price.product}`);
        console.log(`   └─ Valor: ${(price.unit_amount || 0) / 100} ${price.currency.toUpperCase()}`);
        console.log(`   └─ Tipo: ${price.type}`);
        console.log(`   └─ Ativo: ${price.active ? 'SIM' : 'NÃO'}\n`);
      } catch (error: any) {
        console.error(`❌ ${plan.slug}: Price ID INVÁLIDO`);
        console.error(`   └─ Erro: ${error.message}\n`);
      }
    }
  }

  // 5. Simular busca de plano (como o código faz)
  console.log('\n5️⃣ SIMULAR BUSCA DE PLANO\n');

  for (const slug of ['professional', 'business']) {
    const plan = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.slug, slug))
      .limit(1);

    if (plan.length === 0) {
      console.error(`❌ Plano '${slug}' NÃO encontrado no banco`);
    } else {
      const p = plan[0];
      if (!p.stripePriceId) {
        console.error(`❌ Plano '${slug}' encontrado mas stripePriceId é NULL`);
      } else {
        console.log(`✅ Plano '${slug}' encontrado com stripePriceId: ${p.stripePriceId}`);
      }
    }
  }

  // 6. Resumo
  console.log('\n═'.repeat(60));
  console.log('\n6️⃣ RESUMO DO DIAGNÓSTICO\n');

  const profPlan = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.slug, 'professional')).limit(1);
  const bizPlan = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.slug, 'business')).limit(1);

  const issues: string[] = [];

  if (!secretKey) issues.push('STRIPE_SECRET_KEY não configurada');
  if (!profPriceId) issues.push('STRIPE_PROFESSIONAL_PRICE_ID não configurada');
  if (!bizPriceId) issues.push('STRIPE_BUSINESS_PRICE_ID não configurada');
  if (profPlan.length === 0) issues.push('Plano professional não existe no banco');
  if (bizPlan.length === 0) issues.push('Plano business não existe no banco');
  if (profPlan.length > 0 && !profPlan[0].stripePriceId) issues.push('Plano professional sem stripePriceId');
  if (bizPlan.length > 0 && !bizPlan[0].stripePriceId) issues.push('Plano business sem stripePriceId');

  if (issues.length === 0) {
    console.log('✅ NENHUM PROBLEMA ENCONTRADO!');
    console.log('\nO checkout DEVERIA estar funcionando.');
    console.log('Se ainda está com erro, o problema pode ser:');
    console.log('  1. Cache do Railway');
    console.log('  2. Usuário não autenticado');
    console.log('  3. Erro na comunicação com Stripe');
  } else {
    console.log('❌ PROBLEMAS ENCONTRADOS:\n');
    issues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
  }

  console.log('\n═'.repeat(60));
}

diagnoseCheckout()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Erro no diagnóstico:', error);
    process.exit(1);
  });
