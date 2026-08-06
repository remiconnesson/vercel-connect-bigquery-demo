export type CatalogAccess = "governed" | "restricted";

export type CorporateDataset = {
  access: CatalogAccess;
  domain: string;
  id: string;
};

export const CORPORATE_DATASETS = [
  { access: "governed", domain: "Analytics", id: "corp_analytics" },
  { access: "restricted", domain: "Source data", id: "corp_raw" },
  { access: "restricted", domain: "Finance", id: "corp_finance" },
  { access: "restricted", domain: "People", id: "corp_people" },
  { access: "restricted", domain: "Security", id: "corp_security" },
  { access: "governed", domain: "Shared operations", id: "poc_shared" },
  { access: "restricted", domain: "Finance", id: "poc_finance" },
  { access: "restricted", domain: "Security", id: "poc_security" },
] satisfies readonly CorporateDataset[];

export type CorporateDatasetDefinition =
  (typeof CORPORATE_DATASETS)[number];

export type CorporateDatasetId = CorporateDatasetDefinition["id"];

export type CorporateTable = {
  access: CatalogAccess;
  datasetId: CorporateDatasetId;
  domain: string;
  friendlyName: string;
  tableId: string;
  type: string;
};

export function findCorporateDataset(
  datasetId: string,
): CorporateDatasetDefinition | null {
  for (const dataset of CORPORATE_DATASETS) {
    if (dataset.id === datasetId) return dataset;
  }

  return null;
}
