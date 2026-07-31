"use client";

import { Button } from "@autoapply/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useState } from "react";

import { fetchLinkedInSessionStatus, upsertLinkedInSession } from "@/lib/api";

export function SettingsPanel() {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;
  const queryClient = useQueryClient();
  const [storageStateJson, setStorageStateJson] = useState("");

  const statusQuery = useQuery({
    queryKey: ["linkedin-session", accessToken],
    queryFn: () => fetchLinkedInSessionStatus(accessToken ?? ""),
    enabled: Boolean(accessToken),
  });

  const saveMutation = useMutation({
    mutationFn: () => upsertLinkedInSession(accessToken ?? "", storageStateJson),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["linkedin-session", accessToken] });
      setStorageStateJson("");
    },
  });

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">
          Paste a Playwright <code className="text-sm">storageState</code> JSON export for LinkedIn.
          Use a browser extension or Playwright script to capture cookies — interactive login is not
          automated in this milestone.
        </p>
      </section>

      <section className="rounded-lg border border-border/70 bg-background/80 p-5 space-y-4">
        <div>
          <h2 className="font-medium">LinkedIn session</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Status:{" "}
            {statusQuery.data?.configured
              ? `configured (${statusQuery.data.updatedAt ? new Date(statusQuery.data.updatedAt).toLocaleString() : "recent"})`
              : "not configured"}
          </p>
        </div>
        <textarea
          className="min-h-40 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
          placeholder='{"cookies":[...],"origins":[]}'
          value={storageStateJson}
          onChange={(event) => setStorageStateJson(event.target.value)}
        />
        <Button
          disabled={!storageStateJson.trim() || saveMutation.isPending || !accessToken}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? "Saving…" : "Save LinkedIn cookies"}
        </Button>
        {saveMutation.isError ? (
          <p className="text-sm text-destructive">
            {saveMutation.error instanceof Error
              ? saveMutation.error.message
              : "Failed to save session."}
          </p>
        ) : null}
        {saveMutation.isSuccess ? (
          <p className="text-sm text-muted-foreground">LinkedIn session saved.</p>
        ) : null}
      </section>
    </div>
  );
}
