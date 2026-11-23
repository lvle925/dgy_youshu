

type Row = Record<string, any> & { id: string | number };

export function CompanySummary({ row }: { row: Row }) {
  return <div className="business-company-summary"><div className="business-company-mark">{String(row.name).slice(0, 1)}</div><div><h3>{row.name}</h3><p>{row.industry} · {row.scale}企业 · {row.district}</p></div><dl><div><dt>统一社会信用代码</dt><dd>{row.code}</dd></div><div><dt>注册资本</dt><dd>{row.regCapital}</dd></div><div><dt>社保人数</dt><dd>{row.socialSecurity} 人</dd></div><div><dt>所属园区</dt><dd>{row.park}</dd></div><div><dt>企业标签</dt><dd>{(row.tags ?? []).join("、")}</dd></div></dl></div>;
}
