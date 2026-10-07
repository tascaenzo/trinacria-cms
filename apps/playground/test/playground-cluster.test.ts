import assert from "node:assert/strict";
import test from "node:test";
import { readPlaygroundClusterEnabled } from "../src/playground-app.js";

test("single-instance is the default and cluster requires explicit valid configuration", () => {
  for (const value of [undefined, "false", "0"]) assert.equal(readPlaygroundClusterEnabled(value), false);
  for (const value of ["true", "1"]) assert.equal(readPlaygroundClusterEnabled(value), true);
  for (const value of ["", "yes", "tru", "FALSE"]) assert.throws(() => readPlaygroundClusterEnabled(value), /PLAYGROUND_CLUSTER_ENABLED/);
});
