import "server-only";

import {
  getTokenResponse,
  startAuthorization,
  type ConnectTokenParams,
  type ConnectTokenResponse,
} from "@vercel/connect";

import type { RuntimeConfig } from "@/lib/runtime-config";

export const OKTA_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
] as const;

function tokenParams(subject: string): ConnectTokenParams {
  return {
    subject: { type: "user", id: subject },
    scopes: [...OKTA_SCOPES],
  };
}

export async function getOktaToken(
  config: RuntimeConfig,
  subject: string,
): Promise<ConnectTokenResponse> {
  return getTokenResponse(config.connectorUid, tokenParams(subject));
}

export async function getOktaAuthorizationUrl(input: {
  callbackUrl: string;
  config: RuntimeConfig;
  subject: string;
}): Promise<string> {
  const authorization = await startAuthorization(
    input.config.connectorUid,
    tokenParams(input.subject),
    { callbackUrl: input.callbackUrl },
  );

  return authorization.url;
}
