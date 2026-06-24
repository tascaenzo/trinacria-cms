import assert from "node:assert/strict";
import test from "node:test";
import {
  validateAdminActionDefinition,
  validateAdminEndpointBinding
} from "../src/runtime/admin-endpoint-policy.js";

test("validateAdminEndpointBinding allows only relative admin GET data endpoints", () => {
  assert.equal(validateAdminEndpointBinding({ path: "/admin/products" }, "data").ok, true);
  assert.equal(
    validateAdminEndpointBinding({ path: "/admin/products", method: "POST" }, "data").ok,
    false
  );
  assert.equal(validateAdminEndpointBinding({ path: "https://evil.test/admin" }, "data").ok, false);
  assert.equal(validateAdminEndpointBinding({ path: "//evil.test/admin" }, "data").ok, false);
  assert.equal(validateAdminEndpointBinding({ path: "/public/products" }, "data").ok, false);
  assert.equal(validateAdminEndpointBinding({ path: "/admin/../secrets" }, "data").ok, false);
});

test("validateAdminActionDefinition requires mutation endpoints and explicit guards", () => {
  assert.equal(
    validateAdminActionDefinition(
      {
        id: "safe",
        intent: "update",
        title: "Safe",
        endpoint: { method: "PATCH", path: "/admin/products/:id" },
        guards: [{ capability: "products.write" }]
      },
      "catalog"
    ).ok,
    true
  );
  assert.equal(
    validateAdminActionDefinition(
      {
        id: "unguarded",
        intent: "delete",
        title: "Unguarded",
        endpoint: { method: "DELETE", path: "/admin/products/:id" }
      },
      "catalog"
    ).ok,
    false
  );
  assert.equal(
    validateAdminActionDefinition(
      {
        id: "read",
        intent: "read",
        title: "Read",
        endpoint: { method: "GET", path: "/admin/products" },
        guards: [{ capability: "products.read" }]
      },
      "catalog"
    ).ok,
    false
  );
});
