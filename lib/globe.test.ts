import { expect, test } from "bun:test";
import { greatCircle } from "./globe";

const BLQ = { lat: 44.5354, lon: 11.2887 };
const BCN = { lat: 41.2971, lon: 2.0785 };

test("a route runs from origin to destination", () => {
  const line = greatCircle(BLQ, BCN, 8);
  expect(line).toHaveLength(9);
  expect(line[0][0]).toBeCloseTo(BLQ.lon);
  expect(line[0][1]).toBeCloseTo(BLQ.lat);
  expect(line[8][0]).toBeCloseTo(BCN.lon);
  expect(line[8][1]).toBeCloseTo(BCN.lat);
});

test("a great circle bows toward the pole, unlike the mercator straight line", () => {
  const mid = greatCircle({ lat: 40, lon: -70 }, { lat: 40, lon: 10 }, 2)[1];
  expect(mid[1]).toBeGreaterThan(40);
});

test("crossing the antimeridian keeps longitudes continuous", () => {
  const line = greatCircle({ lat: 35, lon: 170 }, { lat: 35, lon: -170 }, 8);
  for (let i = 1; i < line.length; i++) expect(Math.abs(line[i][0] - line[i - 1][0])).toBeLessThan(10);
  expect(line.at(-1)![0]).toBeCloseTo(190);
});
