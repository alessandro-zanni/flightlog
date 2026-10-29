import { expect, test } from "bun:test";
import PostalMime from "postal-mime";
import { baseAddress, spfPass } from "./index";

test("baseAddress strips Gmail forwarding tags", () => {
  expect(baseAddress("Me+caf_=flights=example.com@gmail.com")).toBe("me@gmail.com");
});

const sender = "me+caf_=flights=example.com@gmail.com";
const headersOf = async (...lines: string[]) =>
  (await PostalMime.parse([...lines, "From: x@ryanair.com", "Subject: x", "", "body"].join("\r\n"))).headers;
// Shape of the header Cloudflare stamps on incoming mail (copied from a real one).
const cloudflare = (spf: string, mailfrom: string) =>
  `Authentication-Results: mx.cloudflare.net;\r\n\tdkim=pass header.d=ryanair.com header.s=s1;\r\n\tspf=none (mx.cloudflare.net: no SPF records found) smtp.helo=mail.google.com;\r\n\tspf=${spf} (mx.cloudflare.net: domain of ${mailfrom} designates 2a00::1 as permitted sender) smtp.mailfrom=${mailfrom};\r\n\tarc=none`;

test("spfPass accepts SPF pass for the envelope sender", async () => {
  expect(spfPass(await headersOf(cloudflare("pass", sender)), sender)).toBe(true);
});

test("spfPass rejects failed SPF, another sender and missing results", async () => {
  expect(spfPass(await headersOf(cloudflare("softfail", sender)), sender)).toBe(false);
  expect(spfPass(await headersOf(cloudflare("pass", "attacker@evil.com")), sender)).toBe(false);
  expect(spfPass(await headersOf(), sender)).toBe(false);
});

test("spfPass ignores forged results below Cloudflare's", async () => {
  const forged = cloudflare("pass", sender);
  expect(spfPass(await headersOf(cloudflare("fail", sender), forged), sender)).toBe(false);
});
