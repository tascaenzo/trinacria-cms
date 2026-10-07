import type { GetInstallationStatusResponse } from "@trinacria-cms/sdk";
import { expect, test, type Page } from "@playwright/test";
import { E2E_ADMIN } from "./e2e-env.js";

type InstallationStatus = GetInstallationStatusResponse["data"];

const READY_CHECKS: InstallationStatus["checks"] = [
  { id: "database", status: "pass", message: "database-ready" },
  { id: "transactions", status: "pass", message: "transactions-ready" },
  { id: "write-access", status: "pass", message: "write-access-ready" },
  { id: "runtime-keys", status: "pass", message: "runtime-keys-ready" }
];

function readyStatus(overrides: Partial<InstallationStatus> = {}): InstallationStatus {
  return {
    installed: false,
    phase: "ready",
    canInstall: true,
    restartRequired: false,
    checks: READY_CHECKS,
    envFilePresent: true,
    dbConfigured: true,
    envFilePath: "/cms/.env",
    ...overrides
  };
}

async function mockStatus(page: Page, read: () => InstallationStatus) {
  await page.route("**/v1/install/status", (route) => route.fulfill({ json: { data: read() } }));
}

async function expectCenteredSteps(page: Page, label: string) {
  const progress = page.getByRole("navigation", { name: label });
  await expect(progress.getByRole("listitem")).toHaveCount(3);
  const geometry = await progress.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const centers = [...element.querySelectorAll("li > div > span:first-child")].map((circle) => {
      const circleBounds = circle.getBoundingClientRect();
      return circleBounds.x + circleBounds.width / 2;
    });
    return { left: bounds.left, right: bounds.right, centers };
  });
  expect(geometry.centers).toHaveLength(3);
  expect(
    Math.abs((geometry.centers[0] + geometry.centers[2]) / 2 - (geometry.left + geometry.right) / 2)
  ).toBeLessThan(1);
  expect(
    Math.abs(
      geometry.centers[1] - geometry.centers[0] - (geometry.centers[2] - geometry.centers[1])
    )
  ).toBeLessThan(1);
}

test.describe("installation interface", () => {
  test.afterEach(async ({ page }, testInfo) => {
    const path = testInfo.outputPath("installation-screen.png");
    await page.screenshot({ path, fullPage: true });
    await testInfo.attach("installation-screen", {
      path,
      contentType: "image/png"
    });
  });

  test("opens setup directly, advances all three steps and keeps completion checks collapsed", async ({
    page
  }, testInfo) => {
    await mockStatus(page, () => readyStatus());
    let submissions = 0;
    const completed = readyStatus({
      installed: true,
      phase: "complete",
      canInstall: false,
      checks: [
        ...READY_CHECKS,
        { id: "plugins", status: "pass", message: "plugins-ready" },
        { id: "services", status: "pass", message: "services-ready" },
        { id: "administrator", status: "pass", message: "administrator-ready" },
        { id: "settings", status: "pass", message: "settings-ready" }
      ]
    });
    const user = { id: "installation-ui-admin", ...E2E_ADMIN, locale: "en" };
    await page.route("**/v1/install/bootstrap", async (route) => {
      submissions++;
      expect(route.request().postDataJSON()).toMatchObject({
        siteName: "UI test",
        email: E2E_ADMIN.email,
        dataMode: "empty"
      });
      await route.fulfill({ json: { data: { status: completed, adminUser: user } } });
    });
    await page.route("**/v1/auth/login", (route) =>
      route.fulfill({ json: { data: { user, expiresAt: "2099-01-01T00:00:00.000Z" } } })
    );
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Initial setup" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Installation checks" })).toHaveCount(0);
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expectCenteredSteps(page, "Setup progress");
    await page.screenshot({ path: testInfo.outputPath("setup-desktop.png"), fullPage: true });
    await page.locator('input[name="siteName"]').fill("UI test");
    await page.locator('input[name="siteName"]').press("Enter");
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    expect(submissions).toBe(0);
    await expect(page.locator('[aria-current="step"]')).toHaveText("2");
    await page.locator('input[name="firstName"]').fill(E2E_ADMIN.firstName);
    await page.locator('input[name="lastName"]').fill(E2E_ADMIN.lastName);
    await page.locator('input[name="email"]').fill(E2E_ADMIN.email);
    await page.locator('input[name="password"]').fill(E2E_ADMIN.password);
    await page.locator('input[name="confirmPassword"]').fill(E2E_ADMIN.password);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator('[aria-current="step"]')).toHaveText("3");
    await expect(page.getByText(E2E_ADMIN.email)).toBeVisible();
    await expectCenteredSteps(page, "Setup progress");
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page.locator('input[name="email"]')).toHaveValue(E2E_ADMIN.email);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Initialise CMS" }).click();
    await expect(page.getByRole("button", { name: "Enter backoffice" })).toBeVisible();
    expect(submissions).toBe(1);
    const checks = page.getByRole("list", { name: "Installation checks" });
    await expect(checks).not.toBeVisible();
    await page.getByText("View verification details", { exact: true }).click();
    await expect(checks.getByRole("listitem")).toHaveCount(8);
    await expect(checks).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
    await page.getByText("View verification details", { exact: true }).click();
  });

  test("keeps every step centered and readable on a narrow mobile screen in Italian", async ({
    page
  }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.addInitScript(() => localStorage.setItem("trinacria.backoffice.locale", "it"));
    await mockStatus(page, () => readyStatus());
    await page.goto("/");
    await expectCenteredSteps(page, "Avanzamento del setup");
    const progress = page.getByRole("navigation", { name: "Avanzamento del setup" });
    for (const label of ["Sito", "Amministratore", "Riepilogo"])
      await expect(progress.getByText(label, { exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);
    await page.locator('input[name="siteName"]').fill("Il mio sito");
    await page.getByRole("button", { name: "Continua" }).click();
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expectCenteredSteps(page, "Avanzamento del setup");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);
  });

  test("shows prerequisites without alerts, deduplicates corrections and opens setup after retry", async ({
    page
  }, testInfo) => {
    let status = readyStatus({
      phase: "prerequisites",
      canInstall: false,
      checks: [
        { id: "database", status: "fail", message: "configure-mongo" },
        { id: "transactions", status: "blocked", message: "configure-mongo" },
        { id: "write-access", status: "blocked", message: "configure-mongo" },
        { id: "runtime-keys", status: "fail", message: "configure-runtime-keys" }
      ]
    });
    await mockStatus(page, () => status);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Installation prerequisites" })).toBeVisible();
    await expect(page.locator('input[name="siteName"]')).toHaveCount(0);
    await expect(
      page.getByRole("list", { name: "Installation checks" }).getByRole("listitem")
    ).toHaveCount(4);
    await expect(page.getByRole("alert")).toHaveCount(0);
    const actions = page.getByRole("region", { name: "What to do next" });
    await expect(actions.getByRole("listitem")).toHaveCount(2);
    await expect(page.locator("pre")).not.toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("prerequisites-desktop.png"),
      fullPage: true
    });
    await page.getByText("Show configuration example", { exact: true }).click();
    await expect(page.locator("pre")).toContainText("MONGO_URI=");
    await expect(page.locator("pre")).toContainText("CMS_SECURE_PAYLOAD_KEYS_JSON=");
    await page.getByText("Show configuration example", { exact: true }).click();
    status = readyStatus();
    await page.getByRole("button", { name: "Repeat checks" }).click();
    await expect(page.locator('input[name="siteName"]')).toBeVisible();
    await expect(page.getByRole("list", { name: "Installation checks" })).toHaveCount(0);
  });

  test("shows only the configuration relevant to a failed runtime key check", async ({ page }) => {
    await mockStatus(page, () =>
      readyStatus({
        canInstall: false,
        checks: [
          ...READY_CHECKS.slice(0, 3),
          { id: "runtime-keys", status: "fail", message: "configure-runtime-keys" }
        ]
      })
    );
    await page.goto("/");
    await page.getByText("Show configuration example", { exact: true }).click();
    await expect(page.locator("pre")).toContainText("CMS_SECURE_PAYLOAD_KEYS_JSON=");
    await expect(page.locator("pre")).not.toContainText("MONGO_URI");
    await expect(
      page.getByRole("region", { name: "What to do next" }).getByRole("listitem")
    ).toHaveCount(1);
  });

  test("keeps prerequisites and configuration examples inside a mobile viewport", async ({
    page
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.addInitScript(() => localStorage.setItem("trinacria.backoffice.locale", "it"));
    await mockStatus(page, () =>
      readyStatus({
        restartRequired: true,
        canInstall: false,
        checks: [
          { id: "database", status: "fail", message: "configure-mongo" },
          { id: "transactions", status: "blocked", message: "configure-mongo" },
          { id: "write-access", status: "blocked", message: "configure-mongo" },
          { id: "runtime-keys", status: "fail", message: "configure-runtime-keys" }
        ]
      })
    );
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Prerequisiti di installazione" })
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);
    const checklistWidth = await page
      .getByRole("list", { name: "Controlli di installazione" })
      .evaluate((element) => element.getBoundingClientRect().width);
    expect(checklistWidth).toBeLessThanOrEqual(278);
    await page.getByText("Mostra un esempio di configurazione", { exact: true }).click();
    await expect(page.locator("pre")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);
    expect(
      await page
        .getByRole("list", { name: "Controlli di installazione" })
        .evaluate((element) => element.getBoundingClientRect().width)
    ).toBeLessThanOrEqual(278);
    await page.getByText("Mostra un esempio di configurazione", { exact: true }).click();
  });

  test("requires a ready runtime even when all checks pass", async ({ page }) => {
    let status = readyStatus({ restartRequired: true, canInstall: false });
    await mockStatus(page, () => status);
    await page.goto("/");
    await expect(page.getByText(/Restart the CMS process/)).toBeVisible();
    await expect(page.locator('input[name="siteName"]')).toHaveCount(0);
    await page.getByRole("button", { name: "Repeat checks" }).click();
    await expect(page.getByRole("heading", { name: "Installation prerequisites" })).toBeVisible();
    status = readyStatus();
    await page.getByRole("button", { name: "Repeat checks" }).click();
    await expect(page.locator('input[name="siteName"]')).toBeVisible();
  });

  test("opens login directly for an installed healthy CMS", async ({ page }) => {
    await mockStatus(page, () =>
      readyStatus({ installed: true, phase: "complete", canInstall: false })
    );
    await page.route("**/v1/auth/me", (route) =>
      route.fulfill({ status: 401, json: { error: { code: "auth_invalid_credentials" } } })
    );
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Login to your account" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Setup progress" })).toHaveCount(0);
  });
});
