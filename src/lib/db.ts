import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { type Category, isCategory } from "./categories";
import { type AdvisorSlot, advisorSlots, type Query, queries } from "./schema";

// One SQLite file is the app's whole persistent state. In production
// fly.toml points DATABASE_PATH at the machine's volume (/data), which is
// how state survives a reload and a redeploy; locally it defaults to an
// untracked file in .data/.
const path = process.env.DATABASE_PATH ?? "./.data/app.db";
mkdirSync(dirname(path), { recursive: true });

const client = new Database(path);
client.pragma("journal_mode = WAL");

export const db = drizzle(client);

// Migrations run at boot, on whatever machine holds the volume — the
// recommended shape for SQLite on Fly, where there's no separate machine to
// run them from. The flow: edit src/lib/schema.ts, `pnpm db:generate`,
// commit the migration it writes to drizzle/.
migrate(db, { migrationsFolder: "./drizzle" });

export type { AdvisorSlot, Category, Query };

const SLOT_TIMES = ["10:00", "14:00"];
const SLOT_DAYS_AHEAD = 10; // weekdays

// The real system has advisors publishing their own availability; this slice
// has no advisor-side view, so availability is a fixed, deterministic
// schedule generated once. Runs at boot, after migrate(), only when the table
// is empty — safe to call on every deploy without duplicating rows.
function seedSlotsIfEmpty() {
  const existing = db.select({ id: advisorSlots.id }).from(advisorSlots).limit(1).all();
  if (existing.length > 0) return;

  const slots: (typeof advisorSlots.$inferInsert)[] = [];
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  while (slots.length < SLOT_DAYS_AHEAD * SLOT_TIMES.length) {
    day.setDate(day.getDate() + 1);
    const isWeekday = day.getDay() >= 1 && day.getDay() <= 5;
    if (!isWeekday) continue;
    for (const time of SLOT_TIMES) {
      const [hours, minutes] = time.split(":").map(Number);
      const startsAt = new Date(day);
      startsAt.setHours(hours, minutes, 0, 0);
      slots.push({ startsAt: startsAt.toISOString(), status: "open" });
    }
  }
  db.insert(advisorSlots).values(slots).run();
}
seedSlotsIfEmpty();

export function listOpenSlots(): AdvisorSlot[] {
  return db
    .select()
    .from(advisorSlots)
    .where(eq(advisorSlots.status, "open"))
    .orderBy(asc(advisorSlots.startsAt))
    .all();
}

export function getQuery(id: number): (Query & { slot: AdvisorSlot }) | undefined {
  const row = db
    .select({ query: queries, slot: advisorSlots })
    .from(queries)
    .innerJoin(advisorSlots, eq(queries.slotId, advisorSlots.id))
    .where(eq(queries.id, id))
    .get();
  return row && { ...row.query, slot: row.slot };
}

export class BookingError extends Error {}

// A transaction: booking a slot and recording the query happen together, so
// two students racing for the same slot can't both succeed — the second to
// reach here sees status !== 'open' and is turned away with a clear error
// rather than silently double-booking an advisor.
export function bookQuery(input: {
  studentId: string;
  studentName: string;
  category: Category;
  details: string;
  slotId: number;
}): Query {
  if (!isCategory(input.category)) {
    throw new BookingError(`unknown category: ${input.category}`);
  }
  return db.transaction((tx) => {
    const slot = tx.select().from(advisorSlots).where(eq(advisorSlots.id, input.slotId)).get();
    if (!slot || slot.status !== "open") {
      throw new BookingError("that slot is no longer available");
    }
    tx.update(advisorSlots).set({ status: "booked" }).where(eq(advisorSlots.id, slot.id)).run();
    return tx
      .insert(queries)
      .values({
        studentId: input.studentId,
        studentName: input.studentName,
        category: input.category,
        details: input.details,
        slotId: slot.id,
      })
      .returning()
      .get();
  });
}

export function listQueriesForStudent(studentId: string): (Query & { slot: AdvisorSlot })[] {
  return db
    .select({ query: queries, slot: advisorSlots })
    .from(queries)
    .innerJoin(advisorSlots, eq(queries.slotId, advisorSlots.id))
    .where(eq(queries.studentId, studentId))
    .orderBy(asc(advisorSlots.startsAt))
    .all()
    .map((row) => ({ ...row.query, slot: row.slot }));
}
