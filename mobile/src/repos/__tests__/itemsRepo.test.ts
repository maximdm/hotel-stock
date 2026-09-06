import { DatabaseSync } from "node:sqlite";
import type { SqlDb, SqlValue } from "../../db/types";
import { applyMigrations } from "../../db/migrate";
import { seedAll } from "../../db/seed";
import {
  createItem,
  getItem,
  listItems,
  softDeleteItem,
  updateItem,
} from "../itemsRepo";
import { extractPending } from "../syncQueueRepo";

function fromNode(nodeDb: DatabaseSync): SqlDb {
  return {
    exec: (source) => nodeDb.exec(source),
    run: (source, ...params) => {
      const result = nodeDb
        .prepare(source)
        .run(...(params as unknown as SqlValue[]));
      return { changes: result.changes };
    },
    getFirst: (source, ...params) => {
      const result = nodeDb
        .prepare(source)
        .get(...(params as unknown as SqlValue[]));
      return (result ?? null) as never;
    },
    getAll: (source, ...params) =>
      nodeDb.prepare(source).all(...(params as unknown as SqlValue[])) as never,
    transaction: (fn) => {
      nodeDb.exec("BEGIN");
      try {
        const value = fn();
        nodeDb.exec("COMMIT");
        return value;
      } catch (error) {
        nodeDb.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

describe("items repo CRUD", () => {
  let nodeDb: DatabaseSync;
  let db: SqlDb;

  beforeEach(() => {
    nodeDb = new DatabaseSync(":memory:", {
      enableForeignKeyConstraints: true,
    });
    db = fromNode(nodeDb);
    applyMigrations(db);
    seedAll(db);
  });

  afterEach(() => {
    nodeDb.close();
  });

  test("createItem inserts and appends an upsert queue row", () => {
    const item = createItem(db, {
      name: "Sparkling Water",
      sku: "BAR-SPA",
      unit: "btl",
      category: "Bar",
    });

    expect(getItem(db, item.id)?.name).toBe("Sparkling Water");
    expect(listItems(db).some((it) => it.sku === "BAR-SPA")).toBe(true);

    const queued = extractPending(db);
    expect(queued).toHaveLength(1);
    expect(queued[0]).toMatchObject({
      entity: "items",
      entity_id: item.id,
      operation: "upsert",
    });
    expect(JSON.parse(queued[0].payload)).toMatchObject({
      name: "Sparkling Water",
      unit: "btl",
    });
  });

  test("updateItem re-queues the upsert with merged fields", () => {
    const item = createItem(db, { name: "Sparkling Water", unit: "btl" });

    updateItem(db, item.id, { category: "Bar" });

    const queued = extractPending(db);
    expect(queued).toHaveLength(2);
    const lastUpsert = queued
      .map((row) => JSON.parse(row.payload) as Record<string, unknown>)
      .find((payload) => payload.category === "Bar");
    expect(lastUpsert).toMatchObject({
      name: "Sparkling Water",
      unit: "btl",
      category: "Bar",
    });
  });

  test("softDeleteItem hides the item and queues a tombstone delete", () => {
    const item = createItem(db, { name: "Sparkling Water", unit: "btl" });

    const deleted = softDeleteItem(db, item.id);
    expect(deleted?.deleted_at).toBeTruthy();
    expect(getItem(db, item.id)).toBeNull();
    expect(
      listItems(db).some((it) => it.id === item.id),
    ).toBe(false);

    const queued = extractPending(db);
    const deleteRow = queued.find((row) => row.operation === "delete");
    expect(deleteRow).toMatchObject({
      entity: "items",
      entity_id: item.id,
      operation: "delete",
    });
  });
});