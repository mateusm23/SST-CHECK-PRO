/**
 * Script para corrigir banco de PRODUÇÃO
 * Execute: npm run stripe:fix-production
 */

import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

async function fixProductionDatabase() {
  // Debug: verificar se DATABASE_URL está carregada
  if (!process.env.DATABASE_URL) {
    throw new Error('❌ DATABASE_URL não encontrada no .env');
  }

  console.log('🔗 DATABASE_URL encontrada:', process.env.DATABASE_URL.substring(0, 50) + '...\n');

  // Conecta no banco de PRODUÇÃO (Railway)
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Conectando ao banco de PRODUÇÃO...\n');

    // 1. Verificar estado atual
    console.log('📊 Estado ANTES das correções:\n');
    const beforeResult = await pool.query(`
      SELECT id, slug, name, price, stripe_price_id
      FROM subscription_plans
      ORDER BY id
    `);
    console.table(beforeResult.rows);

    // 2. Corrigir slugs
    console.log('\n🔧 Corrigindo slugs...\n');

    await pool.query(`
      UPDATE subscription_plans
      SET slug = 'professional'
      WHERE slug = 'profissional' OR name = 'Profissional'
    `);
    console.log('✅ Slug "profissional" → "professional"');

    await pool.query(`
      UPDATE subscription_plans
      SET slug = 'business'
      WHERE slug = 'negocios' OR name = 'Negócios'
    `);
    console.log('✅ Slug "negocios" → "business"');

    // 3. Atualizar Price IDs
    console.log('\n💳 Atualizando Price IDs do Stripe...\n');

    const profResult = await pool.query(`
      UPDATE subscription_plans
      SET stripe_price_id = $1
      WHERE slug = 'professional'
      RETURNING *
    `, [process.env.STRIPE_PROFESSIONAL_PRICE_ID]);

    if (profResult.rowCount && profResult.rowCount > 0) {
      console.log('✅ Price ID do Plano Profissional atualizado');
      console.log(`   → ${process.env.STRIPE_PROFESSIONAL_PRICE_ID}`);
    }

    const bizResult = await pool.query(`
      UPDATE subscription_plans
      SET stripe_price_id = $1
      WHERE slug = 'business'
      RETURNING *
    `, [process.env.STRIPE_BUSINESS_PRICE_ID]);

    if (bizResult.rowCount && bizResult.rowCount > 0) {
      console.log('✅ Price ID do Plano Negócios atualizado');
      console.log(`   → ${process.env.STRIPE_BUSINESS_PRICE_ID}`);
    }

    // 4. Verificar resultado final
    console.log('\n📊 Estado DEPOIS das correções:\n');
    const afterResult = await pool.query(`
      SELECT
        id,
        slug,
        name,
        ROUND(price::numeric / 100, 2) as "preço_brl",
        stripe_price_id
      FROM subscription_plans
      ORDER BY id
    `);
    console.table(afterResult.rows);

    console.log('\n✅ Banco de PRODUÇÃO atualizado com sucesso!\n');
    console.log('🎉 Agora você pode testar o checkout:\n');
    console.log('   1. Acesse: https://www.sstcheckpro.com.br/pricing');
    console.log('   2. Faça login');
    console.log('   3. Clique em "Assinar Agora"');
    console.log('   4. Deve redirecionar para o Stripe ✅\n');

  } catch (error) {
    console.error('❌ Erro ao atualizar banco de produção:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

fixProductionDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
