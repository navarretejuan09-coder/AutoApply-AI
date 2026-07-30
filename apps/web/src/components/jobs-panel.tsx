"use client";

import { Button, Input } from "@autoapply/ui";
import type { JobDto, JobStatus } from "@autoapply/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useState } from "react";

import { createJob, deleteJob, fetchJobs } from "@/lib/api";

function statusLabel(status: JobStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "matching":
      return "Matching";
    case "matched":
      return "Matched";
    case "failed":
      return "Failed";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function statusClassName(status: JobStatus): string {
  switch (status) {
    case "pending":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
    case "matching":
      return "bg-sky-500/15 text-sky-700 dark:text-sky-300";
    case "matched":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "failed":
      return "bg-destructive/15 text-destructive";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function isInProgress(status: JobStatus): boolean {
  return status === "pending" || status === "matching";
}

function JobCard({
  job,
  onDelete,
  deleting,
}: {
  job: JobDto;
  onDelete: (jobId: string) => void;
  deleting: boolean;
}) {
  return (
    <article className="rounded-lg border border-border/70 bg-background/80 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{job.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{job.company}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Added {new Date(job.createdAt).toLocaleString()}
            {job.location ? ` · ${job.location}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {job.matchScore != null ? (
            <span className="rounded-md border border-border/60 px-2 py-1 text-xs font-medium">
              Score {Math.round(job.matchScore)}
            </span>
          ) : null}
          <span
            className={`rounded-md px-2 py-1 text-xs font-medium ${statusClassName(job.status)}`}
          >
            {statusLabel(job.status)}
          </span>
        </div>
      </div>

      {job.matchRationale ? (
        <p className="mt-4 text-sm text-muted-foreground">{job.matchRationale}</p>
      ) : null}

      {job.errorMessage ? (
        <p className="mt-4 text-sm text-destructive">{job.errorMessage}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {job.url ? (
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-muted-foreground underline underline-offset-4"
          >
            Open posting
          </a>
        ) : null}
        <Button variant="outline" size="sm" disabled={deleting} onClick={() => onDelete(job.id)}>
          Remove
        </Button>
      </div>
    </article>
  );
}

const emptyForm = {
  title: "",
  company: "",
  url: "",
  location: "",
  description: "",
};

export function JobsPanel() {
  const { data: session, status: sessionStatus } = useSession();
  const accessToken = session?.accessToken;
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const jobsQuery = useQuery({
    queryKey: ["jobs", accessToken],
    queryFn: () => fetchJobs(accessToken ?? ""),
    enabled: Boolean(accessToken),
    refetchInterval: (query) => {
      const jobs = query.state.data?.jobs ?? [];
      return jobs.some((job) => isInProgress(job.status)) ? 2000 : false;
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createJob(accessToken ?? "", {
        title: form.title,
        company: form.company,
        description: form.description,
        url: form.url || undefined,
        location: form.location || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["jobs", accessToken] });
      setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (jobId: string) => deleteJob(accessToken ?? "", jobId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["jobs", accessToken] });
    },
  });

  const jobs = jobsQuery.data?.jobs ?? [];
  const canSubmit =
    Boolean(form.title.trim() && form.company.trim() && form.description.trim()) &&
    !createMutation.isPending &&
    sessionStatus !== "loading";

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="font-display text-2xl font-semibold">Jobs</h1>
        <p className="text-muted-foreground">
          Paste a job posting to rank it against your latest parsed resume using local Ollama
          embeddings and a short AI rationale.
        </p>
      </section>

      <section className="rounded-lg border border-border/70 bg-background/80 p-5">
        <h2 className="font-medium">Add job</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Matching requires a parsed resume under Resumes. Pull Ollama models first if matching
          fails.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="Title"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          />
          <Input
            placeholder="Company"
            value={form.company}
            onChange={(event) => setForm((prev) => ({ ...prev, company: event.target.value }))}
          />
          <Input
            placeholder="URL (optional)"
            value={form.url}
            onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))}
          />
          <Input
            placeholder="Location (optional)"
            value={form.location}
            onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
          />
        </div>
        <textarea
          className="mt-3 min-h-32 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="Paste the job description"
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
        />
        <div className="mt-4">
          <Button
            disabled={!canSubmit}
            onClick={() => {
              if (!accessToken) {
                return;
              }
              createMutation.mutate();
            }}
          >
            {createMutation.isPending ? "Saving…" : "Match job"}
          </Button>
        </div>
        {sessionStatus === "authenticated" && !accessToken ? (
          <p className="mt-4 text-sm text-destructive">
            Your session is missing an API token. Sign out and sign in again, then retry.
          </p>
        ) : null}
        {createMutation.isSuccess ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Job queued for matching (queue job {createMutation.data.queueJobId}).
          </p>
        ) : null}
        {createMutation.isError ? (
          <p className="mt-4 text-sm text-destructive">
            {createMutation.error instanceof Error
              ? createMutation.error.message
              : "Failed to create job."}
          </p>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">Your jobs</h2>
        {jobsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading jobs…</p>
        ) : null}
        {jobsQuery.isError ? (
          <p className="text-sm text-destructive">Failed to load jobs.</p>
        ) : null}
        {!jobsQuery.isLoading && jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No jobs added yet.</p>
        ) : null}
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            deleting={deleteMutation.isPending}
            onDelete={(jobId) => deleteMutation.mutate(jobId)}
          />
        ))}
      </section>
    </div>
  );
}
