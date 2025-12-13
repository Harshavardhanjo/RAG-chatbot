import "server-only";

import { genSaltSync, hashSync } from "bcrypt-ts";
import { and, asc, desc, eq, gt, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  type Message,
  message,
  vote,
  NewFileData,
  file,
  FileDocument,
  insertResourceSchema,
  NewResourceParams,
  resources,
  embeddings as embeddingsTable,
} from "./schema";
import { BlockKind } from "@/components/block";
import { auth } from "@/app/(auth)/auth";
import { generateEmbeddings } from "../ai/embedding";

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
export const db = drizzle(client);

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error("Failed to get user from database");
    throw error;
  }
}

export async function createUser(email: string, password: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  try {
    return await db.insert(user).values({ email, password: hash });
  } catch (error) {
    console.error("Failed to create user in database");
    throw error;
  }
}

export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
    });
  } catch (error) {
    console.error("Failed to save chat in database");
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));

    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error("Failed to delete chat by id from database");
    throw error;
  }
}

export async function getChatsByUserId({ id }: { id: string }) {
  if (!id) {
    throw new Error("User ID is required");
  }

  try {
    return await db
      .select()
      .from(chat)
      .where(eq(chat.userId, id))
      .orderBy(desc(chat.createdAt));
  } catch (error) {
    console.error("Failed to get chats by user from database");
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error("Failed to get chat by id from database");
    throw error;
  }
}

export async function saveMessages({ messages }: { messages: Array<Message> }) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    console.error("Failed to save messages in database", error);
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    console.error("Failed to get messages by chat id from database", error);
    throw error;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === "up" })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }

    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === "up",
    });
  } catch (error) {
    console.error("Failed to vote message in database", error);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error("Failed to get votes by chat id from database", error);
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: BlockKind;
  content: string;
  userId: string;
}) {
  try {
    return await db.insert(document).values({
      id,
      title,
      kind,
      content,
      userId,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to save document in database");
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error("Failed to get document by id from database");
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error("Failed to get document by id from database");
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp)
        )
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
  } catch (error) {
    console.error(
      "Failed to delete documents by id after timestamp from database"
    );
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error("Failed to save suggestions in database");
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(eq(suggestion.documentId, documentId));
  } catch (error) {
    console.error("Failed to get suggestions by document id from database");
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    console.error("Failed to get message by id from database");
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    return await db
      .delete(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp))
      );
  } catch (error) {
    console.error(
      "Failed to delete messages by id after timestamp from database"
    );
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error("Failed to update chat visibility in database");
    throw error;
  }
}

export async function createFile({
  url,
  type,
  name,
  status,
  description,
}: Omit<NewFileData, "userId" | "createdAt">): Promise<FileDocument[]> {
  const session = await auth();
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }
  try {
    const data = await db
      .insert(file)
      .values({
        url,
        type,
        name,
        status,
        description,
        userId: session.user?.id as string,
        createdAt: new Date(),
      })
      .returning();
    return data;
  } catch (error) {
    console.error("Failed to create file in database");
    throw error;
  }
}

export async function getFilesByUserId({ userId }: { userId: string }) {
  try {
    return await db
      .select()
      .from(file)
      .where(eq(file.userId, userId))
      .orderBy(desc(file.createdAt));
  } catch (error) {
    console.error("Failed to get files by user id from database");
    throw error;
  }
}

export async function deleteFileById({ id }: { id: string }) {
  try {
    const fileResources = await db.select().from(resources).where(eq(resources.fileId, id));
    
    for (const resource of fileResources) {
        await db.delete(embeddingsTable).where(eq(embeddingsTable.resourceId, resource.id));
    }
    
    await db.delete(resources).where(eq(resources.fileId, id));
    
    return await db.delete(file).where(eq(file.id, id));
  } catch (error) {
    console.error("Failed to delete file by id from database");
    throw error;
  }
}


export async function updateFileStatus(id: string, status: "processing" | "processed" | "failed") {
  try {
    return await db.update(file).set({ status }).where(eq(file.id, id));
  } catch (error) {
    console.error("Failed to update file status in database");
    throw error;
  }
}

export async function getResourcesByFileId({ fileId }: { fileId: string }) {
  try {
    return await db.select().from(resources).where(eq(resources.fileId, fileId));
  } catch (error) {
    console.error("Failed to get resources by file id from database");
    throw error;
  }
}

export const createResource = async (
  input: NewResourceParams,
  userId: string,
  onProgress?: (step: string) => void
) => {

  try {
    const { content, fileId } = insertResourceSchema.parse(input);

    onProgress?.("Saving raw resource...");
    const [resource] = await db
      .insert(resources)
      .values({ content, userId: userId, fileId })
      .returning();

    onProgress?.("Generating semantic embeddings...");
    const embeddings = await generateEmbeddings(content);
    
    onProgress?.(`Saving ${embeddings.length} embeddings...`);
    await db.insert(embeddingsTable).values(
      embeddings.map((embedding) => ({
        resourceId: resource.id,
        ...embedding,
        userId,
      }))
    );

    return "Resource successfully created and embedded.";
  } catch (error) {
    return error instanceof Error && error.message.length > 0
      ? error.message
      : "Error, please try again.";
  }
};



export async function createEmbeddings({
  context,
  userId,
}: {
  context: string;
  userId: string;
}) {
  const res = await generateEmbeddings(context);
  const dbRes = await db.insert(embeddingsTable).values(
    res.map((embedding) => ({
      content: embedding.content,
      embedding: embedding.embedding,
      userId,
    }))
  );
  return dbRes;
}

export async function analyzePDFDocument(file: File, fileId: string, onProgress?: (step: string) => void) {
  const session = await auth();
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // @ts-ignore
  const pdf = (await import("pdf-parse")).default;

  try {
    onProgress?.("Extracting text from PDF...");
    const data = await pdf(buffer);
    const text = data.text;

    if (text && text.length > 0) {
      const result = await createResource(
        { content: text, fileId },
        session.user?.id as string,
        onProgress
      );
      return result;
    } else {
      return "No text found in PDF";
    }
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw error;
  }
}
