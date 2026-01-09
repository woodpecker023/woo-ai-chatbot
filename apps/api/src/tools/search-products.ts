import { searchProducts } from '../services/rag.js';

export async function handleSearchProducts(storeId: string, args: { query: string; limit?: number }) {
  const results = await searchProducts(storeId, args.query, args.limit || 5);

  if (results.length === 0) {
    return {
      content: 'No products found matching your search.',
      products: [],
    };
  }

  const productList = results
    .map((p) => `- ${p.name} (${p.currency}${p.price}): ${p.description.substring(0, 100)}...`)
    .join('\n');

  return {
    content: `Found ${results.length} products:\n${productList}`,
    products: results.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      currency: p.currency,
      url: p.url,
      imageUrl: p.imageUrl,
    })),
  };
}
