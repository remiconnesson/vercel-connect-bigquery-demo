import "server-only";

export type RuntimeConfig = {
  connectorUid: string;
  location: string;
  projectId: string;
};

export type RuntimeConfigResult =
  | { kind: "ready"; value: RuntimeConfig }
  | { kind: "missing"; keys: string[] }
  | { kind: "invalid"; problems: string[] };

const PROJECT_ID_PATTERN = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
const LOCATION_PATTERN = /^[A-Za-z0-9_-]+$/;

export function getRuntimeConfig(): RuntimeConfigResult {
  const connectorUid = process.env.VERCEL_CONNECTOR_UID?.trim();
  const projectId = process.env.GCP_PROJECT_ID?.trim();
  const location = process.env.BIGQUERY_LOCATION?.trim();

  const missing: string[] = [];
  if (!connectorUid) missing.push("VERCEL_CONNECTOR_UID");
  if (!projectId) missing.push("GCP_PROJECT_ID");
  if (!location) missing.push("BIGQUERY_LOCATION");

  if (!connectorUid || !projectId || !location) {
    return { kind: "missing", keys: missing };
  }

  const problems: string[] = [];
  if (!PROJECT_ID_PATTERN.test(projectId)) {
    problems.push("GCP_PROJECT_ID is not a valid Google Cloud project ID");
  }
  if (!LOCATION_PATTERN.test(location)) {
    problems.push("BIGQUERY_LOCATION is not a valid location");
  }

  if (problems.length > 0) {
    return { kind: "invalid", problems };
  }

  return {
    kind: "ready",
    value: { connectorUid, location, projectId },
  };
}
