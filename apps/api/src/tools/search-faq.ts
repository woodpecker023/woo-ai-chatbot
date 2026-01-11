import { searchFaqs, type SearchFilters } from '../services/rag.js';

export async function handleSearchFaq(
  storeId: string,
  args: { query: string; limit?: number },
  filters?: SearchFilters
) {
  const results = await searchFaqs(storeId, args.query, args.limit || 3, filters);

  if (results.length === 0) {
    return {
      content: '[KNOWLEDGE BASE SEARCH - NO RESULTS]\nNo FAQ entries found matching this question. If the customer is asking about policies, shipping, or returns, tell them you don\'t have that specific information and offer to connect them with support.',
    };
  }

  const faqList = results
    .map((f, i) => `[FAQ Entry ${i + 1}${f.category ? ` - Category: ${f.category}` : ''}]\nQ: ${f.question}\nA: ${f.answer}`)
    .join('\n\n');

  return {
    content: `[KNOWLEDGE BASE SEARCH - VERIFIED DATA]\nFound ${results.length} relevant FAQ entries:\n\n${faqList}\n\nIMPORTANT: The information above is from the store's official knowledge base. Only share policies/shipping info that appears above.`,
  };
}
