import Link from "next/link";

import { appConfig } from "@/lib/config/app";

const pillars = [
  "Join a private room with a short code",
  "Run one active round per room for reliable realtime state",
  "Keep exact hidden coordinates private until the round is finalized",
];

const buildOrder = [
  "Anonymous player identity and room join flow",
  "Room lobby with live player list and round lock state",
  "Hider capture flow with photo upload and geolocation validation",
  "Seeker clue map, guess submission, and server-side winner calculation",
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] text-[var(--ink)]">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-md flex-col gap-4">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] backdrop-blur">
          <div className="bg-[var(--brand)] px-5 py-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/72">
              Friends-only v1
            </p>
            <h1 className="mt-2 text-3xl font-semibold">{appConfig.name}</h1>
            <p className="mt-3 text-sm leading-6 text-white/84">
              Mobile-first hide-and-seek with live rooms, clue photos, and
              private location reveal.
            </p>
          </div>

          <div className="space-y-5 px-5 py-5">
            <div className="rounded-[1.5rem] bg-white/75 p-4">
              <p className="text-sm font-semibold text-[var(--brand-strong)]">
                Current build focus
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                The infrastructure is ready to wire: Supabase-backed rooms,
                anonymous player identity, and server-authoritative round
                control.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold">Architecture guardrails</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--muted)]">
                {pillars.map((pillar) => (
                  <li
                    key={pillar}
                    className="rounded-2xl border border-[var(--line)] bg-white/55 px-3 py-2"
                  >
                    {pillar}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-sm font-semibold">Next implementation slice</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--muted)]">
                {buildOrder.map((item, index) => (
                  <li
                    key={item}
                    className="rounded-2xl border border-dashed border-[var(--line)] px-3 py-2"
                  >
                    <span className="mr-2 font-semibold text-[var(--brand)]">
                      {index + 1}.
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/rooms"
                className="flex min-h-14 items-center justify-center rounded-2xl bg-[var(--brand)] px-4 text-center text-sm font-semibold text-white active:scale-[0.99]"
              >
                Room flow next
              </Link>
              <Link
                href="/docs"
                className="flex min-h-14 items-center justify-center rounded-2xl border border-[var(--line)] bg-white/75 px-4 text-center text-sm font-semibold text-[var(--ink)] active:scale-[0.99]"
              >
                Project context
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
