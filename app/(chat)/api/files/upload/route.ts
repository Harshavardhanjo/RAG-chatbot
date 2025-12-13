import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";
import { analyzePDFDocument, createFile, updateFileStatus } from "@/lib/db/queries";
import { user } from "@/lib/db/schema";

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 50 * 1024 * 1024, {
      message: "File size should be less than 50MB",
    })
    // Update the file type based on the kind of files you want to accept
    .refine(
      (file) =>
        ["image/jpeg", "image/png", "application/pdf"].includes(file.type),
      {
        message: "File type should be JPEG or PNG",
      }
    ),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.body === null) {
    return new Response("Request body is empty", { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(", ");

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get filename from formData since Blob doesn't have name property
    const filename = (formData.get("file") as File).name;
    const fileBuffer = await file.arrayBuffer();

    try {
      let url = ""; 
      // try {
      //   const data = await put(`${filename}`, fileBuffer, {
      //     access: "public",
      //   });
      //   url = data.url;
      // } catch (error) {
         console.warn("Blob upload skipped/failed. Using local placeholder.");
         url = `local://${filename}`;
      // }

      const newFile = await createFile({
        url: url,
        // userId: session.user?.id, // Handled by createFile
        type: file.type,
        name: filename,
        // createdAt: new Date(),   // Handled by createFile
        status: "processing",
        description: "Uploaded via Knowledge Base",
      });

        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                
                const sendProgress = (step: string) => {
                    controller.enqueue(encoder.encode(JSON.stringify({ status: 'progress', message: step }) + '\n'));
                };

                try {
                    if (file.type === "application/pdf") {
                        await analyzePDFDocument(file as File, newFile[0].id, sendProgress);
                        await updateFileStatus(newFile[0].id, "processed");
                    } else {
                        await updateFileStatus(newFile[0].id, "processed");
                    }
                    
                    controller.enqueue(encoder.encode(JSON.stringify({ status: 'complete', file: newFile[0] }) + '\n'));
                    controller.close();
                } catch (e) {
                     controller.enqueue(encoder.encode(JSON.stringify({ status: 'error', message: 'Processing failed' }) + '\n'));
                     controller.close();
                }
            }
        });

      return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        }
      });
    } catch (error) {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
