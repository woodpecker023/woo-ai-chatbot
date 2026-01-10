import { pgTable, text, timestamp, uuid, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { pricingPlans } from './pricing-plans.js';

export const stores = pgTable('stores', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  wooDomain: text('woo_domain'),
  wooConsumerKey: text('woo_consumer_key'),
  wooConsumerSecret: text('woo_consumer_secret'),
  apiKey: text('api_key').notNull().unique(),
  planId: uuid('plan_id').references(() => pricingPlans.id), // null = free tier
  widgetConfig: jsonb('widget_config').$type<{
    theme?: 'light' | 'dark';
    position?: 'left' | 'right';
    greeting?: string;
    primaryColor?: string;
    isActive?: boolean; // true = chatbot enabled, false = disabled
  }>().default({ isActive: true }),
  chatbotConfig: jsonb('chatbot_config').$type<{
    customInstructions?: string;
  }>().default({}),
  botPersona: jsonb('bot_persona').$type<{
    name?: string;        // Bot display name (e.g., "Sarah")
    role?: string;        // Position title (e.g., "Sales Assistant")
    avatarUrl?: string;   // Profile image URL
    language?: string;    // Primary language (e.g., "English", "Serbian")
    description?: string; // Brief business/bot description
  }>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  apiKeyIdx: index('stores_api_key_idx').on(table.apiKey),
  ownerIdIdx: index('stores_owner_id_idx').on(table.ownerId),
}));

export type Store = typeof stores.$inferSelect;
export type NewStore = typeof stores.$inferInsert;
