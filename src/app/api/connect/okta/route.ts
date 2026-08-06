import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/auth";
import { getOktaAuthorizationUrl } from "@/lib/okta-connection";
import { getRuntimeConfig } from "@/lib/runtime-config";

export async function GET(request: NextRequest) {
  const config = getRuntimeConfig();
  if (config.kind !== "ready") {
    return NextResponse.redirect(
      new URL("/?connect_error=config", request.url),
    );
  }

  const passportUser = getUserFromRequest(request);
  if (passportUser === null) {
    return NextResponse.redirect(
      new URL("/?connect_error=passport", request.url),
    );
  }

  const callbackUrl = new URL("/", request.url);
  callbackUrl.searchParams.set("authorization", "complete");

  try {
    const authorizationUrl = await getOktaAuthorizationUrl({
      callbackUrl: callbackUrl.toString(),
      config: config.value,
      subject: passportUser.id,
    });

    return NextResponse.redirect(authorizationUrl);
  } catch {
    return NextResponse.redirect(
      new URL("/?connect_error=authorization", request.url),
    );
  }
}
