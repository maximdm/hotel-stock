export type SqlValue = string | number | bigint | null | Uint8Array;

export interface SqlRunResult {
  changes: number | bigint;
}

export interface SqlDb {
  exec(source: string): void;
  run(source: string, ...params: SqlValue[]): SqlRunResult;
  getFirst<T>(source: string, ...params: SqlValue[]): T | null;
  getAll<T>(source: string, ...params: SqlValue[]): T[];
  transaction<T>(fn: () => T): T;
}