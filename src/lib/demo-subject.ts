export const DEMO_SUBJECT_COOKIE = "bigquery_demo_subject";

export type DemoSubjectId = string & {
  readonly __brand: "DemoSubjectId";
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createDemoSubjectId(): DemoSubjectId {
  return crypto.randomUUID() as DemoSubjectId;
}

export function parseDemoSubjectId(
  value: string | undefined,
): DemoSubjectId | null {
  if (!value || !UUID_PATTERN.test(value)) return null;
  return value as DemoSubjectId;
}
