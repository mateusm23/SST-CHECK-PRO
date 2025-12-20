import { getUncachableStripeClient } from "./stripeClient";
import { db } from "./db";
import { subscriptionPlans } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seedStripeProducts() {
  console.log("Creating Stripe products and prices for SST Check Pro...");
  
  const stripe = await getUncachableStripeClient();

  const plans = [
    {
      slug: "professional",
      name: "SST Check Pro - Profissional",
      description: "30 inspeções por mês, todos os checklists de NRs, upload de logo, planos de ação com IA",
      price: 900,
      currency: "brl",
      interval: "month" as const,
    },
    {
      slug: "business",
      name: "SST Check Pro - Negócios",
      description: "Inspeções ilimitadas, múltiplas empresas, API de integração, dashboard avançado, suporte dedicado",
      price: 14990,
      currency: "brl",
      interval: "month" as const,
    },
  ];

  for (const plan of plans) {
    console.log(`\nCreating product: ${plan.name}...`);
    
    const existingProducts = await stripe.products.search({
      query: `name:'${plan.name}'`,
    });

    let product;
    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0];
      console.log(`Product already exists: ${product.id}`);
    } else {
      product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: {
          slug: plan.slug,
          app: "sst-check-pro",
        },
      });
      console.log(`Created product: ${product.id}`);
    }

    const existingPrices = await stripe.prices.list({
      product: product.id,
      active: true,
    });

    let price;
    const matchingPrice = existingPrices.data.find(
      (p) => 
        p.unit_amount === plan.price && 
        p.currency === plan.currency &&
        p.recurring?.interval === plan.interval
    );

    if (matchingPrice) {
      price = matchingPrice;
      console.log(`Price already exists: ${price.id}`);
    } else {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.price,
        currency: plan.currency,
        recurring: { interval: plan.interval },
        metadata: {
          slug: plan.slug,
        },
      });
      console.log(`Created price: ${price.id}`);
    }

    await db
      .update(subscriptionPlans)
      .set({ stripePriceId: price.id })
      .where(eq(subscriptionPlans.slug, plan.slug));
    console.log(`Updated database with price ID for ${plan.slug}`);
  }

  console.log("\n✅ Stripe products and prices created successfully!");
  console.log("The webhook will automatically sync these to your database.");
}

seedStripeProducts()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error seeding Stripe products:", err);
    process.exit(1);
  });
