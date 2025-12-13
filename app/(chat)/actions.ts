"use server";

import { type CoreUserMessage, generateText } from "ai";
import { cookies } from "next/headers";

import { customModel } from "@/lib/ai";
import {
  createResource,
  db,
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
} from "@/lib/db/queries";
import type { VisibilityType } from "@/components/visibility-selector";
import { file, } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PdfReader } from "pdfreader";
import { z } from "zod";

export async function saveModelId(model: string) {
  const cookieStore = await cookies();
  cookieStore.set("model-id", model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: CoreUserMessage;
}) {
  const { text: title } = await generateText({
    model: customModel("gpt-5.2"),
    system: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
    prompt: JSON.stringify(message),
  });

  return title;
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisiblityById({ chatId, visibility });
}

// Constants
const CONFIG = {
  MAX_SENTENCES: 1000,
  FETCH_TIMEOUT: 30000, // 30 seconds
  CHUNK_SIZE: 50, // Number of sentences to process in parallel
} as const;

// Validation schemas
const FileSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  status: z.enum(["pending", "processing", "processed", "failed"]),
});

// Custom error types
class PDFProcessingError extends Error {
  constructor(message: string, public readonly fileId: string) {
    super(message);
    this.name = "PDFProcessingError";
  }
}

// Types
interface ProcessingResult {
  success: boolean;
  error?: Error;
}

/**
 * Analyzes a PDF document and breaks it into sentences for processing
 * @param fileId - The ID of the file to process
 * @param userId - The ID of the user requesting the analysis
 * @returns Promise<boolean> indicating success or failure
 */
export const analyzePDFDocument = async (
  fileId: string,
  userId: string
): Promise<boolean> => {


  try {
    // Update status to processing
    await updateFileStatus(fileId, "processing");

    // Fetch and validate document
    const documents = await db.select().from(file).where(eq(file.id, fileId));
    const document = FileSchema.parse(documents[0]);

    // Extract and clean text
    const fullText = await extractAndCleanPDFText(document.url);


    if (!fullText) {
      throw new PDFProcessingError("No text content found in PDF", fileId);
    }

    // Process sentences
    const sentences = splitIntoSentences(fullText);
    const results = await processSentencesInChunks(sentences, fileId, userId);

    // Update final status
    await updateFileStatus(fileId, "processed");


    return true;
  } catch (error) {
    console.error(`Error processing PDF document ${fileId}:`, error);
    await handleProcessingError(error as Error, fileId);
    return false;
  }
};

/**
 * Splits text into sentences and processes them in chunks to avoid memory issues
 */
async function processSentencesInChunks(
  sentences: string[],
  fileId: string,
  userId: string
): Promise<ProcessingResult[]> {
  const limitedSentences = sentences.slice(0, CONFIG.MAX_SENTENCES);
  const results: ProcessingResult[] = [];

  for (let i = 0; i < limitedSentences.length; i += CONFIG.CHUNK_SIZE) {
    const chunk = limitedSentences.slice(i, i + CONFIG.CHUNK_SIZE);
    const chunkResults = await Promise.allSettled(
      chunk.map((sentence) =>
        createResource({ content: sentence, fileId }, userId)
      )
    );

    results.push(
      ...chunkResults.map((result) => ({
        success: result.status === "fulfilled",
        error: result.status === "rejected" ? result.reason : undefined,
      }))
    );
  }

  return results;
}

/**
 * Extracts and cleans text from a PDF document
 */
async function extractAndCleanPDFText(url: string): Promise<string> {
  const pdfBuffer = await fetchPDFWithTimeout(url);
  const rawText = await extractTextFromPDF(pdfBuffer);
  return cleanPDFText(rawText);
}

/**
 * Fetches PDF with timeout protection
 */
async function fetchPDFWithTimeout(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.FETCH_TIMEOUT);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Extracts text from PDF buffer
 */
async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const textItems: string[] = [];
    const pdf = new PdfReader();

    pdf.parseBuffer(pdfBuffer, (err, item) => {
      if (err) {
        reject(new Error(`PDF parsing error`));
        return;
      }

      if (!item) {
        resolve(textItems.join(" "));
        return;
      }

      if (item.text) {
        textItems.push(item.text);
      }
    });
  });
}

/**
 * Cleans and normalizes PDF text
 */
function cleanPDFText(text: string): string {
  return text
    .replace(/[Ɵθ]/g, "th")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^a-zA-Z0-9.,!? ]/g, " ")
    .replace(/(?:[A-Za-z])\-\s+/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,!?])/g, "$1")
    .trim();
}

/**
 * Splits text into sentences using proper regex pattern
 */
function splitIntoSentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+/g) || [];
}

/**
 * Updates file status in database
 */
async function updateFileStatus(
  fileId: string,
  status: "processing" | "processed" | "failed"
): Promise<void> {
  await db.update(file).set({ status }).where(eq(file.id, fileId));
}

/**
 * Handles processing errors and updates status
 */
async function handleProcessingError(
  error: Error,
  fileId: string
): Promise<void> {
  console.error(`Processing error for file ${fileId}:`, error);
  await updateFileStatus(fileId, "failed");

  // Here you could add additional error handling like:
  // - Sending notifications
  // - Logging to monitoring service
  // - Retrying with exponential backoff
}
