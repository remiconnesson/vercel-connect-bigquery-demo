#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const credentialPath = process.argv[2];
const expectedIssuer =
  "https://integrator-1495739.okta.com/oauth2/default";
const connectorName = "delivery-hero-bigquery-okta";

if (!credentialPath) {
  fail("Usage: pnpm connector:create /path/to/okta-oauth-client.json");
}

let credentials;
try {
  credentials = JSON.parse(await readFile(credentialPath, "utf8"));
} catch {
  fail("Could not read the Okta OAuth client JSON file.");
}

if (
  credentials?.issuer !== expectedIssuer ||
  typeof credentials?.client_id !== "string" ||
  typeof credentials?.client_secret !== "string"
) {
  fail(
    `Expected issuer ${expectedIssuer} plus client_id and client_secret.`,
  );
}

const connectorData = {
  serverUrl: credentials.issuer,
  clientId: credentials.client_id,
  clientSecret: credentials.client_secret,
  tokenEndpointAuthMethod: "client_secret_basic",
  pkceRequired: true,
  codeChallengeMethod: "S256",
  userAuthorization: {
    enabled: true,
    scopes: ["openid", "profile", "email", "offline_access"],
  },
  refreshTokens: { enabled: true },
  clientCredentials: { enabled: false },
};

const create = run(
  "vercel",
  [
    "connect",
    "create",
    "okta.com",
    "--name",
    connectorName,
    "--connector-type",
    "oauth",
    "--data",
    "@-",
    "--format=json",
  ],
  JSON.stringify(connectorData),
);

let connector;
try {
  connector = JSON.parse(create.stdout);
} catch {
  fail("Vercel created an unexpected response. Check the CLI output above.");
}

if (typeof connector.uid !== "string") {
  fail("Vercel did not return a connector UID.");
}

run("vercel", [
  "connect",
  "attach",
  connector.uid,
  "--environment",
  "production,preview,development",
  "--yes",
  "--format=json",
]);

const environmentValues = {
  VERCEL_CONNECTOR_UID: connector.uid,
  GCP_PROJECT_ID: "delivery-hero-eaa-poc-vtest314",
  BIGQUERY_LOCATION: "EU",
  GOOGLE_WORKFORCE_PROVIDER_AUDIENCE:
    "//iam.googleapis.com/locations/global/workforcePools/delivery-hero-poc-vtest314/providers/okta-connect-dh",
  GOOGLE_WORKFORCE_USER_PROJECT: "210396445251",
};

for (const [name, value] of Object.entries(environmentValues)) {
  for (const environment of ["development", "preview", "production"]) {
    run("vercel", [
      "env",
      "add",
      name,
      environment,
      "--value",
      value,
      "--force",
      "--no-sensitive",
      "--yes",
    ]);
  }
}

console.log(
  `Connector ${connector.uid} is attached and available in every environment.`,
);

function run(command, args, stdin) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    input: stdin,
    stdio: [stdin === undefined ? "inherit" : "pipe", "pipe", "inherit"],
  });

  if (result.status !== 0) {
    fail(`${command} ${args.slice(0, 3).join(" ")} failed.`);
  }

  return result;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
