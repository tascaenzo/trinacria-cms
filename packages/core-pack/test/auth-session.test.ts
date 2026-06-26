import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { readJwtCookieConfigFromEnv } from "../src/modules/auth/auth-session.js";

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  CMS_JWT_COOKIE_SECURE: process.env.CMS_JWT_COOKIE_SECURE,
  CMS_JWT_COOKIE_SAME_SITE: process.env.CMS_JWT_COOKIE_SAME_SITE
};

afterEach(() => {
  restoreEnv("NODE_ENV", originalEnv.NODE_ENV);
  restoreEnv("CMS_JWT_COOKIE_SECURE", originalEnv.CMS_JWT_COOKIE_SECURE);
  restoreEnv("CMS_JWT_COOKIE_SAME_SITE", originalEnv.CMS_JWT_COOKIE_SAME_SITE);
});

test("readJwtCookieConfigFromEnv does not require Secure cookies by default in local development", () => {
  process.env.NODE_ENV = "development";
  delete process.env.CMS_JWT_COOKIE_SECURE;
  delete process.env.CMS_JWT_COOKIE_SAME_SITE;

  assert.equal(readJwtCookieConfigFromEnv().secure, false);
});

test("readJwtCookieConfigFromEnv requires Secure by default in production", () => {
  process.env.NODE_ENV = "production";
  delete process.env.CMS_JWT_COOKIE_SECURE;
  delete process.env.CMS_JWT_COOKIE_SAME_SITE;

  assert.equal(readJwtCookieConfigFromEnv().secure, true);
});

test("readJwtCookieConfigFromEnv requires Secure by default for SameSite=None", () => {
  process.env.NODE_ENV = "development";
  delete process.env.CMS_JWT_COOKIE_SECURE;
  process.env.CMS_JWT_COOKIE_SAME_SITE = "none";

  assert.equal(readJwtCookieConfigFromEnv().secure, true);
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}
