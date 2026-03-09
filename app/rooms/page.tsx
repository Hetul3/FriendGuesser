export default function RoomsPage() {
  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-4 py-6 text-[var(--ink)]">
      <div className="mx-auto max-w-md rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
        <p className="text-sm font-semibold text-[var(--brand-strong)]">
          Next up
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Create or join a room</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          This route is reserved for anonymous player bootstrap, room code
          creation, join flow, and room locking once a round starts.
        </p>
      </div>
    </main>
  );
}
