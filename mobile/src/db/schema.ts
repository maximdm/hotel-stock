export const MIGRATIONS: readonly string[] = [
  // v1 — core domain: zones, items, stock ledger + balances, sync queue
  `
  CREATE TABLE IF NOT EXISTS zones (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT UNIQUE,
    unit TEXT NOT NULL DEFAULT 'pcs',
    category TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'transfer', 'adjust')),
    item_id TEXT NOT NULL REFERENCES items(id),
    from_zone_id TEXT REFERENCES zones(id),
    to_zone_id TEXT REFERENCES zones(id),
    quantity REAL NOT NULL CHECK (quantity <> 0),
    created_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements (item_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_stock_movements_zone ON stock_movements (from_zone_id, created_at);

  CREATE TABLE IF NOT EXISTS stock_balance (
    item_id TEXT NOT NULL REFERENCES items(id),
    zone_id TEXT NOT NULL REFERENCES zones(id),
    quantity REAL NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    updated_at TEXT NOT NULL,
    PRIMARY KEY (item_id, zone_id)
  );

  CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('upsert', 'delete')),
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    synced_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_sync_queue_unsynced ON sync_queue (synced_at, created_at);

  CREATE TABLE IF NOT EXISTS sync_state (
    table_name TEXT PRIMARY KEY,
    last_pulled_at TEXT,
    last_push_at TEXT
  );
  `,
];