// Popula o banco com os 3 planos de assinatura
// Uso: railway run npx tsx init-database.ts

import { db } from "./server/db";
import { subscriptionPlans } from "./shared/schema";
import { eq } from "drizzle-orm";

async function initializeDatabase() {
  console.log("Criando planos de assinatura...\n");

  try {
    const plans = [
      {
        name: "Gratuito",
        slug: "free",
        monthlyLimit: 3,
        canUploadLogo: false,
        stripePriceId: null,
        price: 0,
      },
      {
        name: "Profissional",
        slug: "profissional",
        monthlyLimit: 10,
        canUploadLogo: false,
        stripePriceId: "profissional_payment_link",
        price: 900,
      },
      {
        name: "Negócios",
        slug: "negocios",
        monthlyLimit: 30,
        canUploadLogo: false,
        stripePriceId: "negocios_payment_link",
        price: 2990,
      },
    ];

    for (const plan of plans) {
      const existing = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.slug, plan.slug))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(subscriptionPlans)
          .set(plan)
          .where(eq(subscriptionPlans.slug, plan.slug));
        console.log(`✓ Plano "${plan.name}" atualizado`);
      } else {
        await db.insert(subscriptionPlans).values(plan);
        console.log(`✓ Plano "${plan.name}" criado`);
      }
    }

    console.log("\nSucesso! Banco inicializado.");
  } catch (error) {
    console.error("Erro:", error);
    process.exit(1);
  }

  process.exit(0);
}

initializeDatabase();
