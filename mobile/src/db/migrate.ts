import type { SqlDb } from "./types";
import { MIGRATIONS } from "./schema";

export function applyMigrations(db: SqlDb): void {
  db.exec("PRAGMA foreign_keys = ON");
  const row = db.getFirst<{ user_version: number }>("PRAGMA user_version");
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const target = version + 1;
    db.transaction(() => {
      db.exec(MIGRATIONS[version]);
      db.exec(`PRAGMA user_version = ${target}`);
    });
    version = target;
  }
}