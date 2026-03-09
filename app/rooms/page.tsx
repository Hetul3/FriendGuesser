import Link from "next/link";

export default function RoomsPage() {
  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-4 py-6 text-[var(--ink)]">
      <div className="mx-auto max-w-md rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
        <p className="text-sm font-semibold text-[var(--brand-strong)]">Rooms</p>
        <h1 className="mt-2 text-2xl font-semibold">Create or join from home</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Room entry now lives on the landing page so the anonymous player setup
          and room flow start in one place.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--brand)] px-4 text-sm font-semibold text-white"
        >
          Go to room entry
        </Link>
      </div>
    </main>
  );
}
