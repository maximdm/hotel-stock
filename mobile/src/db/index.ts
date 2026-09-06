import { openDatabaseSync } from "expo-sqlite";
import { fromExpo } from "./expoAdapter";
import { applyMigrations } from "./migrate";
import { seedAll } from "./seed";
import type { SqlDb } from "./types";

let cached: SqlDb | null = null;

export function initDatabase(): SqlDb {
  if (cached) return cached;
  const raw = openDatabaseSync("hotelstock.db");
  const db = fromExpo(raw);
  applyMigrations(db);
  seedAll(db);
  cached = db;
  return db;
}

export function resetDatabase(): void {
  cached = null;
}