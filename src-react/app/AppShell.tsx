import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  navigationByPath,
  navigationGroups,
  type NavigationGroup,
} from "./navigation";
import { PROVINCES, REGION_CITY_OPTIONS } from "../../src/mocks/enums";
import { BrandMark } from "@/components/BrandMark";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { toast } from "sonner";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  PanelLeft,
  Search,
  X,
} from "lucide-react";
import { CityContext } from "./CityContext";

const TABS_KEY = "DEMO_TABS";
const TAB_LIMIT = 12;
const HOME_TAB = { title: "首页", path: "/home/index" };
type WorkspaceTab = { title: string; path: string };

function readTabs(): WorkspaceTab[] {
  try {
    const saved = JSON.parse(
      localStorage.getItem(TABS_KEY) || "[]",
    ) as WorkspaceTab[];
    const isKnownRoute = (path: unknown) =>
      typeof path === "string" &&
      (navigationByPath.has(path) ||
        /^\/(?:policy\/detail|subsidy\/company|park\/detail|clue\/detail)\/[^/]+$/.test(path));
    const valid = Array.isArray(saved)
      ? [
          ...new Map(
            saved
              .filter((tab) => isKnownRoute(tab?.path))
              .map((tab) => [tab.path, tab]),
          ).values(),
        ].slice(-TAB_LIMIT)
      : [];
    return [
      HOME_TAB,
      ...valid.filter((tab) => tab.path !== HOME_TAB.path),
    ].slice(0, TAB_LIMIT);
  } catch {
    return [HOME_TAB];
  }
}

function titleFor(path: string) {
  if (path.startsWith("/policy/detail/")) return "政策详情";
  if (path.startsWith("/subsidy/company/")) return "企业详情";
  if (path.startsWith("/park/detail/")) return "园区详情";
  if (path.startsWith("/clue/detail/")) return "线索详情";
  return navigationByPath.get(path)?.title ?? "业务模块";
}

function navigationPathFor(path: string) {
  if (path.startsWith("/policy/detail/")) return "/policy/index";
  if (path.startsWith("/subsidy/company/")) return "/subsidy/index";
  if (path.startsWith("/park/detail/")) return "/parksBuildings/index";
  if (path.startsWith("/clue/detail/")) return "/business/projectClues/index";
  return path;
}
function iconForPath(path: string) {
  return navigationByPath.get(path)?.icon;
}

function regionForCity(city: string) {
  return (
    PROVINCES.find(
      (region) =>
        region === city || REGION_CITY_OPTIONS[region]?.includes(city),
    ) ?? "上海市"
  );
}

export function AppShell({
  children,
  userName,
  onLogout,
}: {
  children: ReactNode;
  userName: string;
  onLogout: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [tabs, setTabs] = useState<WorkspaceTab[]>(readTabs);
  const [city, setCity] = useState(
    () => localStorage.getItem("workspace_city") || "上海市",
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navigationGroups.map((entry) => [entry.title, true])),
  );
  const [menuQuery, setMenuQuery] = useState("");
  const activePath =
    location.pathname === "/" ? HOME_TAB.path : location.pathname;
  const activeNavigationPath = navigationPathFor(activePath);
  const group = navigationGroups.find((entry) =>
    entry.sections.some((section) =>
      section.items.some((item) => item.path === activeNavigationPath),
    ),
  );

  useEffect(() => {
    setTabs((current) => {
      if (current.some((tab) => tab.path === activePath)) return current;
      const next = [
        ...current,
        { path: activePath, title: titleFor(activePath) },
      ];
      const limited =
        next.length > TAB_LIMIT
          ? [
              HOME_TAB,
              ...next
                .filter((tab) => tab.path !== HOME_TAB.path)
                .slice(-(TAB_LIMIT - 1)),
            ]
          : next;
      localStorage.setItem(TABS_KEY, JSON.stringify(limited));
      return limited;
    });
    document.title = `${titleFor(activePath)} · 有数计划`;
  }, [activePath]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function persistTabs(next: WorkspaceTab[]) {
    setTabs(next);
    localStorage.setItem(TABS_KEY, JSON.stringify(next));
  }
  function closeTab(path: string) {
    if (path === HOME_TAB.path) return;
    const currentIndex = tabs.findIndex((tab) => tab.path === path);
    const next = tabs.filter((tab) => tab.path !== path);
    persistTabs(next);
    if (activePath === path)
      navigate(next[Math.max(0, currentIndex - 1)]?.path ?? HOME_TAB.path);
  }
  function closeOtherTabs() {
    persistTabs([
      HOME_TAB,
      ...tabs.filter(
        (tab) => tab.path === activePath && tab.path !== HOME_TAB.path,
      ),
    ]);
  }
  function closeAllTabs() {
    persistTabs([HOME_TAB]);
    navigate(HOME_TAB.path);
  }

  return (
    <CityContext.Provider value={{ city, setCity }}>
      <SidebarProvider defaultOpen>
        <WorkspaceFrame
          userName={userName}
          onLogout={onLogout}
          city={city}
          setCity={(nextCity) => {
            setCity(nextCity);
            localStorage.setItem("workspace_city", nextCity);
          }}
          group={group}
          activePath={activePath}
          activeNavigationPath={activeNavigationPath}
          expanded={expanded}
          setExpanded={setExpanded}
          menuQuery={menuQuery}
          setMenuQuery={setMenuQuery}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenNotifications={() => setNoticesOpen(true)}
        >
          <WorkspaceTabs
            tabs={tabs}
            activePath={activePath}
            navigate={navigate}
            closeTab={closeTab}
            closeOtherTabs={closeOtherTabs}
            closeAllTabs={closeAllTabs}
          />
          <main className="workspace-content">{children}</main>
        </WorkspaceFrame>
        <GlobalSearch
          open={searchOpen}
          onOpenChange={setSearchOpen}
          onNavigate={(path) => navigate(path)}
        />
        <NotificationDrawer open={noticesOpen} onOpenChange={setNoticesOpen} />
      </SidebarProvider>
    </CityContext.Provider>
  );
}

function WorkspaceFrame({
  children,
  userName,
  onLogout,
  city,
  setCity,
  group,
  activePath,
  activeNavigationPath,
  expanded,
  setExpanded,
  menuQuery,
  setMenuQuery,
  onOpenSearch,
  onOpenNotifications,
}: {
  children: ReactNode;
  userName: string;
  onLogout: () => void;
  city: string;
  setCity: (city: string) => void;
  group?: NavigationGroup;
  activePath: string;
  activeNavigationPath: string;
  expanded: Record<string, boolean>;
  setExpanded: Dispatch<SetStateAction<Record<string, boolean>>>;
  menuQuery: string;
  setMenuQuery: (value: string) => void;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
}) {
  const { toggleSidebar } = useSidebar();
  const normalizedQuery = menuQuery.trim();
  return (
    <>
      <Sidebar collapsible="icon" className="workspace-sidebar">
        <SidebarHeader className="sidebar-brand-wrap">
          <Link
            className="sidebar-brand"
            to="/home/index"
            aria-label="有数计划首页"
          >
            <BrandMark />
            <span className="brand-wordmark">
              <strong>有数计划</strong>
              <small>政务办公工作台</small>
            </span>
          </Link>
        </SidebarHeader>
        <div className="sidebar-search-wrap">
          <div className="sidebar-search-input">
            <Search aria-hidden="true" />
            <Input
              value={menuQuery}
              onChange={(event) => setMenuQuery(event.target.value)}
              placeholder="过滤菜单"
              aria-label="过滤菜单"
            />
            {menuQuery && (
              <button
                type="button"
                onClick={() => setMenuQuery("")}
                aria-label="清除菜单筛选"
              >
                <X />
              </button>
            )}
          </div>
        </div>
        <SidebarSeparator />
        <SidebarContent className="sidebar-content">
          {navigationGroups.map((navGroup) => {
            const matchingSections = navGroup.sections
              .map((section) => ({
                ...section,
                items: section.items.filter((item) =>
                  `${navGroup.title} ${section.title} ${item.title}`.includes(
                    normalizedQuery,
                  ),
                ),
              }))
              .filter((section) => section.items.length > 0);
            if (normalizedQuery && matchingSections.length === 0) return null;
            const NavGroupIcon = navGroup.icon;
            return (
              <SidebarGroup key={navGroup.title}>
                <SidebarGroupLabel
                  render={
                    <button
                      type="button"
                      className="sidebar-category-trigger"
                      aria-expanded={
                        normalizedQuery.length > 0 || expanded[navGroup.title]
                      }
                      onClick={() =>
                        setExpanded((current) => ({
                          ...current,
                          [navGroup.title]: !current[navGroup.title],
                        }))
                      }
                    />
                  }
                >
                  <NavGroupIcon />
                  <span>{navGroup.title}</span>
                  <ChevronDown />
                </SidebarGroupLabel>
                {(normalizedQuery || expanded[navGroup.title]) && (
                  <SidebarGroupContent>
                    {matchingSections.map((section) => (
                      <section
                        className="sidebar-section"
                        key={`${navGroup.title}-${section.title}`}
                      >
                        <div className="sidebar-section-heading">
                          <section.icon className="sidebar-nav-icon" />
                          <span>{section.title}</span>
                        </div>
                        <SidebarMenu className="sidebar-leaf-menu">
                          {section.items.map((item) => {
                            const Icon = item.icon;
                            const selected = item.path === activeNavigationPath;
                            return (
                              <SidebarMenuItem key={item.path}>
                                <SidebarMenuButton
                                  render={<NavLink to={item.path} />}
                                  isActive={selected}
                                  tooltip={item.title}
                                >
                                  <Icon className="sidebar-nav-icon" />
                                  <span>{item.title}</span>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            );
                          })}
                        </SidebarMenu>
                      </section>
                    ))}
                  </SidebarGroupContent>
                )}
              </SidebarGroup>
            );
          })}
        </SidebarContent>
        <SidebarFooter className="sidebar-footer">
          <div className="workspace-status">
            <span className="status-led" />
            <span>本地工作空间</span>
            <Badge variant="outline">演示数据</Badge>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="workspace-main">
        <header className="workspace-header">
          <div className="workspace-header-left">
            <Button
              variant="ghost"
              size="icon"
              aria-label="折叠侧栏"
              onClick={toggleSidebar}
            >
              <PanelLeft />
            </Button>
            <Separator orientation="vertical" className="header-separator" />
            <div className="workspace-breadcrumb">
              <span>工作台</span>
              <ChevronRight />
              <strong>{group?.title ?? "业务模块"}</strong>
              <ChevronRight />
              <b>{titleFor(activePath)}</b>
            </div>
          </div>
          <div className="workspace-header-right">
            <CityPicker city={city} onChange={setCity} />
            <Button
              className="global-search-trigger"
              variant="outline"
              onClick={onOpenSearch}
            >
              <Search data-icon="inline-start" />
              <span>全局搜索</span>
              <kbd>⌘ K</kbd>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="通知"
              onClick={onOpenNotifications}
            >
              <Bell />
              <i className="notification-dot" />
            </Button>
            <Separator orientation="vertical" className="header-separator" />
            <UserMenu userName={userName} onLogout={onLogout} />
          </div>
        </header>
        {children}
      </SidebarInset>
    </>
  );
}

function CityPicker({
  city,
  onChange,
}: {
  city: string;
  onChange: (city: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState(() => {
    const savedRegion = localStorage.getItem("workspace_region");
    return (
      PROVINCES.find((region) => region === savedRegion) ?? regionForCity(city)
    );
  });
  const results = useMemo(
    () => PROVINCES.filter((province) => province.includes(query.trim())),
    [query],
  );
  const cityOptions = REGION_CITY_OPTIONS[selectedRegion] ?? [selectedRegion];
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className="city-picker-trigger"
            aria-label={`当前城市：${city}`}
          >
            <span className="city-picker-label">当前城市</span>
            <strong>{city}</strong>
            <ChevronDown />
          </Button>
        }
      />
      <PopoverContent align="end" className="city-picker-popover">
        <div className="city-picker-heading">
          <strong>选择服务地区</strong>
          <span>34 个省级行政区 · 常用城市范围</span>
        </div>
        <div className="city-picker-search">
          <Search aria-hidden="true" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索省、市、自治区"
          />
        </div>
        <div className="city-picker-cascade">
          <div className="city-picker-list" aria-label="省级行政区">
            {results.map((province) => (
              <button
                type="button"
                key={province}
                className={province === selectedRegion ? "is-selected" : ""}
                aria-pressed={province === selectedRegion}
                onClick={() => setSelectedRegion(province)}
              >
                {province}
                {province === selectedRegion && (
                  <ChevronRight aria-hidden="true" />
                )}
              </button>
            ))}
            {results.length === 0 && <p>没有匹配的地区</p>}
          </div>
          <div className="city-picker-city-list" aria-label="常用城市或区县">
            <div className="city-picker-city-heading">
              <span>常用市 / 区县</span>
              <button
                type="button"
                onClick={() => {
                  onChange(selectedRegion);
                  localStorage.setItem("workspace_region", selectedRegion);
                  setOpen(false);
                  toast.success(`当前城市已切换为${selectedRegion}`);
                }}
              >
                选择全域
              </button>
            </div>
            <div className="city-picker-city-options">
              {cityOptions.map((cityOption) => (
                <button
                  type="button"
                  key={cityOption}
                  className={cityOption === city ? "is-selected" : ""}
                  aria-pressed={cityOption === city}
                  onClick={() => {
                    onChange(cityOption);
                    localStorage.setItem("workspace_region", selectedRegion);
                    setOpen(false);
                    toast.success(`当前城市已切换为${cityOption}`);
                  }}
                >
                  {cityOption}
                  {cityOption === city && <span>当前</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function UserMenu({
  userName,
  onLogout,
}: {
  userName: string;
  onLogout: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="user-trigger"
            aria-label="打开账号菜单"
          >
            <Avatar>
              <AvatarFallback>{userName.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <span className="user-trigger-name">{userName}</span>
            <ChevronDown />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="user-menu">
        <DropdownMenuLabel>
          <span className="user-menu-label">当前账号</span>
          <strong>{userName}</strong>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onLogout}>
          <LogOut />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function WorkspaceTabs({
  tabs,
  activePath,
  navigate,
  closeTab,
  closeOtherTabs,
  closeAllTabs,
}: {
  tabs: WorkspaceTab[];
  activePath: string;
  navigate: (path: string) => void;
  closeTab: (path: string) => void;
  closeOtherTabs: () => void;
  closeAllTabs: () => void;
}) {
  return (
    <div className="workspace-tabs-wrap">
      <div className="workspace-tablist" role="tablist" aria-label="已打开页面">
        {tabs.map((tab, index) => {
          const Icon = iconForPath(tab.path);
          const selected = tab.path === activePath;
          return (
            <div className="workspace-tab-item" key={tab.path}>
              <button
                type="button"
                role="tab"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                className="workspace-tab"
                onClick={() => navigate(tab.path)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
                    return;
                  event.preventDefault();
                  const offset = event.key === "ArrowRight" ? 1 : -1;
                  const nextIndex =
                    (index + offset + tabs.length) % tabs.length;
                  navigate(tabs[nextIndex].path);
                }}
              >
                {Icon && <Icon aria-hidden="true" />}
                <span>{tab.title}</span>
              </button>
              {tab.path !== HOME_TAB.path && (
                <button
                  type="button"
                  aria-label={`关闭${tab.title}`}
                  className="tab-close"
                  onClick={() => closeTab(tab.path)}
                >
                  <X />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm" className="tab-options">
              页签
              <ChevronDown />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={closeOtherTabs}>关闭其他</DropdownMenuItem>
          <DropdownMenuItem onClick={closeAllTabs}>关闭全部</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function GlobalSearch({
  open,
  onOpenChange,
  onNavigate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (path: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="command-dialog">
        <DialogHeader>
          <DialogTitle>搜索工作台</DialogTitle>
          <DialogDescription>输入名称，快速进入业务模块</DialogDescription>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="搜索政策、园区、企业服务…" />
          <CommandList>
            <CommandEmpty>没有匹配的菜单。</CommandEmpty>
            {navigationGroups.map((navGroup) => (
              <CommandGroup heading={navGroup.title} key={navGroup.title}>
                {navGroup.sections.flatMap((section) =>
                  section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <CommandItem
                        key={item.path}
                        value={`${navGroup.title} ${section.title} ${item.title}`}
                        onSelect={() => {
                          onNavigate(item.path);
                          onOpenChange(false);
                        }}
                      >
                        <Icon />
                        {item.title}
                        <span>{section.title}</span>
                      </CommandItem>
                    );
                  }),
                )}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function NotificationDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  useEffect(() => {
    const listener = () => onOpenChange(true);
    window.addEventListener("open-notifications", listener);
    return () => window.removeEventListener("open-notifications", listener);
  }, [onOpenChange]);
  const notices = [
    {
      title: "新的高潜商机线索待跟进",
      detail: "有 3 条线索等待分派处理",
      time: "10 分钟前",
      path: "/business/projectCluesUpdate/index",
    },
    {
      title: "政策信息已更新",
      detail: "上海市政策项目库新增申报信息",
      time: "2 小时前",
      path: "/policy/index",
    },
    {
      title: "园区企业年报申报提醒",
      detail: "请跟进重点企业的年报申报进度",
      time: "昨天",
      path: "/myCampus/guarantee/index",
    },
  ];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="notification-drawer">
        <SheetHeader>
          <SheetTitle>通知消息</SheetTitle>
          <SheetDescription>工作台服务提醒</SheetDescription>
        </SheetHeader>
        <div className="notification-list">
          {notices.map((notice) => (
            <button
              type="button"
              className="notification-row"
              key={notice.title}
              onClick={() => {
                navigate(notice.path);
                onOpenChange(false);
              }}
            >
              <span className="notification-unread" />
              <span className="notification-copy">
                <strong>{notice.title}</strong>
                <span>{notice.detail}</span>
                <small>{notice.time}</small>
              </span>
              <ChevronRight />
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
