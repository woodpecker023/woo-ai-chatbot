import { pgTable, text, timestamp, uuid, index, jsonb } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';
import { chatSessions } from './chat-sessions.js';

export const missingDemand = pgTable('missing_demand', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id').references(() => chatSessions.id, { onDelete: 'set null' }),
  query: text('query').notNull(),
  queryType: text('query_type', { enum: ['product', 'faq', 'both'] }).notNull().default('both'),
  metadata: jsonb('metadata').$type<{
    toolsCalled?: string[];
    resultsCount?: number;
    category?: string;
  }>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  storeIdIdx: index('missing_demand_store_id_idx').on(table.storeId),
  queryTypeIdx: index('missing_demand_query_type_idx').on(table.queryType),
  createdAtIdx: index('missing_demand_created_at_idx').on(table.createdAt),
}));

export type MissingDemand = typeof missingDemand.$inferSelect;
export type NewMissingDemand = typeof missingDemand.$inferInsert;
