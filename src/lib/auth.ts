import type { AstroCookies } from "astro";

// A prototype-grade session: the cookie holds whatever student ID was typed
// on /login, with no password and no check against a real ANU directory —
// see README.md for why that's a deliberate, disclosed limit of this slice.
export const STUDENT_ID_COOKIE = "student_id";

// ANU's own login/email convention (uXXXXXXX@anu.edu.au) is the realistic
// shape to ask for, so the form rejects obvious junk without pretending to
// verify identity.
const STUDENT_ID_PATTERN = /^u\d{7}$/i;

export function isStudentId(value: string): boolean {
  return STUDENT_ID_PATTERN.test(value.trim());
}

export function getStudentId(cookies: AstroCookies): string | undefined {
  const value = cookies.get(STUDENT_ID_COOKIE)?.value;
  return value && isStudentId(value) ? value.toLowerCase() : undefined;
}
