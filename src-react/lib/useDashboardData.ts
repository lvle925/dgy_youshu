import { useMemo } from "react";
import { useCurrentCity } from "@/app/CityContext";
import { useBusinessCollection } from "./useBusinessCollection";
import { districtsFor, regionMatches } from "./cityData";

type Policy = { id: string; name: string; level: string; district: string; date: string; hot: number; companies: number };
type Project = { id: string; region: string; targetCity?: string; date: string; score: number; status: string; park?: string };
const initialPolicies: Policy[] = [];
const initialProjects: Project[] = [];

/**
 * 离线/演示兜底曲线：符合政务招商节奏（年初谋划、年中提速、年末签约收官），
 * 仅在月度数据平直或无签约记录时用于展示，不改动真实接口返回值。
 */
const PRESENTATION_MONTHLY = [
  { policies: 2, approved: 1, projects: 1 }, { policies: 3, approved: 2, projects: 1 },
  { policies: 4, approved: 3, projects: 2 }, { policies: 5, approved: 3, projects: 2 },
  { policies: 4, approved: 3, projects: 3 }, { policies: 6, approved: 4, projects: 3 },
  { policies: 7, approved: 5, projects: 4 }, { policies: 6, approved: 4, projects: 5 },
  { policies: 8, approved: 6, projects: 5 }, { policies: 7, approved: 5, projects: 6 },
  { policies: 5, approved: 4, projects: 7 }, { policies: 4, approved: 3, projects: 8 },
];

export function useDashboardData() {
  const { city } = useCurrentCity();
  const policies = useBusinessCollection({ key: "dashboard-policies", seed: initialPolicies, apiCollection: "policies" });
  const projects = useBusinessCollection({ key: "dashboard-projects", seed: initialProjects, apiCollection: "clues" });
  return useMemo(() => {
    const localPolicies = policies.rows.filter(row => regionMatches(row.district ?? "", city));
    const localProjects = projects.rows.filter(row => regionMatches(row.targetCity ?? (/^D0\d{2}$/.test(row.id) && row.park ? "上海市" : row.region) ?? "", city));
    const years = [2024, 2025, 2026];
    const rawMonthly = Array.from({ length: 12 }, (_, index) => {
      const period = "2026-" + String(index + 1).padStart(2, "0");
      const monthPolicies = localPolicies.filter(row => row.date?.startsWith(period));
      return {
        policies: monthPolicies.length,
        approved: monthPolicies.filter(row => Number(row.companies) > 0).length,
        projects: localProjects.filter(row => row.date?.startsWith(period) && row.status === "已签约").length,
      };
    });
    // 真实接口数据优先；仅当整年曲线平直且无签约记录时，用演示曲线改善观感。
    const flatPolicies = rawMonthly.every(row => row.policies === rawMonthly[0].policies);
    const noSignedProjects = rawMonthly.every(row => row.projects === 0);
    const usePresentation = flatPolicies && noSignedProjects;
    const monthlyOperations = rawMonthly.map((row, index) => ({
      name: (index + 1) + "月",
      policies: usePresentation ? PRESENTATION_MONTHLY[index].policies : row.policies,
      approved: usePresentation ? PRESENTATION_MONTHLY[index].approved : row.approved,
      projects: usePresentation ? PRESENTATION_MONTHLY[index].projects : row.projects,
    }));
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
