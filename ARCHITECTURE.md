# BigQuery Connect demo architecture

## Problem

The demo must prove that Vercel Connect can broker a Google user token that
BigQuery accepts, while BigQuery itself decides which corporate data that user
can discover. The app cannot filter a master table list by email because that
would move authorization into application code. The demo also needs a repeatable
way to switch between an analyst and an admin without exposing Google tokens to
the browser.

## Usage

The server page resolves a random, HTTP-only demo subject and loads one proof:

```ts
const subject = parseDemoSubjectId(cookieValue);
const state = await loadProofState(subject);
```

Once Vercel Connect returns a Google token, the proof asks BigQuery for the
delegated principal and the catalog visible to that token:

```ts
const proof = await runCorporateCatalogProof({
  accessToken: tokenResponse.token,
  config,
});

proof.principal;
proof.datasets;
proof.tables;
```

The browser receives table metadata, not the Google access token. A demo-only
POST route clears the anonymous subject cookie so the presenter can connect a
different managed Google identity.

## Shape

BigQuery owns the access boundary:

| Dataset | Contents | Analyst | Admin |
| --- | --- | --- | --- |
| `corp_analytics` | Five certified views | Read and list | Read and list |
| `corp_raw` | Five source tables | No access | Read and list |
| `corp_finance` | Four finance tables | No access | Read and list |
| `corp_people` | Three people tables | No access | Read and list |
| `corp_security` | Three security tables | No access | Read and list |

The analyst has `roles/bigquery.jobUser` on the project and `READER`, equivalent
to `roles/bigquery.dataViewer`, on `corp_analytics`. The analytics views are
authorized against `corp_raw`. The analyst has no project-wide metadata role and
no ACL entry on the four restricted datasets. The admin owns the demo project.

The app uses these contracts:

```ts
type CatalogAccess = "governed" | "restricted";

type CorporateTable = {
  access: CatalogAccess;
  datasetId: string;
  domain: string;
  friendlyName: string;
  tableId: string;
  type: string;
};

type CorporateCatalogProof = {
  bytesProcessed: string;
  cacheHit: boolean;
  datasets: readonly string[];
  principal: string;
  tables: readonly CorporateTable[];
};

declare function runCorporateCatalogProof(input: {
  accessToken: string;
  config: RuntimeConfig;
}): Promise<CorporateCatalogProof>;
```

`runCorporateCatalogProof` runs `SELECT SESSION_USER()` through `jobs.query`,
then calls `datasets.list` and `tables.list` with the same delegated token.
BigQuery filters those list responses according to IAM. The application keeps a
fixed allowlist of the five demo dataset IDs only to exclude unrelated project
resources from the screen. It never adds a dataset that BigQuery omitted.

External Google responses enter as `unknown` and are parsed in `bigquery.ts`.
The page receives a discriminated `ProofState`. No caller can submit SQL, a
dataset name, or an email address.

## Synthesis decision

The project-level `region-eu.INFORMATION_SCHEMA.TABLES` option lost because it
requires project-wide metadata permission. Granting that permission would let
the analyst discover the restricted tables. A dynamic SQL union over visible
datasets also lost because it adds query construction without improving the
proof. IAM-filtered BigQuery REST catalog methods preserve the access boundary
and keep the single SQL statement fixed.

## Tradeoffs accepted

- We accept several metadata API calls in exchange for BigQuery deciding which
  datasets and tables exist for each principal.
- We accept a demo-only anonymous subject cookie in exchange for avoiding a
  premature application-auth choice. A customer implementation must use its
  authenticated user ID.
- We accept BigQuery Sandbox's 60-day table expiration in exchange for a demo
  that needs no billing account.
- We accept a fixed list of demo dataset IDs in the app in exchange for keeping
  unrelated project resources out of the presentation.

## Alternatives considered

- A project-level `INFORMATION_SCHEMA.TABLES` query would require metadata
  access across the project and weaken the demo's table-hiding claim.
- A shared service account plus an app-side role filter would make BigQuery see
  the same principal for every user.
- A separate query for every known dataset would turn permission denials into
  control flow and expose restricted dataset names to the analyst.

## Open questions and risks

- Which customer system is authoritative for the governed layer: dbt, Looker,
  or BigQuery authorized views?
- Should a production app expose catalog metadata at all, or only named reports?
- Which identity provider should replace the anonymous demo subject?

## Next implementation step

Provision the five datasets and their IAM entries, then fill the catalog proof
against the live BigQuery REST responses.
