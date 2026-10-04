# OID product CSV importer

Status: implemented and locally validated; NOT deployed. No live product records changed.

Based on OID_controlled_product_staging_release_2026-09-06(1).zip. Azure was observed running cp0906a with oid-application:product-phase-20260906-v2. Browser URL policy blocked continuation. Release upload to Cloud Shell was attempted; its Azure-side checksum was not verified, so no registry build or deployment was started.

## Changes

- /migration/products: CSV upload, row-level mapping and warning preview, selected-batch history, explicit review/commit.
- Native OID CSV and WooCommerce CSV header mapping; Excel users must save as CSV.
- Optional OP-R- plus padded website ID SKUs. Original SKU, source identifier and website ID persist in import records and audit history.
- WooCommerce nutraceutical and archived categories are skipped. Unknown non-research categories block import.
- Permissions: migration.run plus product.write to preview; migration.resolve plus product.write to commit; existing human-actor and request-origin controls retained.
- Products/SKUs are UNDER_REVIEW and product evidence remains UNKNOWN. Missing package quantity is stored as null, not the manual form default of one.
- No website SKU changes, stock, lot, supplier qualification, approval, price, configurable contents or bundle fulfillment changes.
- Repeat exact file/mapping reuses its existing batch. Changed uploads with previously mapped website IDs skip those records; SKU and existing-name collisions block import. Concurrent commits use a serializable transaction with duplicate checks before creation.
- Two identical names with distinct website IDs in the same file are retained as separate under-review catalog records with a warning. They are not verified distinct configurations.
- Product and supplier batches have separate status namespaces and screens. No database schema migration required.
- No direct WooCommerce API connection in this release.

## Prepared data

OID_83_Products_Import.csv contains the 83 research catalog records from the supplied September 6 export, excluding 16 nutraceuticals and four archived records. All 83 proposed SKUs match the supplied copy/paste reference. Validation against an empty catalog returns 83 create rows, zero errors and 83 warning rows. Live duplicate checks may change these counts.

Physical forms/storage and unverified individual package conventions are blank. Kit/bundle package counts are taken from explicit named counts. Nominal strengths originate in the reference; they are not analytical verification. Suggested canonical names/classifications and other source uncertainties are preserved in notes.

## Local validation

- npm ci --ignore-scripts --no-audit --no-fund
- npx prisma generate
- npm run typecheck: passed
- npx vitest run tests/unit/product-import.test.ts tests/unit/product-import-service.test.ts tests/unit/product-input.test.ts tests/unit/supplier-workflows.test.ts: 34 tests passed
- OID_DATA_MODE=controlled-product-staging npm run build: passed
- node scripts/check-secrets.mjs: passed

Service tests use mocked database boundaries. Live database commit, concurrent PostgreSQL behavior, authenticated browser UI and postdeployment health/access checks remain to be verified in staging.

## Deployment and import continuation

1. Verify source archive checksum after transferring it into Azure Cloud Shell; extract into a new isolated build directory. Compare current revision/image with the baseline above before deploying.
2. Build the included Dockerfile using the existing registry oidstagingacrqgvnukjcy7jwk, with a fresh oid-application image tag. Dockerfile already sets controlled-product-staging for compilation and includes the runtime identity bridge file.
3. Deploy only container oid in oid-staging-app-qgvnukjcy7jwk, resource group oid-staging-rg. Preserve the existing identity-bridge container, environment variables/secrets, identity settings and ingress protection. Retain the previous revision for rollback.
4. Verify the new revision is healthy/provisioned, readiness responds HTTP 200 with status ready, and anonymous root remains protected. Verify the new routes through the authorized application account.
5. Open Migration -> Import products. Upload OID_83_Products_Import.csv. Keep source identifier woocommerce:oligopolypeptides.com and leave the optional neutral-SKU checkbox unchecked: the prepared internal_sku column already contains the proposed neutral SKUs.
6. Review all rows and warnings, including the two Neurobiology Research Panel records. Resolve any collisions with live OID data. Enter review notes and the displayed commit phrase only after review.
7. Verify committed product/SKU counts, source mappings, audit entries, unknown fields and under-review status. Repeating the committed request must not create duplicates.
