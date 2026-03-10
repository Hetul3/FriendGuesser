# Project Context

This file is the persistent handoff note for future sessions.

## What this project is

FriendGuesser is a friends-only mobile-first web app where groups play hide-and-seek style rounds using photo clues and geolocation.

The project is not a public consumer social app. It should stay simple, private, and practical for a small group of friends.

## Platform and stack

- Frontend framework: Next.js
- Language: TypeScript
- Styling: Tailwind CSS
- Hosting: Vercel
- Backend/data: Supabase
- Database: Supabase Postgres
- Storage: Supabase Storage
- Realtime: Supabase Realtime
- Maps: Leaflet

Do not switch the stack without a strong reason.

## Product direction decided so far

The original framing was private games/lobbies. This has been refined into room-based multiplayer:

- anyone with a room code can join a room
- each room is an isolated concurrent session
- multiple rooms can be active at the same time
- the room is the top-level container for players and rounds

Recommended mental model:

- `rooms` are the multiplayer container
- `room_members` are the members of a room
- `rounds` belong to a room
- a room can run one active round at a time in v1

## Core gameplay

1. A player creates a room and receives a short room code.
2. Other players join the room with the code.
3. Players in the room start a round.
4. One player is the hider and the rest are seekers.
5. The hider gets a hide timer.
6. When the timer ends, the hider submits:
   - one environment photo
   - one selfie photo
   - current geolocation
7. Seekers see:
   - the two photos
   - a rough clue area on the map
8. Seekers submit one guess location each.
9. The server computes distances and rankings.

## Non-negotiable constraints

- Optimize for Safari on iPhone and Chrome on mobile.
- Do not assume background camera access.
- Guided capture flow only.
- Service role keys must stay server-side only.
- RLS must be used.
- Exact hidden coordinates must never be readable by seekers before reveal.
- Clients are untrusted for deadlines, roles, and round transitions.

## Main edge cases to design around

- Camera permission denied
- Location permission denied
- Poor GPS accuracy
- Large photo uploads and compression needs
- Slow or failed uploads
- Refresh or reopen mid-round
- Duplicate submissions
- Late submissions after deadline
- Front/back camera inconsistency across browsers
- Mobile network instability
- Realtime ordering issues and stale UI

## Recommended architecture

Use a room-centric model.

Top-level entities:

- `profiles`
- `rooms`
- `room_members`
- `rounds`
- `round_participants`
- `round_clues`
- `round_locations`
- `round_photos`
- `guesses`

Recommended room assumptions for v1:

- one active round per room
- one hider per round
- one or more seekers per round
- room code join flow instead of invite-only identity complexity

## Security boundaries

Client can read:

- room membership they belong to
- safe room state
- current round public state
- clue photos
- rough clue area
- final results after reveal

Client can write:

- join room with valid code
- own player readiness / presence state
- hider photo upload metadata for assigned round
- seeker guess for assigned round

Server-only:

- exact hidden coordinates
- winner calculation
- round finalization
- host-only or privileged transitions
- generating public clue payload from private location

## Implementation priority

1. App foundation and Supabase wiring
2. Schema and RLS
3. Room create/join flow
4. Room lobby and realtime player list
5. Round start flow
6. Hider submission flow
7. Seeker clue and guess flow
8. Finalization and results

## Current repo status

- Official Next.js baseline is in place and deployed on Vercel.
- Anonymous Supabase auth is enabled and being used for guest players.
- Room create/join/start/leave flows are implemented.
- Auto-return to an active room is implemented for joined players.
- Lobby updates use Supabase Realtime plus polling fallback.
- Free-map live location demo is implemented with Leaflet + OpenStreetMap tiles.
- Guided two-step camera demo is implemented in-room.
- Demo photos are uploaded to Supabase Storage, served back via signed URLs, and deleted when the room is closed.
- Initial schema and RLS are present, including room demo photo support.
- Automated workflow tests now cover key room behaviors that are intended to survive future refactors.

## Current testing strategy

- Keep pure workflow decisions in small helpers so they can be tested cheaply and reliably.
- Use automated tests for room lifecycle decisions that should remain stable:
  - room code handling
  - join eligibility
  - start-round eligibility
  - active-room auto-return selection
  - leave-room close/eject behavior
- Use manual real-device testing for browser APIs and mobile behavior:
  - anonymous auth bootstrap
  - realtime propagation
  - camera permissions
  - geolocation permissions
  - uploads

## Recommended next implementation slice

Convert the current map and camera demos into the real hider submission flow:

1. start from the active round role
2. show a hide timer / submission countdown
3. require the hider to capture:
   - environment photo
   - selfie
   - geolocation
4. compress and upload the photos
5. store exact coordinates privately
6. derive seeker-safe clue payloads
7. block late or duplicate submissions server-side

## Guidance for future sessions

- Favor boring, reliable code over clever abstractions.
- Keep server/client boundaries explicit.
- Do not overengineer for scale.
- Build and test in slices that can be validated on a real phone.
