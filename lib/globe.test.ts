import { expect, test } from "bun:test";
import { viewOf } from "./globe";

const BLQ = { lat: 44.5354, lon: 11.2887 };
const BCN = { lat: 41.2971, lon: 2.0785 };
const TFS = { lat: 28.0445, lon: -16.5725 };

test("one airport sits under the camera at the closest altitude", () => {
  const view = viewOf([BLQ]);
  expect(view.lat).toBeCloseTo(BLQ.lat);
  expect(view.lng).toBeCloseTo(BLQ.lon);
  expect(view.altitude).toBeCloseTo(0.9);
});

test("a route is framed from its midpoint, higher for longer routes", () => {
  const short = viewOf([BLQ, BCN]);
  expect(short.lng).toBeGreaterThan(BCN.lon);
  expect(short.lng).toBeLessThan(BLQ.lon);
  expect(viewOf([BLQ, TFS]).altitude).toBeGreaterThan(short.altitude);
});

test("antipodal airports fall back to the first one, at the farthest altitude", () => {
  const view = viewOf([{ lat: 10, lon: 20 }, { lat: -10, lon: -160 }]);
  expect(view).toEqual({ lat: 10, lng: 20, altitude: 2.5 });
});
