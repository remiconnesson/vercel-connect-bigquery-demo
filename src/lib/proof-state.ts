import "server-only";

import {
  ConnectError,
  ConnectorInstallationRequiredError,
  NoValidTokenError,
  UserAuthorizationRequiredError,
} from "@vercel/connect";

import {
  BigQueryProofError,
  runCorporateCatalogProof,
  type CorporateCatalogProof,
} from "@/lib/bigquery";
import type { DemoSubjectId } from "@/lib/demo-subject";
import { getGoogleToken } from "@/lib/google-connection";
import { getRuntimeConfig } from "@/lib/runtime-config";

export type ProofState =
  | { kind: "configuration-missing"; details: string[] }
  | { kind: "configuration-invalid"; details: string[] }
  | { kind: "ready-to-authorize" }
  | { kind: "authorization-required" }
  | {
      kind: "connected";
      connectorUid: string;
      expiresAt: string;
      externalSubject?: string;
      proof: CorporateCatalogProof;
    }
  | {
      kind: "failed";
      stage: "connect" | "bigquery";
      message: string;
    };

export async function loadProofState(
  subject: DemoSubjectId | null,
): Promise<ProofState> {
  const config = getRuntimeConfig();
  if (config.kind === "missing") {
    return { kind: "configuration-missing", details: config.keys };
  }
  if (config.kind === "invalid") {
    return { kind: "configuration-invalid", details: config.problems };
  }
  if (subject === null) {
    return { kind: "ready-to-authorize" };
  }

  let tokenResponse;
  try {
    tokenResponse = await getGoogleToken(config.value, subject);
  } catch (error) {
    if (
      error instanceof UserAuthorizationRequiredError ||
      error instanceof NoValidTokenError
    ) {
      return { kind: "authorization-required" };
    }
    if (error instanceof ConnectorInstallationRequiredError) {
      return {
        kind: "failed",
        stage: "connect",
        message: "The connector is not attached to this Vercel environment.",
      };
    }
    if (error instanceof ConnectError) {
      return {
        kind: "failed",
        stage: "connect",
        message: error.code
          ? `Vercel Connect returned ${error.code}.`
          : "Vercel Connect could not issue a Google token.",
      };
    }
    return {
      kind: "failed",
      stage: "connect",
      message: "Vercel Connect could not issue a Google token.",
    };
  }

  try {
    const proof = await runCorporateCatalogProof({
      accessToken: tokenResponse.token,
      config: config.value,
    });

    return {
      kind: "connected",
      connectorUid: tokenResponse.connector.uid,
      expiresAt: new Date(tokenResponse.expiresAt).toISOString(),
      externalSubject: tokenResponse.externalSubject,
      proof,
    };
  } catch (error) {
    return {
      kind: "failed",
      stage: "bigquery",
      message:
        error instanceof BigQueryProofError
          ? error.message
          : "BigQuery rejected the delegated token.",
    };
  }
}
