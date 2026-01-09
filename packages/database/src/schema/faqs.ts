import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { vector } from './extensions.js';
import { stores } from './stores.js';

export const faqs = pgTable('faqs', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  storeIdIdx: index('faqs_store_id_idx').on(table.storeId),
}));

export type Faq = typeof faqs.$inferSelect;
export type NewFaq = typeof faqs.$inferInsert;
