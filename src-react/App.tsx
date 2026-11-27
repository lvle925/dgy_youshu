import { type FormEvent, type ReactNode, Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { CircleHelp, Eye, EyeOff } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrandMark } from '@/components/BrandMark';
import { AccessContext, allowsRoute, permissionPath, type Principal } from './app/AccessContext';
import { ReportProvider } from './app/ReportQueue';
import { AppShell } from './app/AppShell';
import { NewDeviceVerificationDialog } from './components/auth/NewDeviceVerificationDialog';
import { CaptchaField, type CaptchaChallenge } from './components/auth/CaptchaField';
import { navigationByPath, navigationItems } from './app/navigation';
import './business-pages.css';

const TABS_KEY = 'DEMO_TABS';
function getTitle(path: string) {
  const item = navigationByPath.get(path);
  if (item) return item.title;
  if (path.startsWith('/policy/detail/')) return '政策详情';
  if (path.startsWith('/subsidy/company/')) return '企业详情';
  if (path.startsWith('/park/detail/')) return '园区详情';
  if (path.startsWith('/clue/detail/')) return '线索详情';
  return '业务模块';
}

type AuthStatus = { initialized: boolean; authenticated: boolean; demoLoginEnabled?: boolean; demoSession?: boolean; demoPhone?: string; principal?: Principal; reason?: string };

function useAuthStatus() {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const refresh = useCallback(async () => {
    const response = await fetch('/api/auth/status', { credentials: 'same-origin' });
    if (!response.ok) throw new Error('服务暂不可用，请稍后重试');
    const result = await response.json();
    setStatus(result);
    return result as AuthStatus;
  }, []);
  useEffect(() => { refresh().catch(() => setStatus({ initialized: false, authenticated: false })); }, [refresh]);
  return { status, refresh };
}

const HomeDashboard = lazy(() => import('./HomeDashboard'));
const PolicyPage = lazy(() => import('./pages/investment/PolicyPage').then((module) => ({ default: module.PolicyPage })));
const PolicyDetailPage = lazy(() => import('./pages/investment/PolicyDetailPage').then((module) => ({ default: module.PolicyDetailPage })));
const IndustryChartPage = lazy(() => import('./pages/investment/IndustryChartPage').then((module) => ({ default: module.IndustryChartPage })));
const IndustrySupplyPage = lazy(() => import('./pages/investment/IndustrySupplyPage').then((module) => ({ default: module.IndustrySupplyPage })));
const ParksBuildingsPage = lazy(() => import('./pages/investment/ParksBuildingsPage').then((module) => ({ default: module.ParksBuildingsPage })));
const BusinessMapPage = lazy(() => import('./pages/investment/BusinessMapPage').then((module) => ({ default: module.BusinessMapPage })));
const CompanySearchPage = lazy(() => import('./pages/investment/CompanySearchPage').then((module) => ({ default: module.CompanySearchPage })));
const CompanyDetailPage = lazy(() => import('./pages/investment/CompanyDetailPage').then((module) => ({ default: module.CompanyDetailPage })));
const ParkDetailPage = lazy(() => import('./pages/investment/ParkDetailPage').then((module) => ({ default: module.ParkDetailPage })));
const BiddingPage = lazy(() => import('./pages/investment/BiddingPage').then((module) => ({ default: module.BiddingPage })));
const BusinessInvestigatePage = lazy(() => import('./pages/opportunity/BusinessInvestigatePage').then((module) => ({ default: module.BusinessInvestigatePage })));
const BusinessHallPage = lazy(() => import('./pages/opportunity/BusinessHallPage').then((module) => ({ default: module.BusinessHallPage })));
const EnterpriseExpansionPage = lazy(() => import('./pages/opportunity/EnterpriseExpansionPage'));
const ProjectCluesPage = lazy(() => import('./pages/opportunity/ProjectCluesPage').then((module) => ({ default: module.ProjectCluesPage })));
const ClueDetailPage = lazy(() => import('./pages/opportunity/ClueDetailPage').then((module) => ({ default: module.ClueDetailPage })));
const AiOutboundTasksPage = lazy(() => import('./pages/opportunity/AiOutboundTasksPage'));
const AiOutboundRecordsPage = lazy(() => import('./pages/opportunity/AiOutboundRecordsPage'));
const AiOutboundDashboardPage = lazy(() => import('./pages/opportunity/AiOutboundDashboardPage'));
const PanoramicInsightPage = lazy(() => import('./pages/stability/PanoramicInsightPage').then((module) => ({ default: module.PanoramicInsightPage })));
const CampusAdminPage = lazy(() => import('./pages/stability/CampusAdminPage').then((module) => ({ default: module.CampusAdminPage })));
const CorporateArchivesPage = lazy(() => import('./pages/stability/CorporateArchivesPage').then((module) => ({ default: module.CorporateArchivesPage })));
const MigrationWarningPage = lazy(() => import('./pages/stability/MigrationWarningPage').then((module) => ({ default: module.MigrationWarningPage })));
const GuaranteePage = lazy(() => import('./pages/stability/GuaranteePage').then((module) => ({ default: module.GuaranteePage })));
const VisitManagePage = lazy(() => import('./pages/stability/VisitManagePage').then((module) => ({ default: module.VisitManagePage })));
const SettingPage = lazy(() => import('./pages/admin/SettingPage').then((module) => ({ default: module.SettingPage })));
const MemberPage = lazy(() => import('./pages/admin/MemberPage').then((module) => ({ default: module.MemberPage })));
const RolePage = lazy(() => import('./pages/admin/RolePage').then((module) => ({ default: module.RolePage })));
const DepartmentPage = lazy(() => import('./pages/admin/DepartmentPage').then((module) => ({ default: module.DepartmentPage })));
const MemberLogPage = lazy(() => import('./pages/admin/MemberLogPage').then((module) => ({ default: module.MemberLogPage })));
const MemberLogStatisticsPage = lazy(() => import('./pages/admin/MemberLogStatisticsPage').then((module) => ({ default: module.MemberLogStatisticsPage })));
const InterfaceMonitoringPage = lazy(() => import('./pages/admin/InterfaceMonitoringPage').then((module) => ({ default: module.InterfaceMonitoringPage })));

function PageFallback({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="business-loading"><Skeleton className="h-10 w-56" /><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>}>{children}</Suspense>;
}

const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function App() {
  return (
    <TooltipProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedShell />}>
          <Route path="/" element={<Navigate replace to="/home/index" />} />
          <Route path="/home/index" element={<PageFallback><HomeDashboard /></PageFallback>} />
          <Route path="/policy/index" element={<PageFallback><PolicyPage /></PageFallback>} />
          <Route path="/policy/detail/:id" element={<PageFallback><PolicyDetailPage /></PageFallback>} />
          <Route path="/industryChain/industryChart/index" element={<PageFallback><IndustryChartPage /></PageFallback>} />
          <Route path="/industryChain/industrySupply/index" element={<PageFallback><IndustrySupplyPage /></PageFallback>} />
          <Route path="/parksBuildings/index" element={<PageFallback><ParksBuildingsPage /></PageFallback>} />
          <Route path="/businessMap/index" element={<PageFallback><BusinessMapPage /></PageFallback>} />
          <Route path="/subsidy/index" element={<PageFallback><CompanySearchPage /></PageFallback>} />
          <Route path="/subsidy/company/:id" element={<PageFallback><CompanyDetailPage /></PageFallback>} />
          <Route path="/business/businessInvestigate/index" element={<PageFallback><BusinessInvestigatePage /></PageFallback>} />
          <Route path="/business/businessHall/index" element={<PageFallback><BusinessHallPage /></PageFallback>} />
          <Route path="/business/projectClues/index" element={<PageFallback><EnterpriseExpansionPage /></PageFallback>} />
          <Route path="/business/enterpriseExpansion/index" element={<Navigate replace to="/business/projectClues/index" />} />
          <Route path="/business/projectCluesUpdate/index" element={<PageFallback><ProjectCluesPage /></PageFallback>} />
          <Route path="/clue/detail/:id" element={<PageFallback><ClueDetailPage /></PageFallback>} />
          <Route path="/business/aiOutbound/tasks" element={<PageFallback><AiOutboundTasksPage /></PageFallback>} />
          <Route path="/business/aiOutbound/records" element={<PageFallback><AiOutboundRecordsPage /></PageFallback>} />
          <Route path="/business/aiOutbound/dashboard" element={<PageFallback><AiOutboundDashboardPage /></PageFallback>} />
          <Route path="/myCampus/panoramicLnsight/index" element={<PageFallback><PanoramicInsightPage /></PageFallback>} />
          <Route path="/myCampus/campusAdmin/index" element={<PageFallback><CampusAdminPage /></PageFallback>} />
          <Route path="/myCampus/corporateArchives/index" element={<PageFallback><CorporateArchivesPage /></PageFallback>} />
          <Route path="/myCampus/migrationWarning/index" element={<PageFallback><MigrationWarningPage /></PageFallback>} />
          <Route path="/myCampus/guarantee/index" element={<PageFallback><GuaranteePage /></PageFallback>} />
          <Route path="/myCampus/visitManage/index" element={<PageFallback><VisitManagePage /></PageFallback>} />
          <Route path="/member/index" element={<PageFallback><MemberPage /></PageFallback>} />
          <Route path="/member/departments" element={<PageFallback><DepartmentPage /></PageFallback>} />
          <Route path="/member/role" element={<PageFallback><RolePage /></PageFallback>} />
          <Route path="/member/log" element={<PageFallback><MemberLogPage /></PageFallback>} />
          <Route path="/member/logStatistics" element={<PageFallback><MemberLogStatisticsPage /></PageFallback>} />
          <Route path="/setting/index" element={<PageFallback><SettingPage /></PageFallback>} />
          <Route path="/system/interface-monitoring" element={<PageFallback><InterfaceMonitoringPage /></PageFallback>} />
          <Route path="/bidding/index" element={<PageFallback><BiddingPage /></PageFallback>} />
          <Route path="/park/detail/:id" element={<PageFallback><ParkDetailPage /></PageFallback>} />
          <Route path="*" element={<PageFallback><NotFoundPage /></PageFallback>} />
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
  const loginLocation = useLocation();
  const [error, setError] = useState(() => (loginLocation.state as { reason?: string } | null)?.reason ?? '');
  const [notice, setNotice] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captcha, setCaptcha] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null);
  const [captchaBusy, setCaptchaBusy] = useState(false);
  const [loginMode, setLoginMode] = useState<'sms' | 'password'>('sms');
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [smsChallengeId, setSmsChallengeId] = useState('');
  const [smsSeconds, setSmsSeconds] = useState(0);
  const [smsSending, setSmsSending] = useState(false);
  const [deviceChallenge, setDeviceChallenge] = useState<{ id: string; phone: string; demoCode?: string } | null>(null);

  const refreshCaptcha = useCallback(async () => {
    setCaptchaBusy(true);
    setCaptcha('');
    setCaptchaToken('');
    setChallenge(null);
    try {
      const response = await fetch('/api/auth/captcha', { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) throw new Error('验证码加载失败，请点击重试。');
      setChallenge(await response.json());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '验证码加载失败，请重试。');
    } finally { setCaptchaBusy(false); }
  }, []);

  useEffect(() => { void refreshCaptcha(); }, [refreshCaptcha]);

  useEffect(() => {
    if (status?.demoLoginEnabled && !phone) setPhone(status.demoPhone || '127127');
  }, [phone, status?.demoLoginEnabled, status?.demoPhone]);

  useEffect(() => {
    if (smsSeconds <= 0) return;
    const timer = window.setTimeout(() => setSmsSeconds((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [smsSeconds]);

  useEffect(() => {
    if (status?.authenticated) navigate('/home/index', { replace: true });
  }, [status, navigate]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loginMode === 'sms') {
      if (status?.demoLoginEnabled && phone === status.demoPhone && !smsChallengeId && !smsCode) {
        await demoLogin();
        return;
      }
      const isDemoPhone = Boolean(status?.demoLoginEnabled && phone === status.demoPhone);
      if ((!isDemoPhone && !/^1\d{10}$/.test(phone)) || !/^\d{6}$/.test(smsCode) || !smsChallengeId) {
        setError(isDemoPhone ? '请点击发送验证码获取本地演示验证码。' : '请输入有效手机号并获取 6 位短信验证码。');
        return;
      }
      setBusy(true);
      setError('');
      try {
        const response = await fetch('/api/auth/sms/login', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, code: smsCode, challengeId: smsChallengeId }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result.message || '短信服务暂不可用，请稍后重试。');
        }
        await completeLogin({ ...result, user: result.user || phone }, '已安全登录');
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : '短信登录失败，请重试。');
      } finally {
        setBusy(false);
      }
      return;
    }
    if (username.trim().length < 3 || password.length < 12) {
      setError('账号至少 3 个字符，密码至少 12 个字符。');
      return;
    }
    const needsTurnstile = challenge?.provider === 'turnstile';
    if (!challenge || (needsTurnstile ? !captchaToken : captcha.trim().length !== 4)) {
      setError(needsTurnstile ? '请完成人机验证。' : '请输入图片中的 4 位验证码。');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const endpoint = status?.initialized ? '/api/auth/login' : '/api/auth/setup';
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password, captchaId: challenge.id, captcha: captcha.trim(), captchaToken }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || (status?.initialized ? '账号或密码不正确。' : '创建失败，请稍后重试。'));
      await completeLogin(
        result,
        status?.initialized ? '已安全登录' : '本地管理员已创建',
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '服务暂不可用，请稍后重试。');
      void refreshCaptcha();
      window.requestAnimationFrame(() => document.getElementById('captcha')?.focus());
    } finally {
      setBusy(false);
    }
  }

  async function sendSmsCode() {
    const isDemoPhone = Boolean(status?.demoLoginEnabled && phone === status.demoPhone);
    if (!isDemoPhone && !/^1\d{10}$/.test(phone)) { setError('请输入 11 位手机号码。'); return; }
    setSmsSending(true);
    try {
      const response = await fetch('/api/auth/sms/send', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || '当前本地服务尚未接入短信发送。');
      setSmsChallengeId(result.challengeId || '');
      if (result.demoCode) setSmsCode(result.demoCode);
      setSmsSeconds(Number(result.resendAfter) || 60);
      setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '短信发送失败，请稍后重试。'); }
    finally { setSmsSending(false); }
  }

  async function verifyNewDevice(code: string, trustDevice: boolean) {
    if (!deviceChallenge) throw new Error('设备验证已过期，请重新登录。');
    const response = await fetch('/api/auth/device/verify', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challengeId: deviceChallenge.id, code, trustDevice }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || '设备验证服务尚未接入。');
    localStorage.setItem('DEMO_USER', result.user || username.trim());
    setDeviceChallenge(null);
    await refresh();
    navigate((location.state as { from?: string } | null)?.from || '/home/index', { replace: true });
  }

  async function demoLogin() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/demo-login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: status?.demoPhone || '127127' }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || '本地演示登录不可用。');
      await completeLogin(result, '已进入本地演示工作台');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '本地演示登录失败。');
    } finally {
      setBusy(false);
    }
  }

  async function completeLogin(result: { user?: string; requiresDeviceVerification?: boolean; deviceChallengeId?: string; maskedPhone?: string; demoCode?: string }, successMessage: string) {
    if (result.requiresDeviceVerification) {
      if (!result.deviceChallengeId) throw new Error('设备验证信息缺失，请重新登录。');
      setDeviceChallenge({ id: result.deviceChallengeId, phone: result.maskedPhone || '已绑定手机号', demoCode: result.demoCode });
      return;
    }
    localStorage.setItem('DEMO_USER', result.user || username.trim());
    setPassword('');
    await refresh();
    const redirect = (location.state as { from?: string } | null)?.from || '/home/index';
    navigate(redirect, { replace: true });
    toast.success(successMessage);
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
      <div className="login-brand-caption">政府委办局与产业园区内部专用</div>
        <div className="login-copy">
          <h1>{status.demoLoginEnabled && !status.initialized ? '进入演示工作台' : status.initialized ? '欢迎回来' : '创建本地管理员'}</h1>
          <p>{status.demoLoginEnabled && !status.initialized ? '本机演示入口可直接体验工作台。' : status.initialized ? '使用安全验证进入工作台。' : '首次使用，请创建管理员账号。'}</p>
        </div>
        {error && <Alert variant="destructive"><CircleHelp /><AlertTitle>无法继续</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
        {notice && <Alert><CircleHelp /><AlertTitle>请注意</AlertTitle><AlertDescription>{notice}</AlertDescription></Alert>}
        <div className="login-mode-tabs" role="tablist" aria-label="登录方式"><button type="button" role="tab" aria-selected={loginMode === 'sms'} className={loginMode === 'sms' ? 'is-active' : ''} onClick={() => { setLoginMode('sms'); setError(''); setNotice(''); setPassword(''); }}>短信验证码登录</button><button type="button" role="tab" aria-selected={loginMode === 'password'} className={loginMode === 'password' ? 'is-active' : ''} onClick={() => { setLoginMode('password'); setError(''); setNotice(''); setPassword(''); }}>账号密码登录</button></div>
        <form className="login-form" onSubmit={submit}>
          {loginMode === 'sms' ? <>
            <label htmlFor="sms-phone">手机号</label>
            <Input id="sms-phone" autoComplete="tel" inputMode="numeric" maxLength={11} value={phone} onChange={(event) => { setPhone(event.target.value.replace(/\D/g, '').slice(0, 11)); setSmsChallengeId(''); setSmsCode(''); setSmsSeconds(0); }} placeholder={status.demoLoginEnabled ? '演示账号 127127' : '请输入 11 位手机号码'} required />
            <label className="captcha-label" htmlFor="sms-code">短信验证码</label>
            <div className="sms-code-row"><Input id="sms-code" autoComplete="one-time-code" inputMode="numeric" maxLength={6} value={smsCode} onChange={(event) => setSmsCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="请输入验证码" required /><Button type="button" variant="outline" disabled={smsSeconds > 0 || smsSending} onClick={() => void sendSmsCode()}>{smsSending ? '发送中…' : smsSeconds > 0 ? `${smsSeconds} 秒后重试` : '发送验证码'}</Button></div>
            {status.demoLoginEnabled && <p className="login-mode-note">本机演示账号 {status.demoPhone || '127127'}。短信码为 127127，也可直接免验证码演示登录。</p>}
            <Button className="login-submit" type="submit" disabled={busy || !smsChallengeId || !/^\d{6}$/.test(smsCode)}>{busy ? '正在验证' : '短信登录'}</Button>
            {status.demoLoginEnabled && <Button className="demo-login-button" type="button" variant="outline" disabled={busy} onClick={() => void demoLogin()}>127127 免验证码演示登录</Button>}
          </> : <>
          <label htmlFor="username">账号</label>
          <Input id="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="至少 3 个字符" required minLength={3} />
          <div className="login-password-label"><label htmlFor="password">密码</label>{status.initialized && <button type="button" className="login-forget-password" onClick={() => { setError(''); setNotice('当前本地服务未开放密码找回，请联系单位管理员重置后重试。'); }}>忘记密码</button>}</div>
          <div className="login-password-input"><Input id="password" autoComplete={status.initialized ? 'current-password' : 'new-password'} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 12 位，包含字母和数字" required minLength={12} /><button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? '隐藏密码' : '显示密码'} aria-pressed={showPassword}>{showPassword ? <EyeOff /> : <Eye />}</button></div>
          <label className="captcha-label" htmlFor={challenge?.provider === 'turnstile' ? undefined : 'captcha'}>{challenge?.provider === 'turnstile' ? '安全验证' : '图片验证码'}</label>
          <CaptchaField challenge={challenge} answer={captcha} token={captchaToken} disabled={busy || captchaBusy} onAnswerChange={setCaptcha} onTokenChange={setCaptchaToken} onRefresh={() => void refreshCaptcha()} />
          <Button className="login-submit" type="submit" disabled={busy || captchaBusy || !challenge || (challenge.provider === 'turnstile' ? !captchaToken : captcha.length !== 4)}>
            {busy ? <><span className="spinner" /> 正在验证</> : status.initialized ? '登录工作台' : '创建并进入工作台'}
          </Button>
          </>}
        </form>
        <div className="login-side-note"><span>产业招商</span><span>·</span><span>企业服务</span><span>·</span><span>园区运营</span></div>
      </section>
      </div>
      <NewDeviceVerificationDialog open={Boolean(deviceChallenge)} onOpenChange={(open) => { if (!open) setDeviceChallenge(null); }} phone={deviceChallenge?.phone ?? ''} demoCode={deviceChallenge?.demoCode} onVerify={verifyNewDevice} onResend={async () => { const response = await fetch('/api/auth/device/send', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challengeId: deviceChallenge?.id }) }); const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.message || '设备验证码发送失败'); return result.demoCode as string | undefined; }} onChangePassword={() => { setDeviceChallenge(null); setLoginMode('password'); setError('当前账号暂不支持在线修改密码，请联系管理员。'); }} />
    </main>
  );
}

function ProtectedShell() {
  const { status, refresh } = useAuthStatus();
  const location = useLocation();
  useEffect(() => {
    const recheck = () => void refresh().catch(() => undefined);
    window.addEventListener("workspace-access-changed", recheck);
    window.addEventListener("focus", recheck);
    return () => {
      window.removeEventListener("workspace-access-changed", recheck);
      window.removeEventListener("focus", recheck);
    };
  }, [refresh]);
  if (!status) return <div className="loading-screen"><BrandMark /><p>正在加载工作台</p></div>;
  if (!status.authenticated || !status.principal) return <Navigate to="/login" replace state={{ from: location.pathname + location.search, reason: status.reason }} />;
  const principal = status.principal;
  const knownRoute = navigationByPath.has(permissionPath(location.pathname));
  const firstRoute = navigationItems.find(item => allowsRoute(principal, item.path));
  if (location.pathname === "/" && firstRoute) return <Navigate replace to={firstRoute.path} />;
  if (location.pathname === "/home/index" && firstRoute && !allowsRoute(principal, location.pathname)) {
    return <Navigate replace to={firstRoute.path} />;
  }
  if (principal.mustChangePassword) return <ForcePasswordChange onChanged={() => void refresh()} />;
  return <AccessContext.Provider value={{ ...principal, demoSession: status.demoLoginEnabled && status.demoSession }}><ReportProvider><Workspace userName={principal.user}>{knownRoute && !allowsRoute(principal, location.pathname) ? <Alert className="os-glass-card"><AlertTitle>没有页面访问权限</AlertTitle><AlertDescription>请选择左侧已有权限的业务菜单，或联系管理员调整角色。</AlertDescription></Alert> : <Outlet />}</Workspace></ReportProvider></AccessContext.Provider>;
}

function ForcePasswordChange({ onChanged }: { onChanged: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) return setError('两次输入的密码不一致。');
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/change-password', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || '密码更新失败。');
      onChanged();
      toast.success('密码已更新');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '密码更新失败。');
    } finally { setBusy(false); }
  }
  return <main className="force-password-page"><form className="force-password-card os-glass-card" onSubmit={submit}>
    <BrandMark />
    <h1>首次登录，请先修改密码</h1>
    <p>新密码至少 12 位，并同时包含字母和数字。</p>
    {error && <Alert variant="destructive"><AlertTitle>无法保存</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
    <label htmlFor="new-password">新密码</label><Input id="new-password" type="password" autoComplete="new-password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} required />
    <label htmlFor="confirm-password">确认新密码</label><Input id="confirm-password" type="password" autoComplete="new-password" minLength={12} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
    <Button type="submit" disabled={busy}>{busy ? '正在保存…' : '更新密码并进入工作台'}</Button>
  </form></main>;
}

function Workspace({ userName, children }: { userName: string; children: ReactNode }) {
  const navigate = useNavigate();
  async function logout() {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
      if (!response.ok) throw new Error('退出失败');
      localStorage.removeItem('DEMO_USER');
      localStorage.removeItem(TABS_KEY);
      navigate('/login', { replace: true });
      toast.success('已退出登录');
    } catch { toast.error('退出失败，请稍后重试'); }
  }
  return <AppShell userName={userName} onLogout={() => void logout()}>{children}</AppShell>;
}

export default App;
