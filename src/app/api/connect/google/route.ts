import { NextRequest, NextResponse } from "next/server";

import {
  createDemoSubjectId,
  DEMO_SUBJECT_COOKIE,
  parseDemoSubjectId,
} from "@/lib/demo-subject";
import { getGoogleAuthorizationUrl } from "@/lib/google-connection";
import { getRuntimeConfig } from "@/lib/runtime-config";

export async function GET(request: NextRequest) {
  const config = getRuntimeConfig();
  if (config.kind !== "ready") {
    return NextResponse.redirect(
      new URL("/?connect_error=config", request.url),
    );
  }

  const existingSubject = parseDemoSubjectId(
    request.cookies.get(DEMO_SUBJECT_COOKIE)?.value,
  );
  const subject = existingSubject ?? createDemoSubjectId();
  const callbackUrl = new URL("/", request.url);
  callbackUrl.searchParams.set("authorization", "complete");

  try {
    const authorizationUrl = await getGoogleAuthorizationUrl({
      callbackUrl: callbackUrl.toString(),
      config: config.value,
      subject,
    });
    const response = NextResponse.redirect(authorizationUrl);

    if (existingSubject === null) {
      response.cookies.set(DEMO_SUBJECT_COOKIE, subject, {
        httpOnly: true,
        maxAge: 60 * 60 * 24,
        path: "/",
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
      });
    }

    return response;
  } catch {
    return NextResponse.redirect(
      new URL("/?connect_error=authorization", request.url),
    );
  }
}
