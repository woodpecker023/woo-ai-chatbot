import { FastifyInstance } from 'fastify';
import { getDbClient } from '@woo-ai/database';
import { stores, faqs, usageMetrics, products } from '@woo-ai/database';
import { eq, and, ilike, sql, desc } from 'drizzle-orm';
import { createStoreSchema, updateStoreSchema, createFaqSchema, generateApiKey, getCurrentMonthKey } from '@woo-ai/shared';
import { authenticateUser, validateStoreOwnership } from '../middleware/auth.js';
import { syncProducts } from '../services/woocommerce.js';
import { embedFaq } from '../services/rag.js';
import { ZodError } from 'zod';

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

        const [updated] = await db
          .update(stores)
          .set({
            ...body,
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

  // Get usage metrics
  server.get<StoreIdParams>('/:storeId/usage', {
    preHandler: [authenticateUser, validateStoreOwnership],
    handler: async (request) => {
      const db = getDbClient();
      const monthKey = getCurrentMonthKey();

      const metrics = await db.query.usageMetrics.findFirst({
        where: and(
          eq(usageMetrics.storeId, request.params.storeId),
          eq(usageMetrics.month, monthKey)
        ),
      });

      return {
        storeId: request.params.storeId,
        month: monthKey,
        messageCount: metrics?.messageCount || 0,
        limit: 10000, // TODO: Get from subscription plan
      };
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
}
