import { cookies } from "next/headers";
import {
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  RefreshCw,
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
import {
  DEMO_SUBJECT_COOKIE,
  parseDemoSubjectId,
} from "@/lib/demo-subject";
import { loadProofState, type ProofState } from "@/lib/proof-state";
import { cn } from "@/lib/utils";

export default async function Home() {
  const cookieStore = await cookies();
  const subject = parseDemoSubjectId(
    cookieStore.get(DEMO_SUBJECT_COOKIE)?.value,
  );
  const state = await loadProofState(subject);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-5 py-10 sm:px-8 sm:py-16">
      <header className="flex flex-col gap-5 border-b pb-8">
        <div className="max-w-3xl space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            BigQuery columns viewer
          </h1>
        </div>
      </header>

      <ProofCard state={state} />
    </main>
  );
}

function ProofCard({ state }: { state: ProofState }) {
  if (state.kind === "configuration-missing") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connector setup required</CardTitle>
          <CardDescription>
            The corporate datasets are ready. Create and attach the Google
            Custom OAuth connector to finish the path.
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
          <CardTitle>
            You are not authenticated
          </CardTitle>
        </CardHeader>
        <CardContent>
          <a
            className={cn(buttonVariants({ size: "lg" }), "w-fit")}
            href="/api/connect/google"
          >
            Connect Google
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
          BigQuery returned this principal&apos;s corporate catalog
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
              ? ` · Google subject ${state.externalSubject}`
              : ""}
            {` · identity query ${state.proof.bytesProcessed} bytes`}
            {state.proof.cacheHit ? " · cache hit" : ""}
          </p>
          <form action="/api/demo/reset" method="post">
            <button
              className={buttonVariants({ variant: "outline" })}
              type="submit"
            >
              Switch Google identity
              <RefreshCw data-icon="inline-end" />
            </button>
          </form>
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
