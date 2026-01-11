import { getDbClient } from '@woo-ai/database';
import { products, faqs } from '@woo-ai/database';
import { eq, sql, and, inArray } from 'drizzle-orm';
import { generateEmbedding } from './openai.js';
import type { RagProductResult, RagFaqResult } from '@woo-ai/shared';
import type { FaqCategory } from '@woo-ai/database';

/**
 * Intent to source type mapping for pre-filtering
 */
export type SourceType = 'product' | 'faq';

export interface SearchFilters {
  sourceTypes?: SourceType[];
  faqCategories?: FaqCategory[];
  minSimilarity?: number;
}

/**
 * Get appropriate filters based on intent
 */
export function getFiltersForIntent(intent: string): SearchFilters {
  switch (intent) {
    case 'PRODUCT_DISCOVERY':
    case 'PRODUCT_DETAILS':
    case 'PRODUCT_COMPARE':
      return {
        sourceTypes: ['product'],
        minSimilarity: 0.3,
      };

    case 'SHIPPING_RETURNS':
      return {
        sourceTypes: ['faq'],
        faqCategories: ['shipping', 'returns'],
        minSimilarity: 0.4,
      };

    case 'PAYMENT':
      return {
        sourceTypes: ['faq'],
        faqCategories: ['payment'],
        minSimilarity: 0.4,
      };

    case 'POLICY':
      return {
        sourceTypes: ['faq'],
        faqCategories: ['policy', 'returns'],
        minSimilarity: 0.4,
      };

    case 'ORDER_STATUS':
      // ORDER_STATUS doesn't use RAG at all
      return {
        sourceTypes: [],
      };

    case 'SMALLTALK':
      // SMALLTALK doesn't use RAG
      return {
        sourceTypes: [],
      };

    case 'GENERAL_SUPPORT':
    default:
      // Allow all sources for general support
      return {
        sourceTypes: ['product', 'faq'],
        minSimilarity: 0.3,
      };
  }
}

/**
 * Hybrid search weights
 * Semantic similarity: 60%, Keyword match: 40%
 */
const SEMANTIC_WEIGHT = 0.6;
const KEYWORD_WEIGHT = 0.4;

/**
 * Prepare search query for tsvector matching
 * Converts natural language query to tsquery format
 */
function prepareSearchQuery(query: string): string {
  // Split into words, remove special chars, join with OR for flexible matching
  const words = query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);

  if (words.length === 0) return '';

  // Use :* for prefix matching (e.g., "harr" matches "harry")
  return words.map((w) => `${w}:*`).join(' | ');
}

/**
 * Search products using hybrid search (semantic + keyword)
 * Combines vector similarity (60%) with full-text search (40%)
 */
export async function searchProducts(
  storeId: string,
  query: string,
  limit: number = 5,
  filters?: SearchFilters
): Promise<RagProductResult[]> {
  // If filters explicitly exclude products, return empty
  if (filters?.sourceTypes && !filters.sourceTypes.includes('product')) {
    return [];
  }

  const db = getDbClient();

  // Generate embedding for semantic search
  const queryEmbedding = await generateEmbedding(query);
  const minSimilarity = filters?.minSimilarity ?? 0.2;

  // Prepare keyword search query
  const searchQuery = prepareSearchQuery(query);

  // Perform hybrid search combining semantic and keyword scores
  // Uses COALESCE to handle null search_vector (backward compatibility)
  const results = await db
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      price: products.price,
      currency: products.currency,
      url: products.url,
      imageUrl: products.imageUrl,
      semanticScore: sql<number>`1 - (${products.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`,
      keywordScore: sql<number>`COALESCE(
        ts_rank(search_vector, to_tsquery('simple', ${searchQuery})) * 2,
        0
      )`,
      hybridScore: sql<number>`(
        ${SEMANTIC_WEIGHT} * (1 - (${products.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)) +
        ${KEYWORD_WEIGHT} * COALESCE(ts_rank(search_vector, to_tsquery('simple', ${searchQuery})) * 2, 0)
      )`,
    })
    .from(products)
    .where(
      and(
        eq(products.storeId, storeId),
        sql`(
          1 - (${products.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector) > ${minSimilarity}
          OR (search_vector IS NOT NULL AND search_vector @@ to_tsquery('simple', ${searchQuery}))
        )`
      )
    )
    .orderBy(sql`(
      ${SEMANTIC_WEIGHT} * (1 - (${products.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)) +
      ${KEYWORD_WEIGHT} * COALESCE(ts_rank(search_vector, to_tsquery('simple', ${searchQuery})) * 2, 0)
    ) DESC`)
    .limit(limit);

  return results.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description || '',
    price: r.price || '0',
    currency: r.currency || 'USD',
    url: r.url || '',
    imageUrl: r.imageUrl || undefined,
    similarity: r.hybridScore, // Return hybrid score as similarity
  }));
}

/**
 * Search FAQs using hybrid search (semantic + keyword) with optional category filtering
 * Combines vector similarity (60%) with full-text search (40%)
 */
export async function searchFaqs(
  storeId: string,
  query: string,
  limit: number = 3,
  filters?: SearchFilters
): Promise<RagFaqResult[]> {
  // If filters explicitly exclude faqs, return empty
  if (filters?.sourceTypes && !filters.sourceTypes.includes('faq')) {
    return [];
  }

  const db = getDbClient();

  // Generate embedding for semantic search
  const queryEmbedding = await generateEmbedding(query);
  const minSimilarity = filters?.minSimilarity ?? 0.2;

  // Prepare keyword search query
  const searchQuery = prepareSearchQuery(query);

  // Build base conditions
  const baseConditions = [eq(faqs.storeId, storeId)];

  // Add category filter if specified
  if (filters?.faqCategories && filters.faqCategories.length > 0) {
    baseConditions.push(inArray(faqs.category, filters.faqCategories));
  }

  // Perform hybrid search combining semantic and keyword scores
  const results = await db
    .select({
      id: faqs.id,
      question: faqs.question,
      answer: faqs.answer,
      category: faqs.category,
      semanticScore: sql<number>`1 - (${faqs.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`,
      keywordScore: sql<number>`COALESCE(
        ts_rank(search_vector, to_tsquery('simple', ${searchQuery})) * 2,
        0
      )`,
      hybridScore: sql<number>`(
        ${SEMANTIC_WEIGHT} * (1 - (${faqs.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)) +
        ${KEYWORD_WEIGHT} * COALESCE(ts_rank(search_vector, to_tsquery('simple', ${searchQuery})) * 2, 0)
      )`,
    })
    .from(faqs)
    .where(
      and(
        ...baseConditions,
        sql`(
          1 - (${faqs.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector) > ${minSimilarity}
          OR (search_vector IS NOT NULL AND search_vector @@ to_tsquery('simple', ${searchQuery}))
        )`
      )
    )
    .orderBy(sql`(
      ${SEMANTIC_WEIGHT} * (1 - (${faqs.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)) +
      ${KEYWORD_WEIGHT} * COALESCE(ts_rank(search_vector, to_tsquery('simple', ${searchQuery})) * 2, 0)
    ) DESC`)
    .limit(limit);

  return results.map((r) => ({
    id: r.id,
    question: r.question,
    answer: r.answer,
    category: r.category ?? undefined,
    similarity: r.hybridScore, // Return hybrid score as similarity
  }));
}

/**
 * Generate and store embedding for a product
 */
export async function embedProduct(productId: string, name: string, description: string): Promise<number[]> {
  const text = `${name}\n${description}`;
  const embedding = await generateEmbedding(text);

  const db = getDbClient();
  await db
    .update(products)
    .set({ embedding })
    .where(eq(products.id, productId));

  return embedding;
}

/**
 * Generate and store embedding for an FAQ
 */
export async function embedFaq(faqId: string, question: string, answer: string): Promise<number[]> {
  const text = `Q: ${question}\nA: ${answer}`;
  const embedding = await generateEmbedding(text);

  const db = getDbClient();
  await db
    .update(faqs)
    .set({ embedding })
    .where(eq(faqs.id, faqId));

  return embedding;
}
