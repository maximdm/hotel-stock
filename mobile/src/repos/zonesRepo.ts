import type { SqlDb } from "../db/types";

export interface Zone {
  id: string;
  code: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export function listZones(db: SqlDb): Zone[] {
  return db.getAll<Zone>("SELECT * FROM zones ORDER BY name");
}

export function getZoneById(db: SqlDb, id: string): Zone | null {
  return db.getFirst<Zone>("SELECT * FROM zones WHERE id = ?", id);
}

export function getZoneByCode(db: SqlDb, code: string): Zone | null {
  return db.getFirst<Zone>("SELECT * FROM zones WHERE code = ?", code);
}