-- Add product_clicks table for tracking clicks on products shown in chat
CREATE TABLE IF NOT EXISTS "product_clicks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "store_id" uuid NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
  "product_id" uuid REFERENCES "products"("id") ON DELETE SET NULL,
  "session_id" uuid REFERENCES "chat_sessions"("id") ON DELETE SET NULL,
  "product_name" text NOT NULL,
  "product_url" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "product_clicks_store_id_idx" ON "product_clicks"("store_id");
CREATE INDEX IF NOT EXISTS "product_clicks_product_id_idx" ON "product_clicks"("product_id");
CREATE INDEX IF NOT EXISTS "product_clicks_created_at_idx" ON "product_clicks"("created_at");

-- Add missing_demand table for tracking unanswered customer queries
CREATE TABLE IF NOT EXISTS "missing_demand" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "store_id" uuid NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
  "session_id" uuid REFERENCES "chat_sessions"("id") ON DELETE SET NULL,
  "query" text NOT NULL,
  "query_type" text NOT NULL DEFAULT 'both',
  "metadata" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "missing_demand_store_id_idx" ON "missing_demand"("store_id");
CREATE INDEX IF NOT EXISTS "missing_demand_query_type_idx" ON "missing_demand"("query_type");
CREATE INDEX IF NOT EXISTS "missing_demand_created_at_idx" ON "missing_demand"("created_at");
