-- Add bot_persona column to stores table
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "bot_persona" jsonb DEFAULT '{}';
