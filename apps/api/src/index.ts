import * as dotenv from 'dotenv';
// Load .env file in development (Railway sets env vars directly in production)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '../../.env' });
}

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import multipart from '@fastify/multipart';
import { chatRoutes } from './routes/chat.js';
import { storeRoutes } from './routes/stores.js';
import { webhookRoutes } from './routes/webhooks.js';
import { authRoutes } from './routes/auth.js';
import { documentRoutes } from './routes/documents.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const server = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
});

// Security and middleware
await server.register(helmet, {
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
});

await server.register(cors, {
  origin: true, // Allow all origins for widget embedding
  credentials: true,
});

await server.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// Multipart for file uploads
await server.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Serve widget.js from the widget dist folder
// In dev: __dirname is apps/api/src, widget is at apps/widget/dist
// In prod: __dirname is apps/api/dist, widget is at apps/widget/dist
await server.register(fastifyStatic, {
  root: join(__dirname, '..', '..', 'widget', 'dist'),
  prefix: '/',
  decorateReply: false,
});

// Health check
server.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Routes
await server.register(authRoutes, { prefix: '/auth' });
await server.register(chatRoutes, { prefix: '/chat' });
await server.register(storeRoutes, { prefix: '/stores' });
await server.register(documentRoutes, { prefix: '/stores' });
await server.register(webhookRoutes, { prefix: '/webhooks' });

// Error handler
server.setErrorHandler((error, _request, reply) => {
  server.log.error(error);

  const err = error as Error & { statusCode?: number };
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  reply.status(statusCode).send({
    error: message,
    statusCode,
  });
});

// Start server
const start = async () => {
  try {
    // Railway provides PORT, local dev uses API_PORT
    const port = parseInt(process.env.PORT || process.env.API_PORT || '3001', 10);
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 API server running on http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
