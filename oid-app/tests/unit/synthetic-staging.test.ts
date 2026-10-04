import { describe, expect, it } from "vitest";
import { actorFromRoles } from "../../lib/auth";
import { actorCanRead, actorCanReadAll } from "../../lib/auth/page-actor";
import { PERMISSIONS } from "../../lib/permissions";
import { SYNTHETIC_STAGING_LABEL, syntheticStagingMode } from "../../lib/synthetic-staging";

describe("controlled product staging foundation", () => {
  it("requires explicit controlled-product-staging configuration", () => {
    expect(() => syntheticStagingMode({ NODE_ENV: "test" } as NodeJS.ProcessEnv)).toThrow("CONTROLLED_PRODUCT_STAGING_CONFIGURATION_REQUIRED");
    expect(() => syntheticStagingMode({ NODE_ENV: "test", OID_DATA_MODE: "production" } as NodeJS.ProcessEnv)).toThrow("CONTROLLED_PRODUCT_STAGING_CONFIGURATION_REQUIRED");
  });
  it("returns a fixed controlled product classification", () => {
    const mode = syntheticStagingMode({ NODE_ENV: "test", OID_DATA_MODE: "controlled-product-staging" } as NodeJS.ProcessEnv);
    expect(mode.label).toBe(SYNTHETIC_STAGING_LABEL); expect(mode.readOnlyFoundation).toBe(false);
  });
  it("derives navigation visibility from existing read permissions", () => {
    const auditor = actorFromRoles("id", "auditor@example.invalid", ["AUDITOR"]);
    const commercial = actorFromRoles("id", "commercial@example.invalid", ["COMMERCIAL"]);
    expect(actorCanRead(auditor, PERMISSIONS.LOT_READ)).toBe(true);
    expect(actorCanRead(auditor, PERMISSIONS.MIGRATION_READ)).toBe(false);
    expect(actorCanRead(commercial, PERMISSIONS.SUPPLIER_READ)).toBe(false);
    expect(actorCanRead(commercial, PERMISSIONS.INTELLIGENCE_QUERY)).toBe(false);
    expect(actorCanReadAll(auditor, [PERMISSIONS.LOT_READ, PERMISSIONS.TEST_READ, PERMISSIONS.EXCEPTION_READ, PERMISSIONS.ACTION_READ, PERMISSIONS.DECISION_READ])).toBe(true);
    expect(actorCanReadAll(commercial, [PERMISSIONS.LOT_READ, PERMISSIONS.EXCEPTION_READ])).toBe(false);
  });
});
