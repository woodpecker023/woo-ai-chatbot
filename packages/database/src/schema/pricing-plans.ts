import { pgTable, text, timestamp, uuid, integer, jsonb } from 'drizzle-orm/pg-core';

export const pricingPlans = pgTable('pricing_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(), // 'free', 'starter', 'pro', 'enterprise'
  displayName: text('display_name').notNull(), // 'Free', 'Starter', 'Pro', 'Enterprise'
  monthlyMessageLimit: integer('monthly_message_limit').notNull(), // -1 for unlimited
  priceCents: integer('price_cents').notNull().default(0),
  features: jsonb('features').$type<{
    widgetCustomization?: boolean;
    prioritySupport?: boolean;
    customBranding?: boolean;
    apiAccess?: boolean;
  }>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type PricingPlan = typeof pricingPlans.$inferSelect;
export type NewPricingPlan = typeof pricingPlans.$inferInsert;
