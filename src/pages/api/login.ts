import type { APIRoute } from "astro";
import { isStudentId, STUDENT_ID_COOKIE } from "../../lib/auth";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const studentId = String(form.get("studentId") ?? "")
    .trim()
    .toLowerCase();
  const next = String(form.get("next") ?? "/");

  if (!isStudentId(studentId)) {
    return new Response("Enter a student ID like u1234567", { status: 400 });
  }

  cookies.set(STUDENT_ID_COOKIE, studentId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
  });

  return redirect(next.startsWith("/") ? next : "/", 303);
};
