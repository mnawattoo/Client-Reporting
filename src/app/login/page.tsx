import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary text-white font-bold">
            R
          </div>
          <h1 className="text-xl font-semibold text-ink-primary">Sign in to Reportly</h1>
          <p className="mt-1 text-sm text-ink-muted">Client reporting for marketing agencies</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
