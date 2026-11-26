import { useState } from "react";
import { DataTable } from "@/../src/components/shared/DataTable";
import { NativeSelect, PageSection, SearchField, StatusValue } from "@/pages/PagePrimitives";
import { OutboundSetup } from "./OutboundSetup";
import { useOutboundRecords } from "./outboundRecords";

export default function AiOutboundRecordsPage() {
  return <OutboundSetup title="通话记录"><CallTable /></OutboundSetup>;
}

function CallTable() {
  const { rows, error } = useOutboundRecords();
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState("");
  const [intent, setIntent] = useState("");
  const [audioError, setAudioError] = useState(false);
  const filtered = rows.filter(row => (row.company + row.task).includes(keyword.trim()) && (!result || row.result === result) && (!intent || row.intent === intent));
  const maskPhone = (phone: string) => phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
  return <PageSection title="通话清单" description="查看录音及转写记录" error={error} onRetry={() => window.location.reload()}>
    <div className="business-toolbar"><SearchField value={keyword} onChange={setKeyword} placeholder="搜索企业或任务" /><NativeSelect label="沟通结果" value={result} onChange={setResult} options={[...new Set(rows.map(row => row.result))]} /><NativeSelect label="意向等级" value={intent} onChange={setIntent} options={[...new Set(rows.map(row => row.intent))]} /></div>
    <DataTable data={filtered} detailTitle="通话详情" columns={[
      { key: "company", header: "企业名称", sortable: true }, { key: "phone", header: "联系电话", cell: row => maskPhone(String(row.phone ?? "")) },
      { key: "task", header: "外呼任务" }, { key: "duration", header: "通话时长" },
      { key: "result", header: "沟通结果", cell: row => <StatusValue value={row.result} /> },
      { key: "intent", header: "意向等级" }, { key: "time", header: "通话时间", sortable: true },
    ]} renderDetails={row => <div className="business-detail-prose">
      <h3>{row.company}</h3><p>{row.task} · {row.time}</p><StatusValue value={row.result} />
      <h3>通话录音</h3>{row.audioUrl && /^(https?:\/\/|\/|blob:)/.test(row.audioUrl) ? <audio controls preload="none" src={row.audioUrl} onError={() => setAudioError(true)} /> : <p>暂无录音</p>}{audioError && <p>录音加载失败，请检查文件是否可访问。</p>}
      <h3>文字转写</h3><p className="whitespace-pre-wrap">{row.transcript || "暂无转写"}</p>
    </div>} />
  </PageSection>;
}
