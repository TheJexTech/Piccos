import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-center dark:bg-black">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
          Check your email
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          We sent a confirmation link to the address you signed up with.
          Click it to activate your account.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm text-zinc-500 hover:underline dark:text-zinc-400"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
