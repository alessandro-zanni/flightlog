// Cloudflare Email Worker for flights@alessandrozanni.dev: parses the mail and posts it to
// the app's /api/inbound. Failures bounce back to the sender, so no mail is silently lost.
import PostalMime from "postal-mime";

type Env = { INBOUND_URL: string; INBOUND_SECRET: string; ALLOWED_FROM: string; FORWARD_TO: string };

// Gmail auto-forwarding sends as user+caf_=...@gmail.com: compare without the +tag.
export const baseAddress = (address: string) => address.toLowerCase().replace(/\+[^@]*@/, "@");

// Cloudflare only drops mail failing both SPF and DKIM, and a DKIM pass on any domain is enough:
// a forged envelope sender signed by the attacker's own domain gets through. Require SPF to pass
// for the envelope sender itself, as stamped by Cloudflare. Its header is the topmost one; any
// Authentication-Results further down came with the mail and can be forged.
export const spfPass = (headers: { key: string; value: string }[], from: string) => {
  const results = headers.find((h) => h.key === "authentication-results")?.value ?? "";
  if (!/^\s*mx\.cloudflare\.net\s*;/.test(results)) return false;
  return results.split(";").some((result) => {
    const match = /^\s*spf=pass\b.*\bsmtp\.mailfrom="?([^\s";]+)/.exec(result);
    return match !== null && baseAddress(match[1]) === baseAddress(from);
  });
};

export default {
  async email(message: ForwardableEmailMessage, env: Env) {
    // Gmail's "confirm forwarding" code has to reach a human.
    if (message.from === "forwarding-noreply@google.com") {
      await message.forward(env.FORWARD_TO);
      return;
    }

    const allowed = env.ALLOWED_FROM.split(",").map((a) => a.trim().toLowerCase());
    if (!allowed.includes(baseAddress(message.from))) return message.setReject("Sender not allowed");

    const mail = await PostalMime.parse(message.raw);
    if (!spfPass(mail.headers, message.from)) return message.setReject("Sender not authenticated");

    const response = await fetch(env.INBOUND_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${env.INBOUND_SECRET}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: mail.from?.address ?? message.from,
        subject: mail.subject ?? "",
        date: mail.date,
        text: mail.text,
        html: mail.html,
      }),
    });
    if (!response.ok) return message.setReject(`flightlog import failed (${response.status})`);
    const { extracted } = (await response.json()) as { extracted: number };
    if (extracted === 0) message.setReject("flightlog found no flights in this email");
  },
} satisfies ExportedHandler<Env>;
