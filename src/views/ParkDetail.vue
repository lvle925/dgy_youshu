<template>
  <div v-if="park">
    <div class="detail-back"><a @click="$router.back()"><ArrowLeftOutlined /> 返回</a></div>
    <PageCard>
      <div class="detail-hero">
        <div>
          <div class="detail-title">{{ park.name }}</div>
          <div class="detail-tags">
            <span class="tag-soft blue">{{ park.type }}</span>
            <span class="tag-soft green">运营中</span>
            <span class="tag-soft gray">{{ park.district }}</span>
          </div>
          <div class="detail-meta">
            <span><EnvironmentOutlined /> {{ park.address }}</span>
            <span><UserOutlined /> 园区负责人 {{ park.manager }}</span>
            <span><PhoneOutlined /> {{ park.phone }}</span>
          </div>
        </div>
        <div class="detail-actions">
          <a-button @click="msg.success('园区已收藏（演示）')"><StarOutlined /> 收藏</a-button>
          <a-button type="primary" @click="msg.success('已发起入驻咨询（演示）')"><ShopOutlined /> 入驻咨询</a-button>
        </div>
      </div>
    </PageCard>

    <div class="stat-row grid4" style="margin-bottom: 0">
      <StatCard title="楼宇数量" :value="park.buildings" unit="栋" tone="info" />
      <StatCard title="入驻企业" :value="park.enterprises" unit="家" tone="success" />
      <StatCard title="园区总面积" :value="park.area" tone="purple" />
      <StatCard title="平均入驻率" :value="park.occupancy" unit="%" tone="warning" />
    </div>

    <div class="detail-layout">
      <div>
        <PageCard title="园区简介">
          <p class="park-intro">{{ park.intro }}</p>
          <div class="park-facts">
            <div><span>主导产业</span><b>生物医药 / 高端医疗器械 / 生命健康</b></div>
            <div><span>可租面积</span><b>12.6 万㎡</b></div>
            <div><span>租金参考</span><b>4.2 - 6.5 元/㎡/天</b></div>
            <div><span>政策支持</span><b>租金补贴、人才补贴、研发资助</b></div>
          </div>
        </PageCard>

        <PageCard title="楼宇列表">
          <a-table :columns="buildingColumns" :data-source="buildingRows" :pagination="{ pageSize: 6 }" size="middle" :row-key="(r) => r.id">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'occupancy'">
                <a-progress :percent="record.occupancy" size="small" :stroke-color="'#4a62e7'" />
              </template>
              <template v-else-if="column.key === 'status'">
                <span class="tag-soft" :class="record.status === '可租' ? 'green' : 'gray'">{{ record.status }}</span>
              </template>
            </template>
          </a-table>
        </PageCard>

        <PageCard title="入驻企业">
          <a-table :columns="enterpriseColumns" :data-source="enterpriseRows" :pagination="{ pageSize: 6 }" size="middle" :row-key="(r) => r.id">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'name'">
                <a class="link" @click="$router.push('/subsidy/company/' + record.id)">{{ record.name }}</a>
              </template>
            </template>
          </a-table>
        </PageCard>
      </div>

      <div class="detail-side">
        <PageCard title="产业分布">
          <ChartBox :option="industryOption" :height="220" />
        </PageCard>
        <PageCard title="园区服务">
          <div class="service-item"><CheckCircleOutlined /> 工商注册与税务代办</div>
          <div class="service-item"><CheckCircleOutlined /> 政策申报辅导</div>
          <div class="service-item"><CheckCircleOutlined /> 人才招聘与公寓对接</div>
          <div class="service-item"><CheckCircleOutlined /> 投融资路演对接</div>
          <div class="service-item"><CheckCircleOutlined /> 共享会议室与实验室</div>
        </PageCard>
        <PageCard title="周边配套">
          <div class="service-item"><EnvironmentOutlined /> 距地铁站 1.2 km</div>
          <div class="service-item"><CoffeeOutlined /> 园区商业配套 2.8 万㎡</div>
          <div class="service-item"><HomeOutlined /> 人才公寓 860 套</div>
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
  ArrowLeftOutlined, EnvironmentOutlined, UserOutlined, PhoneOutlined, StarOutlined,
  ShopOutlined, CheckCircleOutlined, CoffeeOutlined, HomeOutlined,
} from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import StatCard from '../components/StatCard.vue';
import ChartBox from '../components/ChartBox.vue';
import { parks, companies } from '../data/mock';

const msg = message;
const route = useRoute();
const park = computed(() => parks.find((p) => p.id === route.params.id) || parks[0]);
const buildingColumns = [
  { title: '楼宇名称', dataIndex: 'name' },
  { title: '建筑面积', dataIndex: 'area', width: 110 },
  { title: '楼层', dataIndex: 'floors', width: 80 },
  { title: '入驻率', key: 'occupancy', width: 160 },
  { title: '状态', key: 'status', width: 80 },
];
const buildingRows = Array.from({ length: 8 }).map((_, i) => ({
  id: 'BL' + i,
  name: ['A1 研发楼', 'A2 研发楼', 'B1 中试楼', 'B2 生产楼', 'C1 孵化楼', 'C2 加速器', 'D1 综合配套楼', 'D2 人才公寓'][i],
  area: (2.6 + i * 0.8).toFixed(1) + ' 万㎡',
  floors: 6 + i * 2,
  occupancy: 72 + ((i * 7) % 26),
  status: i % 4 === 3 ? '满租' : '可租',
}));
const enterpriseColumns = [
  { title: '企业名称', key: 'name' },
  { title: '所属行业', dataIndex: 'industry', width: 110 },
  { title: '企业规模', dataIndex: 'scale', width: 90 },
  { title: '入驻日期', dataIndex: 'settleDate', width: 110 },
];
const enterpriseRows = companies.filter((c) => c.park === park.value.name).concat(companies).slice(0, 8);
const industryOption = {
  tooltip: { trigger: 'item' },
  legend: { bottom: 0, icon: 'circle', itemWidth: 7, itemHeight: 7, textStyle: { fontSize: 10, color: '#667085' } },
  series: [{
    type: 'pie', radius: ['40%', '66%'], center: ['50%', '44%'],
    label: { show: false },
    data: [
      { value: 38, name: '生物医药', itemStyle: { color: '#4a62e7' } },
      { value: 24, name: '医疗器械', itemStyle: { color: '#52c7b8' } },
      { value: 18, name: '生命健康', itemStyle: { color: '#8b5cf6' } },
      { value: 12, name: '研发服务', itemStyle: { color: '#f5a623' } },
      { value: 8, name: '其他', itemStyle: { color: '#94a3b8' } },
    ],
  }],
};
</script>

<style scoped>
.detail-back { margin-bottom: 10px; font-size: 12.5px; color: #8b93a7; }
.detail-hero { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; }
.detail-title { font-size: 21px; font-weight: 600; line-height: 1.5; }
.detail-tags { display: flex; gap: 8px; flex-wrap: wrap; margin: 9px 0; }
.detail-meta { display: flex; gap: 20px; flex-wrap: wrap; color: #667085; font-size: 12.5px; }
.detail-meta .anticon { margin-right: 4px; color: #98a2b3; }
.detail-actions { display: flex; gap: 8px; flex-shrink: 0; }
.detail-layout { display: grid; grid-template-columns: 1fr 320px; gap: 14px; margin-top: 14px; }
.park-intro { font-size: 13px; color: #4b5563; line-height: 2; margin: 0 0 12px; }
.park-facts { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.park-facts > div { background: #f8fafd; border-radius: 6px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
.park-facts span { color: #8b93a7; }
.park-facts b { color: #344054; font-weight: 500; }
.service-item { font-size: 12.5px; color: #4b5563; padding: 6px 0; }
.service-item .anticon { color: #2fa45f; margin-right: 7px; }
@media (max-width: 1200px) { .detail-layout { grid-template-columns: 1fr; } }
</style>
