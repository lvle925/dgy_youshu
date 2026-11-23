import { logs } from "../../../src/data/mock.js";

type Row = Record<string, any> & { id: string | number };

export const normalizedLogs = (logs as Row[]).map((row) => ({
  ...row,
  title: row.action,
  operator: row.user,
  type: row.module,
  content: row.target,
}));
