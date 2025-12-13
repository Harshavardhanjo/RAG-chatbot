import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db/queries";
import { file, resources, embeddings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const files = await db
      .select()
      .from(file)
      .where(eq(file.userId, session.user.id));

    // Fetch embeddings (chunks) joined with resources to get the fileId
    const chunks = await db
      .select({
        id: embeddings.id,
        content: embeddings.content,
        fileId: resources.fileId,
      })
      .from(embeddings)
      .innerJoin(resources, eq(embeddings.resourceId, resources.id))
      .where(eq(resources.userId, session.user.id));

    const nodes = [
      ...files.map((f) => ({
        id: f.id,
        name: f.name || "Untitled File",
        type: "file",
        val: 10,
      })),
      ...chunks.map((c) => ({
        id: c.id,
        name: `${c.content.substring(0, 20)}...`,
        type: "resource", // Keeping type as 'resource' for frontend compatibility, but it represents a chunk now
        val: 5,
        fullContent: c.content,
      })),
    ];

    const links = chunks.map((c) => ({
      source: c.fileId,
      target: c.id,
    }));

    return NextResponse.json({ nodes, links });
  } catch (error) {
    console.error("Failed to fetch graph data:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
