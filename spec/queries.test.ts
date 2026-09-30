import { beforeAll, describe, expect, inject, it } from "vitest";

// Drives the running app over HTTP to prove this prototype's own core
// promises: booking requires being logged in, a query survives a reload, and
// only the fixed categories are accepted.
const baseUrl = inject("baseUrl");

// Astro checks form POSTs carry a same-origin Origin header (CSRF
// protection); browsers send it automatically, a bare fetch doesn't.
function post(path: string, body: URLSearchParams, cookie?: string) {
  const headers: Record<string, string> = { origin: baseUrl };
  if (cookie) headers.cookie = cookie;
  return fetch(new URL(path, baseUrl), { method: "POST", headers, body, redirect: "manual" });
}

async function logIn(): Promise<string> {
  const res = await post(
    "/api/login",
    new URLSearchParams({ studentId: `u${String(process.hrtime.bigint()).slice(-7)}` }),
  );
  expect(res.status).toBe(303);
  const cookie = res.headers.get("set-cookie");
  if (!cookie) throw new Error("login did not set a cookie");
  return cookie.split(";")[0];
}

async function firstOpenSlotId(cookie: string): Promise<string> {
  const res = await fetch(new URL("/coaching", baseUrl), { headers: { cookie } });
  const html = await res.text();
  const match = html.match(/<select id="slotId"[^>]*>\s*<option value="(\d+)"/);
  if (!match) throw new Error("no open slot found on the coaching page");
  return match[1];
}

describe("query booking", () => {
  let cookie: string;
  let details: string;
  let confirmationUrl: string;

  beforeAll(async () => {
    cookie = await logIn();
    details = `spec probe ${process.hrtime.bigint()}`;
    const slotId = await firstOpenSlotId(cookie);
    const res = await post(
      "/api/queries",
      new URLSearchParams({ studentName: "Spec Student", category: "tax", details, slotId }),
      cookie,
    );
    expect(res.status).toBe(303);
    const location = res.headers.get("location");
    if (!location) throw new Error("no redirect location");
    confirmationUrl = location;
  });

  it("redirects to a confirmation page", () => {
    expect(confirmationUrl).toMatch(/^\/queries\/\d+$/);
  });

  it("persists the query: the confirmation page carries the submitted details", async () => {
    const res = await fetch(new URL(confirmationUrl, baseUrl));
    const html = await res.text();
    expect(html).toContain(details);
    expect(html).toContain("Tax");
  });

  it("still shows the same details on a second load (reload survives)", async () => {
    const res = await fetch(new URL(confirmationUrl, baseUrl));
    expect(await res.text()).toContain(details);
  });

  it("lists the booking under My bookings for the same session", async () => {
    const res = await fetch(new URL("/my-bookings", baseUrl), { headers: { cookie } });
    expect(await res.text()).toContain(confirmationUrl);
  });

  it("rejects a category outside the fixed set", async () => {
    const slotId = await firstOpenSlotId(cookie);
    const res = await post(
      "/api/queries",
      new URLSearchParams({
        studentName: "Spec Student",
        category: "not-a-real-category",
        details: "should be rejected",
        slotId,
      }),
      cookie,
    );
    expect(res.status).toBe(400);
  });

  it("rejects a booking attempt with no session", async () => {
    const res = await post(
      "/api/queries",
      new URLSearchParams({
        studentName: "No Session",
        category: "tax",
        details: "should be rejected",
        slotId: "1",
      }),
    );
    expect(res.status).toBe(401);
  });
});

describe("login gate", () => {
  it("sends an anonymous visitor to /my-bookings to /login", async () => {
    const res = await fetch(new URL("/my-bookings", baseUrl), { redirect: "manual" });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toMatch(/^\/login/);
  });

  it("rejects a student ID that doesn't look like one", async () => {
    const res = await post("/api/login", new URLSearchParams({ studentId: "not-an-id" }));
    expect(res.status).toBe(400);
  });
});
