import { auth } from "@/app/(auth)/auth";
import { deleteFileById } from "@/lib/db/queries";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest) {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Missing id", { status: 400 });
  }

  try {
    await deleteFileById({ id });
    return new Response("File deleted", { status: 200 });
  } catch (error) {
    console.error("Failed to delete file:", error);
    return new Response("Failed to delete file", { status: 500 });
  }
}
