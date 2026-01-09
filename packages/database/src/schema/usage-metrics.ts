import { pgTable, timestamp, uuid, integer, date, index, unique } from 'drizzle-orm/pg-core';
import { stores } from './stores';

export const usageMetrics = pgTable('usage_metrics', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  month: date('month', { mode: 'string' }).notNull(), // YYYY-MM-01 format
  messageCount: integer('message_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  storeIdIdx: index('usage_metrics_store_id_idx').on(table.storeId),
  storeMonthUnique: unique('usage_metrics_store_month_unique').on(table.storeId, table.month),
}));

export type UsageMetric = typeof usageMetrics.$inferSelect;
export type NewUsageMetric = typeof usageMetrics.$inferInsert;
