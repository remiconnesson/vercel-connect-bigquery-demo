import "server-only";

import {
  getTokenResponse,
  startAuthorization,
  type ConnectTokenParams,
  type ConnectTokenResponse,
} from "@vercel/connect";

import type { DemoSubjectId } from "@/lib/demo-subject";
import type { RuntimeConfig } from "@/lib/runtime-config";

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/bigquery.readonly",
] as const;

function tokenParams(subject: DemoSubjectId): ConnectTokenParams {
  return {
    subject: { type: "user", id: subject },
    scopes: [...GOOGLE_SCOPES],
  };
}

export async function getGoogleToken(
  config: RuntimeConfig,
  subject: DemoSubjectId,
): Promise<ConnectTokenResponse> {
  return getTokenResponse(config.connectorUid, tokenParams(subject));
}

export async function getGoogleAuthorizationUrl(input: {
  callbackUrl: string;
  config: RuntimeConfig;
  subject: DemoSubjectId;
}): Promise<string> {
  const authorization = await startAuthorization(
    input.config.connectorUid,
    tokenParams(input.subject),
    { callbackUrl: input.callbackUrl },
  );

  return authorization.url;
}
