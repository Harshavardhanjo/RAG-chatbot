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
  
  // 1. Agentic Analysis (Batched)
  if (onProgress) {
      onProgress({ type: "log", message: "Starting Agentic Chunking process..." });
      onProgress({ type: "log", message: `Input text length: ${value.length} characters.` });
      onProgress({ type: "log", message: "Initializing GPT-4o-mini model..." });
  }

  const BATCH_SIZE = 20000;
  const CONCURRENCY_LIMIT = 5;
  const chunks: string[] = [];
  
  const batches = [];
  for (let i = 0; i < value.length; i += BATCH_SIZE) {
      batches.push({ index: i, batchNum: Math.floor(i / BATCH_SIZE) + 1 });
  }

  const totalBatches = batches.length;
  
  // Helper for concurrent execution
  const processBatch = async ({ index, batchNum }: { index: number, batchNum: number }) => {
      if (onProgress) {
          onProgress({ type: "log", message: `> Processing batch ${batchNum}/${totalBatches} started...` });
          onProgress({ type: "progress", percentage: Math.round((batchNum / totalBatches) * 100) });
      }
      
      const segment = value.slice(index, index + BATCH_SIZE);
      
      try {
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
            prompt: segment,
          });
          
          if (onProgress) onProgress({ type: "log", message: `> Batch ${batchNum}/${totalBatches} complete. Found ${object.chunks.length} chunks.` });
          return object.chunks;
      } catch (err) {
          console.error(`Batch ${batchNum} failed`, err);
          if (onProgress) onProgress({ type: "log", message: `! Batch ${batchNum} failed. Retrying or skipping...` });
          return [];
      }
  };

  // Execute with concurrency limit
  const results = [];
  for (let i = 0; i < batches.length; i += CONCURRENCY_LIMIT) {
      const slice = batches.slice(i, i + CONCURRENCY_LIMIT);
      if (onProgress && i > 0) onProgress({ type: "log", message: `Starting next group of ${slice.length} batches...` });
      
      const batchResults = await Promise.all(slice.map(processBatch));
      results.push(...batchResults);
  }
  
  // Flatten chunks
  results.forEach(batchChunks => chunks.push(...batchChunks));
  
  if (onProgress) onProgress({ type: "log", message: `Agent response received. Organizing ${chunks.length} total chunks...` });

  if (onProgress) {
      onProgress({ type: "log", message: `Agent identified ${chunks.length} distinct semantic concepts.` });
      chunks.forEach((chunk, idx) => {
          onProgress({ type: "chunk_created", content: chunk });
          onProgress({ type: "log", message: `Processed chunk ${idx + 1}/${chunks.length} (${chunk.length} chars).` });
      });
  }

  // 2. Embed the Agent's Chunks
  if (onProgress) {
      onProgress({ type: "log", message: "Initializing text-embedding-3-small..." });
      onProgress({ type: "log", message: `Generating vectors for ${chunks.length} chunks...` });
  }
  
  const { embeddings: finalVectors } = await embedMany({
    model: embeddingModel,
    values: chunks,
  });
  
  if (onProgress) onProgress({ type: "log", message: "Vector generation successful." });
  
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

export const findRelevantContent = async (userQuery: string, userId: string, onProgress?: (step: any) => void) => {
  // 1. Generate a hypothetical answer to the user's query (HyDE)
  if (onProgress) onProgress({ type: 'step', status: 'Generating hypothetical answer...' });
  const { text: hypotheticalAnswer } = await generateText({
    model: openai("gpt-4o-mini"),
    system: "You are a helpful assistant. Write a short, hypothetical answer to the user's question. This answer will be used to search for semantically similar documents. Do not answer the question directly, but write what a relevant document would look like.",
    prompt: userQuery,
  });
  
  if (onProgress) onProgress({ type: 'hyde-generated', content: hypotheticalAnswer });

  // 2. Embed the hypothetical answer
  if (onProgress) onProgress({ type: 'step', status: 'Embedding query...' });
  const userQueryEmbedded = await generateEmbedding(hypotheticalAnswer);
  
  const similarity = sql<number>`1 - (${cosineDistance(
    embeddings.embedding,
    userQueryEmbedded
  )})`;
  
  // 3. Initial dense retrieval (Recall Phase)
  if (onProgress) onProgress("Searching knowledge base...");
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
    .limit(10); // Expanded recall for filtering
    
    if (onProgress) onProgress({ type: 'retrieved-candidates', count: similarGuides.length });
    
    if (similarGuides.length === 0) return [];

  // 4. ReAct Filtering & Verification (Precision Phase)
  if (onProgress) onProgress({ type: 'step', status: `Evaluating ${similarGuides.length} chunks for relevance...` });
  console.log(`[ReAct] Evaluating ${similarGuides.length} chunks for relevance...`);
  
  const { object: evaluation } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: z.object({
          relevantChunks: z.array(z.object({
              chunkIndex: z.number(),
              isRelevant: z.boolean(),
              reasoning: z.string(),
              relevantQuotes: z.array(z.string()).describe("Exact quotes from the text that answer the query"),
          })),
      }),
      system: `You are a strict content evaluator. Your task is to filter a list of retrieved documents based on their relevance to a user query.
      
      Query: "${userQuery}"
      
      For each chunk provided:
      1. Determine if it contains distinct information that answers the query.
      2. If meaningful, set isRelevant to true.
      3. Extract exact quotes that support the answer.
      4. Provide a brief reasoning.
      
      Be strict. If a chunk is vague or unrelated, mark it as false.`,
      prompt: JSON.stringify(similarGuides.map((g, i) => ({ index: i, text: g.name }))),
  });

  // 5. Filter and Format
  const filteredResults = evaluation.relevantChunks
      .filter(r => r.isRelevant)
      .map(r => ({
          name: similarGuides[r.chunkIndex].name,
          reasoning: r.reasoning,
          quotes: r.relevantQuotes,
          similarity: similarGuides[r.chunkIndex].similarity
      }));

   if (onProgress) {
       evaluation.relevantChunks.forEach(r => {
           onProgress({ 
               type: 'react-evaluation', 
               chunkId: r.chunkIndex, 
               isRelevant: r.isRelevant, 
               reasoning: r.reasoning,
               content: similarGuides[r.chunkIndex].name,
               quotes: r.relevantQuotes
           });
       });
   }
      
   console.log(`[ReAct] Filtered down to ${filteredResults.length} relevant chunks.`);
   return filteredResults;
};
