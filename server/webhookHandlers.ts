import Stripe from 'stripe';
import { getStripeSecretKey } from './stripeClient';
import { db } from './db';
import { userSubscriptions, subscriptionPlans } from '@shared/schema';
import { eq } from 'drizzle-orm';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const secret = await getStripeSecretKey();
    const stripe = new Stripe(secret, { apiVersion: '2025-04-30.basil' as any });

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET || '');
    } catch (err: any) {
      console.error('Webhook verification failed:', err.message || err);
      throw err;
    }

    console.log('Received Stripe event:', event.type);

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          // expand subscription and customer if not present
          const fullSession = await stripe.checkout.sessions.retrieve(session.id as string, { expand: ['subscription', 'customer'] });
          const subscription = fullSession.subscription as Stripe.Subscription | null;
          const customer = fullSession.customer as Stripe.Customer | string | null;

          let userId: string | undefined;
          if (typeof customer !== 'string' && customer && (customer as any).metadata?.userId) {
            userId = (customer as any).metadata.userId;
          }

          if (subscription) {
            const priceId = subscription.items.data[0]?.price?.id;
            const planRow = priceId ? (await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.stripePriceId, priceId)))[0] : undefined;

            if (userId && planRow) {
              const existing = (await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, userId)))[0];
              const sub = subscription as any;
              const periodStart = sub.current_period_start || sub.currentPeriodStart;
              const periodEnd = sub.current_period_end || sub.currentPeriodEnd;
              const insertOrUpdate = {
                userId,
                planId: planRow.id,
                stripeCustomerId: typeof customer === 'string' ? (subscription.customer as string) : (customer as any).id,
                stripeSubscriptionId: subscription.id,
                status: subscription.status,
                currentPeriodStart: periodStart ? new Date(periodStart * 1000) : undefined,
                currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
              };

              if (existing) {
                await db.update(userSubscriptions).set(insertOrUpdate).where(eq(userSubscriptions.userId, userId));
              } else {
                await db.insert(userSubscriptions).values(insertOrUpdate as any);
              }
              console.log('Created/updated user subscription for userId:', userId);
            } else {
              console.log('checkout.session.completed: missing userId or planRow; skipping upsert');
            }
          }
          break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          // Ensure we have customer metadata or find user by stripe customer id
          let customerObj: Stripe.Customer | null = null;
          if (typeof subscription.customer === 'string') {
            try {
              customerObj = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
            } catch (e) {
              console.warn('Failed to retrieve customer for subscription event:', e);
            }
          } else {
            customerObj = subscription.customer as Stripe.Customer;
          }

          const userId = customerObj && (customerObj as any).metadata?.userId;
          const priceId = subscription.items.data[0]?.price?.id;
          const planRow = priceId ? (await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.stripePriceId, priceId)))[0] : undefined;

          // Try to find existing user subscription by stripe customer id
          const existingByCustomer = (await db.select().from(userSubscriptions).where(eq(userSubscriptions.stripeCustomerId, (customerObj as any)?.id || (subscription.customer as string))))[0];

          const sub = subscription as any;
          const periodStart = sub.current_period_start || sub.currentPeriodStart;
          const periodEnd = sub.current_period_end || sub.currentPeriodEnd;
          const payload = {
            planId: planRow?.id || existingByCustomer?.planId || null,
            stripeCustomerId: (customerObj as any)?.id || (subscription.customer as string),
            stripeSubscriptionId: subscription.id,
            status: subscription.status,
            currentPeriodStart: periodStart ? new Date(periodStart * 1000) : undefined,
            currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
          };

          if (userId) {
            const existing = (await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, userId)))[0];
            if (existing) {
              await db.update(userSubscriptions).set(payload as any).where(eq(userSubscriptions.userId, userId));
              console.log('Updated subscription for userId', userId);
            } else {
              // create only if we have a planId (must not be null)
              if (payload.planId) {
                await db.insert(userSubscriptions).values({ userId, ...payload } as any);
                console.log('Inserted subscription for userId', userId);
              } else {
                console.log('No planId to create subscription for userId', userId);
              }
            }
          } else if (existingByCustomer) {
            await db.update(userSubscriptions).set(payload as any).where(eq(userSubscriptions.id, existingByCustomer.id));
            console.log('Updated subscription by stripeCustomerId', existingByCustomer.stripeCustomerId);
          } else {
            console.log('Subscription event: no userId or existing subscription found; skipping');
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = typeof subscription.customer === 'string' ? subscription.customer : (subscription.customer as any)?.id;
          const existing = (await db.select().from(userSubscriptions).where(eq(userSubscriptions.stripeCustomerId, customerId)))[0];
          if (existing) {
            await db.update(userSubscriptions).set({ status: 'canceled' }).where(eq(userSubscriptions.id, existing.id));
            console.log('Marked subscription canceled for customer', customerId);
          }
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = (invoice as any).subscription as string | null;
          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const sub = subscription as any;
            const customerId = typeof subscription.customer === 'string' ? subscription.customer : (subscription.customer as any)?.id;
            const existing = (await db.select().from(userSubscriptions).where(eq(userSubscriptions.stripeSubscriptionId, subscriptionId)))[0]
              || (await db.select().from(userSubscriptions).where(eq(userSubscriptions.stripeCustomerId, customerId)))[0];

            if (existing) {
              const periodStart = sub.current_period_start || sub.currentPeriodStart;
              const periodEnd = sub.current_period_end || sub.currentPeriodEnd;
              await db.update(userSubscriptions).set({
                currentPeriodStart: periodStart ? new Date(periodStart * 1000) : undefined,
                currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
                status: subscription.status,
              } as any).where(eq(userSubscriptions.id, existing.id));
              console.log('Updated billing period for subscription', subscriptionId);
            }
          }
          break;
        }

        default:
          console.log('Unhandled event type:', event.type);
      }
    } catch (err: any) {
      console.error('Error handling Stripe event:', err.message || err);
      // don't throw so Stripe doesn't retry infinitely on our processing errors
    }
  }
}
