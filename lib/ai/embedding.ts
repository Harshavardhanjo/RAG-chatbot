import { generateText, embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { cosineDistance, desc, gt, sql, eq, and } from "drizzle-orm";
import { embeddings } from "../db/schema";
import { db } from "../db/queries";

const embeddingModel = openai.embedding("text-embedding-3-small");

// Helper to calculate cosine similarity
const cosineSimilarity = (a: number[], b: number[]) => {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
};

export const generateEmbeddings = async (
  value: string,
  onProgress?: (event: any) => void
): Promise<Array<{ embedding: number[]; content: string }>> => {
  // 1. Split into sentences (simple rule-based)
  const sentences = value.match(/[^.!?]+[.!?]+[\])'"]*/g) || [value];

  // 2. Generate embeddings for all sentences
  if (onProgress) onProgress({ type: "log", message: `Embedding ${sentences.length} sentences...` });
  
  // Use embedMany for efficiency
  const { embeddings: sentenceEmbeddings } = await embedMany({
    model: embeddingModel,
    values: sentences,
  });

  // 3. Group sentences based on semantic similarity
  const chunks: string[] = [];
  let currentChunk = sentences[0];
  let currentChunkEmbedding = sentenceEmbeddings[0];

  for (let i = 1; i < sentences.length; i++) {
    const nextSentence = sentences[i];
    const nextEmbedding = sentenceEmbeddings[i];

    const similarity = cosineSimilarity(currentChunkEmbedding, nextEmbedding);

    // Emit debug event for visualization (throttle to avoid flooding)
    if (onProgress && i % 2 === 0) { 
        onProgress({ 
            type: "similarity", 
            sentence1: currentChunk.substring(0, 50) + "...", 
            sentence2: nextSentence.substring(0, 50) + "...", 
            score: similarity.toFixed(2),
            threshold: 0.5 
        }); 
    }

    if (similarity > 0.5) {
      // Semantically similar: Group them
      currentChunk += " " + nextSentence;
      currentChunkEmbedding = nextEmbedding; 
    } else {
      // Not similar: Close chunk and start new
      chunks.push(currentChunk);
      if (onProgress) onProgress({ type: "chunk_created", content: currentChunk.substring(0, 40) + "..." });
      
      currentChunk = nextSentence;
      currentChunkEmbedding = nextEmbedding;
    }
  }
  chunks.push(currentChunk); // Add final chunk

  // 4. Re-embed the final chunks for high-quality retrieval
  if (onProgress) onProgress({ type: "log", message: `Generated ${chunks.length} semantic chunks. Re-embedding...` });
  
  const finalEmbeddings = await Promise.all(
    chunks.map(async (chunk) => {
        // Reuse the single embedding function or the batch one. 
        // Batch is better but we already have `generateEmbedding` helper below.
        // Let's us embedMany for the chunks too.
        return {
           content: chunk,
           embedding: [] as number[] // placeholder, satisfied below
        }
    })
  );
  
  // Actual embedding call for final chunks
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
