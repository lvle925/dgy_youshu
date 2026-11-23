import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { Download, FileDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { csvLine, saveBlob, type CsvColumn } from "@/lib/exportCsv";
import { useAllowedAction } from "./AccessContext";

type Report = { id: number; name: string; progress: number; file?: Blob; error?: boolean };
type Enqueue = <T>(name: string, columns: CsvColumn<T>[], rows: T[]) => void;
const ReportContext = createContext<{ jobs: Report[]; enqueue: Enqueue }>({ jobs: [], enqueue: () => undefined });

export function useReportExport() {
  const { enqueue } = useContext(ReportContext);
  const allowed = useAllowedAction("导出");
  return <T,>(name: string, columns: CsvColumn<T>[], rows: T[]) => {
    if (allowed) enqueue(name, columns, rows);
  };
}

export function ReportProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Report[]>([]);
  const nextId = useRef(0);
  const enqueue: Enqueue = (name, columns, rows) => {
    const id = ++nextId.current;
    const job = { id, name, progress: 0 };
    setJobs(current => [job, ...current.filter((item, index) => item.progress < 100 && !item.error || index < 19)]);
    toast.info("已加入报告导出队列");
    const update = (patch: Partial<Report>) => setJobs(current => current.map(item => item.id === id ? { ...item, ...patch } : item));
    void (async () => {
      try {
        const lines = [csvLine(columns.map(column => column.header))];
        const chunkSize = Math.max(1, Math.ceil(rows.length / 10));
        for (let start = 0; start < rows.length; start += chunkSize) {
          await new Promise(resolve => window.setTimeout(resolve, 35));
          const batch = rows.slice(start, start + chunkSize);
          lines.push(...batch.map(row => csvLine(columns.map(column => column.value(row)))));
          update({ progress: Math.min(99, Math.round((start + batch.length) / rows.length * 100)) });
        }
        update({ progress: 100, file: new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }) });
      } catch {
        update({ error: true });
      }
    })();
  };
  return <ReportContext.Provider value={{ jobs, enqueue }}>{children}</ReportContext.Provider>;
}

export function ReportQueueTrigger() {
  const { jobs } = useContext(ReportContext);
  return <Popover>
    <PopoverTrigger render={<Button variant="ghost" size="icon" aria-label="报告导出队列" title="报告导出队列" className="report-queue-trigger" data-pending={jobs.some(item => !item.file && !item.error) || undefined} />}><FileDown /></PopoverTrigger>
    <PopoverContent align="end" className="os-glass-card report-queue">
      <strong>报告导出队列</strong>
      {jobs.length === 0 && <p className="text-muted-foreground">暂无导出任务</p>}
      {jobs.map(job => <div className="report-queue-row" key={job.id}>
        <span>{job.name}</span>
        {job.file ? <Button size="sm" variant="outline" onClick={() => job.file && saveBlob(job.name, job.file)}><Download data-icon="inline-start" />下载</Button>
          : job.error ? <span>生成失败</span>
          : <div><Progress value={job.progress} aria-label="生成进度" /><small>{job.progress}%</small></div>}
      </div>)}
    </PopoverContent>
  </Popover>;
}
