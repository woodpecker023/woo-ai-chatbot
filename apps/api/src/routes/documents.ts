import { FastifyInstance } from 'fastify';
import { getDbClient } from '@woo-ai/database';
import { documents, documentChunks } from '@woo-ai/database';
import { eq, and, desc } from 'drizzle-orm';
import { authenticateUser, validateStoreOwnership } from '../middleware/auth.js';
import {
  processDocument,
  getFileType,
  isValidFileType,
  MAX_FILE_SIZE,
} from '../services/documents.js';

type StoreIdParams = { Params: { storeId: string } };
type DocumentIdParams = { Params: { storeId: string; documentId: string } };

export async function documentRoutes(server: FastifyInstance) {
  // Upload document
  server.post<StoreIdParams>('/:storeId/documents', {
    preHandler: [authenticateUser, validateStoreOwnership],
    handler: async (request, reply) => {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      const fileType = getFileType(data.filename);

      if (!isValidFileType(fileType)) {
        return reply.status(400).send({
          error: `Unsupported file type: ${fileType}. Supported types: PDF, DOCX, DOC, TXT`,
        });
      }

      // Read file buffer
      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      if (buffer.length > MAX_FILE_SIZE) {
        return reply.status(400).send({
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        });
      }

      const db = getDbClient();

      // Create document record
      const [newDocument] = await db
        .insert(documents)
        .values({
          storeId: request.params.storeId,
          fileName: data.filename,
          fileType,
          fileSize: buffer.length,
          status: 'processing',
        })
        .returning();

      // Process document in background
      processDocument(newDocument.id, buffer, fileType, request.params.storeId).catch(
        (error) => {
          server.log.error('Document processing failed:', error);
        }
      );

      return {
        document: {
          id: newDocument.id,
          fileName: newDocument.fileName,
          fileType: newDocument.fileType,
          fileSize: newDocument.fileSize,
          status: newDocument.status,
          createdAt: newDocument.createdAt,
        },
        message: 'Document uploaded and processing started',
      };
    },
  });

  // List documents
  server.get<StoreIdParams>('/:storeId/documents', {
    preHandler: [authenticateUser, validateStoreOwnership],
    handler: async (request) => {
      const db = getDbClient();

      const documentList = await db
        .select({
          id: documents.id,
          fileName: documents.fileName,
          fileType: documents.fileType,
          fileSize: documents.fileSize,
          status: documents.status,
          errorMessage: documents.errorMessage,
          createdAt: documents.createdAt,
          updatedAt: documents.updatedAt,
        })
        .from(documents)
        .where(eq(documents.storeId, request.params.storeId))
        .orderBy(desc(documents.createdAt));

      return { documents: documentList };
    },
  });

  // Get document details
  server.get<DocumentIdParams>('/:storeId/documents/:documentId', {
    preHandler: [authenticateUser, validateStoreOwnership],
    handler: async (request, reply) => {
      const db = getDbClient();

      const document = await db.query.documents.findFirst({
        where: and(
          eq(documents.id, request.params.documentId),
          eq(documents.storeId, request.params.storeId)
        ),
      });

      if (!document) {
        return reply.status(404).send({ error: 'Document not found' });
      }

      // Get chunk count
      const chunksResult = await db
        .select({ id: documentChunks.id })
        .from(documentChunks)
        .where(eq(documentChunks.documentId, document.id));

      return {
        document: {
          ...document,
          chunkCount: chunksResult.length,
        },
      };
    },
  });

  // Delete document
  server.delete<DocumentIdParams>('/:storeId/documents/:documentId', {
    preHandler: [authenticateUser, validateStoreOwnership],
    handler: async (request, reply) => {
      const db = getDbClient();

      const document = await db.query.documents.findFirst({
        where: and(
          eq(documents.id, request.params.documentId),
          eq(documents.storeId, request.params.storeId)
        ),
      });

      if (!document) {
        return reply.status(404).send({ error: 'Document not found' });
      }

      // Delete document (chunks will be cascade deleted)
      await db.delete(documents).where(eq(documents.id, request.params.documentId));

      return { success: true };
    },
  });

  // Retry failed document processing
  server.post<DocumentIdParams>('/:storeId/documents/:documentId/retry', {
    preHandler: [authenticateUser, validateStoreOwnership],
    handler: async (request, reply) => {
      const db = getDbClient();

      const document = await db.query.documents.findFirst({
        where: and(
          eq(documents.id, request.params.documentId),
          eq(documents.storeId, request.params.storeId)
        ),
      });

      if (!document) {
        return reply.status(404).send({ error: 'Document not found' });
      }

      if (document.status !== 'failed') {
        return reply.status(400).send({
          error: 'Only failed documents can be retried',
        });
      }

      // Note: For retry, we'd need to store the original file or re-upload
      // For now, users need to re-upload failed documents
      return reply.status(400).send({
        error: 'Please re-upload the document to retry processing',
      });
    },
  });
}
