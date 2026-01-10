import { FastifyInstance } from 'fastify';
import { getDbClient } from '@woo-ai/database';
import { stores, faqs, products, chatSessions, chatMessages } from '@woo-ai/database';
import { eq, and, ilike, sql, desc, gte, count } from 'drizzle-orm';
import { createStoreSchema, updateStoreSchema, createFaqSchema, generateApiKey } from '@woo-ai/shared';
import { authenticateUser, validateStoreOwnership } from '../middleware/auth.js';
import { syncProducts } from '../services/woocommerce.js';
import { embedFaq } from '../services/rag.js';
import { ZodError } from 'zod';

/**
 * Sanitize chatbot custom instructions to prevent prompt injection
 */
function sanitizeChatbotConfig(config: { customInstructions?: string } | undefined): { customInstructions?: string } | undefined {
  if (!config?.customInstructions) return config;

  let sanitized = config.customInstructions;

  // Remove attempts to override system boundaries
  const dangerousPatterns = [
    /\[SYSTEM\]|\[system\]|\{\{SYSTEM\}\}/gi,
    /<\|system\|>|<\|endoftext\|>|<\|im_start\|>|<\|im_end\|>/gi,
    /\x00|\x1b|\x7f/g,
  ];

  for (const pattern of dangerousPatterns) {
    sanitized = sanitized.replace(pattern, '[REMOVED]');
  }

  return { customInstructions: sanitized };
}

type StoreIdParams = { Params: { storeId: string } };
type StoreAndFaqParams = { Params: { storeId: string; faqId: string } };
type ProductsQueryParams = { Params: { storeId: string }; Querystring: { page?: string; limit?: string; search?: string } };

export async function storeRoutes(server: FastifyInstance) {
  // List user's stores
  server.get('/', {
    preHandler: [authenticateUser],
    handler: async (request) => {
      const db = getDbClient();
      const userStores = await db.query.stores.findMany({
        where: eq(stores.ownerId, request.user!.userId),
        columns: {
          id: true,
          name: true,
          wooDomain: true,
          apiKey: true,
          widgetConfig: true,
          chatbotConfig: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return { stores: userStores };
    },
  });

  // Create store
  server.post('/', {
    preHandler: [authenticateUser],
    handler: async (request, reply) => {
      try {
        const body = createStoreSchema.parse(request.body);
        const db = getDbClient();

        const apiKey = generateApiKey();

        const [newStore] = await db
          .insert(stores)
          .values({
            ownerId: request.user!.userId,
            name: body.name,
            wooDomain: body.wooDomain,
            wooConsumerKey: body.wooConsumerKey,
            wooConsumerSecret: body.wooConsumerSecret,
            apiKey,
            widgetConfig: {},
          })
          .returning();

        return { store: newStore };
      } catch (error) {
        if (error instanceof ZodError) {
          const message = error.errors.map(e => e.message).join(', ');
          return reply.status(400).send({ error: message, details: error.errors });
        }
        throw error;
      }
    },
  });

  // Get store details
  server.get<StoreIdParams>('/:storeId', {
    preHandler: [authenticateUser, validateStoreOwnership],
    handler: async (request) => {
      const db = getDbClient();
      const store = await db.query.stores.findFirst({
        where: eq(stores.id, request.params.storeId),
      });

      return { store };
    },
  });

  // Update store
  server.patch<StoreIdParams>('/:storeId', {
    preHandler: [authenticateUser, validateStoreOwnership],
    handler: async (request, reply) => {
      try {
        const body = updateStoreSchema.parse(request.body);
        const db = getDbClient();

        // Sanitize chatbot config to prevent prompt injection
        const sanitizedBody = {
          ...body,
          chatbotConfig: sanitizeChatbotConfig(body.chatbotConfig),
        };

        const [updated] = await db
          .update(stores)
          .set({
            ...sanitizedBody,
            updatedAt: new Date(),
          })
          .where(eq(stores.id, request.params.storeId))
          .returning();

        return { store: updated };
      } catch (error) {
        if (error instanceof ZodError) {
          const message = error.errors.map(e => e.message).join(', ');
          return reply.status(400).send({ error: message, details: error.errors });
        }
        throw error;
      }
    },
  });

  // Delete store
  server.delete<StoreIdParams>('/:storeId', {
    preHandler: [authenticateUser, validateStoreOwnership],
    handler: async (request) => {
      const db = getDbClient();

      await db
        .delete(stores)
        .where(eq(stores.id, request.params.storeId));

      return { success: true };
    },
  });

  // Rotate API key
  server.post<StoreIdParams>('/:storeId/rotate-key', {
    preHandler: [authenticateUser, validateStoreOwnership],
    handler: async (request) => {
      const db = getDbClient();
      const newApiKey = generateApiKey();

      const [updated] = await db
        .update(stores)
        .set({
          apiKey: newApiKey,
          updatedAt: new Date(),
        })
        .where(eq(stores.id, request.params.storeId))
        .returning({ apiKey: stores.apiKey });

      return { apiKey: updated.apiKey };
    },
  });

  // Sync products from WooCommerce
  server.post<StoreIdParams>('/:storeId/sync-products', {
    preHandler: [authenticateUser, validateStoreOwnership],
    handler: async (request) => {
      const count = await syncProducts(request.params.storeId);
      return { success: true, count };
    },
  });

  // List FAQs
  server.get<StoreIdParams>('/:storeId/faqs', {
    preHandler: [authenticateUser, validateStoreOwnership],
    handler: async (request) => {
      const db = getDbClient();
      const faqList = await db.query.faqs.findMany({
        where: eq(faqs.storeId, request.params.storeId),
        columns: {
          id: true,
          question: true,
          answer: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return { faqs: faqList };
    },
  });

  // Create FAQ
  server.post<StoreIdParams>('/:storeId/faqs', {
    preHandler: [authenticateUser, validateStoreOwnership],
    handler: async (request, reply) => {
      try {
        const body = createFaqSchema.parse(request.body);
        const db = getDbClient();

        // Create FAQ
        const [newFaq] = await db
          .insert(faqs)
          .values({
            storeId: request.params.storeId,
            question: body.question,
            answer: body.answer,
          })
          .returning();

        // Generate embedding
        await embedFaq(newFaq.id, body.question, body.answer);

        return newFaq;
      } catch (error) {
        if (error instanceof ZodError) {
          const message = error.errors.map(e => e.message).join(', ');
          return reply.status(400).send({ error: message, details: error.errors });
        }
        throw error;
      }
    },
  });

  // Delete FAQ
  server.delete<StoreAndFaqParams>('/:storeId/faqs/:faqId', {
    preHandler: [authenticateUser, validateStoreOwnership],
    handler: async (request) => {
      const db = getDbClient();
      await db
        .delete(faqs)
        .where(
          and(
            eq(faqs.id, request.params.faqId),
            eq(faqs.storeId, request.params.storeId)
          )
        );

      return { success: true };
    },
  });

  // Get usage metrics with plan details
  server.get<StoreIdParams>('/:storeId/usage', {
    preHandler: [authenticateUser, validateStoreOwnership],
    handler: async (request) => {
      const { getStoreUsage } = await import('../services/usage.js');
      const usage = await getStoreUsage(request.params.storeId);
      return usage;
    },
  });

  // Get usage history (last 6 months)
  server.get<StoreIdParams>('/:storeId/usage/history', {
    preHandler: [authenticateUser, validateStoreOwnership],
    handler: async (request) => {
      const { getUsageHistory } = await import('../services/usage.js');
      const history = await getUsageHistory(request.params.storeId, 6);
      return { history };
    },
  });

  // List products for a store
  server.get<ProductsQueryParams>('/:storeId/products', {
    preHandler: [authenticateUser, validateStoreOwnership],
    handler: async (request) => {
      const db = getDbClient();
      const page = parseInt(request.query.page || '1', 10);
      const limit = Math.min(parseInt(request.query.limit || '20', 10), 100);
      const search = request.query.search?.trim();
      const offset = (page - 1) * limit;

      // Build where conditions
      const whereConditions = [eq(products.storeId, request.params.storeId)];

      if (search) {
        whereConditions.push(ilike(products.name, `%${search}%`));
      }

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(and(...whereConditions));

      const total = Number(countResult[0]?.count || 0);

      // Get products
      const productList = await db
        .select({
          id: products.id,
          wooProductId: products.wooProductId,
          name: products.name,
          description: products.description,
          price: products.price,
          currency: products.currency,
          url: products.url,
          imageUrl: products.imageUrl,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
        })
        .from(products)
        .where(and(...whereConditions))
        .orderBy(desc(products.updatedAt))
        .limit(limit)
        .offset(offset);

      return {
        products: productList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    },
  });

  // Get single product
  server.get<{ Params: { storeId: string; productId: string } }>('/:storeId/products/:productId', {
    preHandler: [authenticateUser, validateStoreOwnership],
    handler: async (request, reply) => {
      const db = getDbClient();

      const product = await db.query.products.findFirst({
        where: and(
          eq(products.id, request.params.productId),
          eq(products.storeId, request.params.storeId)
        ),
      });

      if (!product) {
        return reply.status(404).send({ error: 'Product not found' });
      }

      return { product };
    },
  });

  // Delete single product
  server.delete<{ Params: { storeId: string; productId: string } }>('/:storeId/products/:productId', {
    preHandler: [authenticateUser, validateStoreOwnership],
    handler: async (request) => {
      const db = getDbClient();

      await db
        .delete(products)
        .where(
          and(
            eq(products.id, request.params.productId),
            eq(products.storeId, request.params.storeId)
          )
        );

      return { success: true };
    },
  });

  // Get analytics overview
  server.get<StoreIdParams>('/:storeId/analytics', {
    preHandler: [authenticateUser, validateStoreOwnership],
    handler: async (request) => {
      const db = getDbClient();
      const storeId = request.params.storeId;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get total sessions
      const [sessionCount] = await db
        .select({ count: count() })
        .from(chatSessions)
        .where(eq(chatSessions.storeId, storeId));

      // Get total messages
      const [messageCount] = await db
        .select({ count: count() })
        .from(chatMessages)
        .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
        .where(eq(chatSessions.storeId, storeId));

      // Get messages in last 30 days
      const [recentMessageCount] = await db
        .select({ count: count() })
        .from(chatMessages)
        .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
        .where(
          and(
            eq(chatSessions.storeId, storeId),
            gte(chatMessages.createdAt, thirtyDaysAgo)
          )
        );

      // Get sessions in last 30 days
      const [recentSessionCount] = await db
        .select({ count: count() })
        .from(chatSessions)
        .where(
          and(
            eq(chatSessions.storeId, storeId),
            gte(chatSessions.createdAt, thirtyDaysAgo)
          )
        );

      // Calculate average messages per session
      const totalSessions = Number(sessionCount?.count || 0);
      const totalMessages = Number(messageCount?.count || 0);
      const avgMessagesPerSession = totalSessions > 0 ? totalMessages / totalSessions : 0;

      return {
        overview: {
          totalSessions,
          totalMessages,
          recentSessions: Number(recentSessionCount?.count || 0),
          recentMessages: Number(recentMessageCount?.count || 0),
          avgMessagesPerSession: Math.round(avgMessagesPerSession * 10) / 10,
        },
      };
    },
  });

  // Get messages per day for chart
  server.get<{ Params: { storeId: string }; Querystring: { days?: string } }>('/:storeId/analytics/messages-by-day', {
    preHandler: [authenticateUser, validateStoreOwnership],
    handler: async (request) => {
      const db = getDbClient();
      const storeId = request.params.storeId;
      const days = Math.min(parseInt(request.query.days || '30', 10), 90);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      // Get message counts by day - use TO_CHAR for consistent string format
      const dailyMessages = await db
        .select({
          date: sql<string>`TO_CHAR(${chatMessages.createdAt}::date, 'YYYY-MM-DD')`.as('date'),
          count: count(),
        })
        .from(chatMessages)
        .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
        .where(
          and(
            eq(chatSessions.storeId, storeId),
            gte(chatMessages.createdAt, startDate)
          )
        )
        .groupBy(sql`${chatMessages.createdAt}::date`)
        .orderBy(sql`${chatMessages.createdAt}::date`);

      // Create a map for quick lookup
      const dateMap = new Map<string, number>();
      for (const d of dailyMessages) {
        dateMap.set(d.date, Number(d.count));
      }

      // Fill in missing days with 0
      const result: { date: string; count: number }[] = [];
      const today = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        result.push({
          date: dateStr,
          count: dateMap.get(dateStr) || 0,
        });
      }

      return { data: result, days };
    },
  });

  // Get popular queries
  server.get<StoreIdParams>('/:storeId/analytics/popular-queries', {
    preHandler: [authenticateUser, validateStoreOwnership],
    handler: async (request) => {
      const db = getDbClient();
      const storeId = request.params.storeId;

      // Get recent user messages (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const userMessages = await db
        .select({
          content: chatMessages.content,
        })
        .from(chatMessages)
        .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
        .where(
          and(
            eq(chatSessions.storeId, storeId),
            eq(chatMessages.role, 'user'),
            gte(chatMessages.createdAt, thirtyDaysAgo)
          )
        )
        .limit(500);

      // Simple word frequency analysis
      const wordCounts: Record<string, number> = {};
      const stopWords = new Set([
        'i', 'me', 'my', 'we', 'our', 'you', 'your', 'it', 'its',
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to',
        'for', 'of', 'with', 'is', 'are', 'was', 'were', 'be', 'been',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
        'can', 'could', 'should', 'may', 'might', 'must', 'shall',
        'this', 'that', 'these', 'those', 'what', 'which', 'who',
        'how', 'when', 'where', 'why', 'if', 'then', 'so', 'just',
        'about', 'any', 'some', 'all', 'no', 'not', 'only', 'also',
        'hi', 'hello', 'hey', 'thanks', 'thank', 'please', 'ok', 'okay',
      ]);

      for (const msg of userMessages) {
        const words = msg.content
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .filter((w) => w.length > 2 && !stopWords.has(w));

        for (const word of words) {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
      }

      // Get top 20 keywords
      const topKeywords = Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([word, count]) => ({ word, count }));

      // Also get sample full queries (most recent)
      const recentQueries = userMessages
        .slice(0, 10)
        .map((m) => m.content.slice(0, 100));

      return {
        topKeywords,
        recentQueries,
        totalQueries: userMessages.length,
      };
    },
  });

  // Get peak hours analysis
  server.get<{ Params: { storeId: string }; Querystring: { days?: string } }>('/:storeId/analytics/peak-hours', {
    preHandler: [authenticateUser, validateStoreOwnership],
    handler: async (request) => {
      const db = getDbClient();
      const storeId = request.params.storeId;
      const days = Math.min(parseInt(request.query.days || '30', 10), 90);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      // Get message counts by hour - cast to integer for consistent type
      const hourlyMessages = await db
        .select({
          hour: sql<string>`EXTRACT(HOUR FROM ${chatMessages.createdAt})::integer`.as('hour'),
          count: count(),
        })
        .from(chatMessages)
        .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
        .where(
          and(
            eq(chatSessions.storeId, storeId),
            gte(chatMessages.createdAt, startDate)
          )
        )
        .groupBy(sql`EXTRACT(HOUR FROM ${chatMessages.createdAt})::integer`)
        .orderBy(sql`EXTRACT(HOUR FROM ${chatMessages.createdAt})::integer`);

      // Create a map for quick lookup
      const hourMap = new Map<number, number>();
      for (const h of hourlyMessages) {
        hourMap.set(Number(h.hour), Number(h.count));
      }

      // Fill in all 24 hours
      const hourlyData: { hour: number; count: number }[] = [];
      for (let h = 0; h < 24; h++) {
        hourlyData.push({
          hour: h,
          count: hourMap.get(h) || 0,
        });
      }

      // Find peak hour
      const peakHour = hourlyData.reduce(
        (max, curr) => (curr.count > max.count ? curr : max),
        { hour: 0, count: 0 }
      );

      return {
        hourlyData,
        peakHour: peakHour.hour,
        peakHourCount: peakHour.count,
        days,
      };
    },
  });

  // Verify widget installation
  server.post<StoreIdParams>('/:storeId/verify-install', {
    preHandler: [authenticateUser, validateStoreOwnership],
    handler: async (request) => {
      const db = getDbClient();
      const storeId = request.params.storeId;

      // Get store details
      const store = await db.query.stores.findFirst({
        where: eq(stores.id, storeId),
        columns: {
          id: true,
          wooDomain: true,
          name: true,
        },
      });

      if (!store) {
        return {
          success: false,
          status: 'error',
          message: 'Store not found',
        };
      }

      if (!store.wooDomain) {
        return {
          success: false,
          status: 'no_domain',
          message: 'No store domain configured. Please add your WooCommerce domain in the General settings.',
        };
      }

      // Normalize the domain
      let domain = store.wooDomain.trim();
      if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
        domain = 'https://' + domain;
      }

      try {
        // Fetch the homepage with a timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(domain, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'WooAI-VerifyBot/1.0',
            'Accept': 'text/html',
          },
        });

        clearTimeout(timeout);

        if (!response.ok) {
          return {
            success: false,
            status: 'unreachable',
            message: `Could not reach your website (HTTP ${response.status}). Make sure your site is accessible.`,
            domain,
          };
        }

        const html = await response.text();

        // Check for widget script with this store ID
        const widgetPatterns = [
          new RegExp(`data-store-id=["']${storeId}["']`, 'i'),
          new RegExp(`data-store-id=["']${storeId}["']`, 'i'),
        ];

        const scriptTagPattern = /widget\.js/i;
        const hasWidgetScript = scriptTagPattern.test(html);
        const hasCorrectStoreId = widgetPatterns.some(pattern => pattern.test(html));

        if (hasWidgetScript && hasCorrectStoreId) {
          return {
            success: true,
            status: 'installed',
            message: 'Widget is correctly installed on your website!',
            domain,
            details: {
              scriptFound: true,
              storeIdFound: true,
            },
          };
        } else if (hasWidgetScript && !hasCorrectStoreId) {
          return {
            success: false,
            status: 'wrong_store_id',
            message: 'Widget script found, but with a different store ID. Please update your embed code.',
            domain,
            details: {
              scriptFound: true,
              storeIdFound: false,
            },
          };
        } else {
          return {
            success: false,
            status: 'not_found',
            message: 'Widget not found on your website. Please add the embed code to your site.',
            domain,
            details: {
              scriptFound: false,
              storeIdFound: false,
            },
          };
        }
      } catch (error) {
        const err = error as Error;

        if (err.name === 'AbortError') {
          return {
            success: false,
            status: 'timeout',
            message: 'Request timed out. Your website took too long to respond.',
            domain,
          };
        }

        return {
          success: false,
          status: 'error',
          message: `Could not connect to your website: ${err.message}`,
          domain,
        };
      }
    },
  });
}
