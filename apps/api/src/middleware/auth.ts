import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { getDbClient } from '@woo-ai/database';
import { stores } from '@woo-ai/database';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthUser {
  userId: string;
  email: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
    store?: { id: string; ownerId: string };
  }
}

/**
 * Middleware to validate JWT token for dashboard requests
 */
export async function authenticateUser(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Unauthorized: Missing token' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;

    request.user = decoded;
  } catch (error) {
    return reply.status(401).send({ error: 'Unauthorized: Invalid token' });
  }
}

/**
 * Middleware to validate API key for widget requests
 */
export async function authenticateApiKey(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const apiKey = request.headers['x-api-key'] as string;

    if (!apiKey) {
      return reply.status(401).send({ error: 'Unauthorized: Missing API key' });
    }

    const db = getDbClient();
    const store = await db.query.stores.findFirst({
      where: eq(stores.apiKey, apiKey),
      columns: { id: true, ownerId: true },
    });

    if (!store) {
      return reply.status(401).send({ error: 'Unauthorized: Invalid API key' });
    }

    request.store = store;
  } catch (error) {
    return reply.status(500).send({ error: 'Internal server error' });
  }
}

/**
 * Middleware to validate store ownership
 */
export async function validateStoreOwnership(
  request: FastifyRequest<{ Params: { storeId: string } }>,
  reply: FastifyReply
) {
  try {
    if (!request.user) {
      return reply.status(401).send({ error: 'Unauthorized: User not authenticated' });
    }

    const storeId = request.params.storeId;
    if (!storeId) {
      return reply.status(400).send({ error: 'Bad Request: Missing storeId' });
    }

    const db = getDbClient();
    const store = await db.query.stores.findFirst({
      where: eq(stores.id, storeId),
      columns: { id: true, ownerId: true },
    });

    if (!store) {
      return reply.status(404).send({ error: 'Store not found' });
    }

    if (store.ownerId !== request.user.userId) {
      return reply.status(403).send({ error: 'Forbidden: Not store owner' });
    }

    request.store = store;
  } catch (error) {
    return reply.status(500).send({ error: 'Internal server error' });
  }
}

/**
 * Generate JWT token
 */
export function generateToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}
