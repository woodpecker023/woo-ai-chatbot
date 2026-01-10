-- Add chatbot_config column to stores table
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "chatbot_config" jsonb DEFAULT '{}';
