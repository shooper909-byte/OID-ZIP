import { formatOidCode, type OidEntity } from "./index";

export type OidCounterStore = {
  oidCounter: {
    upsert: (args: {
      where: { entity_year: { entity: string; year: number } };
      create: { entity: string; year: number; currentValue: number };
      update: { currentValue: { increment: number } };
      select: { currentValue: true };
    }) => Promise<{ currentValue: number }>;
  };
};

const YEARLESS = new Set<OidEntity>(["PROD", "SKU", "SUP", "ORG"]);

export async function nextOidCode(store: OidCounterStore, entity: OidEntity, date = new Date()): Promise<string> {
  const year = date.getUTCFullYear();
  const counterYear = YEARLESS.has(entity) ? 0 : year;
  const row = await store.oidCounter.upsert({
    where: { entity_year: { entity, year: counterYear } },
    create: { entity, year: counterYear, currentValue: 1 },
    update: { currentValue: { increment: 1 } },
    select: { currentValue: true },
  });
  return formatOidCode(entity, row.currentValue, year);
}
