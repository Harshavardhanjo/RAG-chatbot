// types/queue.ts
export interface PDFAnalysisJob {
  fileId: string;
  userId: string;
}

import { analyzePDFDocument } from "@/app/(chat)/actions";
// app/api/process-pdf/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { fileId, userId } = await req.json();
  await analyzePDFDocument(fileId, userId);
  return NextResponse.json({ success: true });
}
