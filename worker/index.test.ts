import { expect, test } from "bun:test";
import { baseAddress } from "./index";

test("baseAddress strips Gmail forwarding tags", () => {
  expect(baseAddress("Me+caf_=flights=example.com@gmail.com")).toBe("me@gmail.com");
});
