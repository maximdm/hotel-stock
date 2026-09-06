import type { SqlDb } from "../db/types";
import { newUuid } from "../db/uuid";
import { nowIso } from "../db/time";
import { appendQueue } from "./syncQueueRepo";

export interface Item {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  category: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface NewItem {
  name: string;
  sku?: string | null;
  unit?: string;
  category?: string | null;
}

export interface ItemPatch {
  name?: string;
  sku?: string | null;
  unit?: string;
  category?: string | null;
}

export function listItems(db: SqlDb): Item[] {
  return db.getAll<Item>(
    "SELECT * FROM items WHERE deleted_at IS NULL ORDER BY name",
  );
}

export function getItem(db: SqlDb, id: string): Item | null {
  return db.getFirst<Item>(
    "SELECT * FROM items WHERE id = ? AND deleted_at IS NULL",
    id,
  );
}

export function createItem(db: SqlDb, input: NewItem, id?: string): Item {
  const itemId = id ?? newUuid();
  const ts = nowIso();
  const item: Item = {
    id: itemId,
    name: input.name,
    sku: input.sku ?? null,
    unit: input.unit ?? "pcs",
    category: input.category ?? null,
    created_at: ts,
    updated_at: ts,
    deleted_at: null,
  };
  db.transaction(() => {
    db.run(
      `INSERT INTO items (id, name, sku, unit, category, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
      item.id,
      item.name,
      item.sku,
      item.unit,
      item.category,
      item.created_at,
      item.updated_at,
    );
    appendQueue(db, {
      entity: "items",
      entityId: item.id,
      operation: "upsert",
      payload: JSON.stringify(item),
    });
  });
  return item;
}

export function updateItem(db: SqlDb, id: string, patch: ItemPatch): Item | null {
  const existing = getItem(db, id);
  if (!existing) return null;
  const updated: Item = {
    ...existing,
    name: patch.name ?? existing.name,
    sku: patch.sku !== undefined ? patch.sku : existing.sku,
    unit: patch.unit ?? existing.unit,
    category: patch.category !== undefined ? patch.category : existing.category,
    updated_at: nowIso(),
  };
  db.transaction(() => {
    db.run(
      `UPDATE items SET name = ?, sku = ?, unit = ?, category = ?, updated_at = ?
       WHERE id = ?`,
      updated.name,
      updated.sku,
      updated.unit,
      updated.category,
      updated.updated_at,
      id,
    );
    appendQueue(db, {
      entity: "items",
      entityId: id,
      operation: "upsert",
      payload: JSON.stringify(updated),
    });
  });
  return updated;
}

export function softDeleteItem(db: SqlDb, id: string): Item | null {
  const existing = getItem(db, id);
  if (!existing) return null;
  const deletedAt = nowIso();
  const updated: Item = {
    ...existing,
    deleted_at: deletedAt,
    updated_at: deletedAt,
  };
  db.transaction(() => {
    db.run(
      "UPDATE items SET deleted_at = ?, updated_at = ? WHERE id = ?",
      deletedAt,
      deletedAt,
      id,
    );
    appendQueue(db, {
      entity: "items",
      entityId: id,
      operation: "delete",
      payload: JSON.stringify({ id, deleted_at: deletedAt }),
    });
  });
  return updated;
}