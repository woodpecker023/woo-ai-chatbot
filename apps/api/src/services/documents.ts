import { getDbClient } from '@woo-ai/database';
import { documents, documentChunks } from '@woo-ai/database';
import { eq } from 'drizzle-orm';
import { generateEmbedding } from './openai.js';
import { createRequire } from 'module';
import mammoth from 'mammoth';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const CHUNK_SIZE = 1000; // characters
const CHUNK_OVERLAP = 200; // characters

/**
 * Parse document content based on file type
 */
export async function parseDocument(
  buffer: Buffer,
  fileType: string
): Promise<string> {
  switch (fileType.toLowerCase()) {
    case 'pdf':
      return parsePdf(buffer);
    case 'docx':
    case 'doc':
      return parseWord(buffer);
    case 'txt':
      return buffer.toString('utf-8');
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Parse PDF document
 */
async function parsePdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}

/**
 * Parse Word document (docx)
 */
async function parseWord(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/**
 * Split text into overlapping chunks
 */
export function chunkText(text: string): string[] {
  const chunks: string[] = [];
  const cleanedText = text.replace(/\s+/g, ' ').trim();

  if (cleanedText.length <= CHUNK_SIZE) {
    return [cleanedText];
  }

  let start = 0;
  while (start < cleanedText.length) {
    let end = start + CHUNK_SIZE;

    // Try to break at sentence or paragraph boundary
    if (end < cleanedText.length) {
      const lastPeriod = cleanedText.lastIndexOf('.', end);
      const lastNewline = cleanedText.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);

      if (breakPoint > start + CHUNK_SIZE / 2) {
        end = breakPoint + 1;
      }
    }

    const chunk = cleanedText.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    start = end - CHUNK_OVERLAP;
    if (start < 0) start = 0;
  }

  return chunks;
}

/**
 * Process uploaded document
 */
export async function processDocument(
  documentId: string,
  buffer: Buffer,
  fileType: string,
  storeId: string
): Promise<void> {
  const db = getDbClient();

  try {
    // Update status to processing
    await db
      .update(documents)
      .set({ status: 'processing', updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    // Parse document
    const text = await parseDocument(buffer, fileType);

    if (!text || text.trim().length === 0) {
      throw new Error('Document is empty or could not be parsed');
    }

    // Chunk the text
    const chunks = chunkText(text);

    // Create embeddings and store chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await generateEmbedding(chunk);

      await db.insert(documentChunks).values({
        documentId,
        storeId,
        content: chunk,
        chunkIndex: i,
        embedding,
      });
    }

    // Update status to completed
    await db
      .update(documents)
      .set({
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));
  } catch (error) {
    // Update status to failed
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await db
      .update(documents)
      .set({
        status: 'failed',
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    throw error;
  }
}

/**
 * Get file type from filename
 */
export function getFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) throw new Error('Could not determine file type');
  return ext;
}

/**
 * Validate file type
 */
export function isValidFileType(fileType: string): boolean {
  return ['pdf', 'docx', 'doc', 'txt'].includes(fileType.toLowerCase());
}

/**
 * Get max file size in bytes (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
