# FriendGuesser

FriendGuesser is a mobile-first PWA for friends-only hide-and-seek / GeoGuessr-style rounds.

Players join a room with a short code. Each room runs its own game session independently, so multiple groups can play at the same time. In each round, one player is the hider and the others are seekers. The hider submits:

- one environment photo
- one selfie photo
- their current geolocation

Seekers see only the clue photos and a rough map clue. The exact hidden coordinates remain private until results are finalized server-side.

## Product goals

- Ship a working v1 quickly
- Optimize for iPhone Safari and mobile Chrome
- Keep the architecture simple enough for one person to maintain
- Use Supabase as the main backend and Next.js server routes for privileged logic

## Stack

- Next.js
- TypeScript
- Tailwind CSS
- Supabase Postgres
- Supabase Storage
- Supabase Realtime
- Leaflet
- Vercel

## Core constraints

- Mobile web first, not native
- No background photo capture assumptions
- Guided two-step camera flow: environment photo, then selfie
- Deadlines and round validity must be enforced server-side
- Exact hider coordinates must never be exposed to seekers before reveal
- Clients are untrusted

## Current status

- Official `create-next-app` baseline is set up and deployed on Vercel
- Room-based architecture is the intended multiplayer model
- Next implementation slice: app foundation, Supabase setup, schema, and RLS

## Immediate next steps

1. Replace the starter UI with a mobile-first landing page.
2. Add Supabase environment handling and client utilities.
3. Design the initial schema for rooms, players, rounds, photos, and guesses.
4. Add RLS and server routes for privileged room and round actions.
