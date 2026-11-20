import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../src/api.js";

export type CollectionSource = "loading" | "server" | "local";
export type BusinessRecord = { id: string | number; [key: string]: unknown };

function readCache<T extends BusinessRecord>(key: string) {
  try {
    const value = localStorage.getItem(key);
    const parsed: unknown = value ? JSON.parse(value) : null;
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

function writeCache<T extends BusinessRecord>(key: string, rows: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(rows));
  } catch {
    // Browser storage can be disabled. The current page remains usable in memory.
  }
}

function createLocalId() {
  return globalThis.crypto?.randomUUID?.() ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useBusinessCollection<T extends BusinessRecord>({
  key,
  seed,
  apiCollection,
}: {
  key: string;
  seed: T[];
  apiCollection?: string;
}) {
  const [rows, setRows] = useState<T[]>(() => readCache<T>(key) ?? seed);
  const [source, setSource] = useState<CollectionSource>("loading");
  const [error, setError] = useState("");
  const sourceRef = useRef<CollectionSource>("loading");

  const updateSource = useCallback((next: CollectionSource) => {
    sourceRef.current = next;
    setSource(next);
  }, []);

  const refresh = useCallback(async () => {
    if (!apiCollection) {
      updateSource("local");
      return;
    }
    setError("");
    try {
      const result = (await api.list(apiCollection)) as T[];
      setRows(result);
      writeCache(key, result);
      updateSource("server");
    } catch (cause) {
      const cached = readCache<T>(key);
      setRows(cached ?? seed);
      setError(cause instanceof Error ? cause.message : "数据接口暂不可用");
      updateSource("local");
    }
  }, [apiCollection, key, seed, updateSource]);

  useEffect(() => {
    let active = true;
    if (!apiCollection) {
      updateSource("local");
      return () => {
        active = false;
      };
    }
    api.list(apiCollection)
      .then((result: T[]) => {
        if (!active) return;
        setRows(result);
        writeCache(key, result);
        setError("");
        updateSource("server");
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setRows(readCache<T>(key) ?? seed);
        setError(cause instanceof Error ? cause.message : "数据接口暂不可用");
        updateSource("local");
      });
    return () => {
      active = false;
    };
  }, [apiCollection, key, seed, updateSource]);

  useEffect(() => {
    if (source !== "loading") writeCache(key, rows);
  }, [key, rows, source]);

  const createRecord = useCallback(async (input: Omit<T, "id">) => {
    if (apiCollection && sourceRef.current === "server") {
      const saved = (await api.create(apiCollection, input)) as T;
      setRows((current) => [saved, ...current]);
      return saved;
    }
    const saved = { ...input, id: createLocalId() } as T;
    setRows((current) => [saved, ...current]);
    return saved;
  }, [apiCollection]);

  const updateRecord = useCallback(async (id: T["id"], patch: Partial<T>) => {
    const current = rows.find((row) => String(row.id) === String(id));
    if (!current) throw new Error("记录已不存在，请刷新后重试");
    const next = { ...current, ...patch };
    const saved = apiCollection && sourceRef.current === "server"
      ? ((await api.update(apiCollection, next)) as T)
      : next;
    setRows((items) => items.map((row) => String(row.id) === String(id) ? saved : row));
    return saved;
  }, [apiCollection, rows]);

  const removeRecord = useCallback(async (id: T["id"]) => {
    if (apiCollection && sourceRef.current === "server") {
      await api.remove(apiCollection, id);
    }
    setRows((items) => items.filter((row) => String(row.id) !== String(id)));
  }, [apiCollection]);

  return { rows, setRows, loading: source === "loading", source, error, refresh, createRecord, updateRecord, removeRecord };
}
