import { beforeAll, describe, expect, inject, it } from "vitest";

// Drives the running app to prove community interest is a show-of-hands,
// not a public board: joining is idempotent (no double-counting), leaving
// decrements, and it requires a session.
const baseUrl = inject("baseUrl");
const TOPIC = "interview_practice";

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

async function countFor(topicLabel: string, cookie?: string): Promise<number> {
  const res = await fetch(new URL("/community/", baseUrl), {
    headers: cookie ? { cookie } : {},
  });
  const html = await res.text();
  const row = html.split(topicLabel)[1] ?? "";
  const match = row.match(/(\d+) (?:student|students) interested/);
  if (!match) throw new Error(`could not find a count near "${topicLabel}"`);
  return Number(match[1]);
}

describe("community interest", () => {
  let cookie: string;
  let before: number;

  beforeAll(async () => {
    cookie = await logIn();
    before = await countFor("Interview practice partners", cookie);
  });

  it("joining increments the count", async () => {
    const res = await post("/api/community", new URLSearchParams({ topic: TOPIC, action: "join" }), cookie);
    expect(res.status).toBe(303);
    const after = await countFor("Interview practice partners", cookie);
    expect(after).toBe(before + 1);
  });

  it("joining again does not double-count", async () => {
    await post("/api/community", new URLSearchParams({ topic: TOPIC, action: "join" }), cookie);
    const after = await countFor("Interview practice partners", cookie);
    expect(after).toBe(before + 1);
  });

  it("persists across a reload", async () => {
    const after = await countFor("Interview practice partners", cookie);
    expect(after).toBe(before + 1);
  });

  it("leaving decrements the count", async () => {
    await post("/api/community", new URLSearchParams({ topic: TOPIC, action: "leave" }), cookie);
    const after = await countFor("Interview practice partners", cookie);
    expect(after).toBe(before);
  });

  it("rejects joining with no session", async () => {
    const res = await post("/api/community", new URLSearchParams({ topic: TOPIC, action: "join" }));
    expect(res.status).toBe(401);
  });

  it("rejects a topic outside the fixed set", async () => {
    const res = await post(
      "/api/community",
      new URLSearchParams({ topic: "not-a-real-topic", action: "join" }),
      cookie,
    );
    expect(res.status).toBe(400);
  });
});
