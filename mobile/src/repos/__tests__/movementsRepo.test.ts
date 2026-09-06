import { DatabaseSync } from "node:sqlite";
import type { SqlDb, SqlValue } from "../../db/types";
import { applyMigrations } from "../../db/migrate";
import { seedAll, ZONE_SEEDS, ITEM_SEEDS } from "../../db/seed";
import {
  applyMovement,
  InsufficientStockError,
  getBalanceFor,
  listMovements,
} from "../movementsRepo";
import { countPending, extractPending } from "../syncQueueRepo";

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

const RESTAURANT = ZONE_SEEDS[0];
const MAIN_STORAGE = ZONE_SEEDS[3];
const MILK = ITEM_SEEDS[0];

describe("stock ledger + balance invariant", () => {
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

  test("'in' appends a ledger row, updates balance, and queues it", () => {
    const movement = applyMovement(db, {
      type: "in",
      itemId: MILK.id,
      toZoneId: RESTAURANT.id,
      quantity: 10,
      createdBy: "user-1",
    });

    expect(movement.id).toBeTruthy();
    expect(getBalanceFor(db, MILK.id, RESTAURANT.id)).toBe(10);
    expect(listMovements(db)).toHaveLength(1);
    expect(countPending(db)).toBe(1);

    const queued = extractPending(db);
    expect(queued[0]).toMatchObject({
      entity: "stock_movements",
      entity_id: movement.id,
      operation: "upsert",
    });
    expect(JSON.parse(queued[0].payload)).toMatchObject({
      movement_type: "in",
      quantity: 10,
      to_zone_id: RESTAURANT.id,
    });
  });

  test("'out' beyond balance is rejected and rolls back completely", () => {
    applyMovement(db, {
      type: "in",
      itemId: MILK.id,
      toZoneId: RESTAURANT.id,
      quantity: 5,
    });

    expect(() =>
      applyMovement(db, {
        type: "out",
        itemId: MILK.id,
        fromZoneId: RESTAURANT.id,
        quantity: 6,
      }),
    ).toThrow(InsufficientStockError);

    expect(getBalanceFor(db, MILK.id, RESTAURANT.id)).toBe(5);
    expect(listMovements(db)).toHaveLength(1);
    expect(countPending(db)).toBe(1);
  });

  test("'out' down to exactly zero is allowed", () => {
    applyMovement(db, {
      type: "in",
      itemId: MILK.id,
      toZoneId: RESTAURANT.id,
      quantity: 7,
    });
    applyMovement(db, {
      type: "out",
      itemId: MILK.id,
      fromZoneId: RESTAURANT.id,
      quantity: 7,
    });

    expect(getBalanceFor(db, MILK.id, RESTAURANT.id)).toBe(0);
    expect(listMovements(db)).toHaveLength(2);
    expect(countPending(db)).toBe(2);
  });

  test("'transfer' moves balance across zones and preserves the total", () => {
    applyMovement(db, {
      type: "in",
      itemId: MILK.id,
      toZoneId: MAIN_STORAGE.id,
      quantity: 40,
    });

    applyMovement(db, {
      type: "transfer",
      itemId: MILK.id,
      fromZoneId: MAIN_STORAGE.id,
      toZoneId: RESTAURANT.id,
      quantity: 12,
      createdBy: "user-2",
    });

    expect(getBalanceFor(db, MILK.id, MAIN_STORAGE.id)).toBe(28);
    expect(getBalanceFor(db, MILK.id, RESTAURANT.id)).toBe(12);

    const movements = listMovements(db);
    expect(movements).toHaveLength(2);
    const transfer = movements.find((m) => m.movement_type === "transfer");
    expect(transfer).toMatchObject({
      movement_type: "transfer",
      quantity: 12,
      from_zone_id: MAIN_STORAGE.id,
      to_zone_id: RESTAURANT.id,
      created_by: "user-2",
    });
    expect(countPending(db)).toBe(2);
  });

  test("'transfer' from a zone without enough stock is rejected", () => {
    expect(() =>
      applyMovement(db, {
        type: "transfer",
        itemId: MILK.id,
        fromZoneId: RESTAURANT.id,
        toZoneId: MAIN_STORAGE.id,
        quantity: 1,
      }),
    ).toThrow(InsufficientStockError);

    expect(getBalanceFor(db, MILK.id, RESTAURANT.id)).toBe(0);
    expect(getBalanceFor(db, MILK.id, MAIN_STORAGE.id)).toBe(0);
    expect(listMovements(db)).toHaveLength(0);
    expect(countPending(db)).toBe(0);
  });

  test("'adjust' adds stock to a zone and removes stock with a negative guard", () => {
    applyMovement(db, {
      type: "adjust",
      itemId: MILK.id,
      toZoneId: RESTAURANT.id,
      quantity: 3,
    });
    expect(getBalanceFor(db, MILK.id, RESTAURANT.id)).toBe(3);

    expect(() =>
      applyMovement(db, {
        type: "adjust",
        itemId: MILK.id,
        fromZoneId: RESTAURANT.id,
        quantity: -4,
      }),
    ).toThrow(InsufficientStockError);

    applyMovement(db, {
      type: "adjust",
      itemId: MILK.id,
      fromZoneId: RESTAURANT.id,
      quantity: -2,
    });
    expect(getBalanceFor(db, MILK.id, RESTAURANT.id)).toBe(1);
  });
});