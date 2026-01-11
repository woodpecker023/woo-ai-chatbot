import { searchProducts } from '../services/rag.js';

/**
 * Strip HTML tags and decode common HTML entities
 */
function stripHtml(html: string): string {
  return html
    // Remove HTML tags
    .replace(/<[^>]*>/g, ' ')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

export async function handleSearchProducts(storeId: string, args: { query: string; limit?: number }) {
  const results = await searchProducts(storeId, args.query, args.limit || 5);

  if (results.length === 0) {
    return {
      content: 'No products found matching your search. Try different keywords or ask me what products are available.',
      products: [],
    };
  }

  // Format products with clean descriptions for AI to use conversationally
  const productList = results
    .map((p, i) => {
      const cleanDesc = stripHtml(p.description).substring(0, 150);
      return `${i + 1}. **${p.name}** - ${p.currency}${p.price}\n   ${cleanDesc}${cleanDesc.length >= 150 ? '...' : ''}\n   Link: ${p.url || 'N/A'}`;
    })
    .join('\n\n');

  return {
    content: `Found ${results.length} relevant products:\n\n${productList}\n\nUse this information to help the customer. Recommend products naturally based on their needs. Include product links when suggesting items.`,
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
