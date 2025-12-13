
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { file, resources } from "./lib/db/schema";
import { desc, eq } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

async function main() {
  console.log("Checking latest files...");
  
  const files = await db.select().from(file).orderBy(desc(file.createdAt)).limit(3);
  
  for (const f of files) {
    console.log(`\nFile: ${f.name} (ID: ${f.id}) - Status: ${f.status} - Created: ${f.createdAt}`);
    
    const chunks = await db.select().from(resources).where(eq(resources.fileId, f.id)).limit(3);
    
    if (chunks.length === 0) {
      console.log("  No chunks found!");
    } else {
      chunks.forEach((c, i) => {
        console.log(`  Chunk ${i + 1}: ${c.content.substring(0, 100).replace(/\n/g, "\\n")}...`);
      });
    }
  }
}

main().catch(console.error).then(() => process.exit(0));
