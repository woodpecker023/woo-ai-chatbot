import { getDbClient } from '@woo-ai/database';
import { products, faqs } from '@woo-ai/database';
import { eq, sql } from 'drizzle-orm';
import { generateEmbedding } from './openai.js';
import type { RagProductResult, RagFaqResult } from '@woo-ai/shared';

/**
 * Search products using vector similarity
 */
export async function searchProducts(
  storeId: string,
  query: string,
  limit: number = 5
): Promise<RagProductResult[]> {
  const db = getDbClient();

  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query);

  // Perform vector similarity search
  const results = await db
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      price: products.price,
      currency: products.currency,
      url: products.url,
      imageUrl: products.imageUrl,
      similarity: sql<number>`1 - (${products.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`,
    })
    .from(products)
    .where(eq(products.storeId, storeId))
    .orderBy(sql`${products.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector`)
    .limit(limit);

  return results.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description || '',
    price: r.price || '0',
    currency: r.currency || 'USD',
    url: r.url || '',
    imageUrl: r.imageUrl || undefined,
    similarity: r.similarity,
  }));
}

/**
 * Search FAQs using vector similarity
 */
export async function searchFaqs(
  storeId: string,
  query: string,
  limit: number = 3
): Promise<RagFaqResult[]> {
  const db = getDbClient();

  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query);

  // Perform vector similarity search
  const results = await db
    .select({
      id: faqs.id,
      question: faqs.question,
      answer: faqs.answer,
      similarity: sql<number>`1 - (${faqs.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`,
    })
    .from(faqs)
    .where(eq(faqs.storeId, storeId))
    .orderBy(sql`${faqs.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector`)
    .limit(limit);

  return results.map((r) => ({
    id: r.id,
    question: r.question,
    answer: r.answer,
    similarity: r.similarity,
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
