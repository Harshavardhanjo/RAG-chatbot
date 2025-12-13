import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getResourcesByFileId } from "@/lib/db/queries";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const chunks = await getResourcesByFileId({ fileId: id });
    return NextResponse.json(chunks);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch file chunks" },
      { status: 500 }
    );
  }
}
