-- Idempotent corporate data catalog for the Vercel Connect proof.
-- BigQuery Sandbox expires these objects after 60 days.

CREATE SCHEMA IF NOT EXISTS `remi-demo-bq-connect.corp_raw`
OPTIONS (
  location = "EU",
  description = "Restricted source data for the corporate demo"
);

CREATE SCHEMA IF NOT EXISTS `remi-demo-bq-connect.corp_analytics`
OPTIONS (
  location = "EU",
  description = "Certified analytics views available to corporate analysts"
);

CREATE SCHEMA IF NOT EXISTS `remi-demo-bq-connect.corp_finance`
OPTIONS (
  location = "EU",
  description = "Restricted finance and board data"
);

CREATE SCHEMA IF NOT EXISTS `remi-demo-bq-connect.corp_people`
OPTIONS (
  location = "EU",
  description = "Restricted people operations data"
);

CREATE SCHEMA IF NOT EXISTS `remi-demo-bq-connect.corp_security`
OPTIONS (
  location = "EU",
  description = "Restricted security and access data"
);

-- Source data. CTAS keeps the seed repeatable without unsupported Sandbox DML.

CREATE OR REPLACE TABLE `remi-demo-bq-connect.corp_raw.crm_accounts`
OPTIONS (
  friendly_name = "CRM accounts",
  description = "Account ownership, segmentation, ARR, and health scores",
  labels = [("classification", "restricted"), ("domain", "sales")]
)
AS
SELECT *
FROM UNNEST([
  STRUCT("acct_1001" AS account_id, "Northstar Bank" AS account_name, "Enterprise" AS segment, "France" AS region, "Financial Services" AS industry, NUMERIC "1250000" AS arr_eur, 92 AS health_score, "ava.martin@example.com" AS owner_email),
  STRUCT("acct_1002", "Atlas Health", "Enterprise", "Germany", "Healthcare", NUMERIC "890000", 76, "leo.bernard@example.com"),
  STRUCT("acct_1003", "Ember Retail", "Mid-market", "United Kingdom", "Retail", NUMERIC "420000", 68, "ava.martin@example.com"),
  STRUCT("acct_1004", "Meridian Logistics", "Enterprise", "Netherlands", "Logistics", NUMERIC "730000", 84, "noah.dubois@example.com"),
  STRUCT("acct_1005", "Pine Labs", "Growth", "Spain", "Software", NUMERIC "185000", 95, "leo.bernard@example.com"),
  STRUCT("acct_1006", "Cedar Energy", "Mid-market", "France", "Energy", NUMERIC "310000", 57, "noah.dubois@example.com")
]);

CREATE OR REPLACE TABLE `remi-demo-bq-connect.corp_raw.billing_events`
OPTIONS (
  friendly_name = "Billing events",
  description = "Invoice, usage, credit, and expansion billing events",
  labels = [("classification", "restricted"), ("domain", "billing")]
)
AS
SELECT *
FROM UNNEST([
  STRUCT("bill_2001" AS event_id, "acct_1001" AS account_id, DATE "2026-06-01" AS event_date, "subscription" AS event_type, NUMERIC "104166.67" AS amount_eur, "EUR" AS currency),
  STRUCT("bill_2002", "acct_1002", DATE "2026-06-01", "subscription", NUMERIC "74166.67", "EUR"),
  STRUCT("bill_2003", "acct_1003", DATE "2026-06-01", "subscription", NUMERIC "35000.00", "EUR"),
  STRUCT("bill_2004", "acct_1004", DATE "2026-06-01", "subscription", NUMERIC "60833.33", "EUR"),
  STRUCT("bill_2005", "acct_1005", DATE "2026-07-01", "subscription", NUMERIC "15416.67", "EUR"),
  STRUCT("bill_2006", "acct_1006", DATE "2026-07-01", "subscription", NUMERIC "25833.33", "EUR"),
  STRUCT("bill_2007", "acct_1001", DATE "2026-07-08", "usage", NUMERIC "18420.50", "EUR"),
  STRUCT("bill_2008", "acct_1004", DATE "2026-07-10", "expansion", NUMERIC "45000.00", "EUR")
]);

CREATE OR REPLACE TABLE `remi-demo-bq-connect.corp_raw.product_events`
OPTIONS (
  friendly_name = "Product events",
  description = "Daily account-level adoption and request volume",
  labels = [("classification", "restricted"), ("domain", "product")]
)
AS
SELECT *
FROM UNNEST([
  STRUCT("evt_3001" AS event_id, "acct_1001" AS account_id, DATE "2026-07-10" AS event_date, "Deployments" AS product_area, 184 AS active_users, 4203100 AS requests),
  STRUCT("evt_3002", "acct_1002", DATE "2026-07-10", "Observability", 91, 1264400),
  STRUCT("evt_3003", "acct_1003", DATE "2026-07-10", "Edge Network", 63, 830200),
  STRUCT("evt_3004", "acct_1004", DATE "2026-07-10", "Deployments", 128, 2109800),
  STRUCT("evt_3005", "acct_1005", DATE "2026-07-10", "AI Gateway", 42, 610900),
  STRUCT("evt_3006", "acct_1006", DATE "2026-07-10", "Observability", 37, 388100)
]);

CREATE OR REPLACE TABLE `remi-demo-bq-connect.corp_raw.sales_opportunities`
OPTIONS (
  friendly_name = "Sales opportunities",
  description = "Open pipeline with owner, stage, value, and close probability",
  labels = [("classification", "restricted"), ("domain", "sales")]
)
AS
SELECT *
FROM UNNEST([
  STRUCT("opp_4001" AS opportunity_id, "acct_1002" AS account_id, "Negotiation" AS stage, "Ava Martin" AS owner, NUMERIC "240000" AS amount_eur, DATE "2026-08-15" AS close_date, 75 AS probability_pct),
  STRUCT("opp_4002", "acct_1003", "Proposal", "Leo Bernard", NUMERIC "180000", DATE "2026-09-30", 55),
  STRUCT("opp_4003", "acct_1004", "Discovery", "Noah Dubois", NUMERIC "510000", DATE "2026-10-31", 30),
  STRUCT("opp_4004", "acct_1005", "Commit", "Ava Martin", NUMERIC "95000", DATE "2026-07-31", 90),
  STRUCT("opp_4005", "acct_1006", "Qualification", "Leo Bernard", NUMERIC "210000", DATE "2026-11-15", 20)
]);

CREATE OR REPLACE TABLE `remi-demo-bq-connect.corp_raw.support_tickets`
OPTIONS (
  friendly_name = "Support tickets",
  description = "Customer support cases with priority and resolution timing",
  labels = [("classification", "restricted"), ("domain", "support")]
)
AS
SELECT *
FROM UNNEST([
  STRUCT("case_5001" AS ticket_id, "acct_1001" AS account_id, DATE "2026-07-08" AS opened_date, "P2" AS priority, "Resolved" AS status, "Build failure" AS category, NUMERIC "3.4" AS resolution_hours),
  STRUCT("case_5002", "acct_1002", DATE "2026-07-09", "P1", "Monitoring", "Security", NUMERIC "1.2"),
  STRUCT("case_5003", "acct_1003", DATE "2026-07-10", "P3", "Open", "Configuration", CAST(NULL AS NUMERIC)),
  STRUCT("case_5004", "acct_1004", DATE "2026-07-11", "P2", "Resolved", "Performance", NUMERIC "5.8"),
  STRUCT("case_5005", "acct_1006", DATE "2026-07-12", "P1", "Open", "Outage", CAST(NULL AS NUMERIC)),
  STRUCT("case_5006", "acct_1005", DATE "2026-07-13", "P3", "Resolved", "Billing", NUMERIC "7.1")
]);

-- Certified semantic layer. These views are authorized against corp_raw.

CREATE OR REPLACE VIEW `remi-demo-bq-connect.corp_analytics.customer_health`
OPTIONS (
  friendly_name = "Customer health",
  description = "Certified account health and open support workload",
  labels = [("classification", "internal"), ("certified", "true")]
)
AS
SELECT
  accounts.account_id,
  accounts.account_name,
  accounts.segment,
  accounts.region,
  accounts.arr_eur,
  accounts.health_score,
  CASE
    WHEN accounts.health_score >= 85 THEN "Healthy"
    WHEN accounts.health_score >= 70 THEN "Watch"
    ELSE "At risk"
  END AS health_band,
  COUNTIF(tickets.status != "Resolved") AS open_tickets
FROM `remi-demo-bq-connect.corp_raw.crm_accounts` AS accounts
LEFT JOIN `remi-demo-bq-connect.corp_raw.support_tickets` AS tickets
  USING (account_id)
GROUP BY ALL;

CREATE OR REPLACE VIEW `remi-demo-bq-connect.corp_analytics.monthly_revenue`
OPTIONS (
  friendly_name = "Monthly revenue",
  description = "Certified monthly revenue by customer region",
  labels = [("classification", "internal"), ("certified", "true")]
)
AS
SELECT
  DATE_TRUNC(billing.event_date, MONTH) AS month,
  accounts.region,
  COUNT(DISTINCT billing.account_id) AS paying_accounts,
  SUM(billing.amount_eur) AS revenue_eur
FROM `remi-demo-bq-connect.corp_raw.billing_events` AS billing
JOIN `remi-demo-bq-connect.corp_raw.crm_accounts` AS accounts
  USING (account_id)
GROUP BY ALL;

CREATE OR REPLACE VIEW `remi-demo-bq-connect.corp_analytics.product_adoption`
OPTIONS (
  friendly_name = "Product adoption",
  description = "Certified product adoption and request volume",
  labels = [("classification", "internal"), ("certified", "true")]
)
AS
SELECT
  events.event_date,
  events.product_area,
  COUNT(DISTINCT events.account_id) AS active_accounts,
  SUM(events.active_users) AS active_users,
  SUM(events.requests) AS requests
FROM `remi-demo-bq-connect.corp_raw.product_events` AS events
GROUP BY ALL;

CREATE OR REPLACE VIEW `remi-demo-bq-connect.corp_analytics.sales_pipeline`
OPTIONS (
  friendly_name = "Sales pipeline",
  description = "Certified pipeline totals by stage and expected close month",
  labels = [("classification", "internal"), ("certified", "true")]
)
AS
SELECT
  stage,
  DATE_TRUNC(close_date, MONTH) AS close_month,
  COUNT(*) AS opportunities,
  SUM(amount_eur) AS pipeline_eur,
  SUM(amount_eur * probability_pct / 100) AS weighted_pipeline_eur
FROM `remi-demo-bq-connect.corp_raw.sales_opportunities`
GROUP BY ALL;

CREATE OR REPLACE VIEW `remi-demo-bq-connect.corp_analytics.support_operations`
OPTIONS (
  friendly_name = "Support operations",
  description = "Certified support workload and resolution time by priority",
  labels = [("classification", "internal"), ("certified", "true")]
)
AS
SELECT
  priority,
  COUNT(*) AS tickets,
  COUNTIF(status = "Open") AS open_tickets,
  AVG(resolution_hours) AS average_resolution_hours
FROM `remi-demo-bq-connect.corp_raw.support_tickets`
GROUP BY priority;

-- Finance and board data. Only the admin receives dataset access.

CREATE OR REPLACE TABLE `remi-demo-bq-connect.corp_finance.board_forecast`
OPTIONS (
  friendly_name = "Board forecast",
  description = "Board-level forecast scenarios and liquidity outlook",
  labels = [("classification", "confidential"), ("domain", "finance")]
)
AS
SELECT *
FROM UNNEST([
  STRUCT("2026-Q3" AS quarter, "Base" AS scenario, NUMERIC "4820000" AS bookings_eur, NUMERIC "3910000" AS revenue_eur, NUMERIC "72.4" AS gross_margin_pct, NUMERIC "18400000" AS ending_cash_eur),
  STRUCT("2026-Q3", "Upside", NUMERIC "5450000", NUMERIC "4200000", NUMERIC "74.1", NUMERIC "19100000"),
  STRUCT("2026-Q3", "Downside", NUMERIC "3980000", NUMERIC "3520000", NUMERIC "68.9", NUMERIC "16900000")
]);

CREATE OR REPLACE TABLE `remi-demo-bq-connect.corp_finance.margin_by_customer`
OPTIONS (
  friendly_name = "Customer margin",
  description = "Customer-level revenue, cost, and gross margin",
  labels = [("classification", "confidential"), ("domain", "finance")]
)
AS
SELECT *
FROM UNNEST([
  STRUCT("Northstar Bank" AS account_name, NUMERIC "367000" AS revenue_eur, NUMERIC "61200" AS infrastructure_cost_eur, NUMERIC "18400" AS support_cost_eur, NUMERIC "78.3" AS gross_margin_pct),
  STRUCT("Atlas Health", NUMERIC "244000", NUMERIC "53800", NUMERIC "22900", NUMERIC "68.6"),
  STRUCT("Meridian Logistics", NUMERIC "281000", NUMERIC "44700", NUMERIC "12100", NUMERIC "79.8")
]);

CREATE OR REPLACE TABLE `remi-demo-bq-connect.corp_finance.acquisition_targets`
OPTIONS (
  friendly_name = "Acquisition targets",
  description = "Confidential corporate development target list",
  labels = [("classification", "confidential"), ("domain", "finance")]
)
AS
SELECT *
FROM UNNEST([
  STRUCT("Project Aurora" AS codename, "Observability" AS sector, "Sweden" AS geography, NUMERIC "48000000" AS asking_price_eur, 88 AS strategic_score, "Diligence" AS status),
  STRUCT("Project Harbor", "Security", "United Kingdom", NUMERIC "72000000", 81, "Initial review"),
  STRUCT("Project Juniper", "Developer tools", "France", NUMERIC "31000000", 74, "Paused")
]);

CREATE OR REPLACE TABLE `remi-demo-bq-connect.corp_finance.cash_runway`
OPTIONS (
  friendly_name = "Cash runway",
  description = "Monthly cash and net burn forecast",
  labels = [("classification", "confidential"), ("domain", "finance")]
)
AS
SELECT *
FROM UNNEST([
  STRUCT(DATE "2026-07-01" AS month, NUMERIC "20100000" AS opening_cash_eur, NUMERIC "-570000" AS net_burn_eur, NUMERIC "19530000" AS closing_cash_eur),
  STRUCT(DATE "2026-08-01", NUMERIC "19530000", NUMERIC "-610000", NUMERIC "18920000"),
  STRUCT(DATE "2026-09-01", NUMERIC "18920000", NUMERIC "-520000", NUMERIC "18400000")
]);

-- People data. Only the admin receives dataset access.

CREATE OR REPLACE TABLE `remi-demo-bq-connect.corp_people.employee_compensation`
OPTIONS (
  friendly_name = "Employee compensation",
  description = "Restricted employee salary, bonus, and equity data",
  labels = [("classification", "highly_confidential"), ("domain", "people")]
)
AS
SELECT *
FROM UNNEST([
  STRUCT("emp_7001" AS employee_id, "Camille Laurent" AS employee_name, "Engineering" AS department, "L6" AS level, NUMERIC "168000" AS base_salary_eur, 15 AS bonus_target_pct, 4800 AS equity_units),
  STRUCT("emp_7002", "Hugo Fontaine", "Sales", "L5", NUMERIC "124000", 30, 2200),
  STRUCT("emp_7003", "Ines Moreau", "Finance", "L5", NUMERIC "132000", 15, 2600),
  STRUCT("emp_7004", "Louis Girard", "Security", "L6", NUMERIC "174000", 15, 5100)
]);

CREATE OR REPLACE TABLE `remi-demo-bq-connect.corp_people.performance_reviews`
OPTIONS (
  friendly_name = "Performance reviews",
  description = "Restricted review ratings and manager notes",
  labels = [("classification", "highly_confidential"), ("domain", "people")]
)
AS
SELECT *
FROM UNNEST([
  STRUCT("emp_7001" AS employee_id, "Camille Laurent" AS employee_name, "2026-H1" AS cycle, "Exceeds" AS rating, TRUE AS promotion_recommended, "Expanded platform ownership" AS manager_notes),
  STRUCT("emp_7002", "Hugo Fontaine", "2026-H1", "Meets", FALSE, "Strong enterprise execution"),
  STRUCT("emp_7003", "Ines Moreau", "2026-H1", "Exceeds", TRUE, "Improved forecasting accuracy"),
  STRUCT("emp_7004", "Louis Girard", "2026-H1", "Meets", FALSE, "Completed privileged access program")
]);

CREATE OR REPLACE TABLE `remi-demo-bq-connect.corp_people.headcount_plan`
OPTIONS (
  friendly_name = "Headcount plan",
  description = "Restricted approved hiring plan and annual cost",
  labels = [("classification", "confidential"), ("domain", "people")]
)
AS
SELECT *
FROM UNNEST([
  STRUCT("Engineering" AS department, 84 AS current_headcount, 11 AS approved_roles, 8 AS planned_hires, NUMERIC "1360000" AS annual_cost_eur),
  STRUCT("Sales", 42, 9, 6, NUMERIC "810000"),
  STRUCT("Customer Success", 31, 5, 4, NUMERIC "430000"),
  STRUCT("Security", 12, 4, 3, NUMERIC "510000")
]);

-- Security data. Only the admin receives dataset access.

CREATE OR REPLACE TABLE `remi-demo-bq-connect.corp_security.security_incidents`
OPTIONS (
  friendly_name = "Security incidents",
  description = "Restricted incident register and investigation status",
  labels = [("classification", "highly_confidential"), ("domain", "security")]
)
AS
SELECT *
FROM UNNEST([
  STRUCT("sec_8001" AS incident_id, TIMESTAMP "2026-07-04 08:42:00+00" AS detected_at, "High" AS severity, "Identity" AS system, "Contained" AS status, "Suspicious privileged login" AS summary),
  STRUCT("sec_8002", TIMESTAMP "2026-07-09 14:17:00+00", "Medium", "CI/CD", "Investigating", "Unexpected deployment token use"),
  STRUCT("sec_8003", TIMESTAMP "2026-07-12 03:05:00+00", "Low", "Corporate network", "Resolved", "Blocked malware callback")
]);

CREATE OR REPLACE TABLE `remi-demo-bq-connect.corp_security.privileged_access`
OPTIONS (
  friendly_name = "Privileged access",
  description = "Restricted privileged identities and access reviews",
  labels = [("classification", "highly_confidential"), ("domain", "security")]
)
AS
SELECT *
FROM UNNEST([
  STRUCT("admin-platform@example.com" AS principal, "Production platform" AS system, "Administrator" AS access_level, "security@example.com" AS granted_by, DATE "2026-08-01" AS review_date),
  STRUCT("finance-ops@example.com", "Billing", "Editor", "cfo@example.com", DATE "2026-07-31"),
  STRUCT("incident-response@example.com", "SIEM", "Administrator", "security@example.com", DATE "2026-08-15")
]);

CREATE OR REPLACE TABLE `remi-demo-bq-connect.corp_security.vendor_risk`
OPTIONS (
  friendly_name = "Vendor risk",
  description = "Restricted third-party risk and contract review register",
  labels = [("classification", "confidential"), ("domain", "security")]
)
AS
SELECT *
FROM UNNEST([
  STRUCT("Nimbus AI" AS vendor, "Model inference" AS service, "Tier 1" AS risk_tier, "Customer content" AS data_classification, DATE "2027-01-31" AS contract_end, "Open findings" AS review_status),
  STRUCT("LedgerWorks", "Payroll", "Tier 1", "Employee PII", DATE "2026-12-31", "Approved"),
  STRUCT("SignalPath", "Error tracking", "Tier 2", "Application telemetry", DATE "2026-10-15", "Review due")
]);
