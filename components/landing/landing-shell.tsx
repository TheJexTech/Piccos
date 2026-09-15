import Link from "next/link";

// Shared editorial-scale primitives for the marketing site — same brand
// tokens as the product (app/globals.css), deliberately more spacious
// than the compact in-app density.

export function Container({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto max-w-7xl px-6 sm:px-8 lg:px-10 ${className}`}>{children}</div>;
}

export function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-landing-accent">{children}</p>
  );
}

export function SectionHeading({
  kicker,
  title,
  description,
  align = "left",
  className = "",
}: {
  kicker?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={`${align === "center" ? "mx-auto text-center" : "text-left"} max-w-2xl ${className}`}>
      {kicker && <Kicker>{kicker}</Kicker>}
      <h2 className="mt-3 text-4xl font-semibold tracking-tight text-landing-ink sm:text-5xl">{title}</h2>
      {description && <p className="mt-4 text-lg leading-relaxed text-landing-ink-secondary">{description}</p>}
    </div>
  );
}

export function PrimaryCta({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-full bg-landing-ink px-7 py-3.5 text-base font-medium text-landing-bg transition-colors hover:bg-landing-accent-strong ${className}`}
    >
      {children}
    </Link>
  );
}

export function SecondaryCta({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-full border border-landing-border-strong px-7 py-3.5 text-base font-medium text-landing-ink transition-colors hover:border-landing-accent hover:text-landing-accent ${className}`}
    >
      {children}
    </Link>
  );
}
