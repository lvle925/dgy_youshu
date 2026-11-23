

type Row = Record<string, any> & { id: string | number };

export function readStoredIds(key: string) {
  try {
    const ids = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(ids) ? ids.map(String) : [];
  } catch {
    return [];
  }
}

export function PolicyDetails({ row }: { row: Row }) {
  return <div className="business-detail-prose"><p>{row.content || "政策内容请以发布部门正式文件为准。"}</p><h3>申报条件</h3><ul>{(row.requirements ?? ["符合本市产业发展导向", "在本市依法登记并正常经营"]).map((item: string) => <li key={item}>{item}</li>)}</ul><h3>申报材料</h3><ul>{(row.materials ?? ["项目申请表", "企业资质证明材料"]).map((item: string) => <li key={item}>{item}</li>)}</ul></div>;
}
