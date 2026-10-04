import { REQUIRED_DATA_MODE } from "../config/env";

export const SYNTHETIC_STAGING_LABEL = "CONTROLLED PRODUCT STAGING";
export const SYNTHETIC_STAGING_NOTICE = "Real supplier and product-master records, including reviewed CSV imports, are permitted. Purchasing, receiving, customer, payment, inventory-release, other migration, and production records remain restricted.";

export type SyntheticStagingMode = {
  dataMode: typeof REQUIRED_DATA_MODE;
  label: typeof SYNTHETIC_STAGING_LABEL;
  notice: typeof SYNTHETIC_STAGING_NOTICE;
  readOnlyFoundation: false;
};

export function syntheticStagingMode(env = process.env): SyntheticStagingMode {
  if (env.OID_DATA_MODE !== REQUIRED_DATA_MODE) throw new Error("CONTROLLED_PRODUCT_STAGING_CONFIGURATION_REQUIRED");
  return { dataMode: REQUIRED_DATA_MODE, label: SYNTHETIC_STAGING_LABEL, notice: SYNTHETIC_STAGING_NOTICE, readOnlyFoundation: false };
}
