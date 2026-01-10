-- Migration: Add pricing plans table and plan_id to stores
-- Date: 2026-01-09

-- Create pricing_plans table
CREATE TABLE IF NOT EXISTS "pricing_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL UNIQUE,
  "display_name" text NOT NULL,
  "monthly_message_limit" integer NOT NULL,
  "price_cents" integer NOT NULL DEFAULT 0,
  "features" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Add plan_id column to stores table
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "plan_id" uuid REFERENCES "pricing_plans"("id");

-- Seed default pricing plans
INSERT INTO "pricing_plans" ("name", "display_name", "monthly_message_limit", "price_cents", "features")
VALUES
  ('free', 'Free', 100, 0, '{"widgetCustomization": false, "prioritySupport": false, "customBranding": false, "apiAccess": false}'),
  ('starter', 'Starter', 1000, 2900, '{"widgetCustomization": true, "prioritySupport": false, "customBranding": false, "apiAccess": false}'),
  ('pro', 'Pro', 10000, 9900, '{"widgetCustomization": true, "prioritySupport": true, "customBranding": true, "apiAccess": false}'),
  ('enterprise', 'Enterprise', -1, 29900, '{"widgetCustomization": true, "prioritySupport": true, "customBranding": true, "apiAccess": true}')
ON CONFLICT ("name") DO NOTHING;

-- Set existing stores to free plan by default
UPDATE "stores"
SET "plan_id" = (SELECT "id" FROM "pricing_plans" WHERE "name" = 'free')
WHERE "plan_id" IS NULL;
