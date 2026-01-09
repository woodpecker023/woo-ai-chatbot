import { pgTable, text, timestamp, uuid, decimal, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { vector } from './extensions.js';
import { stores } from './stores.js';

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  wooProductId: text('woo_product_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }),
  currency: text('currency'),
  url: text('url'),
  imageUrl: text('image_url'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  storeIdIdx: index('products_store_id_idx').on(table.storeId),
  storeProductUnique: unique('products_store_woo_id_unique').on(table.storeId, table.wooProductId),
}));

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
