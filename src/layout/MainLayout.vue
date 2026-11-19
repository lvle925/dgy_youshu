<template>
  <div class="app-shell" :class="{ collapsed }">
    <aside class="sidebar">
      <div class="sidebar-logo">
        <div class="logo-mark">CAICT</div>
        <div class="logo-text">有数计划</div>
      </div>
      <div class="menu-search">
        <SearchOutlined />
        <input v-model="menuQuery" placeholder="搜索菜单功能" />
      </div>
      <div class="sidebar-menu">
        <template v-if="!menuQuery">
          <template v-for="group in menu" :key="group.key">
            <div
              v-if="group.children"
              class="menu-group-title"
              :class="{ open: openKeys.includes(group.key) }"
              @click="toggleGroup(group.key)"
            >
              <span class="m-icon" :style="{ color: group.color }"><component :is="group.icon" /></span>
              <span>{{ group.title }}</span>
              <DownOutlined class="m-arrow" />
            </div>
            <div v-else class="menu-item" :class="{ active: activeMenu === group.path }" @click="go(group.path)">
              <span class="m-icon" :style="{ color: group.color }"><component :is="group.icon" /></span>
              <span>{{ group.title }}</span>
            </div>
            <div v-if="group.children && openKeys.includes(group.key)" class="menu-children">
              <template v-for="child in group.children" :key="child.key">
                <div
                  v-if="child.children"
                  class="menu-group-title sub"
                  :class="{ open: openKeys.includes(child.key) }"
                  @click="toggleGroup(child.key)"
                >
                  <span class="m-icon" :style="{ color: child.color }"><component :is="child.icon" /></span>
                  <span>{{ child.title }}</span>
                  <DownOutlined class="m-arrow" />
                </div>
                <div
                  v-else
                  class="menu-item"
                  :class="{ active: activeMenu === child.path }"
                  @click="go(child.path)"
                >
                  <span class="m-icon" :style="{ color: child.color }"><component :is="child.icon" /></span>
                  <span>{{ child.title }}</span>
                </div>
                <div v-if="child.children && openKeys.includes(child.key)" class="menu-children">
                  <div
                    v-for="leaf in child.children"
                    :key="leaf.key"
                    class="menu-item deep"
                    :class="{ active: activeMenu === leaf.path }"
                    @click="go(leaf.path)"
                  >
                    <span class="m-icon" :style="{ color: leaf.color }"><component :is="leaf.icon" /></span>
                    <span>{{ leaf.title }}</span>
                  </div>
                </div>
              </template>
            </div>
          </template>
        </template>
        <template v-else>
          <div v-for="item in searchResult" :key="item.key" class="menu-item" @click="go(item.path)">
            <span class="m-icon" :style="{ color: item.color }"><component :is="item.icon" /></span>
            <span>{{ item.title }}</span>
          </div>
          <div v-if="!searchResult.length" class="no-result">未找到相关菜单</div>
        </template>
      </div>
      <div class="sidebar-note">本地工作空间 <span>·</span> 演示数据</div>
    </aside>

    <div class="main-area">
      <header class="top-header">
        <div class="collapse-btn" @click="collapsed = !collapsed">
          <MenuUnfoldOutlined v-if="collapsed" />
          <MenuFoldOutlined v-else />
        </div>
        <div class="header-title">有数计划平台</div>
        <div class="header-context"><span>工作空间</span><span class="context-separator">/</span><strong>{{ route.meta.title || '首页' }}</strong></div>
        <div class="header-actions">
          <a-dropdown placement="bottomRight">
            <span class="bell-btn"><BellOutlined /></span>
            <template #overlay>
              <div class="notice-panel">
                <div class="notice-title">通知消息</div>
                <div v-for="n in notices" :key="n.id" class="notice-item">
                  <div class="notice-dot"></div>
                  <div>
                    <div class="notice-text">{{ n.text }}</div>
                    <div class="notice-time">{{ n.time }}</div>
                  </div>
                </div>
              </div>
            </template>
          </a-dropdown>
          <a-dropdown placement="bottomRight">
            <div class="user-box">
              <span class="user-name">{{ userName }}</span>
              <span class="user-avatar">{{ userName.slice(0, 1) }}</span>
            </div>
            <template #overlay>
              <a-menu>
                <a-menu-item key="profile" @click="msg.info('个人中心（复刻演示）')">个人中心</a-menu-item>
                <a-menu-item key="logout" @click="logout">退出登录</a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </header>

      <div class="tabs-bar">
        <div
          v-for="tab in tabs"
          :key="tab.path"
          class="tab-item"
          :class="{ active: route.path === tab.path }"
          @click="go(tab.path)"
        >
          <span>{{ tab.title }}</span>
          <CloseOutlined v-if="tab.path !== '/home/index'" class="tab-close" @click.stop="closeTab(tab)" />
        </div>
        <a-dropdown trigger="click" placement="bottomRight">
          <div class="tabs-more">更多 <DownOutlined style="font-size: 9px" /></div>
          <template #overlay>
            <a-menu @click="onMoreClick">
              <a-menu-item v-for="t in tabs" :key="'go:' + t.path">{{ t.title }}</a-menu-item>
              <a-menu-divider />
              <a-menu-item key="close-others">关闭其他</a-menu-item>
              <a-menu-item key="close-all">关闭全部</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>

      <main class="scroll-content">
        <router-view v-slot="{ Component }">
          <component :is="Component" />
        </router-view>
      </main>



      <div class="chat-fab" @click="chatOpen = true"><CustomerServiceOutlined /></div>
    </div>

    <a-modal v-model:open="chatOpen" title="在线客服" :footer="null" width="380px">
      <div class="chat-body">
        <div class="chat-tip">您好，我是有数计划智能助手，请问有什么可以帮您？</div>
        <div class="chat-quick">
          <span v-for="q in quickQuestions" :key="q" class="chat-q" @click="chatAnswer = '已收到您的问题：' + q + '，客服将尽快与您联系。'">{{ q }}</span>
        </div>
        <div v-if="chatAnswer" class="chat-answer">{{ chatAnswer }}</div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import dayjs from 'dayjs';
import {
  SearchOutlined, DownOutlined, SwapOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
  BellOutlined, CloseOutlined, CustomerServiceOutlined,
  HomeOutlined, StarOutlined, ApartmentOutlined, ShopOutlined, GlobalOutlined,
  SafetyCertificateOutlined, ThunderboltOutlined, ProjectOutlined, RobotOutlined,
  SettingOutlined, IdcardOutlined, WalletOutlined, FileSearchOutlined, BankOutlined,
  PieChartOutlined, DatabaseOutlined, SwapRightOutlined, WarningOutlined,
  CustomerServiceOutlined as ServiceIcon, ScheduleOutlined, ClusterOutlined,
  FundOutlined, AuditOutlined, FileTextOutlined, TeamOutlined, CrownOutlined, BulbOutlined,
} from '@ant-design/icons-vue';

const msg = message;
const route = useRoute();
const router = useRouter();
const collapsed = ref(false);
const menuQuery = ref('');
const chatOpen = ref(false);
const chatAnswer = ref('');
const quickQuestions = ['如何生成政策海报？', '如何导出企业名单？', '如何配置外呼任务？'];
const userName = ref(localStorage.getItem('DEMO_USER') || '顾龙飞');
const openKeys = ref(['smart', 'chain', 'chain-industry', 'opportunity', 'invest', 'outbound', 'platform', 'account', 'stable']);

const cities = ['北京市', '天津市', '河北省', '山西省', '内蒙古自治区', '辽宁省', '吉林省', '黑龙江省', '上海市', '江苏省', '浙江省', '安徽省', '福建省', '江西省', '山东省', '河南省', '湖北省', '湖南省', '广东省', '广西壮族自治区', '海南省', '重庆市', '四川省', '贵州省', '云南省', '西藏自治区', '陕西省', '甘肃省', '青海省', '宁夏回族自治区', '新疆维吾尔自治区'];

const notices = [
  { id: 1, text: '您有 3 条新的高潜商机线索待跟进', time: '10 分钟前' },
  { id: 2, text: '政策「上海市专精特新中小企业认定」已更新', time: '2 小时前' },
  { id: 3, text: '园区企业年报申报进入倒计时', time: '昨天' },
];

const menu = [
  { key: 'home', title: '首页', path: '/home/index', icon: HomeOutlined, color: '#6ee7b7' },
  {
    key: 'smart', title: '智慧招商', icon: BulbOutlined, color: '#fbbf24',
    children: [
      { key: 'policy', title: '政策管理', path: '/policy/index', icon: StarOutlined, color: '#fbbf24' },
      {
        key: 'chain-industry', title: '产业链', icon: ApartmentOutlined, color: '#38bdf8',
        children: [
          { key: 'industry-chart', title: '产业图谱', path: '/industryChain/industryChart/index', icon: ClusterOutlined, color: '#38bdf8' },
          { key: 'industry-supply', title: '供应链', path: '/industryChain/industrySupply/index', icon: SwapRightOutlined, color: '#38bdf8' },
        ],
      },
      { key: 'parks', title: '园区楼宇', path: '/parksBuildings/index', icon: ShopOutlined, color: '#c084fc' },
      { key: 'map', title: '商机地图', path: '/businessMap/index', icon: GlobalOutlined, color: '#38bdf8' },
      { key: 'subsidy', title: '企业查询', path: '/subsidy/index', icon: SafetyCertificateOutlined, color: '#34d399' },
    ],
  },
  {
    key: 'opportunity', title: '商机洞察', icon: ThunderboltOutlined, color: '#f59e0b',
    children: [
      {
        key: 'invest', title: '商机拓客', icon: ProjectOutlined, color: '#f59e0b',
        children: [
          { key: 'investigate', title: '商机摸排', path: '/business/businessInvestigate/index', icon: SearchOutlined, color: '#94a3b8' },
          { key: 'hall', title: '商机大厅', path: '/business/businessHall/index', icon: ShopOutlined, color: '#94a3b8' },
          { key: 'clues', title: '企业扩张', path: '/business/projectClues/index', icon: FundOutlined, color: '#94a3b8' },
        ],
      },
      {
        key: 'outbound', title: 'AI外呼中心', icon: RobotOutlined, color: '#22d3ee',
        children: [
          { key: 'ai-tasks', title: '外呼任务', path: '/business/aiOutbound/tasks', icon: ScheduleOutlined, color: '#94a3b8' },
          { key: 'ai-records', title: '通话记录', path: '/business/aiOutbound/records', icon: TeamOutlined, color: '#94a3b8' },
          { key: 'ai-dashboard', title: '数据看板', path: '/business/aiOutbound/dashboard', icon: PieChartOutlined, color: '#94a3b8' },
        ],
      },
      { key: 'clues-update', title: '项目线索', path: '/business/projectCluesUpdate/index', icon: ProjectOutlined, color: '#f59e0b' },
    ],
  },
  {
    key: 'platform', title: '平台管理', icon: SettingOutlined, color: '#93c5fd',
    children: [
      { key: 'setting', title: '门店装修', path: '/setting/index', icon: SettingOutlined, color: '#93c5fd' },
      {
        key: 'account', title: '账号设置', icon: IdcardOutlined, color: '#93c5fd',
        children: [
          { key: 'member', title: '人员管理', path: '/member/index', icon: TeamOutlined, color: '#94a3b8' },
          { key: 'member-log', title: '操作日志', path: '/member/log', icon: FileTextOutlined, color: '#94a3b8' },
          { key: 'member-log-stat', title: '操作日志统计', path: '/member/logStatistics', icon: AuditOutlined, color: '#94a3b8' },
          { key: 'member-role', title: '角色管理', path: '/member/role', icon: CrownOutlined, color: '#94a3b8' },
        ],
      },
      { key: 'billing', title: '接口计费', path: '/interfaceBilling/index', icon: WalletOutlined, color: '#93c5fd' },
    ],
  },
  {
    key: 'stable', title: '安商稳商', icon: BankOutlined, color: '#38bdf8',
    children: [
      { key: 'panorama', title: '全景洞察', path: '/myCampus/panoramicLnsight/index', icon: PieChartOutlined, color: '#38bdf8' },
      { key: 'campus', title: '园区管理', path: '/myCampus/campusAdmin/index', icon: BankOutlined, color: '#38bdf8' },
      { key: 'archives', title: '企业档案', path: '/myCampus/corporateArchives/index', icon: DatabaseOutlined, color: '#38bdf8' },
      { key: 'migration', title: '迁移预警', path: '/myCampus/migrationWarning/index', icon: WarningOutlined, color: '#f87171' },
      { key: 'guarantee', title: '企服保障', path: '/myCampus/guarantee/index', icon: SafetyCertificateOutlined, color: '#38bdf8' },
      { key: 'visit', title: '走访管理', path: '/myCampus/visitManage/index', icon: ScheduleOutlined, color: '#38bdf8' },
    ],
  },
  { key: 'bidding', title: '招投标查询', path: '/bidding/index', icon: FileSearchOutlined, color: '#a78bfa' },
];

const searchResult = computed(() => {
  const q = menuQuery.value.trim();
  if (!q) return [];
  const out = [];
  const walk = (items, parent) => {
    items.forEach((i) => {
      if (i.children) walk(i.children, i.title);
      else if (i.title.includes(q) || (parent && parent.includes(q))) out.push(i);
    });
  };
  walk(menu);
  return out;
});

const activeMenu = computed(() => {
  const p = route.path;
  if (p.startsWith('/policy')) return '/policy/index';
  if (p.startsWith('/subsidy')) return '/subsidy/index';
  if (p.startsWith('/park')) return '/parksBuildings/index';
  if (p.startsWith('/clue/')) return '/business/projectClues/index';
  return p;
});

function toggleGroup(key) {
  openKeys.value.includes(key)
    ? (openKeys.value = openKeys.value.filter((k) => k !== key))
    : openKeys.value.push(key);
}
function go(path) {
  if (path && route.path !== path) router.push(path);
}

const TABS_KEY = 'DEMO_TABS';
function loadTabs() {
  try {
    const raw = JSON.parse(localStorage.getItem(TABS_KEY) || '[]');
    if (Array.isArray(raw) && raw.length) return raw;
  } catch (e) { /* ignore */ }
  return [{ path: '/home/index', title: '首页' }];
}
const tabs = ref(loadTabs());

watch(
  () => route.path,
  (p) => {
    if (route.meta.public) return;
    const title = route.meta.title;
    if (!title) return;
    if (!tabs.value.find((t) => t.path === p)) tabs.value.push({ path: p, title });
    localStorage.setItem(TABS_KEY, JSON.stringify(tabs.value));
    document.title = title + ' - 有数计划平台';
  },
  { immediate: true }
);

function closeTab(tab) {
  const idx = tabs.value.findIndex((t) => t.path === tab.path);
  if (idx === -1) return;
  tabs.value.splice(idx, 1);
  localStorage.setItem(TABS_KEY, JSON.stringify(tabs.value));
  if (route.path === tab.path) {
    const next = tabs.value[Math.min(idx, tabs.value.length - 1)] || tabs.value[0];
    router.push(next ? next.path : '/home/index');
  }
}
function onMoreClick({ key }) {
  if (key === 'close-others') {
    tabs.value = tabs.value.filter((t) => t.path === route.path || t.path === '/home/index');
    localStorage.setItem(TABS_KEY, JSON.stringify(tabs.value));
  } else if (key === 'close-all') {
    tabs.value = [{ path: '/home/index', title: '首页' }];
    localStorage.setItem(TABS_KEY, JSON.stringify(tabs.value));
    router.push('/home/index');
  } else if (key.startsWith('go:')) {
    router.push(key.slice(3));
  }
}
async function logout() {
  try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { msg.error('退出失败，请检查后端'); return; }
  localStorage.removeItem('DEMO_AUTH');
  localStorage.removeItem('DEMO_TABS');
  router.push('/login');
}

const dateText = dayjs().format('YYYY/MM/DD');
const watermarkStyle = computed(() => {
  const text = `${userName.value} ${dateText}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="330" height="190"><g transform="rotate(-24 165 95)" fill="rgba(70,80,100,0.10)" font-size="13" font-family="PingFang SC, Microsoft YaHei, sans-serif"><text x="6" y="80">${text}</text><text x="175" y="170">${text}</text></g></svg>`;
  return { backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, backgroundRepeat: 'repeat' };
});
</script>

<style scoped>
.notice-panel {
  width: 300px; background: #fff; border-radius: 8px; box-shadow: 0 6px 24px rgba(16, 24, 40, .14);
  padding: 12px 14px;
}
.notice-title { font-size: 14px; font-weight: 600; margin-bottom: 10px; }
.notice-item { display: flex; gap: 8px; padding: 8px 0; border-top: 1px solid #f1f3f8; }
.notice-dot { width: 6px; height: 6px; border-radius: 50%; background: #4a62e7; margin-top: 6px; flex-shrink: 0; }
.notice-text { font-size: 12.5px; color: #344054; }
.notice-time { font-size: 11px; color: #98a2b3; margin-top: 3px; }
.chat-body { padding: 4px 0; }
.chat-tip { background: #f5f7fb; border-radius: 6px; padding: 12px; font-size: 13px; color: #344054; }
.chat-quick { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.chat-q { border: 1px solid #d9e2fd; color: #4a62e7; background: #f5f8ff; border-radius: 14px; padding: 4px 10px; font-size: 12px; cursor: pointer; }
.chat-answer { margin-top: 12px; font-size: 12.5px; color: #2fa45f; background: #f2fbf5; border-radius: 6px; padding: 10px; }
.menu-group-title.sub { margin-left: 20px; height: 34px; font-size: 12.5px; }
.menu-item.deep { padding-left: 62px; font-size: 12.5px; }
.app-shell.collapsed .sidebar { width: 64px; flex-basis: 64px; }
.app-shell.collapsed .logo-text,
.app-shell.collapsed .menu-search input,
.app-shell.collapsed .menu-item span,
.app-shell.collapsed .menu-group-title span,
.app-shell.collapsed .old-menu-btn span,
.app-shell.collapsed .menu-group-title .m-arrow { display: none; }
.app-shell.collapsed .menu-item,
.app-shell.collapsed .menu-group-title { justify-content: center; padding: 0; margin: 2px 8px; }
.app-shell.collapsed .menu-item .m-icon,
.app-shell.collapsed .menu-group-title .m-icon { margin: 0; }
.app-shell.collapsed .menu-group-title.sub { margin-left: 8px; }
.app-shell.collapsed .footer-bar,
.app-shell.collapsed .watermark { left: 64px; }
</style>
