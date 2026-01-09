import { pgTable, text, timestamp, uuid, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const stores = pgTable('stores', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  wooDomain: text('woo_domain'),
  wooConsumerKey: text('woo_consumer_key'),
  wooConsumerSecret: text('woo_consumer_secret'),
  apiKey: text('api_key').notNull().unique(),
  widgetConfig: jsonb('widget_config').$type<{
    theme?: 'light' | 'dark';
    position?: 'left' | 'right';
    greeting?: string;
    primaryColor?: string;
  }>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  apiKeyIdx: index('stores_api_key_idx').on(table.apiKey),
  ownerIdIdx: index('stores_owner_id_idx').on(table.ownerId),
}));

export type Store = typeof stores.$inferSelect;
export type NewStore = typeof stores.$inferInsert;
