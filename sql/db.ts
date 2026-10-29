import fs from 'fs';
import path from 'path';
import initSqlJs, { Database } from 'sql.js';

/** In-memory SQLite (sql.js / WebAssembly — no native build or server needed). */
export const SQL_DIR = __dirname;

export const QUERIES = {
  'round-trip transfers': 'scenario1_round_trip_transfers.sql',
  'IPL streaks': 'scenario2_ipl_streaks.sql',
} as const;

export type QueryName = keyof typeof QUERIES;

const read = (file: string) => fs.readFileSync(path.join(SQL_DIR, file), 'utf8');

export async function openSeededDb(): Promise<Database> {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON;');
  db.exec(read('schema.sql'));
  db.exec(read('seed.sql'));
  return db;
}

export function querySql(name: QueryName): string {
  return read(QUERIES[name]);
}

export function runQuery(db: Database, name: QueryName): { columns: string[]; rows: Record<string, unknown>[] } {
  const [result] = db.exec(querySql(name));
  if (!result) return { columns: [], rows: [] };
  return {
    columns: result.columns,
    rows: result.values.map((v) => Object.fromEntries(result.columns.map((c, i) => [c, v[i]]))),
  };
}
