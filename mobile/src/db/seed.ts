import type { SqlDb } from "./types";
import { nowIso } from "./time";

export const ZONE_SEEDS = [
  { id: "11000000-0000-4000-8000-000000000001", code: "restaurant", name: "Restaurant" },
  { id: "11000000-0000-4000-8000-000000000002", code: "patio", name: "Patio" },
  { id: "11000000-0000-4000-8000-000000000003", code: "technical", name: "Technical" },
  { id: "11000000-0000-4000-8000-000000000004", code: "main_storage", name: "Main Storage" },
] as const;

export const ITEM_SEEDS = [
  { id: "20000000-0000-4000-8000-000000000001", name: "Milk (2L)", sku: "DAIRY-MILK", unit: "L", category: "Dairy" },
  { id: "20000000-0000-4000-8000-000000000002", name: "Olive Oil", sku: "PANTRY-OLIVE", unit: "L", category: "Pantry" },
  { id: "20000000-0000-4000-8000-000000000003", name: "Laundry Detergent", sku: "CLEAN-SOAP", unit: "kg", category: "Cleaning" },
  { id: "20000000-0000-4000-8000-000000000004", name: "Espresso Beans", sku: "BAR-ESPRESSO", unit: "kg", category: "Bar" },
  { id: "20000000-0000-4000-8000-000000000005", name: "House White Wine", sku: "BAR-WINE", unit: "btl", category: "Bar" },
  { id: "20000000-0000-4000-8000-000000000006", name: "Paper Towels", sku: "SUPP-PT", unit: "pcs", category: "Supplies" },
] as const;

export function seedZones(db: SqlDb): void {
  const ts = nowIso();
  db.transaction(() => {
    for (const zone of ZONE_SEEDS) {
      db.run(
        "INSERT OR IGNORE INTO zones (id, code, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        zone.id,
        zone.code,
        zone.name,
        ts,
        ts,
      );
    }
  });
}

export function seedItems(db: SqlDb): void {
  const ts = nowIso();
  db.transaction(() => {
    for (const item of ITEM_SEEDS) {
      db.run(
        "INSERT OR IGNORE INTO items (id, name, sku, unit, category, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)",
        item.id,
        item.name,
        item.sku,
        item.unit,
        item.category,
        ts,
        ts,
      );
    }
  });
}

export function seedAll(db: SqlDb): void {
  seedZones(db);
  seedItems(db);
}