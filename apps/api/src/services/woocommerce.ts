import { getDbClient } from '@woo-ai/database';
import { products, stores } from '@woo-ai/database';
import { eq } from 'drizzle-orm';
import { generateEmbedding } from './openai.js';

interface WooProduct {
  id: number;
  name: string;
  description: string;
  short_description: string;
  price: string;
  regular_price: string;
  permalink: string;
  images: Array<{ src: string }>;
}

/**
 * Sync products from WooCommerce store
 */
export async function syncProducts(storeId: string): Promise<number> {
  const db = getDbClient();

  // Get store credentials
  const store = await db.query.stores.findFirst({
    where: eq(stores.id, storeId),
    columns: {
      wooDomain: true,
      wooConsumerKey: true,
      wooConsumerSecret: true,
    },
  });

  if (!store || !store.wooDomain || !store.wooConsumerKey || !store.wooConsumerSecret) {
    throw new Error('Store WooCommerce credentials not configured');
  }

  // Ensure domain has https:// prefix
  let domain = store.wooDomain;
  if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
    domain = `https://${domain}`;
  }
  // Remove trailing slash
  domain = domain.replace(/\/$/, '');

  // Fetch products from WooCommerce REST API
  const auth = Buffer.from(`${store.wooConsumerKey}:${store.wooConsumerSecret}`).toString('base64');
  const response = await fetch(`${domain}/wp-json/wc/v3/products?per_page=100`, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.statusText}`);
  }

  const wooProducts = (await response.json()) as WooProduct[];

  let count = 0;

  // Process each product
  for (const wooProduct of wooProducts) {
    const description = wooProduct.description || wooProduct.short_description || '';
    const price = wooProduct.price || wooProduct.regular_price || '0';
    const imageUrl = wooProduct.images?.[0]?.src;

    // Generate embedding
    const embeddingText = `${wooProduct.name}\n${description}`;
    const embedding = await generateEmbedding(embeddingText);

    // Upsert product
    await db
      .insert(products)
      .values({
        storeId,
        wooProductId: wooProduct.id.toString(),
        name: wooProduct.name,
        description,
        price,
        currency: 'USD', // TODO: Get from WooCommerce settings
        url: wooProduct.permalink,
        imageUrl,
        embedding,
        metadata: {},
      })
      .onConflictDoUpdate({
        target: [products.storeId, products.wooProductId],
        set: {
          name: wooProduct.name,
          description,
          price,
          url: wooProduct.permalink,
          imageUrl,
          embedding,
          updatedAt: new Date(),
        },
      });

    count++;
  }

  return count;
}
