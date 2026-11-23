import {
  Activity,
  Building2,
  CalendarCheck,
  ChartNoAxesCombined,
  ClipboardList,
  FileClock,
  FileSearch,
  FolderKanban,
  Gauge,
  Globe2,
  Landmark,
  LayoutDashboard,
  MapPinned,
  Network,
  PhoneCall,
  ScrollText,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = { title: string; path: string; icon: LucideIcon };
export type NavigationSection = {
  title: string;
  icon: LucideIcon;
  items: NavigationItem[];
};
export type NavigationGroup = {
  title: string;
  icon: LucideIcon;
  sections: NavigationSection[];
};

export const navigationGroups: NavigationGroup[] = [
  {
    title: "首页",
    icon: LayoutDashboard,
    sections: [
      {
        title: "工作台",
        icon: LayoutDashboard,
        items: [{ title: "首页", path: "/home/index", icon: LayoutDashboard }],
      },
    ],
  },
  {
    title: "智慧招商",
    icon: Network,
    sections: [
      {
        title: "政策服务",
        icon: ScrollText,
        items: [{ title: "政策管理", path: "/policy/index", icon: ScrollText }],
      },
      {
        title: "产业链",
        icon: Network,
        items: [
          {
            title: "产业图谱",
            path: "/industryChain/industryChart/index",
            icon: Network,
          },
          {
            title: "供应链",
            path: "/industryChain/industrySupply/index",
            icon: Activity,
          },
        ],
      },
      {
        title: "园区空间",
        icon: MapPinned,
        items: [
          { title: "园区楼宇", path: "/parksBuildings/index", icon: Landmark },
          { title: "商机地图", path: "/businessMap/index", icon: MapPinned },
        ],
      },
      {
        title: "企业拓展",
        icon: Building2,
        items: [
          { title: "企业查询", path: "/subsidy/index", icon: Building2 },
          { title: "招投标查询", path: "/bidding/index", icon: FileSearch },
          {
            title: "商机大厅",
            path: "/business/businessHall/index",
            icon: Globe2,
          },
        ],
      },
    ],
  },
  {
    title: "商机洞察",
    icon: ChartNoAxesCombined,
    sections: [
      {
        title: "线索运营",
        icon: FolderKanban,
        items: [
          {
            title: "商机摸排",
            path: "/business/businessInvestigate/index",
            icon: Search,
          },
          {
            title: "企业扩张",
            path: "/business/projectClues/index",
            icon: ChartNoAxesCombined,
          },
          {
            title: "项目线索",
            path: "/business/projectCluesUpdate/index",
            icon: FileSearch,
          },
        ],
      },
      {
        title: "AI 外呼中心",
        icon: PhoneCall,
        items: [
          {
            title: "外呼任务",
            path: "/business/aiOutbound/tasks",
            icon: PhoneCall,
          },
          {
            title: "通话记录",
            path: "/business/aiOutbound/records",
            icon: FileClock,
          },
          {
            title: "数据看板",
            path: "/business/aiOutbound/dashboard",
            icon: Gauge,
          },
        ],
      },
    ],
  },
  {
    title: "安商稳商",
    icon: ShieldCheck,
    sections: [
      {
        title: "园区运营",
        icon: Landmark,
        items: [
          {
            title: "全景洞察",
            path: "/myCampus/panoramicLnsight/index",
            icon: ChartNoAxesCombined,
          },
          {
            title: "园区管理",
            path: "/myCampus/campusAdmin/index",
            icon: Landmark,
          },
        ],
      },
      {
        title: "企业服务",
        icon: ShieldCheck,
        items: [
          {
            title: "企业档案",
            path: "/myCampus/corporateArchives/index",
            icon: Building2,
          },
          {
            title: "迁移预警",
            path: "/myCampus/migrationWarning/index",
            icon: Activity,
          },
          {
            title: "企服保障",
            path: "/myCampus/guarantee/index",
            icon: ShieldCheck,
          },
          {
            title: "走访管理",
            path: "/myCampus/visitManage/index",
            icon: CalendarCheck,
          },
        ],
      },
    ],
  },
  {
    title: "平台管理",
    icon: Settings2,
    sections: [
      {
        title: "账号权限",
        icon: Users,
        items: [
          { title: "人员管理", path: "/member/index", icon: Users },
          { title: "组织架构", path: "/member/departments", icon: Network },
          { title: "角色管理", path: "/member/role", icon: ShieldCheck },
        ],
      },
      {
        title: "系统审计",
        icon: FileClock,
        items: [
          { title: "操作日志", path: "/member/log", icon: FileClock },
          {
            title: "操作日志统计",
            path: "/member/logStatistics",
            icon: ChartNoAxesCombined,
          },
        ],
      },
      {
        title: "系统管理",
        icon: Settings2,
        items: [
          { title: "系统与门户配置", path: "/setting/index", icon: Settings2 },
          {
            title: "数据服务与接口监控",
            path: "/system/interface-monitoring",
            icon: Activity,
          },
        ],
      },
    ],
  },
];

export const navigationItems = navigationGroups.flatMap((group) =>
  group.sections.flatMap((section) => section.items),
);
export const navigationByPath = new Map(
  navigationItems.map((item) => [item.path, item]),
);
export const navigationCount = navigationItems.length;
