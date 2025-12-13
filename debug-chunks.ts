
import { db } from "./lib/db/queries";
import { embeddings, resources, file } from "./lib/db/schema";
import { eq, count } from "drizzle-orm";

async function checkChunks() {
  console.log("Checking database...");
  
  // Get the most recent file
  const files = await db.select().from(file).limit(1).orderBy(file.createdAt); // Actually we want desc to get latest? No, let's just get all.
  // actually let's just count total embeddings
  
  const embeddingCount = await db.select({ count: count() }).from(embeddings);
  console.log("Total embeddings in DB:", embeddingCount[0].count);

  const resourceCount = await db.select({ count: count() }).from(resources);
  console.log("Total resources in DB:", resourceCount[0].count);
  
  // Check specifically for the last uploaded file if possible, but global count is a good start.
  process.exit(0);
}

checkChunks().catch(console.error);
