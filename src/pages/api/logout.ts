import type { APIRoute } from "astro";
import { STUDENT_ID_COOKIE } from "../../lib/auth";

export const POST: APIRoute = ({ cookies, redirect }) => {
  cookies.delete(STUDENT_ID_COOKIE, { path: "/" });
  return redirect("/login", 303);
};
