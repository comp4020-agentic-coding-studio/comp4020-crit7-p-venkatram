# Career Central — ANU

ANU's real Career Central lets students book appointments, but general-purpose
booking doesn't fit the specific dread of "I have a job offer and I don't
understand the contract, or what to do about tax and super."

This prototype answers that by putting four things a student actually needs
behind one login, and wiring the core one — coaching — fully end to end
rather than just mocking it up: a landing page (`/`) framing **1:1 coaching**
(`/coaching`), **free resources** (`/guides/`), a **job listings** directory
(`/jobs/`), and a lightweight **community** feature (`/community/`) — plus
**My bookings** to find a past session again.

The coaching flow is the one wired fully end to end: log in with your student
ID, pick a category (contract review, tax, superannuation, or another
financial matter), describe your situation, pick an open advisor slot, and get
a confirmation page. Slots come from a fixed schedule (no advisor-facing app
in this slice); the query and the slot booking are recorded together in
SQLite, so a double-booked slot can't happen even if two people submit at
once. Five guide pages under `/guides/` cover the background questions that
come up before a first job or volunteering role — getting an ABN/TFN/WWVP,
ANU+ and volunteering, kinds of work in Australia, reviewing a contract, and
money basics.

## What good looks like here

**The category is a closed list, not free text.** Real Career Central queries
get triaged by a person before anyone reads the details; a fixed set of four
categories is what makes that possible without reading every query first.
`spec/queries.test.ts` enforces this server-side — posting a category outside
the list is rejected with a 400, not just hidden from the `<select>`.

**Login is honest about what it is.** `/login` asks for a student ID and sets
a cookie — there's no password, and nothing checks the ID against a real ANU
directory, because this slice has no access to ANU's actual SSO. It's enough
to scope **My bookings** to "whoever typed this ID," which is the realistic
amount of identity a one-week prototype can build, not a claim that it's
secure. `src/lib/auth.ts` and the note on `/login` itself say so directly
rather than letting the cookie-shaped UI imply more than it delivers.

**A confirmation page and a scoped list, not a shared board.** The most
obvious demo-friendly shape — list every submitted query on the homepage, the
way the starter's guestbook listed every message — doesn't fit here: these are
people's tax and contract questions. Each booking gets its own `/queries/{id}`
page, and `/my-bookings` lists only the queries tied to the logged-in ID.
`spec/queries.test.ts` checks both: the confirmation page survives a reload,
and a booking shows up under the session that made it.

**Slot booking is a transaction.** `bookQuery` in `src/lib/db.ts` checks the
slot is still open and marks it booked in the same database transaction as
inserting the query, so two students racing for the same time can't both get
it — enforced by the schema and the code, not just assumed.

**Job listings are a curated directory, not invented postings.** A fake
"Software Engineer at $RealCompany" ad would mislead in exactly the way a
fake review does. `/jobs/` is a small DB-backed table (`job_listings` in
`src/lib/db.ts`) of four real, verified external boards — ANU CareerHub,
Prosple, Seek, and the real ANU Career Central — each with an honest blurb
about what's actually there, not a scraped or fabricated listing.

**Community is a show of hands, not an open board.** `/community/` has no
free-text field: a student joins one of four fixed topics
(`src/lib/community.ts`), and the count is just `COUNT(*)` grouped by topic.
There's nothing to moderate because there's nothing anyone can post. Real
peer spaces (ANUSA clubs, ANU CareerHub events) are linked directly rather
than imitated.

**The success story on `/` is explicitly illustrative.** It's labeled
"Illustrative example, not a real named individual" and uses an initials
avatar, not a photo — no real student's name, likeness, or specific account
is attached to it.

What's a judgement call, not a test: whether the booking flow reads as
trustworthy for something this personal — tone, how much is asked for
up-front, whether the confirmation page feels like a real appointment rather
than a form receipt. Same for the guide pages: the facts in them (ANU+
mechanics, the super rate, the WWVP process) were checked against ANU and
government sources while writing them, but keeping them accurate over time is
a judgement call for the crit, not something `pnpm check` verifies.

Images go in `public/` and are linked relatively — `![alt](public/before.png)`
— which renders on GitHub and at `/readme/` alike.
