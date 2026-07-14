import "server-only";

import {
  CORPORATE_DATASETS,
  findCorporateDataset,
  type CorporateDatasetDefinition,
  type CorporateDatasetId,
  type CorporateTable,
} from "@/lib/corporate-catalog";
import type { RuntimeConfig } from "@/lib/runtime-config";

export type CorporateCatalogProof = {
  bytesProcessed: string;
  cacheHit: boolean;
  datasets: readonly CorporateDatasetId[];
  principal: string;
  tables: readonly CorporateTable[];
};

type PrincipalProof = Pick<
  CorporateCatalogProof,
  "bytesProcessed" | "cacheHit" | "principal"
>;

export class BigQueryProofError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BigQueryProofError";
  }
}

export async function runCorporateCatalogProof(input: {
  accessToken: string;
  config: RuntimeConfig;
}): Promise<CorporateCatalogProof> {
  const [principalProof, visibleDatasetIds] = await Promise.all([
    queryPrincipal(input),
    listVisibleDatasetIds(input),
  ]);

  const visibleDatasets = CORPORATE_DATASETS.filter((dataset) =>
    visibleDatasetIds.has(dataset.id),
  );

  const tableGroups = await Promise.all(
    visibleDatasets.map((dataset) => listVisibleTables(input, dataset)),
  );
  const tables = tableGroups.flat();

  if (tables.length === 0) {
    throw new BigQueryProofError(
      "BigQuery returned no corporate tables for this Google principal",
    );
  }

  return {
    ...principalProof,
    datasets: visibleDatasets.map((dataset) => dataset.id),
    tables,
  };
}

async function queryPrincipal(input: {
  accessToken: string;
  config: RuntimeConfig;
}): Promise<PrincipalProof> {
  const endpoint = new URL(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(input.config.projectId)}/queries`,
  );
  const payload = await requestBigQueryJson({
    accessToken: input.accessToken,
    endpoint,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: input.config.location,
        maximumBytesBilled: "10000000",
        query: "SELECT SESSION_USER() AS principal",
        timeoutMs: 10_000,
        useLegacySql: false,
      }),
    },
  });

  return parsePrincipalProof(payload);
}

async function listVisibleDatasetIds(input: {
  accessToken: string;
  config: RuntimeConfig;
}): Promise<ReadonlySet<CorporateDatasetId>> {
  const endpoint = new URL(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(input.config.projectId)}/datasets`,
  );
  endpoint.searchParams.set("maxResults", "1000");

  const payload = await requestBigQueryJson({
    accessToken: input.accessToken,
    endpoint,
  });
  const datasetIds = parseDatasetIds(payload);
  const visible = new Set<CorporateDatasetId>();

  for (const datasetId of datasetIds) {
    const dataset = findCorporateDataset(datasetId);
    if (dataset !== null) visible.add(dataset.id);
  }

  return visible;
}

async function listVisibleTables(
  input: { accessToken: string; config: RuntimeConfig },
  dataset: CorporateDatasetDefinition,
): Promise<CorporateTable[]> {
  const endpoint = new URL(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(input.config.projectId)}/datasets/${encodeURIComponent(dataset.id)}/tables`,
  );
  endpoint.searchParams.set("maxResults", "1000");

  const payload = await requestBigQueryJson({
    accessToken: input.accessToken,
    endpoint,
  });

  return parseTables(payload, dataset).sort((left, right) =>
    left.friendlyName.localeCompare(right.friendlyName),
  );
}

async function requestBigQueryJson(input: {
  accessToken: string;
  endpoint: URL;
  init?: RequestInit;
}): Promise<unknown> {
  const headers = new Headers(input.init?.headers);
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${input.accessToken}`);

  const response = await fetch(input.endpoint, {
    ...input.init,
    headers,
    cache: "no-store",
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new BigQueryProofError(
      `BigQuery returned a non-JSON response with status ${response.status}`,
    );
  }

  if (!response.ok) {
    throw new BigQueryProofError(
      readApiError(payload) ?? `BigQuery returned ${response.status}`,
    );
  }

  return payload;
}

function parsePrincipalProof(payload: unknown): PrincipalProof {
  if (!isRecord(payload)) {
    throw new BigQueryProofError("BigQuery returned an invalid query response");
  }
  if (payload.jobComplete !== true) {
    throw new BigQueryProofError(
      "The principal query did not finish before the timeout",
    );
  }

  const errors = payload.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    throw new BigQueryProofError(
      readApiError(payload) ?? "The principal query failed",
    );
  }

  if (!Array.isArray(payload.rows) || payload.rows.length !== 1) {
    throw new BigQueryProofError(
      "BigQuery returned an invalid session principal",
    );
  }

  const cells = readCells(payload.rows[0]);

  return {
    bytesProcessed:
      typeof payload.totalBytesProcessed === "string"
        ? payload.totalBytesProcessed
        : "unknown",
    cacheHit: payload.cacheHit === true,
    principal: readCellString(cells, 0, "principal"),
  };
}

function parseDatasetIds(payload: unknown): string[] {
  if (!isRecord(payload)) {
    throw new BigQueryProofError("BigQuery returned an invalid dataset list");
  }
  if (payload.datasets === undefined) return [];
  if (!Array.isArray(payload.datasets)) {
    throw new BigQueryProofError("BigQuery returned an invalid dataset list");
  }

  const datasetIds: string[] = [];
  for (const entry of payload.datasets) {
    if (!isRecord(entry) || !isRecord(entry.datasetReference)) {
      throw new BigQueryProofError("BigQuery returned an invalid dataset");
    }
    const datasetId = entry.datasetReference.datasetId;
    if (typeof datasetId !== "string") {
      throw new BigQueryProofError("BigQuery returned an invalid dataset ID");
    }
    datasetIds.push(datasetId);
  }

  return datasetIds;
}

function parseTables(
  payload: unknown,
  dataset: CorporateDatasetDefinition,
): CorporateTable[] {
  if (!isRecord(payload)) {
    throw new BigQueryProofError("BigQuery returned an invalid table list");
  }
  if (payload.tables === undefined) return [];
  if (!Array.isArray(payload.tables)) {
    throw new BigQueryProofError("BigQuery returned an invalid table list");
  }

  const tables: CorporateTable[] = [];
  for (const entry of payload.tables) {
    if (!isRecord(entry) || !isRecord(entry.tableReference)) {
      throw new BigQueryProofError("BigQuery returned an invalid table");
    }

    const tableId = entry.tableReference.tableId;
    const tableType = entry.type;
    if (typeof tableId !== "string" || typeof tableType !== "string") {
      throw new BigQueryProofError("BigQuery returned invalid table metadata");
    }

    tables.push({
      access: dataset.access,
      datasetId: dataset.id,
      domain: dataset.domain,
      friendlyName:
        typeof entry.friendlyName === "string"
          ? entry.friendlyName
          : humanizeIdentifier(tableId),
      tableId,
      type: tableType,
    });
  }

  return tables;
}

function humanizeIdentifier(value: string): string {
  return value
    .split("_")
    .filter((part) => part.length > 0)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function readCells(row: unknown): unknown[] {
  if (!isRecord(row) || !Array.isArray(row.f)) {
    throw new BigQueryProofError("BigQuery returned an invalid query row");
  }
  return row.f;
}

function readCellString(
  cells: unknown[],
  index: number,
  field: string,
): string {
  const cell = cells[index];
  if (!isRecord(cell) || typeof cell.v !== "string") {
    throw new BigQueryProofError(
      `BigQuery returned an invalid ${field} value`,
    );
  }
  return cell.v;
}

function readApiError(payload: unknown): string | null {
  if (!isRecord(payload)) return null;

  if (isRecord(payload.error) && typeof payload.error.message === "string") {
    return payload.error.message;
  }

  if (Array.isArray(payload.errors)) {
    for (const error of payload.errors) {
      if (isRecord(error) && typeof error.message === "string") {
        return error.message;
      }
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
