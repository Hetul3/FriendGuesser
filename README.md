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

- Anonymous Supabase auth is working for guest players
- Room create, join, auto-return, start round, and destructive leave-room flows are implemented
- Room pages update with realtime plus polling fallback
- Free-map live location demo is implemented with Leaflet + OpenStreetMap
- Guided two-step camera demo works in-room
- Demo photos can be uploaded to Supabase Storage, viewed again from signed URLs, and deleted when the room closes
- Schema, RLS, and initial server routes are in place for the room-based architecture
- Workflow tests exist for the room code, join/start/leave decisions, and auto-return selection
- The UI direction is documented and should stay aligned with an outdoor, natural, friends-playing-outside feel

## Immediate next steps

1. Convert the camera + location demos into the actual hider submission flow.
2. Add image compression/resizing before upload.
3. Enforce round deadlines and hider-only submission server-side.
4. Build the seeker clue map, guess submission, and result ranking flow.
