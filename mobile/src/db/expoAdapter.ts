import type { SQLiteDatabase } from "expo-sqlite";
import type { SqlDb, SqlRunResult } from "./types";

export function fromExpo(db: SQLiteDatabase): SqlDb {
  return {
    exec: (source) => db.execSync(source),
    run: (source, ...params) => {
      const result = db.runSync(source, ...(params as unknown as string[]));
      return { changes: result.changes } as SqlRunResult;
    },
    getFirst: (source, ...params) =>
      db.getFirstSync(source, ...(params as unknown as string[])),
    getAll: (source, ...params) =>
      db.getAllSync(source, ...(params as unknown as string[])),
    transaction: <T>(fn: () => T): T => {
      let result: T | undefined;
      db.withTransactionSync(() => {
        result = fn();
      });
      return result as T;
    },
  };
}