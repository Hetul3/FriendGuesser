# Schema And RLS

This document describes the initial Supabase schema for the room-based multiplayer model and the intended trust boundary for each table.

## Core design

The main privacy decision is:

- `rounds` is client-readable to room members
- exact hidden coordinates do not live in `rounds`
- exact hidden coordinates live in `round_locations`, which is server-only
- public clue geometry lives in `round_clues`, which room members can read once clue access is allowed

This avoids leaking exact coordinates through a broad `select * from rounds`.

## Tables

### `profiles`

Purpose:
- stores lightweight player metadata for anonymous-auth users

Client-readable:
- yes, but only for users who share a room

Client-writable:
- insert/update own profile only

Server-only:
- no special server-only columns

### `rooms`

Purpose:
- top-level multiplayer container
- holds room code and overall room state

Client-readable:
- yes, only for room members

Client-writable:
- no direct writes in v1

Server-only:
- create room
- join by code
- lock/unlock room
- set `current_round_id`

### `room_members`

Purpose:
- tracks which users belong to a room
- preserves membership outside an active round

Client-readable:
- yes, only for members of that room

Client-writable:
- no direct writes in v1

Server-only:
- add/remove members
- manage membership status

### `rounds`

Purpose:
- authoritative round lifecycle and public-safe round state

Client-readable:
- yes, only for room members

Client-writable:
- no direct writes

Server-only:
- create/finalize/abort round
- assign hider
- enforce deadlines
- set winner

### `round_participants`

Purpose:
- snapshot of who was in the round when it started
- role assignment and reconnect logic

Client-readable:
- yes, only for room members of that round's room

Client-writable:
- no direct writes in v1

Server-only:
- participant snapshot creation
- role assignment
- disconnect/reconnect status changes

### `round_clues`

Purpose:
- public-safe clue map geometry

Client-readable:
- yes, but only when clue access is allowed for the round

Client-writable:
- no direct writes

Server-only:
- derive rough clue center/radius from exact hidden location

### `round_locations`

Purpose:
- exact hidden location and accuracy metadata

Client-readable:
- no

Client-writable:
- no

Server-only:
- hider submission finalization
- winner calculation
- optional reveal after round if a separate safe payload is later added

### `round_photos`

Purpose:
- metadata for the two clue photos

Client-readable:
- hider can read their own uploaded rows during submission
- room members can read once clue access is allowed

Client-writable:
- hider can insert their own photo metadata only during the hider submission phase

Server-only:
- any moderation or cleanup flow

### `guesses`

Purpose:
- one seeker guess per round

Client-readable:
- seekers can read their own guess during the round
- room members can read all guesses after completion or abort

Client-writable:
- seeker can insert one guess for their own user during the seeking phase

Server-only:
- score calculation and result finalization

## RLS summary

General rules:

- all tables have RLS enabled
- tables without client policies are effectively server-only
- anonymous-auth users operate under Supabase `authenticated`
- helper SQL functions are used to keep policies readable

Key helper checks:

- `is_room_member(room_id)`
- `shares_room_with_user(user_id)`
- `is_round_hider(round_id)`
- `is_round_seeker(round_id)`
- `can_read_round_clues(round_id)`
- `can_read_round_results(round_id)`

## Important v1 constraints enforced by schema

- one active round per room
- one hider per round
- one guess per seeker per round
- one environment photo and one selfie per round
- room membership and round participation are separate concepts

## Storage note

Photo bytes will live in Supabase Storage, while `round_photos` stores metadata and storage path references. Storage bucket policies still need to be added later and should mirror the same privacy model as `round_photos`.
