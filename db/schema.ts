import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  varchar,
  boolean,
  timestamp,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// --- Enums -----------------------------------------------------------------

export const formatEnum = pgEnum("format", [
  "LP",
  "2xLP",
  '7"',
  '10"',
  '12"',
  "other",
]);

// --- Tables ----------------------------------------------------------------

export const records = pgTable(
  "records",
  {
    id: serial("id").primaryKey(),
    artist: varchar("artist", { length: 256 }).notNull(),
    title: varchar("title", { length: 256 }).notNull(),
    label: varchar("label", { length: 256 }),
    catalogNumber: varchar("catalog_number", { length: 128 }),
    year: integer("year"),
    country: varchar("country", { length: 128 }),
    format: formatEnum("format").notNull().default("LP"),

    // New vs used. Condition fields apply to used records only.
    // Kupindo's native 1–5 grade with optional +/- (e.g. "5", "5-", "4+").
    isNew: boolean("is_new").notNull().default(false),
    conditionMedia: varchar("condition_media", { length: 4 }),
    conditionSleeve: varchar("condition_sleeve", { length: 4 }),

    // Single-currency pricing in RSD (whole dinars). When callForPrice is true,
    // price is hidden and "Call for price" is shown instead.
    priceRsd: integer("price_rsd"),
    callForPrice: boolean("call_for_price").notNull().default(false),

    // Stock is tracked privately; only `quantity > 0` ("in stock") is shown publicly.
    quantity: integer("quantity").notNull().default(0),

    // Serbian-only free text (UI is bilingual, record content is not — see ADR).
    description: text("description"),

    // Import provenance. For records pulled from an external marketplace
    // (e.g. "kupindo"), `externalId` makes imports idempotent and lets a later
    // detail-enrichment pass locate the source listing again.
    source: varchar("source", { length: 32 }),
    externalId: varchar("external_id", { length: 64 }),
    sourceUrl: text("source_url"),
    // Set when only the listing-level data has been imported; cleared once the
    // detail page (condition, extra photos, description) has been fetched.
    needsEnrichment: boolean("needs_enrichment").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("records_artist_idx").on(t.artist),
    index("records_title_idx").on(t.title),
    index("records_created_at_idx").on(t.createdAt),
    // Idempotent imports: one row per (source, externalId).
    uniqueIndex("records_source_external_idx").on(t.source, t.externalId),
  ],
);

export const images = pgTable(
  "images",
  {
    id: serial("id").primaryKey(),
    recordId: integer("record_id")
      .notNull()
      .references(() => records.id, { onDelete: "cascade" }),
    // Object key in R2 (not a full URL — we build URLs from the public base).
    key: text("key").notNull(),
    isCover: boolean("is_cover").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("images_record_id_idx").on(t.recordId)],
);

export const genres = pgTable("genres", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
});

export const recordGenres = pgTable(
  "record_genres",
  {
    recordId: integer("record_id")
      .notNull()
      .references(() => records.id, { onDelete: "cascade" }),
    genreId: integer("genre_id")
      .notNull()
      .references(() => genres.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.recordId, t.genreId] })],
);

// Data-quality log. Marketplace data is hand-entered, so the importer/enricher
// records anything it can't confidently parse (unmapped genre, missing grade,
// unknown format, etc.) here for human review in the admin panel.
export const importIssues = pgTable(
  "import_issues",
  {
    id: serial("id").primaryKey(),
    recordId: integer("record_id").references(() => records.id, {
      onDelete: "cascade",
    }),
    source: varchar("source", { length: 32 }).notNull(),
    externalId: varchar("external_id", { length: 64 }),
    field: varchar("field", { length: 64 }).notNull(), // genre | year | format | conditionMedia | ...
    issue: varchar("issue", { length: 32 }).notNull(), // unmapped | missing | unknown | unparsed
    rawValue: text("raw_value"),
    resolved: boolean("resolved").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("import_issues_resolved_idx").on(t.resolved),
    // One open issue per (record/external, field, issue) — re-runs don't pile up.
    uniqueIndex("import_issues_dedupe_idx").on(t.externalId, t.field, t.issue),
  ],
);

// Store-wide settings as a small key-value table. One row per setting key
// (e.g. "contactEmail"). Reads fall back to env defaults in lib/settings.ts, so
// an absent row just means "use the default" — the storefront never breaks.
export const settings = pgTable("settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Single shared admin account(s). Password is a bcrypt hash.
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 256 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// --- Relations -------------------------------------------------------------

export const recordsRelations = relations(records, ({ many }) => ({
  images: many(images),
  recordGenres: many(recordGenres),
}));

export const imagesRelations = relations(images, ({ one }) => ({
  record: one(records, {
    fields: [images.recordId],
    references: [records.id],
  }),
}));

export const genresRelations = relations(genres, ({ many }) => ({
  recordGenres: many(recordGenres),
}));

export const recordGenresRelations = relations(recordGenres, ({ one }) => ({
  record: one(records, {
    fields: [recordGenres.recordId],
    references: [records.id],
  }),
  genre: one(genres, {
    fields: [recordGenres.genreId],
    references: [genres.id],
  }),
}));

export type Record = typeof records.$inferSelect;
export type NewRecord = typeof records.$inferInsert;
export type Image = typeof images.$inferSelect;
export type Genre = typeof genres.$inferSelect;
export type ImportIssue = typeof importIssues.$inferSelect;
export type Setting = typeof settings.$inferSelect;
