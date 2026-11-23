import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../../src/api.js";

type Points = { limit: number; remaining: number; unlockedIds: string[] };
const PointsContext = createContext<{
  balance: Points | null;
  unlock: (id: string | number) => Promise<void>;
}>({ balance: null, unlock: async () => undefined });

export const usePoints = () => useContext(PointsContext);

export function PointsProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState<Points | null>(null);
  const refresh = useCallback(() => {
    void api.points().then(setBalance).catch(() => setBalance(null));
  }, []);
  useEffect(() => {
    refresh();
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener("focus", refresh);
      window.clearInterval(timer);
    };
  }, [refresh]);

  const unlock = useCallback(async (id: string | number) => {
    setBalance(await api.unlockProject(id));
  }, []);
  return <PointsContext.Provider value={{ balance, unlock }}>{children}</PointsContext.Provider>;
}
