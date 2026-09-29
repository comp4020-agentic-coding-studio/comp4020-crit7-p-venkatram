import { sql } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

// The schema is the ground truth for the database. To change it: edit here,
// run `pnpm db:generate` to turn the diff into a migration under drizzle/,
// and commit both — the migration applies automatically when the server
// boots (see src/lib/db.ts), locally and deployed. Never edit the database
// by hand: state on the deployed volume outlives every deploy, and the
// migration trail is what keeps old state and new code compatible.
export const advisorSlots = sqliteTable("advisor_slots", {
  id: int().primaryKey({ autoIncrement: true }),
  startsAt: text("starts_at").notNull(),
  status: text().notNull().default("open"), // 'open' | 'booked'
});

export const queries = sqliteTable("queries", {
  id: int().primaryKey({ autoIncrement: true }),
  studentId: text("student_id").notNull(),
  studentName: text("student_name").notNull(),
  category: text().notNull(), // 'contract_review' | 'tax' | 'superannuation' | 'other_financial'
  details: text().notNull(),
  slotId: int("slot_id")
    .notNull()
    .references(() => advisorSlots.id),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type AdvisorSlot = typeof advisorSlots.$inferSelect;
export type Query = typeof queries.$inferSelect;
