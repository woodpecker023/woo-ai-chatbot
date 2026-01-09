export interface WidgetAttributes {
  storeId: string;
  theme?: 'light' | 'dark';
  position?: 'left' | 'right';
  greeting?: string;
  apiUrl?: string;
}

export interface WidgetMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  products?: ProductCard[];
}

export interface ProductCard {
  id: string;
  name: string;
  price: string;
  currency: string;
  url: string;
  imageUrl?: string;
}

export interface WidgetSession {
  sessionId: string;
  messages: WidgetMessage[];
}
