
import { auth } from "@/app/(auth)/auth";
import { deleteFileById } from "@/lib/db/queries";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const BulkDeleteSchema = z.object({
  ids: z.array(z.string()),
});

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const json = await request.json();
    const { ids } = BulkDeleteSchema.parse(json);

    if (ids.length === 0) {
      return new Response("No IDs provided", { status: 400 });
    }

    // Process deletions sequentially to ensure cascade logic in deleteFileById works
    // In a production app with huge bulk deletes, we might want a raw SQL query
    // but for now reusing the existing logic is safer and cleaner.
    const deletedIds: string[] = [];
    const failedIds: string[] = [];

    for (const id of ids) {
      try {
        await deleteFileById({ id });
        deletedIds.push(id);
      } catch (error) {
        console.error(`Failed to delete file ${id}:`, error);
        failedIds.push(id);
      }
    }

    return NextResponse.json({ 
        deletedCount: deletedIds.length, 
        failedCount: failedIds.length,
        deletedIds,
        failedIds 
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
        return new Response("Invalid request body", { status: 400 });
    }
    console.error("Bulk delete failed:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
