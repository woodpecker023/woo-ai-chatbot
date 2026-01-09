import { searchFaqs } from '../services/rag.js';

export async function handleSearchFaq(storeId: string, args: { query: string; limit?: number }) {
  const results = await searchFaqs(storeId, args.query, args.limit || 3);

  if (results.length === 0) {
    return {
      content: 'No FAQ entries found matching your question.',
    };
  }

  const faqList = results
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join('\n\n');

  return {
    content: `Here's what I found in our FAQ:\n\n${faqList}`,
  };
}
