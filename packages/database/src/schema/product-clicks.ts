import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';
import { products } from './products.js';
import { chatSessions } from './chat-sessions.js';

export const productClicks = pgTable('product_clicks', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  sessionId: uuid('session_id').references(() => chatSessions.id, { onDelete: 'set null' }),
  productName: text('product_name').notNull(),
  productUrl: text('product_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  storeIdIdx: index('product_clicks_store_id_idx').on(table.storeId),
  productIdIdx: index('product_clicks_product_id_idx').on(table.productId),
  createdAtIdx: index('product_clicks_created_at_idx').on(table.createdAt),
}));

export type ProductClick = typeof productClicks.$inferSelect;
export type NewProductClick = typeof productClicks.$inferInsert;
