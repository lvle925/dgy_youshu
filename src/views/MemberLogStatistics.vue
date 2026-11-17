<template>
  <div>
    <div class="stat-row grid4" style="margin-bottom: 14px">
      <StatCard title="累计操作" value="1,086" unit="次" tone="info" foot="较上周 +12.4%" />
      <StatCard title="活跃用户" value="13" unit="人" tone="success" foot="占成员总数 81%" />
      <StatCard title="人均操作" value="83.5" unit="次" tone="purple" />
      <StatCard title="异常操作" value="0" unit="次" tone="warning" foot="近 30 天" />
    </div>
    <PageCard>
      <div class="filter-row">
        <a-range-picker v-model:value="range" />
        <a-select v-model:value="granularity" placeholder="统计粒度" style="width: 130px">
          <a-select-option value="day">按天</a-select-option>
          <a-select-option value="week">按周</a-select-option>
          <a-select-option value="month">按月</a-select-option>
        </a-select>
        <a-button type="primary">查询</a-button>
        <a-button style="margin-left: auto" @click="msg.success('统计报表已导出（演示）')"><DownloadOutlined /> 导出报表</a-button>
      </div>
    </PageCard>
    <div class="grid2">
      <PageCard title="操作趋势" sub="近 7 天操作次数与活跃人数">
        <ChartBox :option="trendOption" :height="300" />
      </PageCard>
      <PageCard title="功能模块分布">
        <ChartBox :option="moduleOption" :height="300" />
      </PageCard>
    </div>
    <div class="grid2">
      <PageCard title="成员操作排行">
        <ChartBox :option="userOption" :height="280" />
      </PageCard>
      <PageCard title="成员操作统计" :sub="'统计周期内各成员操作情况'">
        <a-table :columns="columns" :data-source="userStats" :pagination="false" size="small" row-key="name">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <span class="member-avatar">{{ record.name.slice(0, 1) }}</span>
              <b style="margin-left: 8px">{{ record.name }}</b>
            </template>
            <template v-else-if="column.key === 'active'">
              <a-progress :percent="record.active" size="small" :stroke-color="'#4a62e7'" />
            </template>
          </template>
        </a-table>
      </PageCard>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { message } from 'ant-design-vue';
import { DownloadOutlined } from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import StatCard from '../components/StatCard.vue';
import ChartBox from '../components/ChartBox.vue';
import { logStatSeries } from '../data/mock';

const msg = message;
const range = ref();
const granularity = ref('day');
const userStats = [
  { name: '顾龙飞', count: 268, active: 96, module: '政策管理', last: '2026-11-17 10:42' },
  { name: '李婷', count: 216, active: 88, module: '商机摸排', last: '2026-11-17 10:20' },
  { name: '王凯', count: 185, active: 82, module: 'AI外呼中心', last: '2026-11-17 09:58' },
  { name: '陈晨', count: 164, active: 74, module: '企业查询', last: '2026-11-16 18:12' },
  { name: '周敏', count: 121, active: 62, module: '园区管理', last: '2026-11-16 17:44' },
  { name: '吴超', count: 98, active: 48, module: '全景洞察', last: '2026-11-16 15:08' },
];
const columns = [
  { title: '成员', key: 'name', width: 150 },
  { title: '操作次数', dataIndex: 'count', width: 90, sorter: (a, b) => a.count - b.count },
  { title: '活跃度', key: 'active', width: 150 },
  { title: '常用模块', dataIndex: 'module', width: 120 },
  { title: '最近操作', dataIndex: 'last', width: 150 },
];
const trendOption = {
  tooltip: { trigger: 'axis' },
  legend: { top: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 4, textStyle: { fontSize: 11, color: '#667085' } },
  grid: { left: 45, right: 20, top: 34, bottom: 26 },
  xAxis: { type: 'category', data: logStatSeries.map((d) => d.date), axisLabel: { fontSize: 10, color: '#98a2b3' }, axisLine: { lineStyle: { color: '#e4e7ec' } }, axisTick: { show: false } },
  yAxis: [
    { type: 'value', name: '次数', nameTextStyle: { fontSize: 10, color: '#98a2b3' }, axisLabel: { fontSize: 10, color: '#98a2b3' }, splitLine: { lineStyle: { color: '#f2f4f7', type: 'dashed' } } },
    { type: 'value', name: '人数', nameTextStyle: { fontSize: 10, color: '#98a2b3' }, axisLabel: { fontSize: 10, color: '#98a2b3' }, splitLine: { show: false } },
  ],
  series: [
    { name: '操作次数', type: 'bar', barWidth: 18, data: logStatSeries.map((d) => d.count), itemStyle: { color: '#c7d2fe', borderRadius: [4, 4, 0, 0] } },
    { name: '活跃人数', type: 'line', yAxisIndex: 1, smooth: true, symbol: 'circle', symbolSize: 5, data: logStatSeries.map((d) => d.users), lineStyle: { color: '#4a62e7', width: 2 }, itemStyle: { color: '#4a62e7' } },
  ],
};
const moduleOption = {
  tooltip: { trigger: 'item' },
  legend: { bottom: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { fontSize: 11, color: '#667085' } },
  series: [{
    type: 'pie', radius: ['40%', '66%'], center: ['50%', '44%'], label: { show: false },
    data: [
      { value: 286, name: '政策管理', itemStyle: { color: '#4a62e7' } },
      { value: 214, name: '商机洞察', itemStyle: { color: '#52c7b8' } },
      { value: 168, name: '企业档案', itemStyle: { color: '#8b5cf6' } },
      { value: 142, name: '园区管理', itemStyle: { color: '#f5a623' } },
      { value: 98, name: 'AI外呼', itemStyle: { color: '#2fa45f' } },
      { value: 84, name: '其他', itemStyle: { color: '#cbd5e1' } },
    ],
  }],
};
const userOption = {
  grid: { left: 70, right: 30, top: 12, bottom: 22 },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#98a2b3' }, splitLine: { lineStyle: { color: '#f2f4f7', type: 'dashed' } } },
  yAxis: { type: 'category', data: ['吴超', '周敏', '陈晨', '王凯', '李婷', '顾龙飞'], axisLabel: { fontSize: 10, color: '#667085' }, axisLine: { show: false }, axisTick: { show: false } },
  series: [{ type: 'bar', barWidth: 12, data: [98, 121, 164, 185, 216, 268], itemStyle: { color: '#4a62e7', borderRadius: [0, 5, 5, 0] } }],
};
</script>

<style scoped>
.member-avatar { width: 26px; height: 26px; border-radius: 50%; background: #eef1fe; color: #4a62e7; display: inline-grid; place-items: center; font-size: 12px; font-weight: 600; }
</style>
