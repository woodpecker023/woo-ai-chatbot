// Chat API Types
export interface ChatRequest {
  storeId: string;
  sessionId: string;
  message: string;
}

export interface ChatResponse {
  role: 'assistant';
  content: string;
  products?: ProductReference[];
}

export interface ProductReference {
  id: string;
  name: string;
  price: string;
  currency: string;
  url: string;
  imageUrl?: string;
}

// Store API Types
export interface CreateStoreRequest {
  name: string;
  wooDomain?: string;
  wooConsumerKey?: string;
  wooConsumerSecret?: string;
}

export interface UpdateStoreRequest {
  name?: string;
  wooDomain?: string;
  wooConsumerKey?: string;
  wooConsumerSecret?: string;
  widgetConfig?: WidgetConfig;
}

export interface StoreResponse {
  id: string;
  name: string;
  wooDomain?: string;
  apiKey: string;
  widgetConfig: WidgetConfig;
  createdAt: string;
  updatedAt: string;
}

// FAQ API Types
export interface CreateFaqRequest {
  question: string;
  answer: string;
}

export interface FaqResponse {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
  updatedAt: string;
}

// Usage API Types
export interface UsageResponse {
  storeId: string;
  month: string;
  messageCount: number;
  limit: number;
}

// Auth API Types
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  token: string;
}

// Widget Configuration
export interface WidgetConfig {
  theme?: 'light' | 'dark';
  position?: 'left' | 'right';
  greeting?: string;
  primaryColor?: string;
}
