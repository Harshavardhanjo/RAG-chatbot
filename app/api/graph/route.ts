import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db/queries";
import { file, resources } from "@/lib/db/schema";
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

    const allResources = await db
      .select()
      .from(resources)
      .where(eq(resources.userId, session.user.id));

    const nodes = [
      ...files.map((f) => ({
        id: f.id,
        name: f.name || "Untitled File",
        type: "file",
        val: 10,
      })),
      ...allResources.map((r) => ({
        id: r.id,
        name: r.content.substring(0, 20) + "...",
        type: "resource",
        val: 5,
        fullContent: r.content,
      })),
    ];

    const links = allResources.map((r) => ({
      source: r.fileId,
      target: r.id,
    }));

    return NextResponse.json({ nodes, links });
  } catch (error) {
    console.error("Failed to fetch graph data:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
