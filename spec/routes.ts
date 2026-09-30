// The routes the invariants run against. When you add a page, add its route
// here, or the invariants stop covering it.
//
// /my-bookings and /queries/{id} aren't listed: the first redirects an
// anonymous visitor to /login (never a 200), and the second is per-booking,
// not a fixed page — neither fits the "walk every route" invariants sweep.
export const ROUTES = [
  "/",
  "/readme/",
  "/login",
  "/coaching",
  "/jobs/",
  "/community/",
  "/guides/",
  "/guides/getting-set-up/",
  "/guides/volunteering/",
  "/guides/job-types/",
  "/guides/contracts/",
  "/guides/money/",
];
