<template>
  <div>
    <PageCard title="常用功能">
      <template #extra><span class="text-muted">{{ favorites.length }}/10</span></template>
      <div class="favorites">
        <div v-for="f in favorites" :key="f.path" class="fav-item" @click="$router.push(f.path)">
          <component :is="f.icon" class="fav-icon" />
          <span>{{ f.title }}</span>
          <CloseOutlined class="fav-close" @click.stop="removeFav(f)" />
        </div>
        <div class="fav-add" @click="favOpen = true"><PlusOutlined /> 添加常用功能</div>
      </div>
    </PageCard>

    <div class="city-query">
      <a-select v-model:value="city" style="width: 220px" size="large">
        <a-select-option v-for="c in cityOptions" :key="c" :value="c">{{ c }}</a-select-option>
      </a-select>
      <a-button type="primary" size="large" @click="queryCity">查询</a-button>
    </div>

    <div class="home-stats">
      <div class="home-stat">
        <div class="hs-title">政策总数据</div>
        <div class="hs-value">{{ stats.policyTotal.toLocaleString() }}</div>
        <div class="hs-progress"><span :style="{ width: '73%' }"></span></div>
        <div class="hs-mini-row">
          <div><em>项目政策</em><b>{{ stats.projectPolicy.toLocaleString() }}</b></div>
          <div><em>政策通知</em><b>{{ stats.notice.toLocaleString() }} <i class="trend-up">+3</i></b></div>
          <div><em>政策公告</em><b>{{ stats.announce.toLocaleString() }} <i class="trend-up">+9</i></b></div>
        </div>
      </div>
      <div class="home-stat">
        <div class="hs-title">补贴企业金额</div>
        <div class="hs-value">{{ stats.subsidyAmount }}</div>
        <ChartBox :option="sparkBarOption" :height="46" />
        <div class="hs-mini-row">
          <div><em>获批企业数</em><b>{{ stats.fundedCompanies.toLocaleString() }} <i class="trend-up">+2024</i></b></div>
          <div><em>监控企业数</em><b>{{ stats.monitored }}</b></div>
          <div><em>报告导出量</em><b>{{ stats.reports }}</b></div>
        </div>
      </div>
      <div class="home-stat">
        <div class="hs-title">访问总量</div>
        <div class="hs-value">{{ stats.visits.toLocaleString() }}</div>
        <ChartBox :option="sparkAreaOption" :height="46" />
        <div class="hs-mini-row">
          <div><em>昨日访问量</em><b>{{ stats.yesterdayVisit.toLocaleString() }} <i class="trend-up">+2332</i></b></div>
          <div><em>7天访问量</em><b>{{ stats.weekVisit.toLocaleString() }} <i class="trend-up">+2240</i></b></div>
          <div><em>30天访问量</em><b>{{ stats.monthVisit.toLocaleString() }} <i class="trend-up">+4734</i></b></div>
        </div>
      </div>
    </div>

    <PageCard title="热门政策榜单">
      <div class="hot-wrap">
        <div class="hot-chart">
          <ChartBox :option="hotBarOption" :height="330" />
        </div>
        <div class="hot-rank">
          <div class="hot-rank-title">热门政策排名</div>
          <div class="rank-list">
            <div v-for="(p, i) in hotPolicyRank" :key="p.name" class="rank-item">
              <span class="rank-no" :class="{ top1: i === 0, top2: i === 1, top3: i === 2 }">{{ i + 1 }}</span>
              <span class="rank-name" :title="p.name">{{ p.name }}</span>
              <span class="rank-val">{{ p.value.toLocaleString() }}</span>
            </div>
          </div>
        </div>
      </div>
    </PageCard>

    <div class="grid2">
      <PageCard title="产业政策扶持方向">
        <ChartBox :option="directionOption" :height="260" />
      </PageCard>
      <PageCard title="扶持热门行业">
        <ChartBox :option="industryOption" :height="260" />
      </PageCard>
      <PageCard title="各区往年产业专项政策">
        <ChartBox :option="districtPolicyOption" :height="260" />
      </PageCard>
      <PageCard title="扶持企业数量趋势">
        <ChartBox :option="companyTrendOption" :height="260" />
      </PageCard>
    </div>

    <a-modal v-model:open="favOpen" title="添加常用功能" :footer="null" width="560px">
      <p class="text-muted" style="margin-top: -4px">最多可添加 10 个常用功能，点击即可快速进入。</p>
      <div class="fav-picker">
        <div
          v-for="m in favCandidates"
          :key="m.path"
          class="fav-pick-item"
          :class="{ selected: favorites.some((f) => f.path === m.path) }"
          @click="toggleFav(m)"
        >
          <component :is="m.icon" />
          <span>{{ m.title }}</span>
          <CheckOutlined v-if="favorites.some((f) => f.path === m.path)" class="pick-check" />
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { message } from 'ant-design-vue';
import {
  PlusOutlined, CloseOutlined, CheckOutlined, StarOutlined, ShopOutlined,
  SafetyCertificateOutlined, GlobalOutlined, ThunderboltOutlined, FileSearchOutlined,
  BankOutlined, ApartmentOutlined, PieChartOutlined, WalletOutlined,
} from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import ChartBox from '../components/ChartBox.vue';
import { homeStats, hotPolicyRank } from '../data/mock';

const stats = homeStats;
const city = ref('上海市');
const cityOptions = ['上海市', '北京市', '天津市', '杭州市', '苏州市', '南京市', '深圳市'];
const favOpen = ref(false);

const allModules = [
  { title: '政策管理', path: '/policy/index', icon: StarOutlined },
  { title: '产业图谱', path: '/industryChain/industryChart/index', icon: ApartmentOutlined },
  { title: '园区楼宇', path: '/parksBuildings/index', icon: ShopOutlined },
  { title: '商机地图', path: '/businessMap/index', icon: GlobalOutlined },
  { title: '企业查询', path: '/subsidy/index', icon: SafetyCertificateOutlined },
  { title: '商机大厅', path: '/business/businessHall/index', icon: ThunderboltOutlined },
  { title: '全景洞察', path: '/myCampus/panoramicLnsight/index', icon: PieChartOutlined },
  { title: '企业档案', path: '/myCampus/corporateArchives/index', icon: BankOutlined },
  { title: '接口计费', path: '/interfaceBilling/index', icon: WalletOutlined },
  { title: '招投标查询', path: '/bidding/index', icon: FileSearchOutlined },
];
const favCandidates = allModules;
const favorites = ref(JSON.parse(localStorage.getItem('DEMO_FAVORITES') || '[]'));

function toggleFav(m) {
  const idx = favorites.value.findIndex((f) => f.path === m.path);
  if (idx >= 0) favorites.value.splice(idx, 1);
  else if (favorites.value.length >= 10) message.warning('最多添加 10 个常用功能');
  else favorites.value.push({ title: m.title, path: m.path, icon: m.icon });
  localStorage.setItem('DEMO_FAVORITES', JSON.stringify(favorites.value));
}
function removeFav(f) {
  favorites.value = favorites.value.filter((i) => i.path !== f.path);
  localStorage.setItem('DEMO_FAVORITES', JSON.stringify(favorites.value));
}
function queryCity() {
  message.success(`已切换至 ${city.value}，数据已更新`);
}

const sparkBarOption = computed(() => ({
  grid: { left: 0, right: 0, top: 8, bottom: 0 },
  xAxis: { type: 'category', show: false, data: ['1', '2', '3', '4', '5', '6', '7'] },
  yAxis: { type: 'value', show: false },
  series: [{
    type: 'bar', barWidth: 14,
    data: [4, 12, 20, 26, 34, 30, 32],
    itemStyle: { color: '#4a62e7', borderRadius: [2, 2, 0, 0] },
  }],
}));

const sparkAreaOption = computed(() => ({
  grid: { left: 0, right: 0, top: 6, bottom: 0 },
  xAxis: { type: 'category', show: false, data: ['1', '2', '3', '4', '5', '6', '7', '8'] },
  yAxis: { type: 'value', show: false },
  series: [{
    type: 'line', smooth: true, symbol: 'none',
    data: [6, 10, 9, 18, 16, 28, 34, 40],
    lineStyle: { color: '#8b5cf6', width: 2 },
    areaStyle: {
      color: {
        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: 'rgba(139,92,246,.55)' }, { offset: 1, color: 'rgba(139,92,246,.06)' }],
      },
    },
  }],
}));

const hotBarOption = computed(() => ({
  grid: { left: 60, right: 20, top: 20, bottom: 50 },
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'category',
    data: hotPolicyRank.map((p) => (p.name.length > 7 ? p.name.slice(0, 7) + '…' : p.name)),
    axisLabel: { fontSize: 10, color: '#667085', interval: 0, rotate: 0 },
    axisLine: { lineStyle: { color: '#e4e7ec' } },
    axisTick: { show: false },
  },
  yAxis: {
    type: 'value',
    axisLabel: { fontSize: 10, color: '#98a2b3' },
    splitLine: { lineStyle: { color: '#f2f4f7', type: 'dashed' } },
  },
  series: [{
    type: 'bar', barWidth: 20,
    data: [29658, 20622, 18739, 10119, 7842, 6530, 5109, 3544],
    itemStyle: {
      borderRadius: [3, 3, 0, 0],
      color: {
        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: '#7c92ff' }, { offset: 1, color: '#4a62e7' }],
      },
    },
  }],
}));

const directionOption = {
  tooltip: { trigger: 'item' },
  legend: { bottom: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { fontSize: 11, color: '#667085' } },
  series: [{
    type: 'pie', radius: ['38%', '66%'], center: ['50%', '44%'],
    label: { fontSize: 11, color: '#667085' },
    data: [
      { value: 32, name: '先进制造', itemStyle: { color: '#4a62e7' } },
      { value: 24, name: '数字经济', itemStyle: { color: '#52d3c2' } },
      { value: 18, name: '生物医药', itemStyle: { color: '#8b5cf6' } },
      { value: 14, name: '新能源', itemStyle: { color: '#f5a623' } },
      { value: 12, name: '现代服务', itemStyle: { color: '#94a3b8' } },
    ],
  }],
};

const industryOption = {
  grid: { left: 90, right: 30, top: 10, bottom: 20 },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#98a2b3' }, splitLine: { lineStyle: { color: '#f2f4f7', type: 'dashed' } } },
  yAxis: {
    type: 'category', data: ['文化创意', '现代服务', '新能源', '生物医药', '数字经济', '智能制造'],
    axisLabel: { fontSize: 11, color: '#667085' }, axisLine: { show: false }, axisTick: { show: false },
  },
  series: [{
    type: 'bar', barWidth: 12,
    data: [860, 1240, 1680, 2150, 2860, 3420],
    itemStyle: { color: '#52c7b8', borderRadius: [0, 6, 6, 0] },
  }],
};

const districtPolicyOption = {
  tooltip: { trigger: 'axis' },
  legend: { top: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 4, textStyle: { fontSize: 11, color: '#667085' } },
  grid: { left: 40, right: 16, top: 34, bottom: 26 },
  xAxis: {
    type: 'category', data: ['浦东', '黄浦', '徐汇', '长宁', '静安', '普陀', '虹口', '杨浦', '闵行', '宝山'],
    axisLabel: { fontSize: 10, color: '#98a2b3' }, axisLine: { lineStyle: { color: '#e4e7ec' } }, axisTick: { show: false },
  },
  yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#98a2b3' }, splitLine: { lineStyle: { color: '#f2f4f7', type: 'dashed' } } },
  series: [
    { name: '2024', type: 'line', smooth: true, symbol: 'none', data: [120, 82, 96, 54, 60, 42, 38, 76, 88, 46], lineStyle: { color: '#a5b4fc', width: 2 } },
    { name: '2025', type: 'line', smooth: true, symbol: 'none', data: [142, 90, 110, 62, 68, 48, 44, 86, 102, 54], lineStyle: { color: '#6d8cff', width: 2 } },
    { name: '2026', type: 'line', smooth: true, symbol: 'none', data: [168, 102, 128, 70, 76, 55, 50, 98, 120, 62], lineStyle: { color: '#4a62e7', width: 2 }, areaStyle: { color: 'rgba(74,98,231,.08)' } },
  ],
};

const companyTrendOption = {
  tooltip: { trigger: 'axis' },
  grid: { left: 48, right: 18, top: 20, bottom: 26 },
  xAxis: {
    type: 'category', data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月'],
    axisLabel: { fontSize: 10, color: '#98a2b3' }, axisLine: { lineStyle: { color: '#e4e7ec' } }, axisTick: { show: false },
  },
  yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#98a2b3' }, splitLine: { lineStyle: { color: '#f2f4f7', type: 'dashed' } } },
  series: [{
    type: 'line', smooth: true, symbol: 'circle', symbolSize: 4,
    data: [1280, 1520, 1860, 2100, 2380, 2620, 2940, 3180, 3460, 3690, 3920],
    lineStyle: { color: '#52c7b8', width: 2 }, itemStyle: { color: '#52c7b8' },
    areaStyle: {
      color: {
        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: 'rgba(82,199,184,.32)' }, { offset: 1, color: 'rgba(82,199,184,.02)' }],
      },
    },
  }],
};
</script>

<style scoped>
.favorites { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.fav-item {
  position: relative; display: flex; align-items: center; gap: 7px; border: 1px solid #e4e9f5;
  border-radius: 4px; padding: 7px 12px; font-size: 12.5px; color: #4b5563; cursor: pointer;
  background: #fafbff;
}
.fav-item:hover { border-color: #c3cdfa; color: #4a62e7; }
.fav-icon { color: #4a62e7; }
.fav-close { font-size: 9px; color: #b0b7c6; }
.fav-add {
  display: inline-flex; align-items: center; gap: 6px; border: 1px dashed #c9d2e3; border-radius: 4px;
  padding: 7px 16px; font-size: 12.5px; color: #667085; cursor: pointer; background: #fff;
}
.fav-add:hover { color: #4a62e7; border-color: #4a62e7; }
.city-query {
  background: #fff; border-radius: 8px; padding: 14px 16px; display: flex; justify-content: center;
  gap: 10px; margin-bottom: 14px;
}
.home-stats { display: grid; grid-template-columns: 1.1fr 1fr 1fr; gap: 14px; margin-bottom: 14px; }
.home-stat { background: #fff; border-radius: 8px; padding: 16px 18px; min-height: 178px; }
.hs-title { font-size: 13px; color: #5f6776; }
.hs-value { font-size: 25px; font-weight: 700; color: #4a62e7; margin: 9px 0 10px; }
.hs-progress { height: 10px; border-radius: 5px; background: #eef0f5; overflow: hidden; margin: 18px 0 20px; }
.hs-progress span { display: block; height: 100%; border-radius: 5px; background: linear-gradient(90deg, #4a62e7, #52d3c2); }
.hs-mini-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.hs-mini-row em { font-style: normal; font-size: 11px; color: #8b93a7; display: block; margin-bottom: 3px; }
.hs-mini-row b { font-size: 16px; font-weight: 600; color: #344054; }
.hot-wrap { display: flex; gap: 24px; }
.hot-chart { flex: 1; min-width: 0; }
.hot-rank { width: 300px; flex-shrink: 0; border-left: 1px solid #f1f3f8; padding-left: 22px; }
.hot-rank-title { font-size: 13px; font-weight: 600; margin: 6px 0 18px; color: #344054; }
.fav-picker { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.fav-pick-item {
  position: relative; display: flex; align-items: center; gap: 8px; padding: 11px 12px;
  border: 1px solid #e7eaf3; border-radius: 6px; cursor: pointer; color: #4b5563; font-size: 12.5px;
}
.fav-pick-item:hover { border-color: #b7c3f6; }
.fav-pick-item.selected { border-color: #4a62e7; background: #f5f8ff; color: #4a62e7; }
.pick-check { margin-left: auto; color: #4a62e7; }
@media (max-width: 1400px) {
  .home-stats { grid-template-columns: 1fr 1fr; }
  .hot-wrap { flex-direction: column; }
  .hot-rank { width: 100%; border-left: none; padding-left: 0; }
}
</style>
