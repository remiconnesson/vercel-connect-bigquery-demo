#!/usr/bin/env bash

set -euo pipefail

PROJECT_ID="remi-demo-bq-connect"
DEMO_USER="analyst@remi-demo.com"
LOCATION="EU"
RAW_DATASET="corp_raw"
GOVERNED_DATASET="corp_analytics"
GOVERNED_VIEWS='["customer_health","monthly_revenue","product_adoption","sales_pipeline","support_operations"]'
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

for command in gcloud bq jq; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Missing required command: $command" >&2
    exit 1
  fi
done

export CLOUDSDK_CONFIG="${CLOUDSDK_CONFIG:-$HOME/.config/gcloud-remi-demo}"

active_account="$(gcloud auth list --filter=status:ACTIVE --format='value(account)')"
if [[ "$active_account" != "admin@remi-demo.com" ]]; then
  echo "Expected active Google Cloud account admin@remi-demo.com, got: ${active_account:-none}" >&2
  exit 1
fi

gcloud services enable bigquery.googleapis.com --project="$PROJECT_ID"

bq query \
  --project_id="$PROJECT_ID" \
  --location="$LOCATION" \
  --use_legacy_sql=false \
  < "$ROOT_DIR/infra/bigquery.sql"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="user:$DEMO_USER" \
  --role="roles/bigquery.jobUser" \
  --quiet >/dev/null

raw_dataset_json="$(mktemp)"
raw_updated_json="$(mktemp)"
governed_dataset_json="$(mktemp)"
governed_updated_json="$(mktemp)"
trap 'rm -f "$raw_dataset_json" "$raw_updated_json" "$governed_dataset_json" "$governed_updated_json"' EXIT

bq show \
  --project_id="$PROJECT_ID" \
  --format=prettyjson \
  "$PROJECT_ID:$GOVERNED_DATASET" > "$governed_dataset_json"

jq \
  --arg user "$DEMO_USER" \
  '.access = (
    (.access // []) as $access
    | if any($access[];
        .role == "READER" and .userByEmail == $user)
      then $access
      else $access + [{role: "READER", userByEmail: $user}]
      end
  )' "$governed_dataset_json" > "$governed_updated_json"

bq update \
  --project_id="$PROJECT_ID" \
  --source="$governed_updated_json" \
  --update_mode=UPDATE_ACL \
  "$PROJECT_ID:$GOVERNED_DATASET" >/dev/null

bq show \
  --project_id="$PROJECT_ID" \
  --format=prettyjson \
  "$PROJECT_ID:$RAW_DATASET" > "$raw_dataset_json"

jq \
  --arg project "$PROJECT_ID" \
  --arg dataset "$GOVERNED_DATASET" \
  --argjson views "$GOVERNED_VIEWS" \
  '.access = (
    reduce $views[] as $view ((.access // []);
      if any(.[];
          .view.projectId == $project
          and .view.datasetId == $dataset
          and .view.tableId == $view)
        then .
        else . + [{view: {
          projectId: $project,
          datasetId: $dataset,
          tableId: $view
        }}]
        end)
  )' "$raw_dataset_json" > "$raw_updated_json"

bq update \
  --project_id="$PROJECT_ID" \
  --source="$raw_updated_json" \
  --update_mode=UPDATE_ACL \
  "$PROJECT_ID:$RAW_DATASET" >/dev/null

echo "BigQuery demo provisioned for $DEMO_USER in $PROJECT_ID."
