import { FastifyInstance } from 'fastify';
import { getDbClient } from '@woo-ai/database';
import { chatSessions, chatMessages, stores, products, faqs } from '@woo-ai/database';
import { eq, and, desc, count } from 'drizzle-orm';
import { chatRequestSchema } from '@woo-ai/shared';
import { authenticateWidgetRequest } from '../middleware/auth.js';
import { getChatCompletion, AI_TOOLS } from '../services/openai.js';
import { handleSearchProducts } from '../tools/search-products.js';
import { handleSearchFaq } from '../tools/search-faq.js';
import { handleOrderStatus } from '../tools/order-status.js';
import { handleCreateHandoff } from '../tools/create-handoff.js';
import { canSendMessage, incrementUsage } from '../services/usage.js';
import { ZodError } from 'zod';
import type OpenAI from 'openai';

interface StoreData {
  name: string;
  wooDomain: string | null;
  chatbotConfig: {
    customInstructions?: string;
  } | null;
}

/**
 * Build a dynamic system prompt based on store configuration
 */
function buildSystemPrompt(
  store: StoreData,
  productCount: number,
  faqCount: number
): string {
  const lines: string[] = [];

  // Base identity
  lines.push(`You are a helpful AI assistant for "${store.name}"${store.wooDomain ? ` (${store.wooDomain})` : ''}.`);
  lines.push('');

  // Store context
  lines.push('STORE CONTEXT:');
  lines.push(`- Products available: ${productCount} items`);
  lines.push(`- Knowledge base: ${faqCount} FAQ entries`);
  lines.push('');

  // Custom instructions from store owner
  if (store.chatbotConfig?.customInstructions?.trim()) {
    lines.push('CUSTOM INSTRUCTIONS:');
    lines.push(store.chatbotConfig.customInstructions.trim());
    lines.push('');
  }

  // Base capabilities
  lines.push('CAPABILITIES:');
  lines.push('- You can search products using the search_products tool');
  lines.push('- You can answer questions from the FAQ using the search_faq tool');
  lines.push('- You can check order status using the order_status tool');
  lines.push('- You can create a support ticket using the create_handoff_ticket tool');
  lines.push('');

  // General guidelines
  lines.push('GUIDELINES:');
  lines.push('- Be friendly, helpful, and concise');
  lines.push('- Use the available tools to provide accurate information');
  lines.push('- If you cannot help with something, offer to connect the customer with support');
  lines.push('- Always be honest about what you can and cannot do');

  return lines.join('\n');
}

export async function chatRoutes(server: FastifyInstance) {
  server.post('/', {
    preHandler: [authenticateWidgetRequest],
    handler: async (request, reply) => {
      try {
        const body = chatRequestSchema.parse(request.body);
        const storeId = request.store!.id;

        // Check usage limits before processing
        const { allowed, usage } = await canSendMessage(storeId);
        if (!allowed) {
          return reply.status(429).send({
            error: 'limit_exceeded',
            message: 'This store has reached its monthly chat limit.',
            usage: {
              plan: usage.plan.displayName,
              limit: usage.plan.limit,
              used: usage.messageCount,
              resetsAt: usage.resetsAt,
            },
            upgradeUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/billing`,
          });
        }

        const db = getDbClient();

        // Get full store data for system prompt
        const storeData = await db.query.stores.findFirst({
          where: eq(stores.id, storeId),
          columns: {
            name: true,
            wooDomain: true,
            chatbotConfig: true,
          },
        });

        if (!storeData) {
          return reply.status(404).send({ error: 'Store not found' });
        }

        // Count products and FAQs for context
        const [productCountResult] = await db
          .select({ count: count() })
          .from(products)
          .where(eq(products.storeId, storeId));

        const [faqCountResult] = await db
          .select({ count: count() })
          .from(faqs)
          .where(eq(faqs.storeId, storeId));

        const productCount = productCountResult?.count ?? 0;
        const faqCount = faqCountResult?.count ?? 0;

        // Build dynamic system prompt
        const systemPrompt = buildSystemPrompt(storeData, productCount, faqCount);

        // Get or create session
        let session = await db.query.chatSessions.findFirst({
          where: and(
            eq(chatSessions.storeId, storeId),
            eq(chatSessions.sessionId, body.sessionId)
          ),
        });

        if (!session) {
          [session] = await db
            .insert(chatSessions)
            .values({
              storeId,
              sessionId: body.sessionId,
              metadata: {},
            })
            .returning();
        }

        // Store user message
        await db.insert(chatMessages).values({
          sessionId: session.id,
          role: 'user',
          content: body.message,
          metadata: {},
        });

        // Get conversation history (last 10 messages)
        const history = await db.query.chatMessages.findMany({
          where: eq(chatMessages.sessionId, session.id),
          orderBy: [desc(chatMessages.createdAt)],
          limit: 10,
        });

        // Build messages for OpenAI
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
          {
            role: 'system',
            content: systemPrompt,
          },
          ...history.reverse().map((m: { role: string; content: string }) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        ];

        // Get streaming response
        const stream = await getChatCompletion(messages, AI_TOOLS, true);

        let assistantMessage = '';
        let toolCalls: Array<OpenAI.Chat.ChatCompletionMessageToolCall> = [];
        let products: Array<unknown> = [];

        // Set up streaming response with CORS headers using raw response
        const origin = request.headers.origin || '*';
        reply.raw.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        });

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta;

          if (delta?.content) {
            assistantMessage += delta.content;
            reply.raw.write(`data: ${JSON.stringify({ type: 'content', content: delta.content })}\n\n`);
          }

          if (delta?.tool_calls) {
            for (const toolCall of delta.tool_calls) {
              if (!toolCalls[toolCall.index]) {
                toolCalls[toolCall.index] = {
                  id: toolCall.id || '',
                  type: 'function',
                  function: { name: toolCall.function?.name || '', arguments: '' },
                };
              }
              if (toolCall.function?.arguments) {
                toolCalls[toolCall.index].function.arguments += toolCall.function.arguments;
              }
            }
          }

          // Check if we're done
          if (chunk.choices[0]?.finish_reason === 'tool_calls') {
            // Execute tool calls
            for (const toolCall of toolCalls) {
              const args = JSON.parse(toolCall.function.arguments);

              let toolResult;
              switch (toolCall.function.name) {
                case 'search_products':
                  toolResult = await handleSearchProducts(storeId, args);
                  if (toolResult.products) {
                    products.push(...toolResult.products);
                  }
                  break;
                case 'search_faq':
                  toolResult = await handleSearchFaq(storeId, args);
                  break;
                case 'order_status':
                  toolResult = await handleOrderStatus(storeId, args);
                  break;
                case 'create_handoff_ticket':
                  toolResult = await handleCreateHandoff(storeId, args);
                  break;
                default:
                  toolResult = { content: 'Tool not found' };
              }

              assistantMessage += `\n\n${toolResult.content}`;
            }

            // Send final message
            reply.raw.write(`data: ${JSON.stringify({ type: 'content', content: assistantMessage })}\n\n`);
          }
        }

        // Send products if any
        if (products.length > 0) {
          reply.raw.write(`data: ${JSON.stringify({ type: 'products', products })}\n\n`);
        }

        // Send done signal
        reply.raw.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);

        // Store assistant message
        await db.insert(chatMessages).values({
          sessionId: session.id,
          role: 'assistant',
          content: assistantMessage,
          metadata: { products },
        });

        // Increment usage counter
        await incrementUsage(storeId);

        reply.raw.end();
      } catch (error) {
        server.log.error(error);
        if (error instanceof ZodError) {
          return reply.status(400).send({ error: 'Invalid input', details: error.errors });
        }
        return reply.status(500).send({ error: 'Internal server error' });
      }
    },
  });
}
