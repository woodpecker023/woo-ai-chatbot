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
