<template>
  <div v-if="company">
    <div class="detail-back"><a @click="$router.back()"><ArrowLeftOutlined /> 返回</a></div>
    <PageCard>
      <div class="detail-hero">
        <div class="hero-left">
          <div class="company-logo">{{ company.shortName.slice(0, 2) }}</div>
          <div>
            <div class="detail-title">{{ company.name }}</div>
            <div class="detail-tags">
              <span v-for="t in company.tags" :key="t" class="tag-soft blue">{{ t }}</span>
              <span class="tag-soft green">{{ company.industry }}</span>
              <span class="tag-soft gray">{{ company.district }}</span>
            </div>
            <div class="detail-meta">
              <span><SafetyCertificateOutlined /> {{ company.code }}</span>
              <span><EnvironmentOutlined /> {{ company.address }}</span>
            </div>
          </div>
        </div>
        <div class="detail-actions">
          <a-button @click="msg.success('已关注该企业（演示）')"><StarOutlined /> 关注</a-button>
          <a-button @click="msg.success('企业档案已导出（演示）')"><DownloadOutlined /> 导出档案</a-button>
          <a-button type="primary" @click="msg.success('已发起走访工单（演示）')"><ScheduleOutlined /> 发起走访</a-button>
        </div>
      </div>
    </PageCard>

    <div class="grid4 stat-row" style="margin-bottom: 0">
      <StatCard title="注册资本" :value="company.regCapital.replace(' 万元', '')" unit="万元" tone="info" />
      <StatCard title="社保人数" :value="company.socialSecurity" unit="人" tone="success" />
      <StatCard title="入驻时长" value="5" unit="年" tone="purple" foot="入驻日期 2021-06-18" />
      <StatCard title="企业综合评分" :value="company.score" unit="分" tone="warning" foot="风险等级：低风险" />
    </div>

    <div class="detail-layout">
      <div>
        <PageCard title="工商基本信息">
          <a-descriptions :column="2" bordered size="small">
            <a-descriptions-item label="企业名称" :span="2">{{ company.name }}</a-descriptions-item>
            <a-descriptions-item label="统一社会信用代码">{{ company.code }}</a-descriptions-item>
            <a-descriptions-item label="法定代表人">{{ company.contact }}</a-descriptions-item>
            <a-descriptions-item label="注册资本">{{ company.regCapital }}</a-descriptions-item>
            <a-descriptions-item label="成立日期">{{ company.registerDate }}</a-descriptions-item>
            <a-descriptions-item label="企业规模">{{ company.scale }}</a-descriptions-item>
            <a-descriptions-item label="所属行业">{{ company.industry }}</a-descriptions-item>
            <a-descriptions-item label="所属园区" :span="2">{{ company.park }}</a-descriptions-item>
            <a-descriptions-item label="注册地址" :span="2">{{ company.address }}</a-descriptions-item>
          </a-descriptions>
        </PageCard>

        <PageCard title="政策获补记录">
          <a-table :columns="subsidyColumns" :data-source="subsidyRows" :pagination="false" size="middle" :row-key="(r) => r.id">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'amount'">{{ record.amount }} 万元</template>
              <template v-else-if="column.key === 'status'"><span class="tag-soft green">{{ record.status }}</span></template>
            </template>
          </a-table>
        </PageCard>

        <PageCard title="社保人数趋势">
          <ChartBox :option="staffOption" :height="240" />
        </PageCard>
      </div>

      <div class="detail-side">
        <PageCard title="企业联系人">
          <div class="contact-line"><UserOutlined /> {{ company.contact }}</div>
          <div class="contact-line"><PhoneOutlined /> {{ company.phone }}</div>
          <div class="contact-line"><MailOutlined /> contact@example.com</div>
          <div class="contact-line"><EnvironmentOutlined /> {{ company.district }}</div>
        </PageCard>
        <PageCard title="园区信息">
          <div class="park-name">{{ company.park }}</div>
          <a-descriptions :column="1" size="small">
            <a-descriptions-item label="所属区">{{ company.district }}</a-descriptions-item>
            <a-descriptions-item label="入驻日期">{{ company.settleDate }}</a-descriptions-item>
            <a-descriptions-item label="留存率">{{ company.retentionRate }}%</a-descriptions-item>
          </a-descriptions>
          <a-button block @click="$router.push('/parksBuildings/index')">查看园区详情</a-button>
        </PageCard>
        <PageCard title="风险提示">
          <div class="risk-row"><span class="tag-soft green">低风险</span><span>经营状态正常</span></div>
          <div class="risk-row"><span class="tag-soft green">无异常</span><span>近一年无行政处罚</span></div>
          <div class="risk-row"><span class="tag-soft orange">关注</span><span>迁出意向指数 62</span></div>
        </PageCard>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { message } from 'ant-design-vue';
import {
  ArrowLeftOutlined, StarOutlined, DownloadOutlined, ScheduleOutlined, SafetyCertificateOutlined,
  EnvironmentOutlined, UserOutlined, PhoneOutlined, MailOutlined,
} from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import StatCard from '../components/StatCard.vue';
import ChartBox from '../components/ChartBox.vue';
import { companies, policies } from '../data/mock';

const msg = message;
const route = useRoute();
const company = computed(() => companies.find((c) => c.id === route.params.id) || companies[0]);
const subsidyColumns = [
  { title: '政策名称', dataIndex: 'policy' },
  { title: '补贴类型', dataIndex: 'type', width: 100 },
  { title: '获补金额', key: 'amount', width: 110 },
  { title: '获补时间', dataIndex: 'date', width: 110 },
  { title: '状态', key: 'status', width: 90 },
];
const subsidyRows = policies.slice(0, 4).map((p, i) => ({
  id: p.id, policy: p.name, type: p.type, amount: (128.6 - i * 23.4).toFixed(2), date: ['2026-06-18', '2025-11-02', '2025-05-20', '2024-09-12'][i], status: '已到账',
}));
const staffOption = computed(() => ({
  grid: { left: 44, right: 20, top: 20, bottom: 26 },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: ['2022', '2023', '2024', '2025', '2026'], axisLabel: { color: '#657384', fontSize: 10 }, axisLine: { lineStyle: { color: '#F2F4F7' } } },
  yAxis: { type: 'value', axisLabel: { color: '#657384', fontSize: 10 }, splitLine: { lineStyle: { color: '#F2F4F7', type: 'dashed' } } },
  series: [{
    type: 'line', smooth: true, symbol: 'circle', symbolSize: 5,
    data: [26, 38, 52, 68, company.value.socialSecurity],
    lineStyle: { color: '#1652B8', width: 2 }, itemStyle: { color: '#1652B8' },
    areaStyle: { color: 'rgba(74,98,231,.1)' },
  }],
}));
</script>

<style scoped>
.detail-back { margin-bottom: 10px; font-size: 12.5px; color: #657384; }
.detail-hero { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; }
.hero-left { display: flex; gap: 16px; align-items: center; }
.company-logo {
  width: 58px; height: 58px; border-radius: 8px; background: linear-gradient(135deg, #1652B8, #1652B8);
  color: #fff; font-size: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.detail-title { font-size: 20px; font-weight: 600; line-height: 1.5; }
.detail-tags { display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0; }
.detail-meta { display: flex; gap: 20px; flex-wrap: wrap; color: #657384; font-size: 12.5px; }
.detail-meta .anticon { margin-right: 4px; color: #657384; }
.detail-actions { display: flex; gap: 8px; flex-shrink: 0; }
.detail-layout { display: grid; grid-template-columns: 1fr 320px; gap: 14px; margin-top: 14px; }
.contact-line { font-size: 12.5px; color: #657384; padding: 6px 0; }
.contact-line .anticon { color: #1652B8; margin-right: 7px; }
.park-name { font-weight: 600; font-size: 13px; color: #657384; margin-bottom: 10px; line-height: 1.6; }
.risk-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 12px; color: #657384; }
@media (max-width: 1200px) { .detail-layout { grid-template-columns: 1fr; } }
</style>
