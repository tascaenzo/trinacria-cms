import assert from "node:assert/strict";
import test from "node:test";
import { createUserOperationContext, createPluginOperationContext, operationForbidden } from "@trinacria-cms/kernel/runtime";
import { createEmailDeliveryOperations, createEmailTemplateOperations } from "../src/operations/email-operations.js";
const user = createUserOperationContext("user");
test("email internal calls cannot bypass send or template-write permissions", async () => {
  let effects = 0;
  const denied = { assert: async () => { throw operationForbidden(); } };
  const delivery = createEmailDeliveryOperations({ send: async () => { effects++; } } as never, denied);
  await assert.rejects(delivery.send(createPluginOperationContext("consumer"), { to: "a@example.com", subject: "hello", text: "body" }));
  const templates = createEmailTemplateOperations({ upsertTemplate: async () => { effects++; } } as never, denied);
  await assert.rejects(templates.upsertTemplate(user, {} as never)); assert.equal(effects, 0);
});
test("email validates recipient, size and header limits before invoking the provider", async () => {
  let effects = 0;
  const delivery = createEmailDeliveryOperations({ send: async () => { effects++; } } as never, { assert: async () => {} });
  const input = { to: "a@example.com", subject: "hello", text: "body" };
  for (const bad of [{ ...input, to: "a@example.com\r\nBcc: b@example.com" }, { ...input, to: Array(101).fill("a@example.com") }, { ...input, subject: "hello\nBcc:" }, { ...input, text: "a".repeat(1024 * 1024 + 1) }, { ...input, replyTo: "a\nb" }])
    await assert.rejects(delivery.send(user, bad), (error: unknown) => (error as { code: string }).code === "validation_error");
  assert.equal(effects, 0);
  await delivery.send(user, input); assert.equal(effects, 1);
});
