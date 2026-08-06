# Vercel Connect × Okta × BigQuery

This demo uses the visitor's Okta identity to query BigQuery without creating a
Google account for that visitor.

The deployed request path is:

1. Vercel Passport verifies the visitor and supplies `external_sub`.
2. Vercel Connect obtains an Okta access token for that stable subject.
3. Google Security Token Service exchanges the Okta JWT through Workforce
   Identity Federation.
4. BigQuery evaluates IAM for the Okta groups asserted in that JWT.

The Google access token stays in server code. The browser receives only the
IAM-filtered dataset and table metadata returned by BigQuery.

## Delivery Hero resources

- Vercel project: `delivery-hero-poc-vtest314/delivery-hero-bigquery`
- Vercel connector: `okta.com/delivery-hero-bigquery-okta`
- Okta OIDC app: `Vercel Connect - Delivery Hero BigQuery`
- Okta authorization server:
  `https://integrator-1495739.okta.com/oauth2/default`
- Google Cloud project: `delivery-hero-eaa-poc-vtest314`
- Workforce pool: `delivery-hero-poc-vtest314`
- Workforce provider: `okta-connect-dh`
- Authorized Okta group: `bigquery-owner`
- Visible dataset for that group: `poc_shared`

The workforce provider maps `uid` to `google.subject` and `groups` to
`google.groups`. Its condition also requires the dedicated Okta client ID and
the `bigquery-owner` group. The group has query execution permissions plus a
dataset ACL on `poc_shared`; it has no access entry on `poc_finance` or
`poc_security`.

## Run locally

```sh
vercel env pull .env.local --environment=development --yes
pnpm dev
```

Local Vercel OIDC tokens expire. Pull `.env.local` again if Connect starts
returning authentication errors.

## Recreate the Vercel connector

Create an Okta confidential Web app with authorization-code and refresh-token
grants, PKCE, and this redirect URI:

```text
https://connect.vercel.com/callback
```

Assign the app to `bigquery-owner` only. On the `default` authorization server,
add an access-token `groups` claim for groups beginning with `bigquery-`, and
scope its authorization policy to this client. The Delivery Hero sandbox also
uses the dedicated `Delivery Hero BigQuery password` app sign-in policy: its
single-factor password rule applies only to `bigquery-owner`, so test users do
not inherit the org-wide two-factor rule and get blocked on Okta Verify setup.
Do not share that sandbox policy with production apps.

Store its issuer, client ID, and client secret in a JSON file outside the
repository:

```json
{
  "issuer": "https://integrator-1495739.okta.com/oauth2/default",
  "client_id": "...",
  "client_secret": "..."
}
```

Then run:

```sh
pnpm connector:create /path/to/okta-oauth-client.json
```

The script streams the secret to Vercel Connect over standard input. It does
not put the secret in source files, environment variables, or process
arguments.
