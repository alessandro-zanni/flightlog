import { expect, test } from "bun:test";
import { PULL_TRIGGER, pullOffset } from "./pull";

test("pullOffset resists, ignores upward moves and caps", () => {
  expect(pullOffset(-40)).toBe(0);
  expect(pullOffset(50)).toBe(25);
  expect(pullOffset(2 * PULL_TRIGGER)).toBe(PULL_TRIGGER);
  expect(pullOffset(1000)).toBe(96);
});
