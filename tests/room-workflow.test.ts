import test from "node:test";
import assert from "node:assert/strict";

import {
  decideJoinRoom,
  decideLeaveRoom,
  decideStartRound,
  selectAutoReturnRoomCode,
} from "@/lib/rooms/workflow";

test("joined players can re-enter a locked room, but new players cannot", () => {
  assert.deepEqual(
    decideJoinRoom({
      roomStatus: "in_round",
      isExistingMember: true,
    }),
    { allowed: true },
  );

  assert.deepEqual(
    decideJoinRoom({
      roomStatus: "in_round",
      isExistingMember: false,
    }),
    { allowed: false, reason: "room_locked" },
  );
});

test("round start requires membership, an open room, and at least two players", () => {
  assert.deepEqual(
    decideStartRound({
      roomStatus: "open",
      joinedMembersCount: 2,
      actorIsMember: true,
    }),
    { allowed: true },
  );

  assert.deepEqual(
    decideStartRound({
      roomStatus: "open",
      joinedMembersCount: 1,
      actorIsMember: true,
    }),
    { allowed: false, reason: "not_enough_players" },
  );

  assert.deepEqual(
    decideStartRound({
      roomStatus: "in_round",
      joinedMembersCount: 3,
      actorIsMember: true,
    }),
    { allowed: false, reason: "room_not_open" },
  );

  assert.deepEqual(
    decideStartRound({
      roomStatus: "open",
      joinedMembersCount: 3,
      actorIsMember: false,
    }),
    { allowed: false, reason: "not_a_member" },
  );
});

test("auto-return prefers the most recently updated in-round room", () => {
  const code = selectAutoReturnRoomCode([
    {
      code: "AAAA22",
      status: "open",
      updatedAt: "2026-03-10T08:00:00.000Z",
    },
    {
      code: "BBBB33",
      status: "in_round",
      updatedAt: "2026-03-10T08:01:00.000Z",
    },
    {
      code: "CCCC44",
      status: "in_round",
      updatedAt: "2026-03-10T08:05:00.000Z",
    },
  ]);

  assert.equal(code, "CCCC44");
  assert.equal(selectAutoReturnRoomCode([]), null);
});

test("leave room closes and deletes an open room, but blocks active rounds", () => {
  assert.deepEqual(decideLeaveRoom({ roomStatus: "open" }), {
    allowed: true,
    closeRoom: true,
    ejectAllMembers: true,
    deleteRoomData: true,
  });

  assert.deepEqual(decideLeaveRoom({ roomStatus: "closed" }), {
    allowed: true,
    closeRoom: true,
    ejectAllMembers: true,
    deleteRoomData: true,
  });

  assert.deepEqual(decideLeaveRoom({ roomStatus: "in_round" }), {
    allowed: false,
    reason: "active_round",
  });
});
