import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { crawlUrl, crawlWebsite } from '../services/crawler.js';
import { generateFAQsFromContent } from '../services/openai.js';
import { authenticateUser } from '../middleware/auth.js';

const crawlUrlSchema = z.object({
  url: z.string().min(1),
});

const crawlWebsiteSchema = z.object({
  url: z.string().min(1),
  maxPages: z.number().min(1).max(10).optional().default(5),
});

const generateFaqsSchema = z.object({
  content: z.string().min(1),
  websiteTitle: z.string().min(1),
  language: z.string().optional().default('English'),
  maxFaqs: z.number().min(1).max(20).optional().default(10),
});

const autoGenerateFaqsSchema = z.object({
  url: z.string().min(1),
  maxPages: z.number().min(1).max(10).optional().default(5),
  language: z.string().optional().default('English'),
  maxFaqs: z.number().min(1).max(20).optional().default(10),
});

export async function wizardRoutes(server: FastifyInstance) {
  /**
   * Crawl a single URL and extract content
   * POST /wizard/crawl-url
   */
  server.post('/crawl-url', {
    preHandler: [authenticateUser],
    handler: async (request, reply) => {
      try {
        const body = crawlUrlSchema.parse(request.body);
        const result = await crawlUrl(body.url);
        return result;
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid URL', details: error.errors });
        }
        throw error;
      }
    },
  });

  /**
   * Crawl a website (multiple pages) and extract content
   * POST /wizard/crawl-website
   */
  server.post('/crawl-website', {
    preHandler: [authenticateUser],
    handler: async (request, reply) => {
      try {
        const body = crawlWebsiteSchema.parse(request.body);
        const result = await crawlWebsite(body.url, body.maxPages);
        return result;
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid request', details: error.errors });
        }
        throw error;
      }
    },
  });

  /**
   * Generate FAQs from provided content
   * POST /wizard/generate-faqs
   */
  server.post('/generate-faqs', {
    preHandler: [authenticateUser],
    handler: async (request, reply) => {
      try {
        const body = generateFaqsSchema.parse(request.body);
        const faqs = await generateFAQsFromContent(body.content, body.websiteTitle, {
          language: body.language,
          maxFaqs: body.maxFaqs,
        });

        return {
          success: true,
          faqs,
          count: faqs.length,
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid request', details: error.errors });
        }
        throw error;
      }
    },
  });

  /**
   * Crawl website and automatically generate FAQs (combined endpoint)
   * POST /wizard/auto-generate-faqs
   */
  server.post('/auto-generate-faqs', {
    preHandler: [authenticateUser],
    handler: async (request, reply) => {
      try {
        const body = autoGenerateFaqsSchema.parse(request.body);

        // Step 1: Crawl the website
        const crawlResult = await crawlWebsite(body.url, body.maxPages);

        if (!crawlResult.success || crawlResult.pages.length === 0) {
          return reply.status(400).send({
            error: 'Failed to crawl website',
            details: crawlResult.error,
          });
        }

        // Combine content from all successful pages
        const successfulPages = crawlResult.pages.filter(p => p.success);
        const combinedContent = successfulPages
          .map(p => p.content)
          .join('\n\n---\n\n');

        const websiteTitle = successfulPages[0]?.title || body.url;

        // Step 2: Generate FAQs from combined content
        const faqs = await generateFAQsFromContent(combinedContent, websiteTitle, {
          language: body.language,
          maxFaqs: body.maxFaqs,
        });

        return {
          success: true,
          websiteTitle,
          pagesScanned: successfulPages.length,
          totalWordCount: crawlResult.totalWordCount,
          faqs,
          faqCount: faqs.length,
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid request', details: error.errors });
        }
        throw error;
      }
    },
  });
}
