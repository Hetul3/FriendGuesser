import test from "node:test";
import assert from "node:assert/strict";

import {
  ROOM_CODE_LENGTH,
  generateRoomCode,
  isValidRoomCode,
  sanitizeRoomCode,
} from "@/lib/rooms/code";

test("sanitizeRoomCode uppercases and removes invalid characters", () => {
  assert.equal(sanitizeRoomCode("ab-c 23!"), "ABC23");
});

test("generateRoomCode returns a valid 6-character code", () => {
  const code = generateRoomCode();

  assert.equal(code.length, ROOM_CODE_LENGTH);
  assert.equal(isValidRoomCode(code), true);
});

test("generated room codes avoid ambiguous characters", () => {
  const samples = Array.from({ length: 200 }, () => generateRoomCode());

  for (const code of samples) {
    assert.equal(/[01IO]/.test(code), false);
  }
});
