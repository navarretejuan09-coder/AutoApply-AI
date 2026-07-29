"use client";

import { Button } from "@autoapply/ui";
import type { AuthUserDto } from "@autoapply/types";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { enqueueHealthPing, fetchCurrentUser } from "@/lib/api";

export function DashboardOverview() {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;

  const userQuery = useQuery({
    queryKey: ["current-user", accessToken],
    queryFn: () => fetchCurrentUser(accessToken ?? ""),
    enabled: Boolean(accessToken),
  });

  const pingMutation = useMutation({
    mutationFn: () => enqueueHealthPing(accessToken ?? ""),
  });

  const apiUser: AuthUserDto | undefined = userQuery.data;

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Welcome back{apiUser?.name ? `, ${apiUser.name}` : ""}
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Milestone 1 foundation is live. Resume management, job search, and
          application automation arrive in upcoming milestones.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border/70 bg-background/80 p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Session
          </h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Email</dt>
              <dd>{session?.user?.email ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">User ID</dt>
              <dd className="truncate font-mono text-xs">{session?.user?.id ?? "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-border/70 bg-background/80 p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            API profile
          </h2>
          {userQuery.isLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading from NestJS API…</p>
          ) : null}
          {userQuery.isError ? (
            <p className="mt-4 text-sm text-destructive">Failed to load profile from API.</p>
          ) : null}
          {apiUser ? (
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Email</dt>
                <dd>{apiUser.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Name</dt>
                <dd>{apiUser.name ?? "—"}</dd>
              </div>
            </dl>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-border/70 bg-background/80 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-medium">Queue connectivity</h2>
            <p className="text-sm text-muted-foreground">
              Enqueue a health ping job to verify BullMQ wiring between API and worker.
            </p>
          </div>
          <Button
            disabled={!accessToken || pingMutation.isPending}
            onClick={() => {
              pingMutation.mutate();
            }}
          >
            {pingMutation.isPending ? "Enqueueing…" : "Enqueue health ping"}
          </Button>
        </div>
        {pingMutation.isSuccess ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Job enqueued: {String(pingMutation.data.jobId)} ({pingMutation.data.queue})
          </p>
        ) : null}
        {pingMutation.isError ? (
          <p className="mt-4 text-sm text-destructive">Failed to enqueue health ping.</p>
        ) : null}
      </section>
    </div>
  );
}
