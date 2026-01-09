import { FastifyInstance } from 'fastify';
import Stripe from 'stripe';
import { getDbClient } from '@woo-ai/database';
import { subscriptions } from '@woo-ai/database';
import { eq } from 'drizzle-orm';

let stripe: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-02-24.acacia',
    });
  }
  return stripe;
}

// Extend FastifyRequest to include rawBody
declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: Buffer;
  }
}

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'incomplete';

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'canceled':
      return 'canceled';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    default:
      return 'incomplete';
  }
}

export async function webhookRoutes(server: FastifyInstance) {
  server.post('/stripe', {
    config: {
      // Disable body parsing for webhook
      rawBody: true,
    },
    handler: async (request, reply) => {
      const signature = request.headers['stripe-signature'] as string;

      if (!signature) {
        return reply.status(400).send({ error: 'Missing signature' });
      }

      let event: Stripe.Event;

      try {
        const stripeClient = getStripeClient();
        event = stripeClient.webhooks.constructEvent(
          request.rawBody as Buffer,
          signature,
          WEBHOOK_SECRET
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        server.log.error(`Webhook signature verification failed: ${message}`);
        return reply.status(400).send({ error: 'Invalid signature' });
      }

      const db = getDbClient();

      try {
        switch (event.type) {
          case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;

            // Create or update subscription
            await db
              .insert(subscriptions)
              .values({
                storeId: session.metadata?.storeId || '',
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: session.subscription as string,
                status: 'active',
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
              })
              .onConflictDoUpdate({
                target: subscriptions.storeId,
                set: {
                  stripeCustomerId: session.customer as string,
                  stripeSubscriptionId: session.subscription as string,
                  status: 'active',
                  currentPeriodStart: new Date(),
                  currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                  updatedAt: new Date(),
                },
              });

            server.log.info(`Subscription created for store ${session.metadata?.storeId}`);
            break;
          }

          case 'customer.subscription.updated': {
            const subscription = event.data.object as Stripe.Subscription;

            await db
              .update(subscriptions)
              .set({
                status: mapStripeStatus(subscription.status),
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                updatedAt: new Date(),
              })
              .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

            server.log.info(`Subscription updated: ${subscription.id}`);
            break;
          }

          case 'customer.subscription.deleted': {
            const subscription = event.data.object as Stripe.Subscription;

            await db
              .update(subscriptions)
              .set({
                status: 'canceled',
                updatedAt: new Date(),
              })
              .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

            server.log.info(`Subscription canceled: ${subscription.id}`);
            break;
          }

          case 'invoice.payment_failed': {
            const invoice = event.data.object as Stripe.Invoice;

            if (invoice.subscription) {
              await db
                .update(subscriptions)
                .set({
                  status: 'past_due',
                  updatedAt: new Date(),
                })
                .where(eq(subscriptions.stripeSubscriptionId, invoice.subscription as string));

              server.log.warn(`Payment failed for subscription: ${invoice.subscription}`);
            }
            break;
          }

          default:
            server.log.info(`Unhandled event type: ${event.type}`);
        }

        return { received: true };
      } catch (error) {
        server.log.error(`Error processing webhook: ${error}`);
        return reply.status(500).send({ error: 'Webhook processing failed' });
      }
    },
  });
}
