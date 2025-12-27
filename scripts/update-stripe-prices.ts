/**
 * Script para atualizar os Price IDs do Stripe nos planos
 * Execute: npm run tsx scripts/update-stripe-prices.ts
 */

import { db } from '../server/db';
import { subscriptionPlans } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function updateStripePrices() {
  console.log('🔄 Atualizando Price IDs do Stripe...\n');

  try {
    // Atualizar Plano Profissional (tenta ambos os slugs)
    const professionalPriceId = process.env.STRIPE_PROFESSIONAL_PRICE_ID;
    if (professionalPriceId) {
      // Tenta primeiro com 'professional' (inglês)
      let result = await db
        .update(subscriptionPlans)
        .set({ stripePriceId: professionalPriceId })
        .where(eq(subscriptionPlans.slug, 'professional'))
        .returning();

      // Se não encontrar, tenta com 'profissional' (português)
      if (result.length === 0) {
        result = await db
          .update(subscriptionPlans)
          .set({ stripePriceId: professionalPriceId })
          .where(eq(subscriptionPlans.slug, 'profissional'))
          .returning();
      }

      if (result.length > 0) {
        console.log('✅ Plano Profissional atualizado:');
        console.log(`   ID: ${result[0].id}`);
        console.log(`   Slug: ${result[0].slug}`);
        console.log(`   Nome: ${result[0].name}`);
        console.log(`   Stripe Price ID: ${result[0].stripePriceId}\n`);
      } else {
        console.log('⚠️  Plano Profissional não encontrado no banco\n');
      }
    } else {
      console.log('⚠️  STRIPE_PROFESSIONAL_PRICE_ID não configurado\n');
    }

    // Atualizar Plano Negócios (tenta ambos os slugs)
    const businessPriceId = process.env.STRIPE_BUSINESS_PRICE_ID;
    if (businessPriceId) {
      // Tenta primeiro com 'business' (inglês)
      let result = await db
        .update(subscriptionPlans)
        .set({ stripePriceId: businessPriceId })
        .where(eq(subscriptionPlans.slug, 'business'))
        .returning();

      // Se não encontrar, tenta com 'negocios' (português)
      if (result.length === 0) {
        result = await db
          .update(subscriptionPlans)
          .set({ stripePriceId: businessPriceId })
          .where(eq(subscriptionPlans.slug, 'negocios'))
          .returning();
      }

      if (result.length > 0) {
        console.log('✅ Plano Negócios atualizado:');
        console.log(`   ID: ${result[0].id}`);
        console.log(`   Slug: ${result[0].slug}`);
        console.log(`   Nome: ${result[0].name}`);
        console.log(`   Stripe Price ID: ${result[0].stripePriceId}\n`);
      } else {
        console.log('⚠️  Plano Negócios não encontrado no banco\n');
      }
    } else {
      console.log('⚠️  STRIPE_BUSINESS_PRICE_ID não configurado\n');
    }

    console.log('✅ Atualização concluída!\n');
    console.log('🔍 Verificando planos atualizados...\n');

    // Listar todos os planos para verificação
    const allPlans = await db.select().from(subscriptionPlans);
    console.table(allPlans.map(plan => ({
      'Slug': plan.slug,
      'Nome': plan.name,
      'Preço': `R$ ${((plan.price || 0) / 100).toFixed(2)}`,
      'Stripe Price ID': plan.stripePriceId || '❌ Não configurado'
    })));

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao atualizar Price IDs:', error);
    process.exit(1);
  }
}

updateStripePrices();
