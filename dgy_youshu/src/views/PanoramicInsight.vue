<template>
  <div>
    <PageCard>
      <div class="pano-head">
        <div>
          <div class="detail-title"><CompassOutlined style="color: #1652B8" /> 全景洞察</div>
          <div class="text-muted">园区企业迁出迁入、产业结构与服务保障的全景数据视图</div>
        </div>
        <div class="filter-row" style="margin: 0">
          <a-select v-model:value="district" style="width: 140px">
            <a-select-option value="">全部区域</a-select-option>
            <a-select-option v-for="d in ['浦东新区', '徐汇区', '嘉定区', '松江区', '奉贤区', '闵行区']" :key="d" :value="d">{{ d }}</a-select-option>
          </a-select>
          <a-range-picker v-model:value="range" />
          <a-button type="primary" ghost @click="msg.success('洞察报告已生成（演示）')"><FileTextOutlined /> 生成报告</a-button>
        </div>
      </div>
      <div class="pano-stats">
        <div class="pano-stat" v-for="s in stats" :key="s.label">
          <div class="pano-value">{{ s.value }}<span v-if="s.unit">{{ s.unit }}</span></div>
          <div class="pano-label">{{ s.label }}</div>
          <div class="pano-foot" :class="s.tone">{{ s.foot }}</div>
        </div>
      </div>
    </PageCard>

    <div class="grid2" style="grid-template-columns: 1.35fr 1fr">
      <PageCard title="企业迁入迁出趋势" sub="近 8 个月迁入、迁出与净增企业数">
        <ChartBox :option="migrationOption" :height="300" />
      </PageCard>
      <PageCard title="园区入驻率排名">
        <ChartBox :option="occupancyOption" :height="300" />
      </PageCard>
    </div>

    <div class="grid2">
      <PageCard title="产业结构分布">
        <ChartBox :option="industryOption" :height="280" />
      </PageCard>
      <PageCard title="安商稳商服务概览">
        <div class="service-grid">
          <div class="service-item" v-for="s in services" :key="s.label">
            <div class="service-circle" :style="{ background: s.bg, color: s.color }"><component :is="s.icon" /></div>
            <div class="service-value">{{ s.value }}</div>
            <div class="service-label">{{ s.label }}</div>
            <div class="service-trend" :class="s.up ? 'up' : 'down'">{{ s.up ? '↑' : '↓' }} {{ s.trend }}</div>
          </div>
        </div>
        <a-divider style="margin: 14px 0" />
        <div class="risk-bar">
          <div class="flex" style="justify-content: space-between; font-size: 12.5px; margin-bottom: 8px"><span>风险企业中已走访覆盖率</span><b>86.4%</b></div>
          <a-progress :percent="86" :stroke-color="'#1652B8'" />
          <div class="text-muted" style="font-size: 12px; margin-top: 8px">已为 162 家风险企业建立“一企一档”，完成政策匹配 238 项。</div>
        </div>
      </PageCard>
    </div>

    <PageCard title="重点园区运行监测" sub="按入驻企业数排序">
      <a-table :columns="columns" :data-source="campusList" :pagination="false" row-key="id" size="middle">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <b>{{ record.name }}</b>
            <div class="text-muted">{{ record.district }}</div>
          </template>
          <template v-else-if="column.key === 'occupancy'">
            <div class="occ-cell">
              <a-progress :percent="record.occupancy" size="small" :stroke-color="record.occupancy > 90 ? '#2fa45f' : '#1652B8'" />
            </div>
          </template>
          <template v-else-if="column.key === 'status'">
            <span class="tag-soft" :class="record.status === '运营中' ? 'green' : 'orange'">{{ record.status }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <router-link :to="`/park/detail/${record.id}`">查看详情</router-link>
          </template>
        </template>
      </a-table>
    </PageCard>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { message } from 'ant-design-vue';
import { CompassOutlined, FileTextOutlined, BuildOutlined, RiseOutlined, FallOutlined, TeamOutlined, SafetyCertificateOutlined } from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import ChartBox from '../components/ChartBox.vue';
import { panoramicStats, campusList } from '../data/mock';

const msg = message;
const district = ref('');
const range = ref();
const stats = [
  { label: '入驻企业总数', value: panoramicStats.enterprises.toLocaleString(), unit: ' 家', foot: '本月新增 1 家', tone: 'up' },
  { label: '园区载体', value: panoramicStats.parks, unit: ' 个', foot: '楼宇 268 栋', tone: 'up' },
  { label: '在跟商机线索', value: panoramicStats.clues.toLocaleString(), unit: ' 条', foot: '较上月 +8.6%', tone: 'up' },
  { label: '迁移预警企业', value: panoramicStats.migration, unit: ' 家', foot: '高风险 18 家', tone: 'down' },
  { label: '园区总营收', value: '1.86', unit: ' 亿元', foot: '同比增长 12.4%', tone: 'up' },
  { label: '企业留存率', value: panoramicStats.settleRate, foot: '高于全市均值', tone: 'up' },
];
const services = [
  { label: '政策精准匹配', value: '1,656', trend: '12.4%', up: true, icon: SafetyCertificateOutlined, bg: '#F2F4F7', color: '#1652B8' },
  { label: '政策到期提醒', value: '238', trend: '3.2%', up: true, icon: FileTextOutlined, bg: '#F2F4F7', color: '#2fa45f' },
  { label: '科技企业培育', value: '23', trend: '8.0%', up: true, icon: RiseOutlined, bg: '#F2F4F7', color: '#1652B8' },
  { label: '迁出挽留成功', value: '31', trend: '1.6%', up: false, icon: FallOutlined, bg: '#F2F4F7', color: '#1652B8' },
];
const columns = [
  { title: '园区名称', key: 'name' },
  { title: '建筑数', dataIndex: 'buildings', width: 90 },
  { title: '入驻企业', dataIndex: 'enterprises', width: 100, sorter: (a, b) => a.enterprises - b.enterprises },
  { title: '载体面积', dataIndex: 'area', width: 110 },
  { title: '入驻率', key: 'occupancy', width: 190 },
  { title: '运营状态', key: 'status', width: 100 },
  { title: '操作', key: 'action', width: 90 },
];
const migrationOption = {
  tooltip: { trigger: 'axis' },
  legend: { top: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 4, textStyle: { fontSize: 11, color: '#657384' } },
  grid: { left: 42, right: 22, top: 36, bottom: 26 },
  xAxis: { type: 'category', data: ['4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月'], axisLabel: { fontSize: 10, color: '#657384' }, axisLine: { lineStyle: { color: '#F2F4F7' } }, axisTick: { show: false } },
  yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#657384' }, splitLine: { lineStyle: { color: '#F2F4F7', type: 'dashed' } } },
  series: [
    { name: '迁入', type: 'bar', barWidth: 12, data: [18, 24, 21, 32, 28, 35, 41, 26], itemStyle: { color: '#1652B8', borderRadius: [3, 3, 0, 0] } },
    { name: '迁出', type: 'bar', barWidth: 12, data: [9, 7, 11, 6, 8, 5, 4, 3], itemStyle: { color: '#1652B8', borderRadius: [3, 3, 0, 0] } },
    { name: '净增', type: 'line', smooth: true, symbol: 'circle', symbolSize: 4, data: [9, 17, 10, 26, 20, 30, 37, 23], lineStyle: { color: '#1652B8', width: 2 }, itemStyle: { color: '#1652B8' } },
  ],
};
const occupancyOption = {
  grid: { left: 100, right: 40, top: 10, bottom: 20 },
  tooltip: { trigger: 'axis', valueFormatter: (v) => v + '%' },
  xAxis: { type: 'value', max: 100, axisLabel: { fontSize: 10, color: '#657384' }, splitLine: { lineStyle: { color: '#F2F4F7', type: 'dashed' } } },
  yAxis: { type: 'category', data: ['嘉定氢能港', '松江G60科创云廊', '临港东方芯港', '临港生命蓝湾', '漕河泾科技绿洲', '张江人工智能岛'], axisLabel: { fontSize: 10, color: '#657384' }, axisLine: { show: false }, axisTick: { show: false } },
  series: [{ type: 'bar', barWidth: 12, data: [78.4, 87.3, 88.1, 92.5, 94.7, 96.3], itemStyle: { color: '#1652B8', borderRadius: [0, 6, 6, 0] } }],
};
const industryOption = {
  tooltip: { trigger: 'item' },
  legend: { bottom: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { fontSize: 11, color: '#657384' } },
  series: [{
    type: 'pie', radius: ['42%', '68%'], center: ['50%', '44%'], label: { show: false },
    data: [
      { value: 862, name: '集成电路', itemStyle: { color: '#1652B8' } },
      { value: 724, name: '生物医药', itemStyle: { color: '#1652B8' } },
      { value: 586, name: '人工智能', itemStyle: { color: '#1652B8' } },
      { value: 468, name: '新能源', itemStyle: { color: '#1652B8' } },
      { value: 465, name: '高端装备', itemStyle: { color: '#2fa45f' } },
    ],
  }],
};
</script>

<style scoped>
.pano-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; }
.detail-title { font-size: 19px; font-weight: 600; display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.pano-stats { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0; border-top: 1px solid #F2F4F7; padding-top: 6px; }
.pano-stat { padding: 12px 18px 6px; border-right: 1px dashed #F2F4F7; }
.pano-stat:last-child { border-right: none; }
.pano-value { font-size: 24px; font-weight: 700; color: #303b49; }
.pano-value span { font-size: 12px; font-weight: 500; color: #657384; }
.pano-label { font-size: 12.5px; color: #657384; margin: 5px 0 4px; }
.pano-foot { font-size: 11.5px; }
.pano-foot.up { color: #2fa45f; }
.pano-foot.down { color: #1652B8; }
.service-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.service-item { border: 1px solid #F2F4F7; border-radius: 10px; padding: 16px 10px; text-align: center; }
.service-circle { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 8px; font-size: 17px; }
.service-value { font-size: 21px; font-weight: 700; color: #303b49; }
.service-label { font-size: 12px; color: #657384; margin-top: 3px; }
.service-trend { font-size: 11px; margin-top: 4px; }
.service-trend.up { color: #2fa45f; }
.service-trend.down { color: #1652B8; }
.occ-cell { max-width: 170px; }
.occ-cell :deep(.ant-progress) { margin: 0; }
@media (max-width: 1200px) {
  .pano-stats { grid-template-columns: repeat(3, 1fr); }
  .service-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
