import { expect, test } from "bun:test";
import { daysBetween, pickLocale } from "./i18n";

test("pickLocale takes the first of it/en the browser prefers", () => {
  expect(pickLocale("it-IT,it;q=0.9,en;q=0.8")).toBe("it");
  expect(pickLocale("de-DE,en;q=0.8,it;q=0.5")).toBe("en");
  expect(pickLocale("fr-FR")).toBe("en");
  expect(pickLocale(null)).toBe("en");
});

test("daysBetween counts calendar days", () => {
  expect(daysBetween("2026-10-29", "2026-11-04")).toBe(6);
  expect(daysBetween("2026-10-29", "2026-10-29")).toBe(0);
});
