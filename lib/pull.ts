// Pull to refresh in the home-screen web app, where iOS has no native one.
export const PULL_TRIGGER = 56;
const PULL_MAX = 96;

// The indicator moves at half the finger's speed, so a refresh takes a deliberate ~112px pull.
export function pullOffset(dy: number) {
  return Math.min(Math.max(dy, 0) / 2, PULL_MAX);
}
