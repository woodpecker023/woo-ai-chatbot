-- Add category column to FAQs for intent-based filtering
-- Categories: shipping, returns, payment, policy, product_info, general

ALTER TABLE "faqs" ADD COLUMN IF NOT EXISTS "category" text DEFAULT 'general';

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS "faqs_category_idx" ON "faqs" ("category");

-- Update existing FAQs to auto-categorize based on content (best effort)
-- This uses pattern matching on question text

UPDATE "faqs" SET "category" = 'shipping'
WHERE "category" = 'general'
  AND (
    LOWER("question") LIKE '%shipping%'
    OR LOWER("question") LIKE '%delivery%'
    OR LOWER("question") LIKE '%dostava%'
    OR LOWER("question") LIKE '%isporuka%'
    OR LOWER("question") LIKE '%tracking%'
    OR LOWER("question") LIKE '%pracenje%'
  );

UPDATE "faqs" SET "category" = 'returns'
WHERE "category" = 'general'
  AND (
    LOWER("question") LIKE '%return%'
    OR LOWER("question") LIKE '%refund%'
    OR LOWER("question") LIKE '%exchange%'
    OR LOWER("question") LIKE '%povrat%'
    OR LOWER("question") LIKE '%zamena%'
    OR LOWER("question") LIKE '%vracanje%'
  );

UPDATE "faqs" SET "category" = 'payment'
WHERE "category" = 'general'
  AND (
    LOWER("question") LIKE '%payment%'
    OR LOWER("question") LIKE '%pay%'
    OR LOWER("question") LIKE '%price%'
    OR LOWER("question") LIKE '%placanje%'
    OR LOWER("question") LIKE '%cena%'
    OR LOWER("question") LIKE '%popust%'
    OR LOWER("question") LIKE '%discount%'
  );

UPDATE "faqs" SET "category" = 'policy'
WHERE "category" = 'general'
  AND (
    LOWER("question") LIKE '%policy%'
    OR LOWER("question") LIKE '%warranty%'
    OR LOWER("question") LIKE '%guarantee%'
    OR LOWER("question") LIKE '%terms%'
    OR LOWER("question") LIKE '%garancija%'
    OR LOWER("question") LIKE '%uslovi%'
  );
