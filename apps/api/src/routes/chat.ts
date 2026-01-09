import { FastifyInstance } from 'fastify';
import { getDbClient } from '@woo-ai/database';
import { chatSessions, chatMessages, usageMetrics } from '@woo-ai/database';
import { eq, and, sql, desc } from 'drizzle-orm';
import { chatRequestSchema, getCurrentMonthKey } from '@woo-ai/shared';
import { authenticateApiKey } from '../middleware/auth.js';
import { getChatCompletion, AI_TOOLS } from '../services/openai.js';
import { handleSearchProducts } from '../tools/search-products.js';
import { handleSearchFaq } from '../tools/search-faq.js';
import { handleOrderStatus } from '../tools/order-status.js';
import { handleCreateHandoff } from '../tools/create-handoff.js';
import { ZodError } from 'zod';
import type OpenAI from 'openai';

export async function chatRoutes(server: FastifyInstance) {
  server.post('/', {
    preHandler: [authenticateApiKey],
    handler: async (request, reply) => {
      try {
        const body = chatRequestSchema.parse(request.body);
        const storeId = request.store!.id;

        // Validate storeId matches authenticated store
        if (body.storeId !== storeId) {
          return reply.status(403).send({ error: 'Forbidden: Store ID mismatch' });
        }

        const db = getDbClient();

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
            content: `You are a helpful AI assistant for an e-commerce store. You can help customers find products, answer questions from the FAQ, and provide support. Be friendly, concise, and helpful. If you can't answer something, offer to connect them with support.`,
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

        // Set up streaming response
        reply.header('Content-Type', 'text/event-stream');
        reply.header('Cache-Control', 'no-cache');
        reply.header('Connection', 'keep-alive');

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

        // Update usage metrics
        const monthKey = getCurrentMonthKey();
        await db
          .insert(usageMetrics)
          .values({
            storeId,
            month: monthKey,
            messageCount: 1,
          })
          .onConflictDoUpdate({
            target: [usageMetrics.storeId, usageMetrics.month],
            set: {
              messageCount: sql`${usageMetrics.messageCount} + 1`,
              updatedAt: new Date(),
            },
          });

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
