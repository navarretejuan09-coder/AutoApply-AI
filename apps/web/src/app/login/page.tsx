import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-8 space-y-2 text-center">
        <p className="font-display text-3xl font-semibold tracking-tight">AutoApply AI</p>
        <p className="text-sm text-muted-foreground">
          Sign in to manage resumes, job search, and applications.
        </p>
      </div>

      <div className="rounded-lg border border-border/70 bg-background/80 p-6 shadow-sm backdrop-blur">
        <LoginForm />
      </div>
    </main>
  );
}
