import { RoomEntryCard } from "@/components/home/room-entry-card";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] text-[var(--ink)]">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-md flex-col gap-4">
        <RoomEntryCard />
      </div>
    </main>
  );
}
