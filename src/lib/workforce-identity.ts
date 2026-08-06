import "server-only";

import type { RuntimeConfig } from "@/lib/runtime-config";

const GOOGLE_STS_URL = "https://sts.googleapis.com/v1/token";
const TOKEN_EXCHANGE_GRANT =
  "urn:ietf:params:oauth:grant-type:token-exchange";
const ACCESS_TOKEN_TYPE = "urn:ietf:params:oauth:token-type:access_token";
const JWT_TOKEN_TYPE = "urn:ietf:params:oauth:token-type:jwt";
const BIGQUERY_READONLY_SCOPE =
  "https://www.googleapis.com/auth/bigquery.readonly";

export type GoogleWorkforceToken = {
  accessToken: string;
  expiresAt: string;
};

export class GoogleStsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleStsError";
  }
}

export async function exchangeOktaTokenForGoogleAccessToken(input: {
  config: RuntimeConfig;
  oktaAccessToken: string;
}): Promise<GoogleWorkforceToken> {
  const body = new URLSearchParams({
    audience: input.config.workforceProviderAudience,
    grant_type: TOKEN_EXCHANGE_GRANT,
    options: JSON.stringify({
      userProject: input.config.workforceUserProject,
    }),
    requested_token_type: ACCESS_TOKEN_TYPE,
    scope: BIGQUERY_READONLY_SCOPE,
    subject_token: input.oktaAccessToken,
    subject_token_type: JWT_TOKEN_TYPE,
  });

  const response = await fetch(GOOGLE_STS_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new GoogleStsError(
      `Google STS returned a non-JSON response with status ${response.status}`,
    );
  }

  if (!response.ok) {
    throw new GoogleStsError(
      readStsError(payload) ?? `Google STS returned ${response.status}`,
    );
  }

  if (!isRecord(payload)) {
    throw new GoogleStsError("Google STS returned an invalid token response");
  }

  const accessToken = payload.access_token;
  const expiresIn = payload.expires_in;
  if (
    typeof accessToken !== "string" ||
    typeof expiresIn !== "number" ||
    !Number.isFinite(expiresIn) ||
    expiresIn <= 0
  ) {
    throw new GoogleStsError("Google STS returned an invalid token response");
  }

  return {
    accessToken,
    expiresAt: new Date(Date.now() + expiresIn * 1_000).toISOString(),
  };
}

function readStsError(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.error_description === "string") {
    return payload.error_description;
  }
  if (typeof payload.error === "string") return payload.error;
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
