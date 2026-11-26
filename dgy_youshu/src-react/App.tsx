import { FormEvent, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, Building2, Building, CalendarDays,
  ChevronDown, ChevronRight, CircleHelp, ClipboardList, Crown, Eye, EyeOff, FileSearch,
  FileText, FolderKanban, Gavel, Globe2, History, Home, Landmark, LayoutDashboard, LogOut, Map, Network,
  Plus, RefreshCw, Search, Settings2, ShieldCheck, Star, Users, Wallet, X, type LucideIcon,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarSeparator, SidebarTrigger } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import legacyTheme from './legacy-theme.css?raw';
import { PlatformIcon, type PlatformIconName } from '@/components/PlatformIcon';
import { BrandMark } from '@/components/BrandMark';
import { apiFetch, clearAuth, saveAuth } from '../src/http.js';

type NavItem = { title: string; path: string; icon: PlatformIconName };
type NavSection = { title: string; icon: PlatformIconName; items: NavItem[] };
type NavGroup = { title: string; sections: NavSection[] };

const navGroups: NavGroup[] = [
  { title: '工作台', sections: [
    { title: '工作总览', icon: 'home', items: [{ title: '首页', path: '/home/index', icon: 'dashboard' }] },
  ] },
  { title: '智慧招商', sections: [
    { title: '政策服务', icon: 'policy', items: [{ title: '政策管理', path: '/policy/index', icon: 'policy' }] },
    { title: '产业研究', icon: 'network', items: [
      { title: '产业图谱', path: '/industryChain/industryChart/index', icon: 'network' },
      { title: '供应链', path: '/industryChain/industrySupply/index', icon: 'activity' },
    ] },
    { title: '园区空间', icon: 'map', items: [
      { title: '园区楼宇', path: '/parksBuildings/index', icon: 'buildingSmall' },
      { title: '商机地图', path: '/businessMap/index', icon: 'map' },
    ] },
    { title: '企业服务', icon: 'building', items: [
      { title: '企业查询', path: '/subsidy/index', icon: 'search' },
      { title: '商机大厅', path: '/business/businessHall/index', icon: 'globe' },
    ] },
  ] },
  { title: '商机洞察', sections: [
    { title: '线索运营', icon: 'folder', items: [
      { title: '商机摸排', path: '/business/businessInvestigate/index', icon: 'search' },
      { title: '企业扩张', path: '/business/projectClues/index', icon: 'arrowUpRight' },
      { title: '项目线索', path: '/business/projectCluesUpdate/index', icon: 'fileSearch' },
      { title: '投融引育', path: '/business/investmentNurturing/index', icon: 'billing' },
    ] },
    { title: '智能外呼', icon: 'activity', items: [
      { title: '外呼任务', path: '/business/aiOutbound/tasks', icon: 'clipboard' },
      { title: '通话记录', path: '/business/aiOutbound/records', icon: 'history' },
      { title: '数据看板', path: '/business/aiOutbound/dashboard', icon: 'dashboard' },
    ] },
  ] },
  { title: '安商稳商', sections: [
    { title: '园区运营', icon: 'landmark', items: [
      { title: '全景洞察', path: '/myCampus/panoramicLnsight/index', icon: 'activity' },
      { title: '园区管理', path: '/myCampus/campusAdmin/index', icon: 'landmark' },
    ] },
    { title: '企业服务', icon: 'shield', items: [
      { title: '企业档案', path: '/myCampus/corporateArchives/index', icon: 'building' },
      { title: '迁移预警', path: '/myCampus/migrationWarning/index', icon: 'arrowDownRight' },
      { title: '企服保障', path: '/myCampus/guarantee/index', icon: 'shield' },
      { title: '走访管理', path: '/myCampus/visitManage/index', icon: 'calendar' },
    ] },
  ] },
  { title: '平台管理', sections: [
    { title: '账号权限', icon: 'users', items: [
      { title: '人员管理', path: '/member/index', icon: 'users' },
      { title: '角色管理', path: '/member/role', icon: 'crown' },
    ] },
    { title: '系统审计', icon: 'history', items: [
      { title: '操作日志', path: '/member/log', icon: 'history' },
      { title: '操作日志统计', path: '/member/logStatistics', icon: 'activity' },
    ] },
    { title: '业务设置', icon: 'settings', items: [
      { title: '门店装修', path: '/setting/index', icon: 'settings' },
      { title: '接口计费', path: '/interfaceBilling/index', icon: 'billing' },
      { title: '招投标查询', path: '/bidding/index', icon: 'bidding' },
    ] },
  ] },
];

const TABS_KEY = 'DEMO_TABS';

const allNavItems = navGroups.flatMap((group) => group.sections.flatMap((section) => section.items));

function sectionKey(groupTitle: string, sectionTitle: string) {
  return `${groupTitle}:${sectionTitle}`;
}

const defaultExpandedSections = Object.fromEntries(
  navGroups.flatMap((group) => group.sections.map((section) => [sectionKey(group.title, section.title), true])),
);

function safeReadTabs() {
  try {
    const value = JSON.parse(localStorage.getItem(TABS_KEY) || '[]');
    return Array.isArray(value) ? value.filter((tab) => tab?.path && tab?.title) : [];
  } catch { return []; }
}


function activeNavigationPath(path: string) {
  if (path.startsWith('/policy')) return '/policy/index';
  if (path.startsWith('/subsidy')) return '/subsidy/index';
  if (path.startsWith('/park/')) return '/parksBuildings/index';
  if (path.startsWith('/clue/')) return '/business/projectClues/index';
  return path;
}

function getTitle(path: string) {
  const item = allNavItems.find((entry) => entry.path === path);
  if (item) return item.title;
  if (path.startsWith('/policy/detail/')) return '政策详情';
  if (path.startsWith('/subsidy/company/')) return '企业详情';
  if (path.startsWith('/park/detail/')) return '园区详情';
  if (path.startsWith('/clue/detail/')) return '线索详情';
  return '业务模块';
}

function useAuthStatus() {
  const [status, setStatus] = useState<{ initialized: boolean; authenticated: boolean } | null>(null);
  const refresh = useCallback(async () => {
    const response = await apiFetch('/api/auth/status', { credentials: 'same-origin' });
    if (!response.ok) throw new Error('无法连接后端服务');
    const result = await response.json();
    setStatus(result);
    return result as { initialized: boolean; authenticated: boolean };
  }, []);
  useEffect(() => { refresh().catch(() => setStatus({ initialized: false, authenticated: false })); }, [refresh]);
  return { status, refresh };
}

const HomeDashboard = lazy(() => import('./HomeDashboard'));

function DashboardFallback() { return <div className="dashboard-page"><Skeleton className="h-10 w-56" /><Skeleton className="h-36 w-full" /><Skeleton className="h-72 w-full" /></div>; }

function App() {
  return (
    <TooltipProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedShell />}>
          <Route path="/" element={<Navigate replace to="/home/index" />} />
          <Route path="/home/index" element={<Suspense fallback={<DashboardFallback />}><HomeDashboard /></Suspense>} />
          <Route path="*" element={<LegacyFrame />} />
        </Route>
        <Route path="*" element={<Navigate replace to="/home/index" />} />
      </Routes>
      <Toaster position="top-right" richColors closeButton />
    </TooltipProvider>
  );
}

function LoginPage() {
  const { status, refresh } = useAuthStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captcha, setCaptcha] = useState('');
  const [challenge, setChallenge] = useState<{ id: string; image: string } | null>(null);
  const [captchaBusy, setCaptchaBusy] = useState(false);

  const refreshCaptcha = useCallback(async () => {
    setCaptchaBusy(true);
    setCaptcha('');
    setChallenge(null);
    try {
      const response = await apiFetch('/api/auth/captcha', { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) throw new Error('验证码加载失败，请点击重试。');
      setChallenge(await response.json());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '验证码加载失败，请重试。');
    } finally { setCaptchaBusy(false); }
  }, []);

  useEffect(() => { void refreshCaptcha(); }, [refreshCaptcha]);

  useEffect(() => {
    if (status?.authenticated) navigate('/home/index', { replace: true });
  }, [status, navigate]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (username.trim().length < 3 || password.length < 10) {
      setError('账号至少 3 个字符，密码至少 10 个字符。');
      return;
    }
    if (!challenge || captcha.trim().length !== 4) {
      setError('请输入图片中的 4 位验证码。');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const endpoint = status?.initialized ? '/api/auth/login' : '/api/auth/setup';
      const response = await apiFetch(endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password, captchaId: challenge.id, captcha: captcha.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || result.error || (status?.initialized ? '账号或密码不正确。' : '创建失败，请检查后端服务。'));
      saveAuth({ ...result, user: result.user || username.trim() });
      await refresh();
      const redirect = (location.state as { from?: string } | null)?.from || '/home/index';
      navigate(redirect, { replace: true });
      toast.success(status?.initialized ? '已安全登录' : '管理员已创建');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法连接后端服务。');
      void refreshCaptcha();
    } finally {
      setBusy(false);
      setPassword('');
    }
  }

  if (!status) return <div className="login-screen"><Skeleton className="h-[420px] w-full max-w-[460px] rounded-2xl" /></div>;
  return (
    <main className="login-screen">
      <div className="login-layout">
      <aside className="login-art" aria-label="产业园区">
        <img src="/images/youshu-industry-campus-4k.webp" alt="现代滨水产业园区的建筑与公共空间" fetchPriority="high" />
        <span className="login-art-caption">有数计划 · 产业服务平台</span>
        <div className="login-art-copy"><h2>让产业与城市，共同生长。</h2><p>连接企业、政策与空间，让每一次招商更有方向。</p></div>
      </aside>
      <section className="login-panel">
        <div className="login-brand"><BrandMark /><span>有数计划</span></div>
        <div className="login-brand-caption">产业招商与企业服务工作台</div>
        <div className="login-copy">
          <h1>{status.initialized ? '欢迎回来' : '创建管理员'}</h1>
          <p>{status.initialized ? '登录账号，开始今天的工作。' : '首次使用，请创建管理员账号。'}</p>
        </div>
        {error && <Alert variant="destructive"><CircleHelp /><AlertTitle>无法继续</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
        <form className="login-form" onSubmit={submit}>
          <label htmlFor="username">账号</label>
          <Input id="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="至少 3 个字符" required minLength={3} />
          <div className="login-password-label"><label htmlFor="password">密码</label>{status.initialized && <span>请输入管理员密码</span>}</div>
          <div className="login-password-input"><Input id="password" autoComplete={status.initialized ? 'current-password' : 'new-password'} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 10 个字符" required minLength={10} /><button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? '隐藏密码' : '显示密码'} aria-pressed={showPassword}>{showPassword ? <EyeOff /> : <Eye />}</button></div>
          <label className="captcha-label" htmlFor="captcha">验证码</label>
          <div className="captcha-row">
            <Input id="captcha" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={4} minLength={4} value={captcha} onChange={(event) => setCaptcha(event.target.value.toUpperCase())} placeholder="输入右侧字符" required />
            <button type="button" className="captcha-image" onClick={() => void refreshCaptcha()} disabled={captchaBusy || busy} aria-label="刷新验证码" title="看不清？点击换一张">
              {challenge ? <img src={challenge.image} alt="4 位随机验证码，点击可刷新" width={164} height={52} /> : <span>{captchaBusy ? '加载中…' : '点击重试'}</span>}
              <RefreshCw aria-hidden="true" />
            </button>
          </div>
          <span className="captcha-hint">不区分大小写，点击图片可更换</span>
          <Button className="login-submit" type="submit" disabled={busy || captchaBusy || !challenge}>
            {busy ? <><span className="spinner" /> 正在验证</> : status.initialized ? '登录工作台' : '创建并进入工作台'}
          </Button>
        </form>
        <div className="login-side-note"><span>产业招商</span><span>·</span><span>企业服务</span><span>·</span><span>园区运营</span></div>
      </section>
      </div>
    </main>
  );
}

function ProtectedShell() {
  const { status } = useAuthStatus();
  const location = useLocation();
  if (!status) return <div className="loading-screen"><BrandMark /><p>正在加载工作台</p></div>;
  if (!status.authenticated) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  return <Workspace />;
}

function Workspace() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tabs, setTabs] = useState(safeReadTabs);
  const [userName, setUserName] = useState(localStorage.getItem('DEMO_USER') || '管理员');
  const [searchOpen, setSearchOpen] = useState(false);
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(defaultExpandedSections);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(navGroups.map((group) => [group.title, true])),
  );
  const pageTitle = getTitle(location.pathname);

  useEffect(() => {
    window.scrollTo(0, 0);
    const activePath = activeNavigationPath(location.pathname);
    const activeSection = navGroups.flatMap((group) => group.sections.map((section) => ({ group, section })))
      .find(({ section }) => section.items.some((item) => item.path === activePath));
    if (activeSection) {
      const key = sectionKey(activeSection.group.title, activeSection.section.title);
      setExpandedSections((current) => current[key] ? current : { ...current, [key]: true });
      setExpandedGroups((current) => current[activeSection.group.title] ? current : { ...current, [activeSection.group.title]: true });
    }
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === '/login') return;
    setTabs((current) => {
      const next = current.some((tab) => tab.path === location.pathname)
        ? current
        : [...current, { path: location.pathname, title: pageTitle }];
      localStorage.setItem(TABS_KEY, JSON.stringify(next));
      return next;
    });
    document.title = `${pageTitle} · 有数计划`;
  }, [location.pathname, pageTitle]);

  async function logout() {
    try {
      const response = await apiFetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
      if (!response.ok) throw new Error('退出失败');
      clearAuth();
      localStorage.removeItem('DEMO_USER');
      localStorage.removeItem(TABS_KEY);
      navigate('/login', { replace: true });
      toast.success('已退出登录');
    } catch { toast.error('退出失败，请检查后端服务'); }
  }

  function closeTab(path: string) {
    if (path === '/home/index') return;
    const next = tabs.filter((tab) => tab.path !== path);
    setTabs(next);
    localStorage.setItem(TABS_KEY, JSON.stringify(next));
    if (location.pathname === path) navigate(next[Math.max(0, next.length - 1)]?.path || '/home/index');
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="offcanvas" className="workspace-sidebar">
        <SidebarHeader className="sidebar-brand-wrap">
          <Link className="sidebar-brand" to="/home/index" aria-label="有数计划首页">
            <BrandMark />
            <span className="brand-wordmark"><strong>有数计划</strong><small>政务办公工作台</small></span>
          </Link>
        </SidebarHeader>
        <div className="sidebar-search-wrap">
          <Button variant="outline" className="sidebar-search" onClick={() => setSearchOpen(true)}>
            <Search data-icon="inline-start" /><span>搜索菜单</span><kbd>⌘ K</kbd>
          </Button>
        </div>
        <SidebarSeparator />
        <SidebarContent className="sidebar-content">
          {navGroups.map((group) => (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel className="sidebar-category-trigger" render={<button type="button" aria-expanded={expandedGroups[group.title]} onClick={() => setExpandedGroups((current) => ({ ...current, [group.title]: !current[group.title] }))} />}>
                <span>{group.title}</span><ChevronDown aria-hidden="true" />
              </SidebarGroupLabel>
              {expandedGroups[group.title] && <SidebarGroupContent>
                {group.sections.map((section) => {
                  const key = sectionKey(group.title, section.title);
                  const expanded = expandedSections[key] ?? true;
                  const sectionActive = section.items.some((item) => item.path === activeNavigationPath(location.pathname));
                  return (
                    <div className="sidebar-section" key={key}>
                      <button
                        className="sidebar-section-trigger"
                        data-active={sectionActive || undefined}
                        aria-expanded={expanded}
                        onClick={() => setExpandedSections((current) => ({ ...current, [key]: !expanded }))}
                      >
                        <PlatformIcon name={section.icon} variant="line" className="sidebar-nav-icon" />
                        <span>{section.title}</span>
                        <ChevronDown className="sidebar-section-chevron" aria-hidden="true" />
                      </button>
                      {expanded && <SidebarMenu className="sidebar-leaf-menu">
                        {section.items.map((item) => {
                          const Icon = item.icon;
                          const active = activeNavigationPath(location.pathname) === item.path;
                          return (
                            <SidebarMenuItem key={item.path}>
                              <SidebarMenuButton render={<NavLink to={item.path} />} isActive={active} tooltip={item.title}>
                                <PlatformIcon name={Icon} variant="line" className="sidebar-nav-icon" /><span>{item.title}</span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>}
                    </div>
                  );
                })}
              </SidebarGroupContent>}
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter className="sidebar-footer">
          <div className="workspace-status"><span className="status-led" /><span>有数计划工作空间</span><Badge variant="outline">服务端数据</Badge></div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="workspace-main">
        <header className="workspace-header">
          <div className="workspace-header-left"><SidebarTrigger /><Separator orientation="vertical" className="header-separator" />
            <Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink render={<Link to="/home/index" />}>工作台</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>{pageTitle}</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>
          </div>
          <div className="workspace-header-right">
            <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" aria-label="通知" onClick={() => setNoticesOpen(true)}><Bell /></Button>} /><TooltipContent>通知消息</TooltipContent></Tooltip>
            <Separator orientation="vertical" className="header-separator" />
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" className="user-trigger" aria-label="打开账号菜单"><Avatar><AvatarFallback>{userName.slice(0, 1)}</AvatarFallback></Avatar><span className="user-trigger-name">{userName}</span><ChevronDown /></Button>} />
              <DropdownMenuContent align="end" className="user-menu">
                <DropdownMenuGroup><DropdownMenuLabel><span className="user-menu-label">当前账号</span><strong>{userName}</strong></DropdownMenuLabel></DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={logout}><LogOut />退出登录</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="workspace-tabs-wrap">
          <Tabs value={location.pathname} onValueChange={(path) => navigate(path)}>
            <TabsList className="workspace-tabs">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.path} value={tab.path} className="workspace-tab">
                  {tab.title}{tab.path !== '/home/index' && <button aria-label={`关闭${tab.title}`} className="tab-close" onClick={(event) => { event.stopPropagation(); closeTab(tab.path); }}><X /></button>}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="tab-options">页签 <ChevronDown /></Button>} />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { const next = tabs.filter((tab) => tab.path === location.pathname || tab.path === '/home/index'); setTabs(next); localStorage.setItem(TABS_KEY, JSON.stringify(next)); }}>关闭其他</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { const next = [{ path: '/home/index', title: '首页' }]; setTabs(next); localStorage.setItem(TABS_KEY, JSON.stringify(next)); navigate('/home/index'); }}>关闭全部</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <main className="workspace-content"><Outlet /></main>
      </SidebarInset>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="command-dialog"><DialogHeader><DialogTitle>搜索工作台</DialogTitle><DialogDescription>按名称查找业务模块。</DialogDescription></DialogHeader>
          <Command><CommandInput placeholder="搜索政策、园区、企业服务…" /><CommandList><CommandEmpty>没有匹配的菜单。</CommandEmpty>
            {navGroups.flatMap((group) => group.sections.map((section) => <CommandGroup heading={`${group.title} · ${section.title}`} key={`${group.title}:${section.title}`}>{section.items.map((item) => { const Icon = item.icon; return <CommandItem key={item.path} value={`${group.title} ${section.title} ${item.title}`} onSelect={() => { navigate(item.path); setSearchOpen(false); }}><PlatformIcon name={Icon} />{item.title}<ChevronRight className="command-arrow" /></CommandItem>; })}</CommandGroup>))}
          </CommandList></Command>
        </DialogContent>
      </Dialog>
      <Dialog open={noticesOpen} onOpenChange={setNoticesOpen}>
        <DialogContent className="notice-dialog"><DialogHeader><DialogTitle>通知消息</DialogTitle><DialogDescription>工作台服务提醒</DialogDescription></DialogHeader>
          <div className="notice-list"><Notice text="您有 3 条新的高潜商机线索待跟进" time="10 分钟前" path="/business/projectCluesUpdate/index" onNavigate={() => setNoticesOpen(false)} /><Notice text="政策「上海市专精特新中小企业认定」已更新" time="2 小时前" path="/policy/detail/P001" onNavigate={() => setNoticesOpen(false)} /><Notice text="园区企业年报申报进入倒计时" time="昨天" path="/myCampus/guarantee/index" onNavigate={() => setNoticesOpen(false)} /></div>
        </DialogContent>
      </Dialog>

    </SidebarProvider>
  );
}

function Notice({ text, time, path, onNavigate }: { text: string; time: string; path: string; onNavigate: () => void }) {
  return <Link className="notice-row" to={path} onClick={onNavigate}><span className="notice-mark" /><div><p>{text}</p><small>{time}</small></div><ChevronRight className="notice-arrow" aria-hidden="true" /></Link>;
}

function LegacyFrame() {
  const location = useLocation();
  const navigate = useNavigate();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [frameHeight, setFrameHeight] = useState(900);
  const [outerMask, setOuterMask] = useState<{ top: number; left: number; right: number; bottom: number; color: string } | null>(null);
  const syncOverlayRef = useRef<(() => void) | null>(null);
  const legacySrc = `/legacy.html#${location.pathname}${location.search}`;

  const observerRef = useRef<ResizeObserver | null>(null);
  const mountObserverRef = useRef<MutationObserver | null>(null);
  const overlayObserverRef = useRef<MutationObserver | null>(null);
  const styleLegacy = useCallback(() => {
    const frame = frameRef.current;
    const document = frame?.contentDocument;
    if (!document) return;
    observerRef.current?.disconnect();
    mountObserverRef.current?.disconnect();
    overlayObserverRef.current?.disconnect();
    document.documentElement.style.setProperty('--workspace-height', `${window.innerHeight}px`);
    const legacyWindow = frame.contentWindow;
    const syncLegacyRoute = () => {
      const hash = legacyWindow?.location.hash || '';
      const legacyPath = hash.replace(/^#/, '').split('?')[0];
      if (legacyPath.startsWith('/') && legacyPath !== location.pathname) navigate(legacyPath);
    };
    legacyWindow?.addEventListener('hashchange', syncLegacyRoute);
    legacyWindow?.addEventListener('popstate', syncLegacyRoute);
    const history = legacyWindow?.history as (History & { __workspaceRouteSyncPatched?: boolean }) | undefined;
    if (history && !history.__workspaceRouteSyncPatched) {
      const pushState = history.pushState.bind(history);
      const replaceState = history.replaceState.bind(history);
      history.pushState = (...args) => { pushState(...args); queueMicrotask(syncLegacyRoute); };
      history.replaceState = (...args) => { replaceState(...args); queueMicrotask(syncLegacyRoute); };
      history.__workspaceRouteSyncPatched = true;
    }
    document.getElementById('workspace-theme')?.remove();
    const style = document.createElement('style');
    style.id = 'workspace-theme';
    style.textContent = legacyTheme;
    document.head.appendChild(style);
    const reportHeight = () => {
      const content = document.querySelector('.scroll-content');
      if (!content) return;
      const bounds = content.getBoundingClientRect();
      const height = Math.ceil(bounds.top + Math.max(bounds.height, content.scrollHeight) + 32);
      setFrameHeight(Math.max(300, height));
    };
    const observer = new ResizeObserver(reportHeight);
    observerRef.current = observer;
    const observeContent = () => {
      const content = document.querySelector('.scroll-content');
      if (!content) return false;
      observer.observe(content);
      reportHeight();
      return true;
    };
    if (!observeContent()) {
      const mountObserver = new MutationObserver(() => {
        if (observeContent()) mountObserver.disconnect();
      });
      mountObserverRef.current = mountObserver;
      mountObserver.observe(document.body, { childList: true, subtree: true });
    }
    document.fonts?.ready.then(reportHeight);
    setTimeout(reportHeight, 120);
    let overlayVisible = false;
    const syncOverlay = () => {
      const visible = Array.from(document.querySelectorAll('.ant-modal-wrap,.ant-drawer')).some((element) => {
        const box = element.getBoundingClientRect();
        const style = document.defaultView?.getComputedStyle(element);
        return box.width > 0 && box.height > 0 && style?.visibility !== 'hidden' && style?.display !== 'none';
      });
      if (visible && !overlayVisible) window.scrollTo({ top: 0 });
      overlayVisible = visible;
      const masks = Array.from(document.querySelectorAll<HTMLElement>('.ant-modal-mask,.ant-drawer-mask'));
      const mask = masks.reverse().find((element) => {
        const style = document.defaultView?.getComputedStyle(element);
        return style && style.display !== 'none' && style.visibility !== 'hidden' && element.getBoundingClientRect().width > 0;
      });
      if (!visible || !mask || !frame) { setOuterMask(null); return; }
      const rect = frame.getBoundingClientRect();
      const next = { top: Math.max(0, Math.min(window.innerHeight, rect.top)), left: Math.max(0, Math.min(window.innerWidth, rect.left)), right: Math.max(0, Math.min(window.innerWidth, rect.right)), bottom: Math.max(0, Math.min(window.innerHeight, rect.bottom)), color: document.defaultView?.getComputedStyle(mask).backgroundColor || 'rgba(0, 0, 0, .45)' };
      setOuterMask((previous) => previous && Object.keys(next).every((key) => previous[key as keyof typeof next] === next[key as keyof typeof next]) ? previous : next);
    };
    syncOverlayRef.current = syncOverlay;
    const overlaySelector = '.ant-modal-wrap,.ant-modal-mask,.ant-drawer,.ant-drawer-mask';
    const relevantNode = (node: Node) => node.nodeType === Node.ELEMENT_NODE && ((node as Element).matches(overlaySelector) || !!(node as Element).querySelector(overlaySelector));
    const overlayObserver = new MutationObserver((records) => {
      if (records.some((record) => {
        if (record.target.nodeType === Node.ELEMENT_NODE && (record.target as Element).closest('.map-live')) return false;
        return record.type === 'attributes'
          ? record.target.nodeType === Node.ELEMENT_NODE && (record.target as Element).matches(overlaySelector)
          : [...record.addedNodes, ...record.removedNodes].some(relevantNode);
      })) syncOverlay();
    });
    overlayObserverRef.current = overlayObserver;
    overlayObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    syncOverlay();
  }, [location.pathname, navigate]);

  useEffect(() => {
    const sync = () => syncOverlayRef.current?.();
    window.addEventListener('resize', sync);
    window.addEventListener('scroll', sync, { passive: true });
    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('scroll', sync);
      observerRef.current?.disconnect();
      mountObserverRef.current?.disconnect();
      overlayObserverRef.current?.disconnect();
    };
  }, []);

  const closeFromOuterMask = () => {
    const doc = frameRef.current?.contentDocument;
    if (!doc) return;
    const targets = Array.from(doc.querySelectorAll<HTMLElement>('.ant-modal-wrap,.ant-drawer-mask')).reverse();
    const target = targets.find((element) => element.getBoundingClientRect().width > 0 && doc.defaultView?.getComputedStyle(element).display !== 'none');
    if (target) { const event = doc.createEvent('MouseEvents'); event.initMouseEvent('click', true, true, doc.defaultView || window, 1, 0, 0, 0, 0, false, false, false, false, 0, null); target.dispatchEvent(event); }
  };
  return <section className="legacy-page"><iframe ref={frameRef} key={legacySrc} src={legacySrc} title={`${getTitle(location.pathname)}业务模块`} onLoad={styleLegacy} style={{ height: frameHeight }} />
    {outerMask && createPortal(<div className="legacy-outer-mask" aria-hidden="true" onClick={closeFromOuterMask}>
      <div style={{ top: 0, left: 0, right: 0, height: outerMask.top, background: outerMask.color }} />
      <div style={{ top: outerMask.top, left: 0, width: outerMask.left, height: Math.max(0, outerMask.bottom - outerMask.top), background: outerMask.color }} />
      <div style={{ top: outerMask.top, left: outerMask.right, right: 0, height: Math.max(0, outerMask.bottom - outerMask.top), background: outerMask.color }} />
      <div style={{ top: outerMask.bottom, left: 0, right: 0, bottom: 0, background: outerMask.color }} />
    </div>, window.document.body)}
  </section>;
}

export default App;
