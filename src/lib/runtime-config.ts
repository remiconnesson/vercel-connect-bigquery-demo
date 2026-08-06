import "server-only";

export type RuntimeConfig = {
  connectorUid: string;
  location: string;
  projectId: string;
  workforceProviderAudience: string;
  workforceUserProject: string;
};

export type RuntimeConfigResult =
  | { kind: "ready"; value: RuntimeConfig }
  | { kind: "missing"; keys: string[] }
  | { kind: "invalid"; problems: string[] };

const PROJECT_ID_PATTERN = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
const LOCATION_PATTERN = /^[A-Za-z0-9_-]+$/;
const WORKFORCE_PROVIDER_PATTERN =
  /^\/\/iam\.googleapis\.com\/locations\/global\/workforcePools\/[a-z0-9-]+\/providers\/[a-z0-9-]+$/;
const WORKFORCE_USER_PROJECT_PATTERN =
  /^(?:\d+|[a-z][a-z0-9-]{4,28}[a-z0-9])$/;

export function getRuntimeConfig(): RuntimeConfigResult {
  const connectorUid = process.env.VERCEL_CONNECTOR_UID?.trim();
  const projectId = process.env.GCP_PROJECT_ID?.trim();
  const location = process.env.BIGQUERY_LOCATION?.trim();
  const workforceProviderAudience =
    process.env.GOOGLE_WORKFORCE_PROVIDER_AUDIENCE?.trim();
  const workforceUserProject =
    process.env.GOOGLE_WORKFORCE_USER_PROJECT?.trim();

  const missing: string[] = [];
  if (!connectorUid) missing.push("VERCEL_CONNECTOR_UID");
  if (!projectId) missing.push("GCP_PROJECT_ID");
  if (!location) missing.push("BIGQUERY_LOCATION");
  if (!workforceProviderAudience) {
    missing.push("GOOGLE_WORKFORCE_PROVIDER_AUDIENCE");
  }
  if (!workforceUserProject) missing.push("GOOGLE_WORKFORCE_USER_PROJECT");

  if (
    !connectorUid ||
    !projectId ||
    !location ||
    !workforceProviderAudience ||
    !workforceUserProject
  ) {
    return { kind: "missing", keys: missing };
  }

  const problems: string[] = [];
  if (!PROJECT_ID_PATTERN.test(projectId)) {
    problems.push("GCP_PROJECT_ID is not a valid Google Cloud project ID");
  }
  if (!LOCATION_PATTERN.test(location)) {
    problems.push("BIGQUERY_LOCATION is not a valid location");
  }
  if (!WORKFORCE_PROVIDER_PATTERN.test(workforceProviderAudience)) {
    problems.push(
      "GOOGLE_WORKFORCE_PROVIDER_AUDIENCE is not a workforce provider resource",
    );
  }
  if (!WORKFORCE_USER_PROJECT_PATTERN.test(workforceUserProject)) {
    problems.push("GOOGLE_WORKFORCE_USER_PROJECT is not a valid project");
  }

  if (problems.length > 0) {
    return { kind: "invalid", problems };
  }

  return {
    kind: "ready",
    value: {
      connectorUid,
      location,
      projectId,
      workforceProviderAudience,
      workforceUserProject,
    },
  };
}
