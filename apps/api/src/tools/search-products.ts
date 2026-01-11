import { searchProducts, type SearchFilters } from '../services/rag.js';

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

export async function handleSearchProducts(
  storeId: string,
  args: { query: string; limit?: number },
  filters?: SearchFilters
) {
  const results = await searchProducts(storeId, args.query, args.limit || 5, filters);

  if (results.length === 0) {
    return {
      content: '[PRODUCT CATALOG SEARCH - NO RESULTS]\nNo products found matching your search. You may tell the customer you couldn\'t find matching products and offer to help them search differently.',
      products: [],
    };
  }

  // Format products with clean descriptions for AI to use conversationally
  const productList = results
    .map((p, i) => {
      const cleanDesc = stripHtml(p.description).substring(0, 150);
      return `${i + 1}. **${p.name}**\n   Price: ${p.currency}${p.price} (VERIFIED)\n   ${cleanDesc}${cleanDesc.length >= 150 ? '...' : ''}\n   Link: ${p.url || 'N/A'}`;
    })
    .join('\n\n');

  return {
    content: `[PRODUCT CATALOG SEARCH - VERIFIED DATA]\nFound ${results.length} products from the store catalog:\n\n${productList}\n\nIMPORTANT: The prices above are VERIFIED from the catalog. Only quote these exact prices to customers.`,
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
