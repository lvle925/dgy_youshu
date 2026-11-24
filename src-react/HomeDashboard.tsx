import { useDashboardData } from "@/lib/useDashboardData";
import { useReportExport } from "@/app/ReportQueue";
import { ActionButton, allowsRoute, usePrincipal } from "@/app/AccessContext";
import { isShanghaiArea, regionMatches } from "@/lib/cityData";
import { SpatialMap } from "@/components/SpatialMap";
import { OperationBriefDialog } from "@/components/shared/OperationBriefDialog";
import { useNavigate } from "react-router-dom";
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, Check, ChevronRight, Download, MapPinned, Plus, X } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import { mapMarkers, migrationEnterprises } from '../src/data/mock.js';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NumberTicker } from '@/components/ui/number-ticker';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlatformIcon, type PlatformIconName } from '@/components/PlatformIcon';
import { parkPointsFromGeoJson, toParkFeatureCollection } from '@/lib/spatialData';

const favoriteOptions = [
  { title: '政策管理', path: '/policy/index', icon: 'policy' },
  { title: '产业图谱', path: '/industryChain/industryChart/index', icon: 'network' },
  { title: '园区楼宇', path: '/parksBuildings/index', icon: 'building' },
  { title: '商机地图', path: '/businessMap/index', icon: 'map' },
  { title: '企业查询', path: '/subsidy/index', icon: 'search' },
  { title: '商机大厅', path: '/business/businessHall/index', icon: 'globe' },
  { title: '全景洞察', path: '/myCampus/panoramicLnsight/index', icon: 'dashboard' },
  { title: '企业档案', path: '/myCampus/corporateArchives/index', icon: 'folder' },
  { title: '数据服务与接口监控', path: '/system/interface-monitoring', icon: 'activity' },
  { title: '招投标查询', path: '/bidding/index', icon: 'bidding' },
] as const;

const policyDirection = [
  { name: '先进制造', value: 32 }, { name: '数字经济', value: 24 }, { name: '生物医药', value: 18 },
  { name: '新能源', value: 14 }, { name: '现代服务', value: 12 },
];
const industrySupport = [
  { name: '文化创意', value: 860 }, { name: '现代服务', value: 1240 }, { name: '新能源', value: 1680 },
  { name: '生物医药', value: 2150 }, { name: '数字经济', value: 2860 }, { name: '智能制造', value: 3420 },
];
const enterpriseTrend = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月']
  .map((name, index) => ({ name, value: [1280, 1520, 1860, 2100, 2380, 2620, 2940, 3180, 3460, 3690, 3920][index] }));
const chartColors = ['#1652B8', '#147A4C', '#C8922E', '#5C8ED5', '#64748B'];
const favoritesKey = 'DEMO_FAVORITES';

function safeReadFavorites() {
  try {
    const stored = localStorage.getItem(favoritesKey);
    if (stored === null) return favoriteOptions.filter((item) => ['/policy/index', '/businessMap/index', '/subsidy/index', '/parksBuildings/index', '/business/projectClues/index', '/myCampus/visitManage/index'].includes(item.path));
    const saved = JSON.parse(stored);
    return Array.isArray(saved) ? saved.map((item) => favoriteOptions.find((option) => option.path === item.path)).filter((item): item is (typeof favoriteOptions)[number] => Boolean(item)) : [];
  } catch { return []; }
}


function MetricCard({ title, value, detail, children, ticker = false, tone = 'secondary', icon }: { title: string; value: string | number; detail?: ReactNode; children?: ReactNode; ticker?: boolean; tone?: 'primary' | 'secondary' | 'tertiary'; icon: PlatformIconName }) {
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const numeric = typeof value === 'number' ? value : null;
  return (
    <Card className={`metric-card metric-card--${tone} ${tone === 'primary' ? 'os-hero-card' : 'os-glass-card'}`}>
      <CardHeader className="metric-card-header"><CardDescription><PlatformIcon name={icon} className="metric-heading-icon" />{title}</CardDescription></CardHeader>
      <CardContent>
        <div className="metric-value">{ticker && numeric !== null && !prefersReducedMotion ? <NumberTicker value={numeric} startValue={Math.floor(numeric * 0.99)} className="metric-ticker" /> : value}</div>
        {children}
        {detail && <div className="metric-detail">{detail}</div>}
      </CardContent>
    </Card>
  );
}

export default function HomeDashboard() {
  const { city, localPolicies, localProjects, monthlyOperations, districtsTrend, hotPolicyRank } = useDashboardData();
  const enqueue = useReportExport();
  const principal = usePrincipal();
  const navigate = useNavigate();
  const allowMap = allowsRoute(principal, "/businessMap/index");
  const allowPolicyDetail = allowsRoute(principal, "/policy/index");
  const points = isShanghaiArea(city) ? mapMarkers.filter(marker => city === "上海市" || regionMatches(marker.district, city)) : [];
  const parkPoints = parkPointsFromGeoJson(toParkFeatureCollection(points));
  const highIntent = localProjects.filter(row => row.score >= 85).length;
  const riskRows = isShanghaiArea(city) ? migrationEnterprises.filter(row => city === "上海市" || ("district" in row && row.district === city)) : [];
  const risks = riskRows.filter(row => row.risk === "高风险").length;
  const [favorites, setFavorites] = useState(safeReadFavorites);
  const [favoriteOpen, setFavoriteOpen] = useState(false);

  function toggleFavorite(item: (typeof favoriteOptions)[number]) {
    const exists = favorites.some((saved) => saved.path === item.path);
    if (!exists && favorites.length >= 10) { toast.warning('最多可添加 10 个常用功能'); return; }
    const next = exists ? favorites.filter((saved) => saved.path !== item.path) : [...favorites, item];
    setFavorites(next);
    localStorage.setItem(favoritesKey, JSON.stringify(next.map(({ title, path }) => ({ title, path }))));
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-title-row">
        <div><h1>首页</h1><p>{city} · 政策服务、招商动态与企业运营情况</p></div>
        <OperationBriefDialog city={city} />
      </div>



      <section className="dashboard-bento-kpi" aria-label="首页数据概览">
        <MetricCard title="政策总数据" icon="policy" value={localPolicies.length} tone="primary" detail={<span>区级政策 <strong>{localPolicies.filter(row => row.level === "区级").length}</strong><span className="metric-divider" />各类扶持 <strong>{localPolicies.reduce((sum, row) => sum + (Number(row.companies) || 0), 0).toLocaleString()}</strong> 家次</span>}>
          <span className="dashboard-kpi-note"><span className="status-led" />{city}</span>
        </MetricCard>
        <MetricCard title="高意愿项目线索池" icon="folder" value={highIntent} detail={<span>地区线索共 <strong>{localProjects.length}</strong> 条</span>}>
          <span className="dashboard-kpi-note is-success"><span className="status-led" />意愿度 85 分及以上</span>
        </MetricCard>
        <MetricCard title="安商迁移高风险预警" icon="shield" value={risks} detail={<span>监测企业 <strong>{riskRows.length}</strong> 家</span>}>
          <span className="dashboard-kpi-note is-warning"><AlertTriangle size={12} />高风险企业</span>
        </MetricCard>
      </section>

      <section className="dashboard-bento-grid" aria-label="首页趋势与空间洞察">
        <Card className="chart-card os-glass-card dashboard-trend-card">
          <CardHeader className="section-heading"><div><CardTitle><PlatformIcon name="activity" className="section-heading-icon" />招商转化趋势</CardTitle><CardDescription>政策发布、已有获批记录及签约项目按月汇总</CardDescription></div><ActionButton action="导出" variant="ghost" size="sm" onClick={() => enqueue(city + "招商趋势.csv", [{ header: "月份", value: row => row.name }, { header: "政策发布", value: row => row.policies }, { header: "已有获批记录的政策", value: row => row.approved }, { header: "已签约线索", value: row => row.projects }], monthlyOperations)}><Download data-icon="inline-start" />导出</ActionButton></CardHeader>
          <CardContent className="chart-content"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={monthlyOperations} margin={{ left: 2, right: 10, top: 12, bottom: 0 }}><CartesianGrid stroke="rgba(100,116,139,.14)" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} /><YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} width={30} /><YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} width={28} /><ChartTooltip contentStyle={{ borderRadius: 10, borderColor: 'rgba(22,82,184,.10)', boxShadow: '0 8px 24px rgba(15,39,68,.10)' }} formatter={(value, name) => [Number(value).toLocaleString(), name === 'policies' ? '政策发布' : name === 'approved' ? '获批政策' : '已签约线索']} /><Bar yAxisId="left" dataKey="policies" name="policies" fill="#93C5FD" radius={[4, 4, 0, 0]} barSize={18} isAnimationActive={false} /><Bar yAxisId="left" dataKey="approved" name="approved" fill="#1652B8" radius={[4, 4, 0, 0]} barSize={18} isAnimationActive={false} /><Line yAxisId="right" type="monotone" dataKey="projects" name="projects" stroke="#C8922E" strokeWidth={2.5} dot={{ r: 3, fill: '#C8922E', strokeWidth: 0 }} activeDot={{ r: 4 }} isAnimationActive={false} /></ComposedChart></ResponsiveContainer></CardContent>
        </Card>
        <Card className="chart-card os-glass-card dashboard-map-card">
          <CardHeader className="section-heading"><div><CardTitle><MapPinned className="section-heading-icon" />电子围栏与空间载体</CardTitle><CardDescription>{city} · 产业载体示意</CardDescription></div>{allowMap && <Button variant="ghost" size="sm" render={<Link to="/businessMap/index" />}>全屏地图 <ChevronRight data-icon="inline-end" /></Button>}</CardHeader>
          <CardContent className="dashboard-map-content">{parkPoints.length ? <SpatialMap compact parks={parkPoints} onSelect={() => { if (allowMap) navigate("/businessMap/index"); }} /> : <div className="business-empty-hint">当前地区暂无园区点位</div>}</CardContent>
        </Card>
      </section>

      <section className="dashboard-third-row" aria-label="常用功能与热门政策">
      <Card className="favorites-card">
        <CardHeader className="favorites-header"><div><CardTitle>常用功能</CardTitle><CardDescription>快速进入日常工作模块</CardDescription></div><Button variant="outline" size="sm" onClick={() => setFavoriteOpen(true)}><Plus data-icon="inline-start" />管理功能 <Badge variant="secondary">{favorites.length}/10</Badge></Button></CardHeader>
        <CardContent className="favorites-list">
          {favorites.filter(item => allowsRoute(principal, item.path)).map((item) => <Link to={item.path} className="favorite-link" key={item.path}><PlatformIcon name={item.icon} className="favorite-icon" /><span className="favorite-link-label">{item.title}</span><button aria-label={`移除${item.title}`} onClick={(event) => { event.preventDefault(); toggleFavorite(item); }}><X /></button></Link>)}
          {!favorites.length && <p className="favorite-empty">常用功能还未设置，选择管理功能添加常用模块。</p>}
        </CardContent>
      </Card>

      <Card className="policy-rank-card">
        <CardHeader className="section-heading"><div><CardTitle><PlatformIcon name="dashboard" className="section-heading-icon" />热门政策榜单</CardTitle><CardDescription>按当前地区政策浏览量排序</CardDescription></div>{allowPolicyDetail && <Button variant="ghost" size="sm" render={<Link to="/policy/index" />}>查看政策 <ChevronRight data-icon="inline-end" /></Button>}</CardHeader>
        {hotPolicyRank.length ? <CardContent className="policy-rank-content">
          <div className="policy-bar-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={hotPolicyRank.slice(0, 6).map((policy) => ({ ...policy, shortName: policy.name.length > 15 ? `${policy.name.slice(0, 15)}…` : policy.name }))} layout="vertical" margin={{ left: 8, right: 18, top: 4, bottom: 4 }}><CartesianGrid stroke="var(--border)" strokeDasharray="3 5" vertical={false} /><XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} /><YAxis type="category" dataKey="shortName" width={150} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} /><ChartTooltip cursor={{ fill: 'var(--muted)' }} contentStyle={{ borderRadius: 10, borderColor: 'var(--border)' }} formatter={(value) => [Number(value).toLocaleString(), '浏览量']} /><Bar dataKey="value" fill="var(--chart-1)" radius={[0, 5, 5, 0]} barSize={14} isAnimationActive={false}>{hotPolicyRank.slice(0, 6).map((entry, index) => <Cell fill={index === 0 ? 'var(--primary)' : 'var(--chart-1)'} fillOpacity={1 - index * 0.08} key={entry.name} />)}</Bar></BarChart></ResponsiveContainer></div>
          <div className="policy-rank-list"><Table><TableHeader><TableRow><TableHead>政策名称</TableHead><TableHead className="rank-table-value">浏览量</TableHead></TableRow></TableHeader><TableBody>{hotPolicyRank.map((policy, index) => <TableRow key={policy.name}><TableCell><span className="rank-table-link"><span className={`rank-index ${index < 3 ? `rank-index-${index + 1}` : ''}`}>{String(index + 1).padStart(2, '0')}</span>{allowPolicyDetail ? <Link className="rank-policy-name" title={policy.name} to={`/policy/detail/${policy.id}`}>{policy.name}</Link> : <span className="rank-policy-name" title={policy.name}>{policy.name}</span> }</span></TableCell><TableCell className="rank-table-value"><strong>{policy.value.toLocaleString()}</strong></TableCell></TableRow>)}</TableBody></Table></div>
        </CardContent> : <CardContent className="business-empty-hint">当前地区暂无政策浏览记录</CardContent>}
      </Card>
      </section>

      <section className="dashboard-chart-grid">
        <Card className="chart-card"><CardHeader><CardTitle><PlatformIcon name="landmark" className="section-heading-icon" />产业政策扶持方向</CardTitle><CardDescription>各重点产业项目占比</CardDescription></CardHeader><CardContent className="chart-content"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={policyDirection} dataKey="value" nameKey="name" innerRadius={62} outerRadius={93} paddingAngle={3} stroke="none" isAnimationActive={false}>{policyDirection.map((item, index) => <Cell fill={chartColors[index]} key={item.name} />)}</Pie><ChartTooltip formatter={(value, name) => [`${value}%`, name]} contentStyle={{ borderRadius: 10, borderColor: 'var(--border)' }} /></PieChart></ResponsiveContainer><div className="chart-legend">{policyDirection.map((item, index) => <div key={item.name}><i style={{ background: chartColors[index] }} /><span>{item.name}</span><strong>{item.value}%</strong></div>)}</div></CardContent></Card>
        <Card className="chart-card"><CardHeader><CardTitle><PlatformIcon name="building" className="section-heading-icon" />扶持热门行业</CardTitle><CardDescription>企业扶持数量</CardDescription></CardHeader><CardContent className="chart-content"><ResponsiveContainer width="100%" height="100%"><BarChart data={industrySupport} layout="vertical" margin={{ left: 4, right: 18 }}><CartesianGrid stroke="var(--border)" strokeDasharray="3 5" horizontal={false} /><XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} /><YAxis type="category" dataKey="name" width={86} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} /><ChartTooltip cursor={{ fill: 'rgba(22,82,184,.04)' }} contentStyle={{ borderRadius: 10, borderColor: 'var(--border)', boxShadow: '0 8px 24px rgba(15,39,68,.10)' }} labelFormatter={(label) => String(label)} formatter={(value) => [`${Number(value).toLocaleString()} 家`, '企业数量']} /><Bar dataKey="value" fill="var(--chart-3)" radius={[0, 5, 5, 0]} barSize={15} isAnimationActive={false} /></BarChart></ResponsiveContainer></CardContent></Card>
        <Card className="chart-card"><CardHeader><CardTitle><PlatformIcon name="dashboard" className="section-heading-icon" />各区往年产业专项政策</CardTitle><CardDescription>2024—2026 年度数量对比</CardDescription></CardHeader><CardContent className="chart-content"><div className="chart-legend-inline"><span><i className="legend-2024" />2024</span><span><i className="legend-2025" />2025</span><span><i className="legend-2026" />2026</span></div><ResponsiveContainer width="100%" height="100%"><LineChart data={districtsTrend} margin={{ left: 0, right: 16, top: 10, bottom: 0 }}><CartesianGrid stroke="var(--border)" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} width={38} /><ChartTooltip contentStyle={{ borderRadius: 10, borderColor: 'var(--border)', boxShadow: '0 8px 24px rgba(15,39,68,.10)' }} labelFormatter={(label) => `${label}区`} formatter={(value, name) => [`${Number(value).toLocaleString()} 项`, `${name}年`]} /><Line type="monotone" dataKey="2024" stroke="var(--chart-4)" strokeWidth={2} dot={false} isAnimationActive={false} /><Line type="monotone" dataKey="2025" stroke="var(--chart-3)" strokeWidth={2} dot={false} isAnimationActive={false} /><Line type="monotone" dataKey="2026" stroke="var(--primary)" strokeWidth={2.3} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></CardContent></Card>
        <Card className="chart-card"><CardHeader><CardTitle><PlatformIcon name="users" className="section-heading-icon" />扶持企业数量趋势</CardTitle><CardDescription>2026 年累计扶持企业</CardDescription></CardHeader><CardContent className="chart-content"><ResponsiveContainer width="100%" height="100%"><AreaChart data={enterpriseTrend} margin={{ left: 0, right: 12, top: 10, bottom: 0 }}><CartesianGrid stroke="var(--border)" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} width={44} /><ChartTooltip contentStyle={{ borderRadius: 10, borderColor: 'var(--border)', boxShadow: '0 8px 24px rgba(15,39,68,.10)' }} formatter={(value) => [`${Number(value).toLocaleString()} 家`, '累计扶持企业']} /><Area type="monotone" dataKey="value" stroke="var(--chart-2)" strokeWidth={2.4} fill="var(--chart-2)" fillOpacity={0.13} isAnimationActive={false} /></AreaChart></ResponsiveContainer></CardContent></Card>
      </section>

      <Dialog open={favoriteOpen} onOpenChange={setFavoriteOpen}><DialogContent className="favorite-dialog"><DialogHeader><DialogTitle>管理常用功能</DialogTitle><DialogDescription>最多可添加 10 个模块，点击切换。</DialogDescription></DialogHeader><div className="favorite-picker">{favoriteOptions.filter(item => allowsRoute(principal, item.path)).map((item) => { const selected = favorites.some((saved) => saved.path === item.path); return <Button key={item.path} variant={selected ? 'secondary' : 'outline'} className="favorite-choice" onClick={() => toggleFavorite(item)}>{item.title}{selected && <Check className="favorite-check" />}</Button>; })}</div></DialogContent></Dialog>
    </div>
  );
}
