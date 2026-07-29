"use client";

import { Button } from "@autoapply/ui";
import type { ResumeDto, ResumeStatus } from "@autoapply/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRef, useState } from "react";

import { fetchResumes, uploadResume } from "@/lib/api";

function statusLabel(status: ResumeStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "processing":
      return "Processing";
    case "parsed":
      return "Parsed";
    case "failed":
      return "Failed";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function statusClassName(status: ResumeStatus): string {
  switch (status) {
    case "pending":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
    case "processing":
      return "bg-sky-500/15 text-sky-700 dark:text-sky-300";
    case "parsed":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "failed":
      return "bg-destructive/15 text-destructive";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function isInProgress(status: ResumeStatus): boolean {
  return status === "pending" || status === "processing";
}

function ResumeCard({ resume }: { resume: ResumeDto }) {
  return (
    <article className="rounded-lg border border-border/70 bg-background/80 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{resume.fileName}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Uploaded {new Date(resume.createdAt).toLocaleString()}
          </p>
        </div>
        <span
          className={`rounded-md px-2 py-1 text-xs font-medium ${statusClassName(resume.status)}`}
        >
          {statusLabel(resume.status)}
        </span>
      </div>

      {resume.summary ? (
        <p className="mt-4 text-sm text-muted-foreground">{resume.summary}</p>
      ) : null}

      {resume.skills.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {resume.skills.map((skill) => (
            <li
              key={skill}
              className="rounded-md border border-border/60 px-2 py-1 text-xs"
            >
              {skill}
            </li>
          ))}
        </ul>
      ) : null}

      {resume.errorMessage ? (
        <p className="mt-4 text-sm text-destructive">{resume.errorMessage}</p>
      ) : null}
    </article>
  );
}

export function ResumesPanel() {
  const { data: session, status: sessionStatus } = useSession();
  const accessToken = session?.accessToken;
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const resumesQuery = useQuery({
    queryKey: ["resumes", accessToken],
    queryFn: () => fetchResumes(accessToken ?? ""),
    enabled: Boolean(accessToken),
    refetchInterval: (query) => {
      const resumes = query.state.data?.resumes ?? [];
      return resumes.some((resume) => isInProgress(resume.status)) ? 2000 : false;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadResume(accessToken ?? "", file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["resumes", accessToken] });
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
  });

  const resumes = resumesQuery.data?.resumes ?? [];
  const canUpload =
    Boolean(selectedFile) &&
    !uploadMutation.isPending &&
    sessionStatus !== "loading";

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="font-display text-2xl font-semibold">Resumes</h1>
        <p className="text-muted-foreground">
          Upload a PDF or DOCX resume. Parsing runs in the background and extracted
          skills appear when ready.
        </p>
      </section>

      <section className="rounded-lg border border-border/70 bg-background/80 p-5">
        <h2 className="font-medium">Upload resume</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Supported formats: PDF, DOCX. Maximum size: 5MB.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="text-sm"
            onChange={(event) => {
              setSelectedFile(event.target.files?.[0] ?? null);
            }}
          />
          <Button
            disabled={!canUpload}
            onClick={() => {
              if (!accessToken) {
                return;
              }

              const file = fileInputRef.current?.files?.[0] ?? selectedFile;
              if (file) {
                uploadMutation.mutate(file);
              }
            }}
          >
            {uploadMutation.isPending ? "Uploading…" : "Upload"}
          </Button>
        </div>
        {sessionStatus === "authenticated" && !accessToken ? (
          <p className="mt-4 text-sm text-destructive">
            Your session is missing an API token. Sign out and sign in again, then retry.
          </p>
        ) : null}
        {uploadMutation.isSuccess ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Upload queued for parsing (job {String(uploadMutation.data.jobId)}).
          </p>
        ) : null}
        {uploadMutation.isError ? (
          <p className="mt-4 text-sm text-destructive">
            {uploadMutation.error instanceof Error
              ? uploadMutation.error.message
              : "Upload failed."}
          </p>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">Your resumes</h2>
        {resumesQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading resumes…</p>
        ) : null}
        {resumesQuery.isError ? (
          <p className="text-sm text-destructive">Failed to load resumes.</p>
        ) : null}
        {!resumesQuery.isLoading && resumes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No resumes uploaded yet.</p>
        ) : null}
        {resumes.map((resume) => (
          <ResumeCard key={resume.id} resume={resume} />
        ))}
      </section>
    </div>
  );
}
