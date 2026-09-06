import type { SqlDb } from "../db/types";
import { newUuid } from "../db/uuid";
import { nowIso } from "../db/time";

export interface QueueRow {
  id: string;
  entity: string;
  entity_id: string;
  operation: "upsert" | "delete";
  payload: string;
  created_at: string;
  attempts: number;
  last_error: string | null;
  synced_at: string | null;
}

export interface QueueAppendInput {
  entity: string;
  entityId: string;
  operation: "upsert" | "delete";
  payload: string;
  id?: string;
  createdAt?: string;
  attempts?: number;
}

export function appendQueue(db: SqlDb, input: QueueAppendInput): QueueRow {
  const id = input.id ?? newUuid();
  const createdAt = input.createdAt ?? nowIso();
  const row: QueueRow = {
    id,
    entity: input.entity,
    entity_id: input.entityId,
    operation: input.operation,
    payload: input.payload,
    created_at: createdAt,
    attempts: input.attempts ?? 0,
    last_error: null,
    synced_at: null,
  };
  db.run(
    "INSERT INTO sync_queue (id, entity, entity_id, operation, payload, created_at, attempts, last_error, synced_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL)",
    id,
    row.entity,
    row.entity_id,
    row.operation,
    row.payload,
    createdAt,
    row.attempts,
  );
  return row;
}

export function extractPending(db: SqlDb, limit = 100): QueueRow[] {
  return db.getAll<QueueRow>(
    `SELECT * FROM sync_queue
     WHERE synced_at IS NULL
     ORDER BY created_at, id
     LIMIT ?`,
    limit,
  );
}

export function countPending(db: SqlDb): number {
  const row = db.getFirst<{ n: number }>(
    "SELECT COUNT(*) AS n FROM sync_queue WHERE synced_at IS NULL",
  );
  return row?.n ?? 0;
}

export function markSynced(db: SqlDb, id: string, syncedAt?: string): void {
  db.run(
    "UPDATE sync_queue SET synced_at = ?, last_error = NULL WHERE id = ?",
    syncedAt ?? nowIso(),
    id,
  );
}

export function markFailed(db: SqlDb, id: string, error: string): void {
  db.run(
    "UPDATE sync_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?",
    error,
    id,
  );
}