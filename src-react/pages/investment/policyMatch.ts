import { companies } from "../../../src/data/mock.js";
import { regionMatches } from "@/lib/cityData";

const normalize = (value: unknown) => String(value ?? "").normalize("NFKC").replace(/\s+/g, "").toLowerCase();
const industries: Record<string, string[]> = {
  人工智能: ["人工智能", "软件和信息技术服务业", "数字经济", "机器学习"],
  生物医药: ["生物医药", "生命健康", "生物技术", "医药制造"],
  集成电路: ["集成电路", "半导体", "芯片", "电子制造"],
  智能制造: ["智能制造", "先进制造", "工业自动化", "制造业"],
  新能源: ["新能源", "清洁能源", "储能", "电池"],
};

export function matchPolicies<T extends Record<string, unknown>>(rows: T[], query: { name: string; industry: string; region: string; city: string }) {
  const name = normalize(query.name);
  const profile = companies.find(company => normalize(company.name) === name || normalize(company.shortName) === name)
    ?? companies.find(company => normalize(company.name).includes(name));
  const industry = normalize(query.industry || profile?.industry);
  const region = normalize(query.region || profile?.district || query.city);
  const industryTerms = (industries[industry] ?? [industry]).filter(Boolean);
  return rows.flatMap(row => {
    const text = normalize([row.name, row.type, row.industry, row.content, row.requirements].join(" "));
    const location = String(row.district ?? "");
    const direct = normalize(row.industry).includes(industry) && industry.length > 0;
    const relevant = industryTerms.some(term => text.includes(term));
    const nameMatch = text.includes(name);
    const exactRegion = location === region || regionMatches(location, region);
    const cityWide = query.city !== region && normalize(location) === normalize(query.city) && regionMatches(region, query.city);
    const nationwide = row.level === "国家级";
    if ((!exactRegion && !cityWide && !nationwide) || (industry ? !relevant : !nameMatch)) return [];
    const fit = Math.min(100, (direct ? 53 : relevant ? 39 : 48) + (exactRegion ? 29 : cityWide ? 22 : 16)
      + (nameMatch ? 8 : 0) + (row.status === "申报中" ? 6 : 0) + Math.min(5, Number(row.stars) || 0));
    return [{ ...row, fit, basis: [direct ? "行业直接命中" : relevant ? "命中关联行业" : "命中企业关键词",
      exactRegion ? "区域命中" : cityWide ? "全市适用" : "全国适用"].join(" · ") }];
  }).sort((a, b) => b.fit - a.fit);
}
