import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  sourceType: varchar("source_type", { length: 16 }).notNull(), // 'url' | 'upload'
  sourceUrl: text("source_url"),
  contentType: varchar("content_type", { length: 64 })
    .notNull()
    .default("other"), // product_montage | tutorial | vlog | other
  status: varchar("status", { length: 16 }).notNull().default("processing"), // processing | done | failed
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const frames = pgTable("frames", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  seqIndex: integer("seq_index").notNull(),
  timestampSec: integer("timestamp_sec").notNull(),
  storageUrl: text("storage_url").notNull(),
});

export const frameTransitions = pgTable("frame_transitions", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  frameFromId: uuid("frame_from_id")
    .notNull()
    .references(() => frames.id, { onDelete: "cascade" }),
  frameToId: uuid("frame_to_id")
    .notNull()
    .references(() => frames.id, { onDelete: "cascade" }),
  seqIndex: integer("seq_index").notNull(),
  description: text("description").notNull(),
  motionTags: jsonb("motion_tags").$type<string[]>().notNull().default([]),
  aiProviderUsed: varchar("ai_provider_used", { length: 32 }).notNull(),
});

export const feedback = pgTable("feedback", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  frameTransitionId: uuid("frame_transition_id").references(
    () => frameTransitions.id,
    { onDelete: "cascade" }
  ),
  rating: integer("rating"),
  text: text("text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 32 }).notNull(), // claude | openai | gemini
  label: text("label").notNull(),
  encryptedKey: text("encrypted_key").notNull(),
  maskedPreview: varchar("masked_preview", { length: 32 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at"),
});

export const recreateBlueprints = pgTable("recreate_blueprints", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sourceDocumentId: uuid("source_document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  newSubjectImageUrl: text("new_subject_image_url").notNull(),
  shotList: jsonb("shot_list").$type<
    Array<{
      shotNumber: number;
      description: string;
      motionTags: string[];
      referenceFrameUrl: string;
    }>
  >(),
  status: varchar("status", { length: 16 }).notNull().default("processing"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
