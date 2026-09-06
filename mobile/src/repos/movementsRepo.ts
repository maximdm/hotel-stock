import type { SqlDb } from "../db/types";
import { newUuid } from "../db/uuid";
import { nowIso } from "../db/time";
import { appendQueue } from "./syncQueueRepo";

export const MOVEMENT_TYPES = ["in", "out", "transfer", "adjust"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export interface Movement {
  id: string;
  movement_type: MovementType;
  item_id: string;
  from_zone_id: string | null;
  to_zone_id: string | null;
  quantity: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MovementInput {
  id?: string;
  type: MovementType;
  itemId: string;
  fromZoneId?: string | null;
  toZoneId?: string | null;
  quantity: number;
  createdBy?: string | null;
  createdAt?: string;
}

export class InsufficientStockError extends Error {
  constructor(
    public readonly itemId: string,
    public readonly zoneId: string,
    public readonly available: number,
    public readonly requested: number,
  ) {
    super(
      `Insufficient stock for item ${itemId} in zone ${zoneId}: ${available} available, ${requested} requested`,
    );
    this.name = "InsufficientStockError";
  }
}

interface ZoneEffect {
  zoneId: string;
  delta: number;
}

export function applyMovement(db: SqlDb, input: MovementInput): Movement {
  const { type, itemId, quantity } = input;
  if (!Number.isFinite(quantity) || quantity === 0) {
    throw new Error(`quantity must be a nonzero number, got ${quantity}`);
  }

  const fromZoneId = input.fromZoneId ?? null;
  const toZoneId = input.toZoneId ?? null;

  let effects: ZoneEffect[];
  switch (type) {
    case "in":
      if (!toZoneId) throw new Error('movement "in" requires toZoneId');
      effects = [{ zoneId: toZoneId, delta: quantity }];
      break;
    case "out":
      if (!fromZoneId) throw new Error('movement "out" requires fromZoneId');
      effects = [{ zoneId: fromZoneId, delta: -quantity }];
      break;
    case "transfer":
      if (!fromZoneId || !toZoneId) {
        throw new Error('movement "transfer" requires fromZoneId and toZoneId');
      }
      if (fromZoneId === toZoneId) {
        throw new Error("transfer must span two different zones");
      }
      effects = [
        { zoneId: fromZoneId, delta: -quantity },
        { zoneId: toZoneId, delta: quantity },
      ];
      break;
    case "adjust":
      if (!fromZoneId && !toZoneId) {
        throw new Error('movement "adjust" requires a target zone');
      }
      effects =
        quantity > 0
          ? [{ zoneId: toZoneId!, delta: quantity }]
          : [{ zoneId: fromZoneId!, delta: quantity }];
      break;
  }

  const id = input.id ?? newUuid();
  const createdAt = input.createdAt ?? nowIso();
  const createdBy = input.createdBy ?? null;

  const isDebit = type === "out" || type === "transfer" || (type === "adjust" && quantity < 0);
  const isCredit = type === "in" || type === "transfer" || (type === "adjust" && quantity > 0);
  const ledgerFrom = isDebit ? fromZoneId : null;
  const ledgerTo = isCredit ? toZoneId : null;

  db.transaction(() => {
    for (const effect of effects) {
      if (effect.delta < 0) {
        const available = getBalanceFor(db, itemId, effect.zoneId);
        if (available + effect.delta < 0) {
          throw new InsufficientStockError(
            itemId,
            effect.zoneId,
            available,
            Math.abs(effect.delta),
          );
        }
      }
    }

    db.run(
      `INSERT INTO stock_movements
         (id, movement_type, item_id, from_zone_id, to_zone_id, quantity, created_by, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      id,
      type,
      itemId,
      ledgerFrom,
      ledgerTo,
      quantity,
      createdBy,
      createdAt,
      createdAt,
    );

    for (const effect of effects) {
      upsertBalance(db, itemId, effect.zoneId, effect.delta, createdAt);
    }

    appendQueue(db, {
      entity: "stock_movements",
      entityId: id,
      operation: "upsert",
      payload: JSON.stringify({
        movement_type: type,
        item_id: itemId,
        from_zone_id: ledgerFrom,
        to_zone_id: ledgerTo,
        quantity,
        created_by: createdBy,
        created_at: createdAt,
        updated_at: createdAt,
      }),
    });
  });

  const row = db.getFirst<Movement>(
    "SELECT * FROM stock_movements WHERE id = ?",
    id,
  );
  if (!row) throw new Error("movement insert failed");
  return row;
}

export function getMovement(db: SqlDb, id: string): Movement | null {
  return db.getFirst<Movement>(
    "SELECT * FROM stock_movements WHERE id = ? AND deleted_at IS NULL",
    id,
  );
}

export function listMovements(
  db: SqlDb,
  opts?: { itemId?: string; limit?: number },
): Movement[] {
  const { itemId, limit = 200 } = opts ?? {};
  if (itemId) {
    return db.getAll<Movement>(
      `SELECT * FROM stock_movements
       WHERE deleted_at IS NULL AND item_id = ?
       ORDER BY created_at, id DESC
       LIMIT ?`,
      itemId,
      limit,
    );
  }
  return db.getAll<Movement>(
    `SELECT * FROM stock_movements
     WHERE deleted_at IS NULL
     ORDER BY created_at, id DESC
     LIMIT ?`,
    limit,
  );
}

export function getBalanceFor(
  db: SqlDb,
  itemId: string,
  zoneId: string,
): number {
  const row = db.getFirst<{ quantity: number }>(
    "SELECT quantity FROM stock_balance WHERE item_id = ? AND zone_id = ?",
    itemId,
    zoneId,
  );
  return row ? row.quantity : 0;
}

export function listBalances(db: SqlDb): Array<{
  item_id: string;
  zone_id: string;
  quantity: number;
  updated_at: string;
}> {
  return db.getAll(
    "SELECT * FROM stock_balance ORDER BY zone_id, item_id",
  );
}

function upsertBalance(
  db: SqlDb,
  itemId: string,
  zoneId: string,
  delta: number,
  at: string,
): void {
  const next = getBalanceFor(db, itemId, zoneId) + delta;
  db.run(
    `INSERT INTO stock_balance (item_id, zone_id, quantity, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(item_id, zone_id) DO UPDATE SET
       quantity = excluded.quantity,
       updated_at = excluded.updated_at`,
    itemId,
    zoneId,
    next,
    at,
  );
}