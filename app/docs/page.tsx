export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-4 py-6 text-[var(--ink)]">
      <div className="mx-auto max-w-md rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
        <p className="text-sm font-semibold text-[var(--brand-strong)]">
          Project context
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Room-based multiplayer</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          The durable project notes live in <code>docs/PROJECT_CONTEXT.md</code>.
          This route exists as a quick in-app pointer while the gameplay flows
          are still being built.
        </p>
      </div>
    </main>
  );
}
