"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState } from "react";
import { signIn } from "@/lib/auth/actions";
import { initialAuthActionState } from "@/lib/auth/types";

function LinkError() {
  const linkError = useSearchParams().get("error");
  if (!linkError) return null;
  return <p className="mt-2 text-sm text-red-400">{linkError}</p>;
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, initialAuthActionState);

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-landing-bg px-4">
      {/* Salon atmosphere photo — same background-layer treatment as the
          landing hero (components/landing/hero.tsx): CSS background-image
          on absolutely-positioned divs, never part of document flow, never
          above the content. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-30 hidden bg-[url('/images/login.png')] bg-cover bg-[position:62%_center] sm:block"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-30 block bg-[url('/images/login.png')] bg-cover bg-[position:60%_center] sm:hidden"
      />

      {/* Dark overlay — darkest through the center where the card sits,
          easing off toward the edges on desktop/tablet so the salon
          imagery still reads there. Mobile stays heavily darkened
          edge-to-edge since the card spans nearly the full width. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 hidden bg-[radial-gradient(ellipse_75%_85%_at_center,rgba(6,4,3,0.95)_0%,rgba(6,4,3,0.9)_35%,rgba(7,5,4,0.75)_58%,rgba(8,6,5,0.4)_80%,rgba(8,6,5,0.14)_100%)] sm:block"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-20 block bg-[linear-gradient(180deg,rgba(6,4,3,0.94)_0%,rgba(6,4,3,0.97)_55%,rgba(6,4,3,0.985)_100%)] sm:hidden"
      />

      <div className="w-full max-w-sm rounded-2xl border border-landing-border bg-landing-surface/90 p-8 shadow-2xl backdrop-blur-sm">
        <h1 className="text-xl font-semibold text-landing-ink">Log in to Piccos</h1>

        <Suspense fallback={null}>
          <LinkError />
        </Suspense>

        <form action={formAction} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm text-landing-ink-secondary">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded-lg border border-landing-border-strong bg-landing-bg-alt px-3 py-2 text-sm text-landing-ink placeholder:text-landing-muted focus:border-landing-accent focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm text-landing-ink-secondary">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="rounded-lg border border-landing-border-strong bg-landing-bg-alt px-3 py-2 text-sm text-landing-ink placeholder:text-landing-muted focus:border-landing-accent focus:outline-none"
            />
          </div>

          {state.error && <p className="text-sm text-red-400">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-landing-ink px-3 py-2 text-sm font-medium text-landing-bg transition-colors hover:bg-landing-accent-strong disabled:opacity-50"
          >
            {pending ? "Logging in…" : "Log in"}
          </button>
        </form>

        <div className="mt-4 flex justify-between text-sm">
          <Link href="/signup" className="text-landing-ink-secondary hover:text-landing-accent">
            Create account
          </Link>
          <Link href="/forgot-password" className="text-landing-ink-secondary hover:text-landing-accent">
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
}
