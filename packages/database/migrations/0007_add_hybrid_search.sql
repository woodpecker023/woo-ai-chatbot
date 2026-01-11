-- T3: Add hybrid search support (semantic + keyword)
-- Purpose: Fix exact matches for SKUs, product names, and specific terms

-- Add tsvector column for products full-text search
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

-- Add tsvector column for FAQs full-text search
ALTER TABLE "faqs" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

-- Create GIN indexes for fast full-text search
CREATE INDEX IF NOT EXISTS "products_search_vector_idx" ON "products" USING GIN ("search_vector");
CREATE INDEX IF NOT EXISTS "faqs_search_vector_idx" ON "faqs" USING GIN ("search_vector");

-- Update existing products with search vectors
-- Combines name and description with different weights (A = highest, D = lowest)
UPDATE "products"
SET "search_vector" =
  setweight(to_tsvector('simple', COALESCE("name", '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE("description", '')), 'B')
WHERE "search_vector" IS NULL;

-- Update existing FAQs with search vectors
UPDATE "faqs"
SET "search_vector" =
  setweight(to_tsvector('simple', COALESCE("question", '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE("answer", '')), 'B')
WHERE "search_vector" IS NULL;

-- Create trigger function to auto-update product search vectors
CREATE OR REPLACE FUNCTION products_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Create trigger function to auto-update FAQ search vectors
CREATE OR REPLACE FUNCTION faqs_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.question, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.answer, '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Create triggers (drop first if exists to avoid duplicates)
DROP TRIGGER IF EXISTS products_search_vector_trigger ON "products";
CREATE TRIGGER products_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "products"
  FOR EACH ROW EXECUTE FUNCTION products_search_vector_update();

DROP TRIGGER IF EXISTS faqs_search_vector_trigger ON "faqs";
CREATE TRIGGER faqs_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "faqs"
  FOR EACH ROW EXECUTE FUNCTION faqs_search_vector_update();
