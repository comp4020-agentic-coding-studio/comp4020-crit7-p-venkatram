import type { APIRoute } from "astro";
import { getStudentId } from "../../lib/auth";
import { isCategory } from "../../lib/categories";
import { BookingError, bookQuery } from "../../lib/db";

// A plain HTML form POSTs here; on success the student is redirected to their
// own confirmation page (no client-side JavaScript required either way).
// Booking is gated on login (see src/lib/auth.ts) — normal navigation never
// reaches this route without a session, since / only renders the form to a
// logged-in visitor; this check is the backstop against a direct POST.
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const studentId = getStudentId(cookies);
  if (!studentId) {
    return new Response("Log in first", { status: 401 });
  }

  const form = await request.formData();
  const studentName = String(form.get("studentName") ?? "").trim();
  const category = String(form.get("category") ?? "");
  const details = String(form.get("details") ?? "").trim();
  const slotId = Number(form.get("slotId"));

  if (!studentName || !details || !isCategory(category) || !Number.isInteger(slotId)) {
    return new Response("Missing or invalid field", { status: 400 });
  }

  try {
    const query = bookQuery({
      studentId,
      studentName: studentName.slice(0, 200),
      category,
      details: details.slice(0, 2000),
      slotId,
    });
    return redirect(`/queries/${query.id}`, 303);
  } catch (error) {
    if (error instanceof BookingError) {
      return new Response(error.message, { status: 400 });
    }
    throw error;
  }
};
