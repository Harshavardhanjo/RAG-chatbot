import { auth } from "@/app/(auth)/auth";
import { getFilesByUserId } from "@/lib/db/queries";

export async function GET(request: Request) {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const files = await getFilesByUserId({ userId: session.user.id });

  console.log("files", files);

  return Response.json(files, { status: 200 });
}
