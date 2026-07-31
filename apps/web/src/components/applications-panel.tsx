"use client";

import { Button } from "@autoapply/ui";
import type { ApplicationDto, ApplicationStatus } from "@autoapply/contracts";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { fetchApplications } from "@/lib/api";

function statusLabel(status: ApplicationStatus): string {
  switch (status) {
    case "queued":
      return "Queued";
    case "submitting":
      return "Submitting";
    case "submitted":
      return "Submitted";
    case "failed":
      return "Failed";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function ApplicationRow({ application }: { application: ApplicationDto }) {
  return (
    <article className="rounded-lg border border-border/70 bg-background/80 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">Job {application.jobId}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {application.provider} · {new Date(application.createdAt).toLocaleString()}
          </p>
        </div>
        <span className="rounded-md border border-border/60 px-2 py-1 text-xs font-medium">
          {statusLabel(application.status)}
        </span>
      </div>
      {application.errorMessage ? (
        <p className="mt-3 text-sm text-destructive">{application.errorMessage}</p>
      ) : null}
    </article>
  );
}

export function ApplicationsPanel() {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;

  const applicationsQuery = useQuery({
    queryKey: ["applications", accessToken],
    queryFn: () => fetchApplications(accessToken ?? ""),
    enabled: Boolean(accessToken),
    refetchInterval: (query) => {
      const apps = query.state.data?.applications ?? [];
      return apps.some((app) => app.status === "queued" || app.status === "submitting")
        ? 2000
        : false;
    },
  });

  const applications = applicationsQuery.data?.applications ?? [];

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="font-display text-2xl font-semibold">Applications</h1>
        <p className="text-muted-foreground">
          Track LinkedIn Easy Apply runs queued from Jobs. Import cookies under Settings first.
        </p>
      </section>

      <section className="space-y-4">
        {applicationsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading applications…</p>
        ) : null}
        {applicationsQuery.isError ? (
          <p className="text-sm text-destructive">Failed to load applications.</p>
        ) : null}
        {!applicationsQuery.isLoading && applications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No applications yet.</p>
        ) : null}
        {applications.map((application) => (
          <ApplicationRow key={application.id} application={application} />
        ))}
      </section>
    </div>
  );
}
