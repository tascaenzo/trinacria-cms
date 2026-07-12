import { expect, request as apiRequest, test, type Page } from "@playwright/test";
import { createHash, createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  E2E_ADMIN,
  E2E_API_URL,
  E2E_APP_URL,
  E2E_BACKEND_LOG_PATH,
  E2E_DEGRADED_API_URL,
  E2E_DOWN_API_URL,
  E2E_OBSERVABILITY_TOKEN,
  E2E_PLUGIN_AUTH_SECRET
} from "./e2e-env.js";
import { smokeBackupAndRestoreE2eDatabase } from "./mongo-lifecycle.js";
import { extractFlowToken, readLatestSecureEmail } from "./secure-email-reader.js";

const VERIFIED_USER = {
  email: "verified.e2e@trinacria.local",
  firstName: "Verified",
  lastName: "Operator",
  initialPassword: "Verified-E2E-Password-2026!",
  resetPassword: "Verified-E2E-Password-Reset-2026!"
} as const;

const INVITED_USER = {
  email: "invited.e2e@trinacria.local",
  firstName: "Invited",
  lastName: "Operator",
  password: "Invited-E2E-Password-2026!"
} as const;

test.describe.serial("production readiness baseline", () => {
  test("reports an uninstalled but database-ready CMS", async ({ request }) => {
    const response = await request.get("/cms/v1/install/status");

    expect(response.status()).toBe(200);
    expect(response.headers()["x-request-id"]).toBeTruthy();
    await expect(response.json()).resolves.toMatchObject({
      data: {
        installed: false,
        envFilePresent: true,
        dbConfigured: true
      }
    });
  });

  test("installs the CMS and reaches the authenticated backoffice", async ({ page }) => {
    await page.goto("/");

    await page.locator('input[name="siteName"]').fill("Trinacria E2E");
    await page.locator('input[name="siteTagline"]').fill("Production readiness baseline");
    await page.getByRole("button", { name: "Continue" }).click();

    await page.locator('input[name="firstName"]').fill(E2E_ADMIN.firstName);
    await page.locator('input[name="lastName"]').fill(E2E_ADMIN.lastName);
    await page.locator('input[name="email"]').fill(E2E_ADMIN.email);
    await page.locator('input[name="password"]').fill(E2E_ADMIN.password);
    await page.locator('input[name="confirmPassword"]').fill(E2E_ADMIN.password);
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText(E2E_ADMIN.email)).toBeVisible();
    await page.getByRole("button", { name: "Initialise CMS" }).dispatchEvent("click");

    await expect(page.getByText(`${E2E_ADMIN.firstName} ${E2E_ADMIN.lastName}`)).toBeVisible();
    await expect(page.getByText("Runtime health").first()).toBeVisible();
  });

  test("returns the bearer access token without exposing the refresh token", async () => {
    const client = await apiRequest.newContext({
      baseURL: E2E_API_URL,
      extraHTTPHeaders: { Origin: E2E_APP_URL }
    });

    try {
      const response = await client.post("/v1/auth/login", {
        data: {
          email: E2E_ADMIN.email,
          password: E2E_ADMIN.password
        }
      });
      const body = await response.json();

      expect(response.status()).toBe(200);
      expect(response.headers()["set-cookie"]).toContain("cms_access_token=");
      expect(body.data.accessToken).toMatch(/^eyJ/);
      expect(body.data).not.toHaveProperty("refreshToken");
      expect(JSON.stringify(body)).not.toContain(E2E_ADMIN.password);
    } finally {
      await client.dispose();
    }
  });

  test("handles invalid login, restores the session and revokes it on sign out", async ({
    page
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Login to your account" })).toBeVisible();

    await page.locator('input[name="email"]').fill(E2E_ADMIN.email);
    await page.locator('input[name="password"]').fill("wrong-password");
    await page.locator('button[type="submit"]').click();
    await expect(page.getByRole("alert")).toBeVisible();

    await page.locator('input[name="password"]').fill(E2E_ADMIN.password);
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(`${E2E_ADMIN.firstName} ${E2E_ADMIN.lastName}`)).toBeVisible();

    await page.reload();
    await expect(page.getByText(`${E2E_ADMIN.firstName} ${E2E_ADMIN.lastName}`)).toBeVisible();

    await page.getByRole("button", { name: new RegExp(E2E_ADMIN.firstName) }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page.getByRole("heading", { name: "Login to your account" })).toBeVisible();

    const meResponse = await page.request.get("/cms/v1/auth/me");
    expect(meResponse.status()).toBe(401);
  });

  test("rejects cookie-authenticated mutations from an untrusted origin", async () => {
    const loginClient = await apiRequest.newContext({
      baseURL: E2E_API_URL,
      extraHTTPHeaders: { Origin: E2E_APP_URL }
    });

    try {
      const loginResponse = await loginClient.post("/v1/auth/login", {
        data: {
          email: E2E_ADMIN.email,
          password: E2E_ADMIN.password
        }
      });
      expect(loginResponse.status()).toBe(200);
      const cookie = extractCookieHeader(await loginResponse.headersArray());
      const hostileClient = await apiRequest.newContext({
        baseURL: E2E_API_URL,
        extraHTTPHeaders: {
          Cookie: cookie,
          Origin: "https://untrusted.example"
        }
      });

      try {
        const response = await hostileClient.post("/v1/auth/logout");
        expect(response.status()).toBe(403);
        await expect(response.json()).resolves.toMatchObject({
          error: { code: "csrf_origin_rejected" }
        });
      } finally {
        await hostileClient.dispose();
      }
    } finally {
      await loginClient.dispose();
    }
  });

  test("guards and exposes admin extensions, settings, permissions and email templates", async () => {
    const publicClient = await apiRequest.newContext({ baseURL: E2E_API_URL });
    const accessToken = await loginAsAdmin();
    const adminClient = await apiRequest.newContext({
      baseURL: E2E_API_URL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    try {
      expect((await publicClient.get("/v1/admin/extensions")).status()).toBe(401);
      expect((await publicClient.get("/v1/email/templates")).status()).toBe(401);

      const extensionsResponse = await adminClient.get("/v1/admin/extensions");
      expect(extensionsResponse.status()).toBe(200);
      const extensionsBody = await extensionsResponse.json();
      expect(
        extensionsBody.data.map((manifest: { pluginId: string }) => manifest.pluginId)
      ).toEqual(expect.arrayContaining(["core-pack", "email-pack"]));

      const settingsResponse = await adminClient.get("/v1/settings/definitions?limit=200&offset=0");
      expect(settingsResponse.status()).toBe(200);
      const settingsBody = await settingsResponse.json();
      expect(settingsBody.data.map((definition: { key: string }) => definition.key)).toContain(
        "core-pack:security:plugin_access_grants"
      );
      const serializedSettings = JSON.stringify(settingsBody);
      expect(serializedSettings).not.toContain(
        "trinacria-e2e-only-jwt-secret-with-more-than-thirty-two-characters"
      );
      expect(serializedSettings).not.toContain(E2E_OBSERVABILITY_TOKEN);

      const templatesResponse = await adminClient.get("/v1/email/templates");
      expect(templatesResponse.status()).toBe(200);
      const templatesBody = await templatesResponse.json();
      const template = templatesBody.data.find(
        (item: { status: string }) => item.status === "active"
      ) as { key: string; locale: string; variables: string[] } | undefined;
      expect(template).toBeTruthy();

      const variables = Object.fromEntries(
        (template?.variables ?? []).map((variable) => [variable, `E2E ${variable}`])
      );
      const previewResponse = await adminClient.post("/v1/email/templates/preview", {
        data: {
          key: template?.key,
          locale: template?.locale,
          variables
        }
      });
      expect(previewResponse.status()).toBe(200);
      const previewBody = await previewResponse.json();
      expect(previewBody.data.subject).not.toContain("{{");
      expect(previewBody.data.text).not.toContain("{{");
    } finally {
      await publicClient.dispose();
      await adminClient.dispose();
    }
  });

  test("rejects signed plugin request replay", async () => {
    const path = "/v1/settings/definitions?ownerPluginId=email-pack&limit=20&offset=0";
    const headers = buildPluginAuthHeaders({
      pluginId: "email-pack",
      secret: E2E_PLUGIN_AUTH_SECRET,
      method: "GET",
      path,
      body: undefined,
      nonce: "e2e-fixed-replay-nonce"
    });
    const client = await apiRequest.newContext({
      baseURL: E2E_API_URL,
      extraHTTPHeaders: headers
    });

    try {
      expect((await client.get(path)).status()).toBe(200);
      const replay = await client.get(path);
      expect(replay.status()).toBe(401);
      await expect(replay.json()).resolves.toMatchObject({
        error: { code: "plugin_auth_nonce_replay" }
      });
    } finally {
      await client.dispose();
    }
  });

  test("covers registration, verification, privilege isolation and password reset", async () => {
    const adminToken = await loginAsAdmin();
    const adminClient = await createBearerClient(adminToken);

    try {
      await upsertSetting(adminClient, "core-pack:user_flows:public_registration_enabled", true);
      await upsertSetting(adminClient, "core-pack:user_flows:email_verification_required", true);

      const registration = await adminClient.post("/v1/auth/register", {
        data: {
          email: VERIFIED_USER.email,
          firstName: VERIFIED_USER.firstName,
          lastName: VERIFIED_USER.lastName,
          password: VERIFIED_USER.initialPassword
        }
      });
      expect(registration.status()).toBe(200);
      expect(
        (await loginWithPassword(VERIFIED_USER.email, VERIFIED_USER.initialPassword)).status
      ).toBe(401);

      const verificationEmail = await readLatestSecureEmail(
        VERIFIED_USER.email,
        "email_verification"
      );
      const verificationToken = extractFlowToken(verificationEmail.variables.verificationUrl ?? "");
      const verification = await adminClient.post("/v1/auth/email-verification/confirm", {
        data: { token: verificationToken }
      });
      expect(verification.status()).toBe(200);
      expect(
        (
          await adminClient.post("/v1/auth/email-verification/confirm", {
            data: { token: verificationToken }
          })
        ).status()
      ).not.toBe(200);

      const userLogin = await loginWithPassword(VERIFIED_USER.email, VERIFIED_USER.initialPassword);
      expect(userLogin.status).toBe(200);
      const userClient = await createBearerClient(userLogin.body.data?.accessToken ?? "");
      try {
        const escalation = await userClient.get("/v1/admin/extensions");
        expect(escalation.status()).toBe(403);
        await expect(escalation.json()).resolves.toMatchObject({
          error: { code: "auth_forbidden_admin_required" }
        });
      } finally {
        await userClient.dispose();
      }

      expect(
        (
          await adminClient.post("/v1/auth/password-reset/request", {
            data: { email: VERIFIED_USER.email }
          })
        ).status()
      ).toBe(200);
      const resetEmail = await readLatestSecureEmail(VERIFIED_USER.email, "reset_password");
      const resetToken = extractFlowToken(resetEmail.variables.resetUrl ?? "");
      expect(
        (
          await adminClient.post("/v1/auth/password-reset/complete", {
            data: { token: resetToken, newPassword: VERIFIED_USER.resetPassword }
          })
        ).status()
      ).toBe(200);
      expect(
        (
          await adminClient.post("/v1/auth/password-reset/complete", {
            data: { token: resetToken, newPassword: VERIFIED_USER.resetPassword }
          })
        ).status()
      ).not.toBe(200);
      expect(
        (await loginWithPassword(VERIFIED_USER.email, VERIFIED_USER.initialPassword)).status
      ).toBe(401);
      expect(
        (await loginWithPassword(VERIFIED_USER.email, VERIFIED_USER.resetPassword)).status
      ).toBe(200);
    } finally {
      await adminClient.dispose();
    }
  });

  test("creates and consumes a single-use user invitation", async () => {
    const adminClient = await createBearerClient(await loginAsAdmin());

    try {
      const created = await adminClient.post("/v1/users", {
        data: {
          email: INVITED_USER.email,
          firstName: INVITED_USER.firstName,
          lastName: INVITED_USER.lastName
        }
      });
      expect(created.status()).toBe(200);
      const createdBody = await created.json();
      const userId = createdBody.data.id as string;

      expect(
        (await adminClient.post(`/v1/users/${encodeURIComponent(userId)}/invite`)).status()
      ).toBe(200);
      const inviteEmail = await readLatestSecureEmail(INVITED_USER.email, "user_invite");
      const inviteToken = extractFlowToken(inviteEmail.variables.inviteUrl ?? "");
      expect(
        (
          await adminClient.post("/v1/auth/invite/accept", {
            data: { token: inviteToken, password: INVITED_USER.password }
          })
        ).status()
      ).toBe(200);
      expect(
        (
          await adminClient.post("/v1/auth/invite/accept", {
            data: { token: inviteToken, password: INVITED_USER.password }
          })
        ).status()
      ).not.toBe(200);
      expect((await loginWithPassword(INVITED_USER.email, INVITED_USER.password)).status).toBe(200);
    } finally {
      await adminClient.dispose();
    }
  });

  test("writes general settings, plugin grants and email templates from the backoffice", async ({
    page
  }) => {
    await loginThroughUi(page);
    await page.getByRole("button", { name: new RegExp(E2E_ADMIN.firstName) }).click();
    await page.getByRole("menuitem", { name: "Settings" }).click();

    await page.getByRole("button", { name: /General/ }).click();
    const siteName = page.getByLabel("Name", { exact: true });
    await expect(siteName).toBeVisible();
    await siteName.fill("Trinacria E2E Updated");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Settings saved.")).toBeVisible();

    await page.getByRole("button", { name: /Plugin permissions/ }).click();
    const grantSwitch = page.getByRole("switch").first();
    await expect(grantSwitch).toBeVisible();
    const initiallyApproved = await grantSwitch.isChecked();
    await grantSwitch.locator("..").click();
    await expect(grantSwitch).toBeChecked({ checked: !initiallyApproved });
    await expect(page.getByText("Permission updated.")).toBeVisible();
    await grantSwitch.locator("..").click();
    await expect(grantSwitch).toBeChecked({ checked: initiallyApproved });

    await page.getByRole("button", { name: /Email templates/ }).click();
    const subject = page.getByLabel("Oggetto email");
    await expect(subject).toBeVisible();
    const originalSubject = await subject.inputValue();
    await subject.fill(`${originalSubject} [E2E]`);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Template salvato.")).toBeVisible();
    await page.getByRole("button", { name: "Valida salvato" }).click();
    await expect(
      page.getByText(
        "Validazione backend completata: il template salvato renderizza correttamente."
      )
    ).toBeVisible();
  });

  test("protects operational surfaces while keeping readiness probeable", async () => {
    const publicClient = await apiRequest.newContext({ baseURL: E2E_API_URL });
    const operatorClient = await apiRequest.newContext({
      baseURL: E2E_API_URL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${E2E_OBSERVABILITY_TOKEN}`
      }
    });

    try {
      const ready = await publicClient.get("/ready");
      expect(ready.status()).toBe(200);
      expect(ready.headers()["x-request-id"]).toBeTruthy();

      expect((await publicClient.get("/metrics")).status()).toBe(401);
      expect((await publicClient.get("/ops/checklist")).status()).toBe(401);
      expect((await operatorClient.get("/metrics")).status()).toBe(200);
      expect((await operatorClient.get("/ops/checklist")).status()).toBe(200);
    } finally {
      await publicClient.dispose();
      await operatorClient.dispose();
    }
  });

  test("reports degraded and down readiness through live HTTP fixtures", async () => {
    const degradedClient = await apiRequest.newContext({ baseURL: E2E_DEGRADED_API_URL });
    const downClient = await apiRequest.newContext({ baseURL: E2E_DOWN_API_URL });

    try {
      const degradedHealth = await degradedClient.get("/health");
      expect(degradedHealth.status()).toBe(200);
      await expect(degradedHealth.json()).resolves.toMatchObject({
        status: "degraded",
        runtime: { byState: { disabled: 1 } },
        db: { ok: true }
      });
      const degradedReady = await degradedClient.get("/ready");
      expect(degradedReady.status()).toBe(200);
      await expect(degradedReady.json()).resolves.toMatchObject({ data: { status: "degraded" } });

      const downHealth = await downClient.get("/health");
      expect(downHealth.status()).toBe(200);
      await expect(downHealth.json()).resolves.toMatchObject({
        status: "down",
        db: { ok: false }
      });
      const downReady = await downClient.get("/ready");
      expect(downReady.status()).toBe(503);
      await expect(downReady.json()).resolves.toMatchObject({ data: { status: "down" } });
    } finally {
      await degradedClient.dispose();
      await downClient.dispose();
    }
  });

  test("keeps auth secrets out of structured backend logs", async () => {
    const verificationEmail = await readLatestSecureEmail(
      VERIFIED_USER.email,
      "email_verification"
    );
    const resetEmail = await readLatestSecureEmail(VERIFIED_USER.email, "reset_password");
    const inviteEmail = await readLatestSecureEmail(INVITED_USER.email, "user_invite");
    const secrets = [
      E2E_ADMIN.password,
      VERIFIED_USER.initialPassword,
      VERIFIED_USER.resetPassword,
      INVITED_USER.password,
      extractFlowToken(verificationEmail.variables.verificationUrl ?? ""),
      extractFlowToken(resetEmail.variables.resetUrl ?? ""),
      extractFlowToken(inviteEmail.variables.inviteUrl ?? "")
    ];
    const logs = await readFile(resolve(process.cwd(), E2E_BACKEND_LOG_PATH), "utf8");

    for (const secret of secrets) expect(logs).not.toContain(secret);
    const outboundEntries = logs
      .split("\n")
      .filter((line) => line.includes('"event":"outbound_email"'))
      .map((line) => JSON.parse(line) as { event: string; text: string; html?: string });
    expect(outboundEntries.length).toBeGreaterThanOrEqual(3);
    expect(outboundEntries.every((entry) => entry.event === "outbound_email")).toBe(true);
    expect(
      outboundEntries.every((entry) => `${entry.text}${entry.html ?? ""}`.includes("[REDACTED]"))
    ).toBe(true);
  });

  test("backs up and restores the installed Mongo dataset into an isolated database", async () => {
    const restored = await smokeBackupAndRestoreE2eDatabase();
    expect(restored.collections).toBeGreaterThan(0);
    expect(restored.documents).toBeGreaterThan(0);
  });
});

function extractCookieHeader(headers: readonly { name: string; value: string }[]): string {
  const cookies = headers
    .filter((header) => header.name.toLowerCase() === "set-cookie")
    .map((header) => header.value.split(";", 1)[0])
    .filter((value): value is string => Boolean(value));

  expect(cookies.length).toBeGreaterThan(0);
  return cookies.join("; ");
}

async function loginAsAdmin(): Promise<string> {
  const client = await apiRequest.newContext({
    baseURL: E2E_API_URL,
    extraHTTPHeaders: { Origin: E2E_APP_URL }
  });

  try {
    const response = await client.post("/v1/auth/login", {
      data: {
        email: E2E_ADMIN.email,
        password: E2E_ADMIN.password
      }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    return body.data.accessToken as string;
  } finally {
    await client.dispose();
  }
}

async function loginWithPassword(
  email: string,
  password: string
): Promise<{ status: number; body: { data?: { accessToken?: string } } }> {
  const client = await apiRequest.newContext({
    baseURL: E2E_API_URL,
    extraHTTPHeaders: { Origin: E2E_APP_URL }
  });
  try {
    const response = await client.post("/v1/auth/login", { data: { email, password } });
    return {
      status: response.status(),
      body: (await response.json()) as { data?: { accessToken?: string } }
    };
  } finally {
    await client.dispose();
  }
}

async function createBearerClient(token: string) {
  return apiRequest.newContext({
    baseURL: E2E_API_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` }
  });
}

async function upsertSetting(
  client: Awaited<ReturnType<typeof apiRequest.newContext>>,
  key: string,
  value: unknown
): Promise<void> {
  const response = await client.put(`/v1/settings/values/${encodeURIComponent(key)}`, {
    data: { value, updatedBy: "e2e" }
  });
  expect(response.status()).toBe(200);
}

function buildPluginAuthHeaders(input: {
  pluginId: string;
  secret: string;
  method: string;
  path: string;
  body: unknown;
  nonce: string;
}): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const canonical = [
    input.method.toUpperCase(),
    new URL(input.path, E2E_API_URL).pathname,
    String(timestamp),
    input.nonce,
    input.pluginId.toLowerCase(),
    createHash("sha256").update(serializeCanonical(input.body), "utf8").digest("hex")
  ].join("\n");
  const signature = createHmac("sha256", input.secret).update(canonical, "utf8").digest("hex");

  return {
    "x-cms-plugin-id": input.pluginId.toLowerCase(),
    "x-cms-plugin-ts": String(timestamp),
    "x-cms-plugin-nonce": input.nonce,
    "x-cms-plugin-signature": signature
  };
}

function serializeCanonical(value: unknown): string {
  if (value === undefined) return "";
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(serializeCanonical).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${serializeCanonical(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(String(value));
}

async function loginThroughUi(page: Page): Promise<void> {
  await page.goto("/");
  await page.locator('input[name="email"]').fill(E2E_ADMIN.email);
  await page.locator('input[name="password"]').fill(E2E_ADMIN.password);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText(`${E2E_ADMIN.firstName} ${E2E_ADMIN.lastName}`)).toBeVisible();
}
