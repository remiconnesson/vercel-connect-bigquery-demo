import { NextRequest, NextResponse } from "next/server";

import { DEMO_SUBJECT_COOKIE } from "@/lib/demo-subject";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(DEMO_SUBJECT_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });
  return response;
}
