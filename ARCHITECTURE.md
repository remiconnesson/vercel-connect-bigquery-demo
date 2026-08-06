# BigQuery Connect demo architecture

## Identity path

```text
Okta user
  -> Vercel Passport identity
  -> Vercel Connect Okta access token
  -> Google Security Token Service
  -> Workforce Identity Federation principal
  -> BigQuery IAM
```

Passport and Connect use the same person without sharing credentials. Passport
provides a verified `external_sub`; the app uses that value as the Vercel
Connect user subject. Connect stores and refreshes the Okta grant. The app then
exchanges the returned Okta JWT for a short-lived Google access token.

The Workforce Identity provider accepts only tokens that:

- are issued by the Okta `default` custom authorization server;
- have audience `api://default`;
- have the dedicated Connect client in `cid`; and
- contain `bigquery-owner` in the `groups` claim.

It maps the Okta `uid` to `google.subject` and `groups` to `google.groups`.
Existing Google IAM bindings for the workforce group therefore remain the
authorization boundary.

## Data boundary

The app executes only `SELECT SESSION_USER()` and calls BigQuery's
`datasets.list` and `tables.list` endpoints with the exchanged Google token.
BigQuery omits unauthorized datasets before the response reaches the app.

For the Delivery Hero sandbox, `bigquery-owner` can run queries and access
`poc_shared`. It has no dataset ACL on `poc_finance` or `poc_security`.

The browser never receives either the Okta token or the Google token. It
receives only the principal and IAM-filtered catalog metadata.
