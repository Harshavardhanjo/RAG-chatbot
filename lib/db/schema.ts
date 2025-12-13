import type { InferSelectModel } from "drizzle-orm";
import {
  pgTable,
  varchar,
  timestamp,
  json,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
  index,
  vector,
} from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import type { z } from "zod";

export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  password: varchar("password", { length: 64 }),
  plan: varchar("plan", { enum: ["free", "pro"] }).notNull().default("free"),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
});

export type Chat = InferSelectModel<typeof chat>;

export const message = pgTable("Message", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  content: json("content").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type Message = InferSelectModel<typeof message>;

export const vote = pgTable(
  "Vote",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "Document",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("text", { enum: ["text", "code"] })
      .notNull()
      .default("text"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  }
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "Suggestion",
  {
    id: uuid("id").notNull().defaultRandom(),
    documentId: uuid("documentId").notNull(),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    description: text("description"),
    isResolved: boolean("isResolved").notNull().default(false),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const file = pgTable("File", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  url: text("url").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id, {
      onDelete: "cascade",
    }),
  type: text("type").notNull().default("document"),
  name: text("name").notNull().default("No Name Given"), // This is fine as is
  createdAt: timestamp("createdAt").notNull(),
  status: varchar("status", {
    enum: ["processing", "processed", "failed"],
  }).default("processing"),
  description: text("description").default("No Description Given"),
});

// Schema for files - used to validate API requests
export const baseFileSchema = createSelectSchema(file);
export const insertFileSchema = baseFileSchema.extend({}).omit({
  id: true,
});

// Type for files - used to type API request params and within Components
export type NewFileData = z.input<typeof insertFileSchema>;

export type FileDocument = InferSelectModel<typeof file>;

export const resources = pgTable("resources", {
  content: text("content").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id, {
      onDelete: "cascade",
    }),
  fileId: uuid("fileId")
    .notNull()
    .references(() => file.id, {
      onDelete: "cascade",
    }),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
});

// Schema for resources - used to validate API requests
export const baseResourceSchema = createSelectSchema(resources);
export const insertResourceSchema = createSelectSchema(resources)
  .extend({})
  .omit({
    id: true,
    userId: true,
  });

// Type for resources - used to type API request params and within Components
export type NewResourceParams = z.infer<typeof insertResourceSchema>;

export const embeddings = pgTable(
  "embeddings",
  {
    id: uuid("id").notNull().defaultRandom(),
    resourceId: uuid("resourceId").references(() => resources.id),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => ({
    embeddingIndex: index("embeddingIndex").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  })
);
