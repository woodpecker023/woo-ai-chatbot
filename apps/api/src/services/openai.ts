import OpenAI from 'openai';

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

/**
 * Generate embeddings for text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient();
  const response = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    encoding_format: 'float',
  });

  return response.data[0].embedding;
}

/**
 * Get chat completion with streaming
 */
export async function getChatCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  tools: OpenAI.Chat.ChatCompletionTool[],
  stream: true
): Promise<AsyncIterable<OpenAI.Chat.ChatCompletionChunk>>;
export async function getChatCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  tools: OpenAI.Chat.ChatCompletionTool[],
  stream: false
): Promise<OpenAI.Chat.ChatCompletion>;
export async function getChatCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  tools: OpenAI.Chat.ChatCompletionTool[],
  stream: boolean
): Promise<AsyncIterable<OpenAI.Chat.ChatCompletionChunk> | OpenAI.Chat.ChatCompletion> {
  const client = getOpenAIClient();
  return await client.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages,
    tools,
    tool_choice: 'auto',
    stream,
    temperature: 0.7,
  }) as AsyncIterable<OpenAI.Chat.ChatCompletionChunk> | OpenAI.Chat.ChatCompletion;
}

/**
 * Generate FAQs from website content
 */
export interface GeneratedFAQ {
  question: string;
  answer: string;
  category?: string;
}

export async function generateFAQsFromContent(
  content: string,
  websiteTitle: string,
  options?: {
    language?: string;
    maxFaqs?: number;
  }
): Promise<GeneratedFAQ[]> {
  const client = getOpenAIClient();
  const maxFaqs = options?.maxFaqs || 10;
  const language = options?.language || 'English';

  const systemPrompt = `You are an expert at analyzing business websites and extracting frequently asked questions.
Your task is to generate helpful FAQ entries based on the provided website content.

Guidelines:
- Generate questions that real customers would ask
- Answers should be based ONLY on information found in the content
- Keep answers concise but informative (2-4 sentences)
- Cover topics like: products/services, pricing, shipping, returns, contact info, business hours
- Use ${language} for both questions and answers
- If information is not in the content, don't make it up

Output format: Return a JSON array of FAQ objects with "question" and "answer" fields.`;

  const userPrompt = `Website: ${websiteTitle}

Content:
${content.slice(0, 12000)}

Generate up to ${maxFaqs} FAQ entries based on this content. Return ONLY valid JSON array.`;

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const responseText = response.choices[0]?.message?.content || '{"faqs":[]}';
    const parsed = JSON.parse(responseText);

    // Handle both { faqs: [...] } and direct array formats
    const faqs = Array.isArray(parsed) ? parsed : (parsed.faqs || parsed.questions || []);

    return faqs.slice(0, maxFaqs).map((faq: { question?: string; q?: string; answer?: string; a?: string; category?: string }) => ({
      question: faq.question || faq.q || '',
      answer: faq.answer || faq.a || '',
      category: faq.category,
    })).filter((faq: GeneratedFAQ) => faq.question && faq.answer);
  } catch (error) {
    console.error('Failed to generate FAQs:', error);
    return [];
  }
}

/**
 * Define available tools for the AI assistant
 */
export const AI_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_products',
      description: 'Search for products in the store catalog based on user query',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query for products',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return (default: 5)',
            default: 5,
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_faq',
      description: 'Search the knowledge base for answers to frequently asked questions',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The question or topic to search for',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return (default: 3)',
            default: 3,
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'order_status',
      description: 'Get the status of a customer order (stub for v0.1)',
      parameters: {
        type: 'object',
        properties: {
          orderId: {
            type: 'string',
            description: 'The order ID to check',
          },
        },
        required: ['orderId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_handoff_ticket',
      description: 'Create a handoff ticket for human support (stub for v0.1)',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Reason for handoff to human support',
          },
          customerEmail: {
            type: 'string',
            description: 'Customer email address',
          },
        },
        required: ['reason'],
      },
    },
  },
];
