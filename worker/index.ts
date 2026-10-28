// Cloudflare Email Worker for flights@alessandrozanni.dev: parses the mail and posts it to
// the app's /api/inbound. Failures bounce back to the sender, so no mail is silently lost.
import PostalMime from "postal-mime";

type Env = { INBOUND_URL: string; INBOUND_SECRET: string; ALLOWED_FROM: string; FORWARD_TO: string };

// Gmail auto-forwarding sends as user+caf_=...@gmail.com: compare without the +tag.
export const baseAddress = (address: string) => address.toLowerCase().replace(/\+[^@]*@/, "@");

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
