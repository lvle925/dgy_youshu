import { useMemo } from "react";
import { useCurrentCity } from "@/app/CityContext";
import { useBusinessCollection } from "./useBusinessCollection";
import { districtsFor, regionMatches } from "./cityData";

type Policy = { id: string; name: string; level: string; district: string; date: string; hot: number; companies: number };
type Project = { id: string; region: string; targetCity?: string; date: string; score: number; status: string; park?: string };
const initialPolicies: Policy[] = [];
const initialProjects: Project[] = [];

export function useDashboardData() {
  const { city } = useCurrentCity();
  const policies = useBusinessCollection({ key: "dashboard-policies", seed: initialPolicies, apiCollection: "policies" });
  const projects = useBusinessCollection({ key: "dashboard-projects", seed: initialProjects, apiCollection: "clues" });
  return useMemo(() => {
    const localPolicies = policies.rows.filter(row => regionMatches(row.district ?? "", city));
    const localProjects = projects.rows.filter(row => regionMatches(row.targetCity ?? (/^D0\d{2}$/.test(row.id) && row.park ? "上海市" : row.region) ?? "", city));
    const years = [2024, 2025, 2026];
    const monthlyOperations = Array.from({ length: 12 }, (_, index) => {
      const period = "2026-" + String(index + 1).padStart(2, "0");
      const monthPolicies = localPolicies.filter(row => row.date?.startsWith(period));
      return {
        name: (index + 1) + "月",
        policies: monthPolicies.length,
        approved: monthPolicies.filter(row => Number(row.companies) > 0).length,
        projects: localProjects.filter(row => row.date?.startsWith(period) && row.status === "已签约").length,
      };
    });
    const districts = districtsFor(city);
    const districtsTrend = (districts.length ? districts : [city]).map(district => ({
      name: district,
      ...Object.fromEntries(years.map(year => [year, localPolicies.filter(row => regionMatches(row.district ?? "", district) && row.date?.startsWith(String(year))).length])),
    }));
    const hotPolicyRank = localPolicies.filter(row => Number(row.hot) > 0)
      .map(row => ({ id: row.id, name: row.name, value: Number(row.hot) })).sort((a, b) => b.value - a.value).slice(0, 8);
    return { city, localPolicies, localProjects, monthlyOperations, districtsTrend, hotPolicyRank };
  }, [city, policies.rows, projects.rows]);
}
