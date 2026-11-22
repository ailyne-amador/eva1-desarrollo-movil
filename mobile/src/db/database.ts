import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

const DATABASE_NAME = "todo.db";
const SCHEMA_VERSION = 1;

let dbPromise: Promise<SQLiteDatabase> | null = null;

async function migrate(db: SQLiteDatabase): Promise<void> {
  const version = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  const currentVersion = version?.user_version ?? 0;

  if (currentVersion < SCHEMA_VERSION) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          server_id INTEGER,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          latitude REAL,
          longitude REAL,
          location_name TEXT,
          photo_uri TEXT,
          photo_status TEXT NOT NULL DEFAULT 'none',
          sync_status TEXT NOT NULL DEFAULT 'pending_create',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_sync_status ON tasks(sync_status);
      `);
      await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    });
  }
}

export async function getDatabase(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabaseAsync(DATABASE_NAME).then(async (db) => {
      await migrate(db);
      return db;
    });
  }
  return dbPromise;
}

export async function closeDatabase(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    await db.closeAsync();
    dbPromise = null;
  }
}

export function resetDatabaseCache(): void {
  dbPromise = null;
}
