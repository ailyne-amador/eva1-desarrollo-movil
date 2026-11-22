// Mock de expo-sqlite para pruebas con una base SQLite en memoria.
// Soporta solo las operaciones y sintaxis que usa la app.

type Row = Record<string, SQLiteBindValue>;
type Table = Row[];

type SQLiteBindValue = string | number | null | boolean | Uint8Array;

const tables = new Map<string, Table>();
let userVersion = 0;

function normalizeParams(
  params: SQLiteBindValue[] | Record<string, SQLiteBindValue>,
): SQLiteBindValue[] {
  if (Array.isArray(params)) return params;
  return Object.values(params);
}

function parseWhere(sql: string): { table: string; conditions: string[] } | null {
  const match = sql.match(/FROM\s+(\w+)\s+WHERE\s+(.+)/i);
  if (!match) return null;
  return {
    table: match[1],
    conditions: match[2].split(/\s+AND\s+/i).map((c) => c.trim()),
  };
}

function parseInValues(literalList: string): SQLiteBindValue[] {
  return literalList
    .split(",")
    .map((v) => v.trim())
    .map((v) => {
      if (v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1);
      const num = Number(v);
      return Number.isNaN(num) ? v : num;
    });
}

function rowMatches(row: Row, conditions: string[], params: SQLiteBindValue[]): boolean {
  let paramIndex = 0;
  for (const condition of conditions) {
    const inMatch = condition.match(/(\w+)\s+IN\s*\(([^)]+)\)/i);
    if (inMatch) {
      const column = inMatch[1];
      const values = parseInValues(inMatch[2]);
      const rowValue = row[column];
      if (!values.some((v) => v === rowValue)) return false;
      continue;
    }

    const match = condition.match(/(\w+)\s*(=|!=|<>)\s*\?/i);
    if (!match) continue;
    const column = match[1];
    const operator = match[2].toLowerCase();
    const value = params[paramIndex++];
    const rowValue = row[column];
    if (operator === "=" && rowValue !== value) return false;
    if ((operator === "!=" || operator === "<>") && rowValue === value)
      return false;
  }
  return true;
}

function parseInsert(sql: string): { table: string; columns: string[] } | null {
  const match = sql.match(/INSERT INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES/i);
  if (!match) return null;
  return {
    table: match[1],
    columns: match[2].split(",").map((c) => c.trim()),
  };
}

function parseUpdate(sql: string): { table: string; setColumns: string[] } | null {
  const match = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.+)\s+WHERE/i);
  if (!match) return null;
  const setPart = match[2];
  const columns: string[] = [];
  const parts = setPart.split(",").map((p) => p.trim());
  for (const part of parts) {
    const colMatch = part.match(/(\w+)\s*=/);
    if (colMatch) columns.push(colMatch[1]);
  }
  return { table: match[1], setColumns: columns };
}

function parseDelete(sql: string): { table: string } | null {
  const match = sql.match(/DELETE FROM\s+(\w+)/i);
  if (!match) return null;
  return { table: match[1] };
}

function parseOrderBy(sql: string): { column: string; direction: string } | null {
  const match = sql.match(/ORDER BY\s+(\w+)\s*(ASC|DESC)?/i);
  if (!match) return null;
  return { column: match[1], direction: (match[2] ?? "ASC").toUpperCase() };
}

function parseCreateTable(sql: string): { table: string } | null {
  const match = sql.match(/CREATE TABLE IF NOT EXISTS\s+(\w+)/i);
  if (!match) return null;
  return { table: match[1] };
}

function parsePragma(sql: string): { name: string } | null {
  const match = sql.match(/PRAGMA\s+(\w+)/i);
  if (!match) return null;
  return { name: match[1] };
}

function matchesSimpleWhere(row: Row, whereSql: string, params: SQLiteBindValue[]): boolean {
  const conditions = whereSql.split(/\s+AND\s+/i).map((c) => c.trim());
  return rowMatches(row, conditions, params);
}

class MockDatabase {
  async getFirstAsync<T>(sql: string, params: SQLiteBindValue[] = []): Promise<T | null> {
    const rows = await this.getAllAsync<T>(sql, params);
    return rows[0] ?? null;
  }

  async getAllAsync<T>(sql: string, params: SQLiteBindValue[] = []): Promise<T[]> {
    const pragma = parsePragma(sql);
    if (pragma?.name === "user_version") {
      return [{ user_version: userVersion } as unknown as T];
    }

    const parsed = parseWhere(sql);
    if (!parsed) return [];
    let rows = tables.get(parsed.table) ?? [];
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER BY|$)/is);
    if (whereMatch) {
      rows = rows.filter((row) =>
        matchesSimpleWhere(row as Row, whereMatch[1], normalizeParams(params)),
      );
    }

    const order = parseOrderBy(sql);
    if (order) {
      rows = [...rows].sort((a, b) => {
        const aVal = (a as Row)[order.column];
        const bVal = (b as Row)[order.column];
        if (aVal === bVal) return 0;
        const result = aVal! > bVal! ? 1 : -1;
        return order.direction === "DESC" ? -result : result;
      });
    }

    return rows as T[];
  }

  async runAsync(sql: string, ...args: unknown[]): Promise<{ lastInsertRowId: number; changes: number }> {
    const params = Array.isArray(args[0]) ? args[0] : args;
    const normalized = normalizeParams(params as SQLiteBindValue[]);

    const insert = parseInsert(sql);
    if (insert) {
      const row: Row = {};
      insert.columns.forEach((col, index) => {
        row[col] = normalized[index] ?? null;
      });
      const table = tables.get(insert.table) ?? [];
      table.push(row);
      tables.set(insert.table, table);
      return { lastInsertRowId: table.length, changes: 1 };
    }

    const update = parseUpdate(sql);
    if (update) {
      const whereMatch = sql.match(/WHERE\s+(.+)/is);
      let rows = tables.get(update.table) ?? [];
      let changes = 0;
      rows = rows.map((row) => {
        if (whereMatch && !matchesSimpleWhere(row, whereMatch[1], normalized.slice(update.setColumns.length))) {
          return row;
        }
        update.setColumns.forEach((col, index) => {
          row[col] = normalized[index] ?? null;
        });
        changes++;
        return row;
      });
      tables.set(update.table, rows);
      return { lastInsertRowId: 0, changes };
    }

    const del = parseDelete(sql);
    if (del) {
      const whereMatch = sql.match(/WHERE\s+(.+)/is);
      const rows = tables.get(del.table) ?? [];
      let changes = 0;
      const filtered = rows.filter((row) => {
        if (whereMatch && matchesSimpleWhere(row, whereMatch[1], normalized)) {
          changes++;
          return false;
        }
        return !whereMatch;
      });
      tables.set(del.table, filtered);
      return { lastInsertRowId: 0, changes };
    }

    return { lastInsertRowId: 0, changes: 0 };
  }

  async execAsync(sql: string): Promise<void> {
    const createTable = parseCreateTable(sql);
    if (createTable) {
      if (!tables.has(createTable.table)) {
        tables.set(createTable.table, []);
      }
      return;
    }
    const pragma = parsePragma(sql);
    if (pragma?.name === "user_version") {
      const match = sql.match(/=\s*(\d+)/);
      if (match) userVersion = Number(match[1]);
    }
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    await task();
  }

  async closeAsync(): Promise<void> {}
}

export async function openDatabaseAsync(): Promise<MockDatabase> {
  return new MockDatabase();
}

export async function deleteDatabaseAsync(): Promise<void> {
  tables.clear();
  userVersion = 0;
}

export function __resetMockDatabase(): void {
  tables.clear();
  userVersion = 0;
}
