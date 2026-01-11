import OpenAI from 'openai';

/**
 * Intent types for message classification
 */
export type Intent =
  | 'PRODUCT_DISCOVERY'    // Looking for products, browsing
  | 'PRODUCT_DETAILS'      // Asking about specific product details
  | 'PRODUCT_COMPARE'      // Comparing products
  | 'SHIPPING_RETURNS'     // Shipping, delivery, returns questions
  | 'ORDER_STATUS'         // Checking order status
  | 'PAYMENT'              // Payment methods, pricing questions
  | 'POLICY'               // Store policies, terms
  | 'GENERAL_SUPPORT'      // Help, complaints, general inquiries
  | 'SMALLTALK';           // Greetings, thanks, off-topic

export interface IntentClassification {
  intent: Intent;
  confidence: number;
  reasoning: string;
  suggestedTools: string[];
}

export interface SessionContext {
  previousMessages?: Array<{ role: string; content: string }>;
  previousIntents?: Intent[];
}

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

const INTENT_DEFINITIONS = `
INTENT DEFINITIONS:

1. PRODUCT_DISCOVERY - User is browsing, exploring, looking for products
   Examples: "what do you have?", "show me wands", "looking for a gift", "what's popular?"
   Tools: search_products

2. PRODUCT_DETAILS - User asks about a specific product's features, specs, description
   Examples: "tell me about Harry's wand", "what material is it?", "how long is this one?"
   Tools: search_products

3. PRODUCT_COMPARE - User wants to compare multiple products
   Examples: "which is better?", "difference between X and Y", "compare these two"
   Tools: search_products

4. SHIPPING_RETURNS - Questions about delivery, shipping times, returns, exchanges
   Examples: "how long does shipping take?", "can I return it?", "do you ship to X?"
   Tools: search_faq

5. ORDER_STATUS - User wants to check their order status (requires order number)
   Examples: "where is my order?", "order #12345", "tracking my package"
   Tools: order_status (NO RAG - direct tool call only)

6. PAYMENT - Questions about payment methods, pricing, discounts
   Examples: "how can I pay?", "do you accept PayPal?", "any discounts?"
   Tools: search_faq

7. POLICY - Store policies, terms of service, warranty, guarantees
   Examples: "what's your warranty?", "refund policy", "terms and conditions"
   Tools: search_faq

8. GENERAL_SUPPORT - Help requests, complaints, issues, escalation
   Examples: "I need help", "speak to human", "I have a problem", "complaint"
   Tools: create_handoff_ticket

9. SMALLTALK - Greetings, thanks, casual chat, off-topic
   Examples: "hi", "thanks", "goodbye", "how are you?", "what's your name?"
   Tools: none (respond directly, keep it short)
`;

/**
 * Classify the intent of a user message
 */
export async function classifyIntent(
  message: string,
  sessionContext?: SessionContext
): Promise<IntentClassification> {
  const client = getOpenAIClient();

  // Build context from previous messages if available
  let contextHint = '';
  if (sessionContext?.previousMessages?.length) {
    const recentMessages = sessionContext.previousMessages.slice(-3);
    contextHint = `\nRECENT CONVERSATION:\n${recentMessages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n')}\n`;
  }

  const systemPrompt = `You are an intent classifier for an e-commerce chatbot.
Your job is to classify the user's message into exactly ONE intent category.

${INTENT_DEFINITIONS}

RULES:
- Choose the MOST SPECIFIC intent that applies
- If multiple intents could apply, choose based on the PRIMARY goal of the message
- Confidence should be 0.0-1.0 (1.0 = very certain)
- Consider conversation context when available

Output JSON only:
{
  "intent": "INTENT_NAME",
  "confidence": 0.95,
  "reasoning": "Brief explanation",
  "suggestedTools": ["tool1", "tool2"]
}`;

  const userPrompt = `${contextHint}
USER MESSAGE: "${message}"

Classify this message. Return JSON only.`;

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1, // Low temperature for consistent classification
      response_format: { type: 'json_object' },
      max_tokens: 200,
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');

    // Validate and normalize the response
    const validIntents: Intent[] = [
      'PRODUCT_DISCOVERY',
      'PRODUCT_DETAILS',
      'PRODUCT_COMPARE',
      'SHIPPING_RETURNS',
      'ORDER_STATUS',
      'PAYMENT',
      'POLICY',
      'GENERAL_SUPPORT',
      'SMALLTALK',
    ];

    const intent = validIntents.includes(result.intent)
      ? result.intent
      : 'GENERAL_SUPPORT';

    return {
      intent,
      confidence: Math.min(1, Math.max(0, result.confidence || 0.5)),
      reasoning: result.reasoning || 'No reasoning provided',
      suggestedTools: result.suggestedTools || [],
    };
  } catch (error) {
    console.error('Intent classification failed:', error);
    // Fallback to general support on error
    return {
      intent: 'GENERAL_SUPPORT',
      confidence: 0.3,
      reasoning: 'Classification failed, defaulting to general support',
      suggestedTools: ['search_products', 'search_faq'],
    };
  }
}

/**
 * Get tool configuration based on intent
 */
export function getToolsForIntent(intent: Intent): {
  allowedTools: string[];
  skipRAG: boolean;
  responseStyle: 'normal' | 'short' | 'detailed';
} {
  switch (intent) {
    case 'ORDER_STATUS':
      return {
        allowedTools: ['order_status'],
        skipRAG: true,
        responseStyle: 'normal',
      };

    case 'SMALLTALK':
      return {
        allowedTools: [],
        skipRAG: true,
        responseStyle: 'short',
      };

    case 'PRODUCT_DISCOVERY':
    case 'PRODUCT_DETAILS':
    case 'PRODUCT_COMPARE':
      return {
        allowedTools: ['search_products'],
        skipRAG: false,
        responseStyle: intent === 'PRODUCT_COMPARE' ? 'detailed' : 'normal',
      };

    case 'SHIPPING_RETURNS':
    case 'PAYMENT':
    case 'POLICY':
      return {
        allowedTools: ['search_faq'],
        skipRAG: false,
        responseStyle: 'normal',
      };

    case 'GENERAL_SUPPORT':
      return {
        allowedTools: ['search_faq', 'search_products', 'create_handoff_ticket'],
        skipRAG: false,
        responseStyle: 'normal',
      };

    default:
      return {
        allowedTools: ['search_products', 'search_faq'],
        skipRAG: false,
        responseStyle: 'normal',
      };
  }
}
