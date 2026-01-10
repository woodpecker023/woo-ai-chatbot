import { z } from 'zod';

// Chat Schemas
export const chatRequestSchema = z.object({
  storeId: z.string().uuid(),
  sessionId: z.string().min(1),
  message: z.string().min(1).max(4000),
});

// Store Schemas
export const createStoreSchema = z.object({
  name: z.string().min(1).max(255),
  wooDomain: z.string().min(1),
  wooConsumerKey: z.string().min(1).optional(),
  wooConsumerSecret: z.string().min(1).optional(),
}).refine(
  (data) => {
    // If one of the API credentials is provided, both must be provided
    const hasKey = !!data.wooConsumerKey;
    const hasSecret = !!data.wooConsumerSecret;

    // Either both provided or both empty
    return (hasKey && hasSecret) || (!hasKey && !hasSecret);
  },
  {
    message: 'Both WooCommerce Consumer Key and Consumer Secret must be provided together',
  }
);

export const updateStoreSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  wooDomain: z.string().min(1).optional(),
  wooConsumerKey: z.string().min(1).optional(),
  wooConsumerSecret: z.string().min(1).optional(),
  widgetConfig: z.object({
    theme: z.enum(['light', 'dark']).optional(),
    position: z.enum(['left', 'right']).optional(),
    greeting: z.string().max(255).optional(),
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  }).optional(),
  chatbotConfig: z.object({
    customInstructions: z.string().max(5000).optional(),
  }).optional(),
});

// FAQ Schemas
export const createFaqSchema = z.object({
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(5000),
});

export const updateFaqSchema = z.object({
  question: z.string().min(1).max(500).optional(),
  answer: z.string().min(1).max(5000).optional(),
});

// Auth Schemas
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(255),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Widget Config Schema
export const widgetConfigSchema = z.object({
  theme: z.enum(['light', 'dark']).optional(),
  position: z.enum(['left', 'right']).optional(),
  greeting: z.string().max(255).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

// Chatbot Config Schema
export const chatbotConfigSchema = z.object({
  customInstructions: z.string().max(5000).optional(),
});
