import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { vector } from './extensions.js';
import { stores } from './stores.js';

/**
 * FAQ categories for intent-based filtering
 * - shipping: Delivery, shipping times, tracking
 * - returns: Returns, refunds, exchanges
 * - payment: Payment methods, pricing, discounts
 * - policy: Store policies, terms, warranty
 * - product_info: Product-related FAQs (care, usage, specs)
 * - general: General questions, contact, hours
 */
export type FaqCategory = 'shipping' | 'returns' | 'payment' | 'policy' | 'product_info' | 'general';

export const faqs = pgTable('faqs', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  category: text('category').$type<FaqCategory>().default('general'),
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  storeIdIdx: index('faqs_store_id_idx').on(table.storeId),
  categoryIdx: index('faqs_category_idx').on(table.category),
}));

export type Faq = typeof faqs.$inferSelect;
export type NewFaq = typeof faqs.$inferInsert;
