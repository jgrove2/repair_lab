// Small helpers wrapping c.env.DB prepared statements.
export async function listAll<T>(db: D1Database, sql: string): Promise<T[]> {
  const res = await db.prepare(sql).all<T>();
  return res.results ?? [];
}

export async function getOne<T>(
  db: D1Database,
  sql: string,
  ...params: unknown[]
): Promise<T | null> {
  const row = await db
    .prepare(sql)
    .bind(...params)
    .first<T>();
  return row ?? null;
}
