/**
 * Script para corrigir slugs dos planos (português → inglês)
 * Execute: npm run stripe:fix-slugs
 */

import { db } from '../server/db';
import { subscriptionPlans } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function fixSlugs() {
  console.log('🔄 Corrigindo slugs dos planos...\n');

  try {
    // Atualizar 'profissional' → 'professional'
    const profResult = await db
      .update(subscriptionPlans)
      .set({ slug: 'professional' })
      .where(eq(subscriptionPlans.slug, 'profissional'))
      .returning();

    if (profResult.length > 0) {
      console.log('✅ Slug atualizado: profissional → professional');
    }

    // Atualizar 'negocios' → 'business'
    const bizResult = await db
      .update(subscriptionPlans)
      .set({ slug: 'business' })
      .where(eq(subscriptionPlans.slug, 'negocios'))
      .returning();

    if (bizResult.length > 0) {
      console.log('✅ Slug atualizado: negocios → business\n');
    }

    console.log('✅ Slugs corrigidos!\n');
    console.log('🔍 Verificando planos atualizados...\n');

    // Listar todos os planos
    const allPlans = await db.select().from(subscriptionPlans);
    console.table(allPlans.map(plan => ({
      'ID': plan.id,
      'Slug': plan.slug,
      'Nome': plan.name,
      'Preço': `R$ ${((plan.price || 0) / 100).toFixed(2)}`,
      'Stripe Price ID': plan.stripePriceId || '❌ Não configurado'
    })));

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao corrigir slugs:', error);
    process.exit(1);
  }
}

fixSlugs();
