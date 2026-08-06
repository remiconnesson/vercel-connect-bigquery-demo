import {
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getUser, type PassportUser } from "@/lib/auth";
import { loadProofState, type ProofState } from "@/lib/proof-state";
import { cn } from "@/lib/utils";

export default async function Home() {
  const passportUser = await getUser();
  const state = await loadProofState(passportUser?.id ?? null);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-5 py-10 sm:px-8 sm:py-16">
      <header className="flex flex-col gap-5 border-b pb-8">
        <div className="max-w-3xl space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            BigQuery table viewer
          </h1>
        </div>
        <PassportIdentity user={passportUser} />
      </header>

      <ProofCard passportUser={passportUser} state={state} />
    </main>
  );
}

function PassportIdentity({ user }: { user: PassportUser | null }) {
  const displayName = user?.name ?? user?.email ?? user?.id;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
      <span className="font-medium">Passport identity</span>
      <Badge variant={user ? "secondary" : "outline"}>
        {user ? "Connected" : "Not detected"}
      </Badge>
      {displayName ? (
        <span className="max-w-full truncate font-mono text-xs text-muted-foreground">
          {displayName}
        </span>
      ) : null}
    </div>
  );
}

function ProofCard({
  passportUser,
  state,
}: {
  passportUser: PassportUser | null;
  state: ProofState;
}) {
  if (state.kind === "configuration-missing") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connector setup required</CardTitle>
          <CardDescription>
            The BigQuery datasets are ready. Attach the Okta connector and
            Google Workforce Identity provider to finish the path.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <CircleAlert />
            <AlertTitle>Missing runtime configuration</AlertTitle>
            <AlertDescription className="font-mono">
              {state.details.join(", ")}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (state.kind === "configuration-invalid") {
    return (
      <FailureAlert
        title="Invalid runtime configuration"
        details={state.details}
      />
    );
  }

  if (state.kind === "failed") {
    return (
      <FailureAlert
        title={
          state.stage === "connect"
            ? "Connect token failed"
            : state.stage === "google-sts"
              ? "Google token exchange failed"
              : "BigQuery query failed"
        }
        details={[state.message]}
      />
    );
  }

  if (
    state.kind === "ready-to-authorize" ||
    state.kind === "authorization-required"
  ) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authorize BigQuery access</CardTitle>
          <CardDescription>
            Continue with Okta so Google can enforce the BigQuery permissions
            attached to your Okta groups.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            className={cn(buttonVariants({ size: "lg" }), "w-fit")}
            href="/api/connect/okta"
          >
            Continue with Okta
            <ExternalLink data-icon="inline-end" />
          </a>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-4" />
          <span className="text-sm font-medium">Delegated catalog loaded</span>
        </div>
        <CardTitle className="mt-2 text-xl">
          BigQuery returned this principal&apos;s visible catalog
        </CardTitle>
        <CardDescription>
          The principal and visible objects below came from BigQuery. The app
          did not receive a role or a table allowlist from the browser.
        </CardDescription>
        <CardAction>
          <Badge variant="secondary">Connected</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Connected through Passport
          </div>
          <div className="mt-1 font-medium">
            {passportUser?.name ?? passportUser?.email ?? "Authenticated visitor"}
          </div>
          <div className="mt-1 font-mono text-xs text-muted-foreground">
            Passport user ID: {passportUser?.id ?? "Unavailable"}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="BigQuery principal" value={state.proof.principal} />
          <Metric label="Connector" value={state.connectorUid} />
          <Metric
            label="Visible datasets"
            value={String(state.proof.datasets.length)}
            suffix="IAM-filtered"
          />
          <Metric
            label="Visible tables"
            value={String(state.proof.tables.length)}
            suffix="IAM-filtered"
          />
        </div>

        <Alert>
          <ShieldCheck />
          <AlertTitle>BigQuery filtered this list</AlertTitle>
          <AlertDescription>
            Unauthorized datasets are absent from the BigQuery API response.
            This page does not fetch a master catalog and hide rows afterward.
          </AlertDescription>
        </Alert>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>Dataset</TableHead>
                <TableHead>Object</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.proof.tables.map((table) => (
                <TableRow key={`${table.datasetId}.${table.tableId}`}>
                  <TableCell>{table.domain}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {table.datasetId}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{table.friendlyName}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {table.tableId}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {formatTableType(table.type)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        table.access === "governed"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {table.access === "governed"
                        ? "Certified"
                        : "Restricted"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-xs text-muted-foreground">
            Token expires {state.expiresAt}
            {state.externalSubject
              ? ` · Okta subject ${state.externalSubject}`
              : ""}
            {` · identity query ${state.proof.bytesProcessed} bytes`}
            {state.proof.cacheHit ? " · cache hit" : ""}
          </p>
          <a
            className={buttonVariants({ variant: "outline" })}
            href="/api/connect/okta"
          >
            Reauthorize Okta
            <ExternalLink data-icon="inline-end" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

function formatTableType(value: string): string {
  if (value === "VIEW") return "View";
  if (value === "TABLE") return "Table";
  return value.toLowerCase().replaceAll("_", " ");
}

function Metric(input: { label: string; suffix?: string; value: string }) {
  return (
    <div className="space-y-1 rounded-lg bg-muted/50 p-3">
      <div className="text-xs text-muted-foreground">{input.label}</div>
      <div className="truncate font-mono text-sm" title={input.value}>
        {input.value}
      </div>
      {input.suffix ? (
        <div className="text-[11px] text-muted-foreground">
          {input.suffix}
        </div>
      ) : null}
    </div>
  );
}

function FailureAlert(input: { details: string[]; title: string }) {
  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertTitle>{input.title}</AlertTitle>
      <AlertDescription>{input.details.join(" · ")}</AlertDescription>
    </Alert>
  );
}
