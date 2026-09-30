import type { APIRoute } from "astro";
import { getStudentId } from "../../lib/auth";
import { isTopic } from "../../lib/community";
import { joinTopic, leaveTopic } from "../../lib/db";

// Join/leave a fixed topic — no free text, so there's nothing to moderate.
// Idempotent: db.ts's joinTopic no-ops on a repeat join rather than
// duplicating a row.
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const studentId = getStudentId(cookies);
  if (!studentId) {
    return new Response("Log in first", { status: 401 });
  }

  const form = await request.formData();
  const topic = String(form.get("topic") ?? "");
  const action = String(form.get("action") ?? "join");

  if (!isTopic(topic)) {
    return new Response("Unknown topic", { status: 400 });
  }

  if (action === "leave") {
    leaveTopic(studentId, topic);
  } else {
    joinTopic(studentId, topic);
  }

  return redirect("/community/", 303);
};
