import { useBusinessCollection } from "@/lib/useBusinessCollection";
import { useCurrentCity } from "@/app/CityContext";

export type CallRecord = { id: string; company: string; city: string; phone: string; task: string; duration: string; result: string; intent: string; time: string; audioUrl?: string; transcript?: string };
const empty: CallRecord[] = [];
export function useOutboundRecords() {
  const { city } = useCurrentCity();
  const { rows, error, loading } = useBusinessCollection({ key: "youshu-ai-records", seed: empty, apiCollection: "aiRecords" });
  return { rows: rows.filter(row => city === row.city), error, loading };
}
