import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, ChevronRight, Plus, X } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import { homeStats, hotPolicyRank } from '../src/data/mock.js';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NumberTicker } from '@/components/ui/number-ticker';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlatformIcon, type PlatformIconName } from '@/components/PlatformIcon';

const favoriteOptions = [
  { title: '政策管理', path: '/policy/index', icon: 'policy' },
  { title: '产业图谱', path: '/industryChain/industryChart/index', icon: 'network' },
  { title: '园区楼宇', path: '/parksBuildings/index', icon: 'building' },
  { title: '商机地图', path: '/businessMap/index', icon: 'map' },
  { title: '企业查询', path: '/subsidy/index', icon: 'search' },
  { title: '商机大厅', path: '/business/businessHall/index', icon: 'globe' },
  { title: '全景洞察', path: '/myCampus/panoramicLnsight/index', icon: 'dashboard' },
  { title: '企业档案', path: '/myCampus/corporateArchives/index', icon: 'folder' },
  { title: '接口计费', path: '/interfaceBilling/index', icon: 'billing' },
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
const districtsTrend = [
  { name: '浦东', '2024': 120, '2025': 142, '2026': 168 }, { name: '黄浦', '2024': 82, '2025': 90, '2026': 102 },
  { name: '徐汇', '2024': 96, '2025': 110, '2026': 128 }, { name: '长宁', '2024': 54, '2025': 62, '2026': 70 },
  { name: '静安', '2024': 60, '2025': 68, '2026': 76 }, { name: '普陀', '2024': 42, '2025': 48, '2026': 55 },
  { name: '虹口', '2024': 38, '2025': 44, '2026': 50 }, { name: '杨浦', '2024': 76, '2025': 86, '2026': 98 },
  { name: '闵行', '2024': 88, '2025': 102, '2026': 120 }, { name: '宝山', '2024': 46, '2025': 54, '2026': 62 },
];
const enterpriseTrend = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月']
  .map((name, index) => ({ name, value: [1280, 1520, 1860, 2100, 2380, 2620, 2940, 3180, 3460, 3690, 3920][index] }));
const chartColors = ['#1652B8', '#4F80C4', '#82A6D5', '#A9C0DE', '#CCD9E9'];
const cityOptions = ['上海市', '北京市', '天津市', '杭州市', '苏州市', '南京市', '深圳市'];
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
    <Card className={`metric-card metric-card--${tone}`}>
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
  const [city, setCity] = useState('上海市');
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
        <div><h1>首页</h1><p>政策服务、招商动态与企业运营情况</p></div>
        <div className="city-switcher"><span>开通城市</span><Select value={city} onValueChange={(value) => { if (value) setCity(value); }}><SelectTrigger aria-label="选择城市"><SelectValue /></SelectTrigger><SelectContent>{cityOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select><Button onClick={() => toast.success(`已切换至 ${city}，数据已更新`)}>查询</Button></div>
      </div>



      <section className="metric-grid" aria-label="首页数据概览">
        <MetricCard title="政策总数据" icon="policy" value={homeStats.policyTotal} tone="primary" ticker detail={<span>项目政策 <strong>{homeStats.projectPolicy.toLocaleString()}</strong><span className="metric-divider" />政策通知 <strong>{homeStats.notice.toLocaleString()}</strong><span className="metric-divider" />政策公告 <strong>{homeStats.announce.toLocaleString()}</strong></span>}>
          <Progress value={73} className="policy-progress" />
        </MetricCard>
        <MetricCard title="补贴企业金额" icon="billing" value={`¥ ${homeStats.subsidyAmount}`} detail={<span>获批企业 <strong>{homeStats.fundedCompanies.toLocaleString()}</strong><span className="metric-divider" />监控企业 <strong>{homeStats.monitored}</strong><span className="metric-divider" />报告导出 <strong>{homeStats.reports}</strong></span>}>
          <div className="metric-spark"><ResponsiveContainer width="100%" height="100%"><BarChart data={[4, 12, 20, 26, 34, 30, 32].map((value, index) => ({ index, value }))}><XAxis dataKey="index" hide /><YAxis hide domain={[0, 40]} /><Bar dataKey="value" fill="var(--chart-1)" radius={[3, 3, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div>
        </MetricCard>
        <MetricCard title="访问总量" icon="users" value={homeStats.visits} tone="tertiary" ticker detail={<span>昨日 <strong>{homeStats.yesterdayVisit.toLocaleString()}</strong><span className="metric-divider" />7 天 <strong>{homeStats.weekVisit.toLocaleString()}</strong><span className="metric-divider" />30 天 <strong>{homeStats.monthVisit.toLocaleString()}</strong></span>}>
          <div className="metric-spark"><ResponsiveContainer width="100%" height="100%"><AreaChart data={[6, 10, 9, 18, 16, 28, 34, 40].map((value, index) => ({ index, value }))}><XAxis dataKey="index" hide /><YAxis hide domain={[0, 42]} /><Area type="monotone" dataKey="value" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.12} strokeWidth={2} isAnimationActive={false} /></AreaChart></ResponsiveContainer></div>
        </MetricCard>
      </section>

      <Card className="favorites-card">
        <CardHeader className="favorites-header"><div><CardTitle>常用功能</CardTitle><CardDescription>快速进入日常工作模块</CardDescription></div><Button variant="outline" size="sm" onClick={() => setFavoriteOpen(true)}><Plus data-icon="inline-start" />管理功能 <Badge variant="secondary">{favorites.length}/10</Badge></Button></CardHeader>
        <CardContent className="favorites-list">
          {favorites.map((item) => <Link to={item.path} className="favorite-link" key={item.path}><PlatformIcon name={item.icon} className="favorite-icon" /><span className="favorite-link-label">{item.title}</span><button aria-label={`移除${item.title}`} onClick={(event) => { event.preventDefault(); toggleFavorite(item); }}><X /></button></Link>)}
          {!favorites.length && <p className="favorite-empty">常用功能还未设置，选择管理功能添加常用模块。</p>}
        </CardContent>
      </Card>

      <Card className="policy-rank-card">
        <CardHeader className="section-heading"><div><CardTitle><PlatformIcon name="dashboard" className="section-heading-icon" />热门政策榜单</CardTitle><CardDescription>按浏览热度排序</CardDescription></div><Button variant="ghost" size="sm" render={<Link to="/policy/index" />}>查看政策 <ChevronRight data-icon="inline-end" /></Button></CardHeader>
        <CardContent className="policy-rank-content">
          <div className="policy-bar-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={hotPolicyRank.slice(0, 6).map((policy) => ({ ...policy, shortName: policy.name.length > 15 ? `${policy.name.slice(0, 15)}…` : policy.name }))} layout="vertical" margin={{ left: 8, right: 18, top: 4, bottom: 4 }}><CartesianGrid stroke="var(--border)" strokeDasharray="3 5" vertical={false} /><XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} /><YAxis type="category" dataKey="shortName" width={150} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} /><ChartTooltip cursor={{ fill: 'var(--muted)' }} contentStyle={{ borderRadius: 10, borderColor: 'var(--border)' }} formatter={(value) => [Number(value).toLocaleString(), '浏览量']} /><Bar dataKey="value" fill="var(--chart-1)" radius={[0, 5, 5, 0]} barSize={14} isAnimationActive={false}>{hotPolicyRank.slice(0, 6).map((entry, index) => <Cell fill={index === 0 ? 'var(--primary)' : 'var(--chart-1)'} fillOpacity={1 - index * 0.08} key={entry.name} />)}</Bar></BarChart></ResponsiveContainer></div>
          <div className="policy-rank-list"><Table><TableHeader><TableRow><TableHead>政策名称</TableHead><TableHead className="rank-table-value">浏览量</TableHead></TableRow></TableHeader><TableBody>{hotPolicyRank.map((policy, index) => <TableRow key={policy.name}><TableCell><Link to="/policy/index" className="rank-table-link"><span className={`rank-index ${index < 3 ? `rank-index-${index + 1}` : ''}`}>{String(index + 1).padStart(2, '0')}</span><span className="rank-policy-name" title={policy.name}>{policy.name}</span></Link></TableCell><TableCell className="rank-table-value"><strong>{policy.value.toLocaleString()}</strong></TableCell></TableRow>)}</TableBody></Table></div>
        </CardContent>
      </Card>

      <section className="dashboard-chart-grid">
        <Card className="chart-card"><CardHeader><CardTitle><PlatformIcon name="landmark" className="section-heading-icon" />产业政策扶持方向</CardTitle><CardDescription>各重点产业项目占比</CardDescription></CardHeader><CardContent className="chart-content"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={policyDirection} dataKey="value" nameKey="name" innerRadius={62} outerRadius={93} paddingAngle={3} stroke="none" isAnimationActive={false}>{policyDirection.map((item, index) => <Cell fill={chartColors[index]} key={item.name} />)}</Pie><ChartTooltip formatter={(value, name) => [`${value}%`, name]} contentStyle={{ borderRadius: 10, borderColor: 'var(--border)' }} /></PieChart></ResponsiveContainer><div className="chart-legend">{policyDirection.map((item, index) => <div key={item.name}><i style={{ background: chartColors[index] }} /><span>{item.name}</span><strong>{item.value}%</strong></div>)}</div></CardContent></Card>
        <Card className="chart-card"><CardHeader><CardTitle><PlatformIcon name="building" className="section-heading-icon" />扶持热门行业</CardTitle><CardDescription>企业扶持数量</CardDescription></CardHeader><CardContent className="chart-content"><ResponsiveContainer width="100%" height="100%"><BarChart data={industrySupport} layout="vertical" margin={{ left: 4, right: 18 }}><CartesianGrid stroke="var(--border)" strokeDasharray="3 5" horizontal={false} /><XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} /><YAxis type="category" dataKey="name" width={86} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} /><ChartTooltip cursor={{ fill: 'rgba(22,82,184,.04)' }} contentStyle={{ borderRadius: 10, borderColor: 'var(--border)', boxShadow: '0 8px 24px rgba(15,39,68,.10)' }} labelFormatter={(label) => String(label)} formatter={(value) => [`${Number(value).toLocaleString()} 家`, '企业数量']} /><Bar dataKey="value" fill="var(--chart-3)" radius={[0, 5, 5, 0]} barSize={15} isAnimationActive={false} /></BarChart></ResponsiveContainer></CardContent></Card>
        <Card className="chart-card"><CardHeader><CardTitle><PlatformIcon name="dashboard" className="section-heading-icon" />各区往年产业专项政策</CardTitle><CardDescription>2024—2026 年度数量对比</CardDescription></CardHeader><CardContent className="chart-content"><div className="chart-legend-inline"><span><i className="legend-2024" />2024</span><span><i className="legend-2025" />2025</span><span><i className="legend-2026" />2026</span></div><ResponsiveContainer width="100%" height="100%"><LineChart data={districtsTrend} margin={{ left: 0, right: 16, top: 10, bottom: 0 }}><CartesianGrid stroke="var(--border)" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} width={38} /><ChartTooltip contentStyle={{ borderRadius: 10, borderColor: 'var(--border)', boxShadow: '0 8px 24px rgba(15,39,68,.10)' }} labelFormatter={(label) => `${label}区`} formatter={(value, name) => [`${Number(value).toLocaleString()} 项`, `${name}年`]} /><Line type="monotone" dataKey="2024" stroke="var(--chart-4)" strokeWidth={2} dot={false} isAnimationActive={false} /><Line type="monotone" dataKey="2025" stroke="var(--chart-3)" strokeWidth={2} dot={false} isAnimationActive={false} /><Line type="monotone" dataKey="2026" stroke="var(--primary)" strokeWidth={2.3} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></CardContent></Card>
        <Card className="chart-card"><CardHeader><CardTitle><PlatformIcon name="users" className="section-heading-icon" />扶持企业数量趋势</CardTitle><CardDescription>2026 年累计扶持企业</CardDescription></CardHeader><CardContent className="chart-content"><ResponsiveContainer width="100%" height="100%"><AreaChart data={enterpriseTrend} margin={{ left: 0, right: 12, top: 10, bottom: 0 }}><CartesianGrid stroke="var(--border)" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} width={44} /><ChartTooltip contentStyle={{ borderRadius: 10, borderColor: 'var(--border)', boxShadow: '0 8px 24px rgba(15,39,68,.10)' }} formatter={(value) => [`${Number(value).toLocaleString()} 家`, '累计扶持企业']} /><Area type="monotone" dataKey="value" stroke="var(--chart-2)" strokeWidth={2.4} fill="var(--chart-2)" fillOpacity={0.13} isAnimationActive={false} /></AreaChart></ResponsiveContainer></CardContent></Card>
      </section>

      <Dialog open={favoriteOpen} onOpenChange={setFavoriteOpen}><DialogContent className="favorite-dialog"><DialogHeader><DialogTitle>管理常用功能</DialogTitle><DialogDescription>最多可添加 10 个模块，点击切换。</DialogDescription></DialogHeader><div className="favorite-picker">{favoriteOptions.map((item) => { const selected = favorites.some((saved) => saved.path === item.path); return <Button key={item.path} variant={selected ? 'secondary' : 'outline'} className="favorite-choice" onClick={() => toggleFavorite(item)}>{item.title}{selected && <Check className="favorite-check" />}</Button>; })}</div></DialogContent></Dialog>
    </div>
  );
}
