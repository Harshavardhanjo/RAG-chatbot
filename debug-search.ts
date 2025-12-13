
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { embeddings } from "./lib/db/schema";
import { cosineDistance, desc, gt, sql } from "drizzle-orm";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

const embeddingModel = openai.embedding("text-embedding-3-small");

const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll("\\n", " ");
  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
  });
  return embedding;
};

async function main() {
  const query = "work experience";
  console.log(`Searching for: "${query}"...`);

  const userQueryEmbedded = await generateEmbedding(query);
  const similarity = sql<number>`1 - (${cosineDistance(
    embeddings.embedding,
    userQueryEmbedded
  )})`;
  
  const results = await db
    .select({ content: embeddings.content, similarity })
    .from(embeddings)
    .where(gt(similarity, 0.3)) // Testing the new 0.3 threshold
    .orderBy((t) => desc(t.similarity))
    .limit(4);

  console.log(`Found ${results.length} matches:`);
  results.forEach(r => {
    console.log(`\n[Score: ${r.similarity}]\n${r.content.substring(0, 150)}...`);
  });
}

main().catch(console.error).then(() => process.exit(0));
