#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { chmod, readFile } from "node:fs/promises";

const credentialPath = process.argv[2];
const expectedProjectId = "remi-demo-bq-connect";
const expectedRedirectUri = "https://connect.vercel.com/callback";
const connectorName = "bigquery-google-passport-demo";

if (!credentialPath) {
  fail("Usage: pnpm connector:create /path/to/google-client-secret.json");
}

let parsed;
try {
  parsed = JSON.parse(await readFile(credentialPath, "utf8"));
} catch {
  fail("Could not read the Google OAuth client JSON file.");
}

const web = parsed?.web;
if (
  !web ||
  typeof web.client_id !== "string" ||
  typeof web.client_secret !== "string" ||
  web.project_id !== expectedProjectId ||
  !Array.isArray(web.redirect_uris) ||
  !web.redirect_uris.includes(expectedRedirectUri)
) {
  fail(
    `Expected a Google OAuth Web credential for ${expectedProjectId} with redirect URI ${expectedRedirectUri}.`,
  );
}

const scopes = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/bigquery.readonly",
];

const connectorData = {
  serverUrl: "https://accounts.google.com",
  clientId: web.client_id,
  clientSecret: web.client_secret,
  tokenEndpointAuthMethod: "client_secret_post",
  pkceRequired: true,
  codeChallengeMethod: "S256",
  userAuthorization: { enabled: true, scopes },
  refreshTokens: { enabled: true },
  clientCredentials: { enabled: false },
  authorizationUrlParams: {
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
  },
};

const create = run(
  "vercel",
  [
    "connect",
    "create",
    "google",
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
  GCP_PROJECT_ID: expectedProjectId,
  BIGQUERY_LOCATION: "EU",
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

run("vercel", [
  "env",
  "pull",
  ".env.local",
  "--environment=development",
  "--yes",
]);
await chmod(".env.local", 0o600);

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
