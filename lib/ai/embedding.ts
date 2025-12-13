import { generateText, embed, embedMany, generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { cosineDistance, desc, gt, sql, eq, and } from "drizzle-orm";
import { embeddings } from "../db/schema";
import { db } from "../db/queries";
import { z } from "zod";

const embeddingModel = openai.embedding("text-embedding-3-small");

export const generateEmbeddings = async (
  value: string,
  onProgress?: (event: any) => void
): Promise<Array<{ embedding: number[]; content: string }>> => {
  
  // 1. Agentic Analysis
  if (onProgress) onProgress({ type: "log", message: "Agent is reading document structure..." });

  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: z.object({
      chunks: z.array(z.string()).describe("Semantically complete chunks of the text"),
    }),
    system: `You are an expert content editor. Your task is to split the input text into semantically self-contained chunks.
    
    Rules:
    - Each chunk must be a complete idea or concept.
    - Preserve all technical details and code blocks.
    - Do not summarize; use the exact original text, just split it intelligently.
    - Chunk size should be roughly 150-300 words.
    - If a code block is long, keep it together with its explanation if possible.`,
    prompt: value,
  });

  const chunks = object.chunks;

  if (onProgress) {
      onProgress({ type: "log", message: `Agent identified ${chunks.length} semantic concepts.` });
      chunks.forEach(chunk => {
          onProgress({ type: "chunk_created", content: chunk.substring(0, 50) + "..." });
      });
  }

  // 2. Embed the Agent's Chunks
  if (onProgress) onProgress({ type: "log", message: " generating vectors for chunks..." });
  
  const { embeddings: finalVectors } = await embedMany({
    model: embeddingModel,
    values: chunks,
  });
  
  return finalVectors.map((e, i) => ({
      content: chunks[i],
      embedding: e
  }));
};

//generating embedding for the input text (used for short text)
export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll("\\n", " ");
  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
  });
  return embedding;
};

export const findRelevantContent = async (userQuery: string, userId: string) => {
  // 1. Generate a hypothetical answer to the user's query (HyDE)
  const { text: hypotheticalAnswer } = await generateText({
    model: openai("gpt-4o-mini"),
    system: "You are a helpful assistant. Write a short, hypothetical answer to the user's question. This answer will be used to search for semantically similar documents. Do not answer the question directly, but write what a relevant document would look like.",
    prompt: userQuery,
  });

  // 2. Embed the hypothetical answer
  const userQueryEmbedded = await generateEmbedding(hypotheticalAnswer);
  
  const similarity = sql<number>`1 - (${cosineDistance(
    embeddings.embedding,
    userQueryEmbedded
  )})`;
  
  const similarGuides = await db
    .select({ name: embeddings.content, similarity })
    .from(embeddings)
    .where(
        and(
            gt(similarity, 0.3),
            eq(embeddings.userId, userId) // SECURITY: Filter by user ID
        )
    )
    .orderBy((t) => desc(t.similarity))
    .limit(10); // Expanded recall
  return similarGuides;
};
