import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { and, asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { type Category, isCategory } from "./categories";
import { type Topic, TOPICS } from "./community";
import {
  type AdvisorSlot,
  advisorSlots,
  communityInterest,
  type JobListing,
  jobListings,
  type Query,
  queries,
} from "./schema";

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

export type { AdvisorSlot, Category, JobListing, Query };

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

// A curated directory of real external job boards — see README.md for why
// this isn't scraped or invented listings. Seeded once, same as slots above.
const JOB_LISTINGS: (typeof jobListings.$inferInsert)[] = [
  {
    title: "Casual & part-time roles",
    source: "ANU CareerHub",
    url: "https://careerhub.anu.edu.au/",
    blurb: "The University's own noticeboard for casual and on-campus roles open to enrolled students.",
  },
  {
    title: "Internships & vacation programs",
    source: "Prosple",
    url: "https://au.prosple.com/",
    blurb: "Structured internships and vacation programs across Australian employers.",
  },
  {
    title: "Broader casual & part-time search",
    source: "Seek",
    url: "https://www.seek.com.au/",
    blurb: "Australia's largest general job board — useful once you're searching beyond campus.",
  },
  {
    title: "Everything in one place",
    source: "ANU Career Central",
    url: "https://careercentral.anu.edu.au/",
    blurb: "The real, official ANU platform this prototype is modelled on — appointments, events and more.",
  },
];

function seedJobListingsIfEmpty() {
  const existing = db.select({ id: jobListings.id }).from(jobListings).limit(1).all();
  if (existing.length > 0) return;
  db.insert(jobListings).values(JOB_LISTINGS).run();
}
seedJobListingsIfEmpty();

export function listJobListings(): JobListing[] {
  return db.select().from(jobListings).all();
}

export function communityCounts(): Record<Topic, number> {
  const counts = Object.fromEntries(Object.keys(TOPICS).map((topic) => [topic, 0])) as Record<
    Topic,
    number
  >;
  for (const row of db.select({ topic: communityInterest.topic }).from(communityInterest).all()) {
    const topic = row.topic as Topic;
    if (topic in counts) counts[topic] += 1;
  }
  return counts;
}

export function joinedTopicsFor(studentId: string): Set<Topic> {
  const rows = db
    .select({ topic: communityInterest.topic })
    .from(communityInterest)
    .where(eq(communityInterest.studentId, studentId))
    .all();
  return new Set(rows.map((row) => row.topic as Topic));
}

// Idempotent by design: joining twice is a no-op, not a duplicate row, so the
// count can never be inflated by an eager click.
export function joinTopic(studentId: string, topic: Topic): void {
  db.transaction((tx) => {
    const existing = tx
      .select({ id: communityInterest.id })
      .from(communityInterest)
      .where(and(eq(communityInterest.studentId, studentId), eq(communityInterest.topic, topic)))
      .get();
    if (existing) return;
    tx.insert(communityInterest).values({ studentId, topic }).run();
  });
}

export function leaveTopic(studentId: string, topic: Topic): void {
  db.delete(communityInterest)
    .where(and(eq(communityInterest.studentId, studentId), eq(communityInterest.topic, topic)))
    .run();
}

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
