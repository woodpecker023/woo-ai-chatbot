// AI Tool Types
export interface SearchProductsTool {
  name: 'search_products';
  arguments: {
    query: string;
    limit?: number;
  };
}

export interface SearchFaqTool {
  name: 'search_faq';
  arguments: {
    query: string;
    limit?: number;
  };
}

export interface OrderStatusTool {
  name: 'order_status';
  arguments: {
    orderId: string;
  };
}

export interface CreateHandoffTicketTool {
  name: 'create_handoff_ticket';
  arguments: {
    reason: string;
    customerEmail?: string;
  };
}

export type AiTool = SearchProductsTool | SearchFaqTool | OrderStatusTool | CreateHandoffTicketTool;

// OpenAI Message Types
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
  name?: string;
}

// RAG Result Types
export interface RagProductResult {
  id: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  url: string;
  imageUrl?: string;
  similarity: number;
}

export interface RagFaqResult {
  id: string;
  question: string;
  answer: string;
  category?: string;
  similarity: number;
}
