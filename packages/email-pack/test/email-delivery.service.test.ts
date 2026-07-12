import assert from "node:assert/strict";
import test from "node:test";
import { EmailDeliveryService } from "../src/modules/email/services/email-delivery.service.js";
import type { EmailConfigService } from "../src/modules/email/services/email-config.service.js";

test("console email delivery emits JSON logs with flow tokens redacted", async () => {
  const token = "sensitive-flow-token-that-must-never-reach-logs";
  const lines: string[] = [];
  const originalInfo = console.info;
  console.info = (...args: unknown[]) => lines.push(args.map(String).join(" "));

  try {
    const service = new EmailDeliveryService({
      async readConfig() {
        return {
          provider: "console" as const,
          fromAddress: "no-reply@example.test",
          fromName: "Trinacria CMS"
        };
      }
    } as EmailConfigService);

    await service.send({
      to: "operator@example.test",
      subject: "Reset password",
      text: `Reset: https://cms.example.test/reset-password?token=${token}&locale=it`,
      html: `<a href="https://cms.example.test/reset-password?token=${token}">Reset</a>`
    });
  } finally {
    console.info = originalInfo;
  }

  assert.equal(lines.length, 1);
  const entry = JSON.parse(lines[0] ?? "") as Record<string, unknown>;
  assert.equal(entry.event, "outbound_email");
  assert.match(String(entry.text), /token=\[REDACTED\]/);
  assert.match(String(entry.html), /token=\[REDACTED\]/);
  assert.doesNotMatch(lines[0] ?? "", new RegExp(token));
});
