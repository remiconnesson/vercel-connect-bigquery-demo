# Vercel Connect × BigQuery

This demo proves that a Vercel Connect Custom OAuth connector can broker a
Google user token that BigQuery accepts. The app shows the principal returned by
`SESSION_USER()` and the corporate datasets and tables that BigQuery allows
that principal to discover.

The app does not fetch a master catalog and filter it by email. It calls
BigQuery's dataset and table listing APIs with the delegated Google token, so
unauthorized datasets never enter the application response.

## Current resources

- Vercel project: `demo-team-passport-vtest314/vercel-connect-bigquery-demo`
- Vercel connector: `google/bigquery-google-passport-demo`
- Google Cloud organization: `remi-demo.com`
- Google Cloud project: `remi-demo-bq-connect`
- BigQuery location: `EU`
- Analyst identity: `analyst@remi-demo.com`
- Admin identity: `admin@remi-demo.com`

## Passport identity

The Vercel project is protected by Passport. The app reads the verified
`x-vercel-oidc-passport-token` identity on the server and displays the visitor's
name, email, or stable `external_sub` ID. It never sends the raw Passport token
to the browser or builds a second login system.

For local development only, set `PASSPORT_DEV_USER` to show a stand-in identity.
The fallback is disabled in production builds.

## BigQuery access model

| Dataset | Objects | Analyst | Admin |
| --- | ---: | --- | --- |
| `corp_analytics` | 5 certified views | Visible and queryable | Visible and queryable |
| `corp_raw` | 5 source tables | Hidden | Visible and queryable |
| `corp_finance` | 4 finance tables | Hidden | Visible and queryable |
| `corp_people` | 3 people tables | Hidden | Visible and queryable |
| `corp_security` | 3 security tables | Hidden | Visible and queryable |

The analyst has `roles/bigquery.jobUser` on the project and `READER` on
`corp_analytics`. The five analytics views are authorized against `corp_raw`.
The analyst has no access entry on the four restricted datasets. The admin owns
the demo project.

## Provision the demo

Apply the 20 fake corporate objects, the analyst grant, and the authorized-view
entries:

```sh
CLOUDSDK_CONFIG="$HOME/.config/gcloud-remi-demo" ./scripts/setup-gcp.sh
```

The script is idempotent. BigQuery Sandbox automatically expires tables and
views after 60 days.

## Google OAuth and Vercel Connect

The Google Auth Platform app is Internal to `remi-demo.com`. Its Web application
client has this redirect URI:

```text
https://connect.vercel.com/callback
```

Create and attach the connector from a downloaded Google OAuth credential file:

```sh
pnpm connector:create ~/Downloads/client_secret_....json
```

The script streams the client secret to Vercel Connect over standard input. It
does not add the secret to source files, environment variables, shell history,
or process arguments.

## Run the proof

Deploy the app:

```sh
vercel --prod
```

Open the production URL and connect `analyst@remi-demo.com`. BigQuery returns
one visible dataset and five certified views. Click **Switch Google identity**,
connect `admin@remi-demo.com`, and BigQuery returns all five datasets and all 20
objects.

For local development:

```sh
vercel env pull .env.local --environment=development --yes
pnpm dev
```

Local Vercel OIDC tokens expire. Pull `.env.local` again when Connect starts
returning authentication errors.

## Security boundary

- Vercel Connect holds and refreshes the Google grant. Provider tokens remain
  in server code.
- The fixed SQL statement is `SELECT SESSION_USER()`. Callers cannot submit SQL,
  dataset names, or an email address.
- BigQuery filters `datasets.list` and `tables.list` according to the delegated
  principal's IAM permissions.
- The HTTP-only cookie is only a temporary Connect subject for the demo. A real
  app must replace it with its authenticated user ID.
- The identity-switch route clears that anonymous subject cookie. It does not
  expose or copy the previous user's token.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the design and rejected alternatives.
