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

// Structured Response Types (T5)
export interface ProductRecommendation {
  id: string;
  name: string;
  price: string;
  currency: string;
  url: string;
  imageUrl?: string;
  reason?: string; // Why this product was recommended
}

export interface StructuredResponseMetadata {
  // Products mentioned/recommended (max 3)
  products: ProductRecommendation[];
  // Suggested follow-up questions for the user
  followUpQuestions: string[];
  // Suggested next action (e.g., "view_product", "contact_support", "browse_more")
  nextAction?: {
    type: 'view_product' | 'contact_support' | 'browse_more' | 'checkout' | 'none';
    label?: string;
    url?: string;
  };
  // Intent that was classified
  intent?: string;
  // Confidence of the response
  confidence?: number;
}

// Chat stream event types
export type ChatStreamEvent =
  | { type: 'content'; content: string }
  | { type: 'products'; products: ProductRecommendation[] }
  | { type: 'metadata'; metadata: StructuredResponseMetadata }
  | { type: 'done' }
  | { type: 'error'; error: string };
