import { sql } from '@databases/sqlite';

/**
 * Safely builds a SQL query from a string with {0}, {1}, {2}... placeholders
 * and a params array. Uses @databases/sqlite's parameter binding (sql.value) for safety.
 */
export function rawSql(queryString: string, params: unknown[] = []): any {
  const fragments: any[] = [];
  let result: any = sql``;
  let lastIndex = 0;

  const regex = /\{(\d+)\}/g;
  let match;

  while ((match = regex.exec(queryString)) !== null) {
    const beforePart = queryString.substring(lastIndex, match.index);
    if (beforePart) {
      result = sql`${result}${sql.__dangerous__rawValue(beforePart)}`;
    }
    const paramIndex = parseInt(match[1], 10);
    if (paramIndex >= 0 && paramIndex < params.length) {
      result = sql`${result}${sql.value(params[paramIndex])}`;
    }
    lastIndex = regex.lastIndex;
  }

  const afterPart = queryString.substring(lastIndex);
  if (afterPart) {
    result = sql`${result}${sql.__dangerous__rawValue(afterPart)}`;
  }

  return result;
}