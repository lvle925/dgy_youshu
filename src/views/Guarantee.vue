<template>
  <div>
    <PageCard>
      <div class="pill-tabs" style="margin-bottom: 0">
        <span v-for="t in tabs" :key="t.key" class="pill-tab" :class="{ active: tab === t.key }" @click="switchTab(t.key)">
          <component :is="t.icon" />
          {{ t.label }} <span class="pill-count">{{ t.count }}</span>
        </span>
      </div>
    </PageCard>

    <div class="stat-row grid5" style="margin-bottom: 14px">
      <StatCard v-for="s in currentStats" :key="s.title" :title="s.title" :value="s.value" :unit="s.unit" :tone="s.tone" :foot="s.foot" />
    </div>

    <PageCard>
      <div class="filter-row">
        <a-input-search v-model:value="keyword" :placeholder="`搜索${tab === 'report' ? '企业名称' : '企业 / 政策名称'}`" style="width: 250px" />
        <a-select v-model:value="parkFilter" placeholder="所属园区" style="width: 220px" allow-clear>
          <a-select-option v-for="p in ['临港新片区生命蓝湾生物医药特色产业园', '张江人工智能岛', '漕河泾科技绿洲', '松江G60科创云廊', '临港新片区东方芯港']" :key="p" :value="p">{{ p }}</a-select-option>
        </a-select>
        <a-select v-if="tab === 'report'" v-model:value="statusFilter" placeholder="报送状态" style="width: 150px" allow-clear>
          <a-select-option v-for="s in reportStatuses" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-select v-model:value="ownerFilter" placeholder="负责人" style="width: 130px" allow-clear>
          <a-select-option v-for="o in ['顾龙飞', '李婷', '王凯', '陈晨', '周敏', '刘洋']" :key="o" :value="o">{{ o }}</a-select-option>
        </a-select>
        <a-button type="primary">查询</a-button>
        <div style="margin-left: auto" class="flex gap8">
          <a-button @click="bulkNotify"><BellOutlined /> 批量发送提醒</a-button>
          <a-button type="primary" ghost @click="msg.success('名单已导出（演示）')"><DownloadOutlined /> 导出</a-button>
        </div>
      </div>
    </PageCard>

    <PageCard :title="currentTabLabel" :sub="`共 ${filtered.length} 条记录`">
      <a-table :columns="columns" :data-source="filtered" :pagination="{ pageSize: 8 }" :row-key="(r) => r.id" size="middle">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <router-link :to="`/subsidy/company/E${record.id.slice(1)}`" style="font-weight: 500">{{ record.name }}</router-link>
          </template>
          <template v-else-if="column.key === 'status'">
            <span class="tag-soft" :class="record.status.includes('未') ? 'orange' : record.status.includes('已') ? 'green' : 'blue'">{{ record.status }}</span>
          </template>
          <template v-else-if="column.key === 'days'">
            <span :class="record.days <= 30 ? 'danger-text' : ''">{{ record.days }} 天</span>
          </template>
          <template v-else-if="column.key === 'match'">
            <div class="match-cell"><a-progress :percent="record.match" size="small" :stroke-color="'#4a62e7'" /><b>{{ record.match }}%</b></div>
          </template>
          <template v-else-if="column.key === 'action'">
            <a @click="notifyOne(record)">发送提醒</a>
            <a-divider type="vertical" />
            <a @click="openDetail(record)">详情</a>
          </template>
        </template>
      </a-table>
    </PageCard>

    <a-drawer v-model:open="detailOpen" :title="detail?.name" width="620px">
      <template v-if="detail">
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="企业名称">{{ detail.name }}</a-descriptions-item>
          <a-descriptions-item label="所属园区">{{ detail.park }}</a-descriptions-item>
          <a-descriptions-item label="负责人">{{ detail.owner }}</a-descriptions-item>
          <a-descriptions-item :label="tab === 'report' ? '年报状态' : '当前状态'">{{ detail.status }}</a-descriptions-item>
          <a-descriptions-item :label="tab === 'report' ? '最近申报时间' : '更新时间'">{{ detail.date }}</a-descriptions-item>
          <a-descriptions-item label="注册地址">{{ detail.address }}</a-descriptions-item>
        </a-descriptions>
        <template v-if="tab === 'report'">
          <a-divider />
          <div class="detail-sub">年报报送历史</div>
          <a-table :columns="historyColumns" :data-source="history" :pagination="false" size="small">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                <span class="tag-soft" :class="record.status === '已报送' ? 'green' : 'orange'">{{ record.status }}</span>
              </template>
            </template>
          </a-table>
        </template>
        <template v-else-if="tab === 'match'">
          <a-divider />
          <div class="detail-sub">匹配政策</div>
          <a-table :columns="policyColumns" :data-source="matchedPolicies" :pagination="false" size="small">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'rate'">
                <span class="tag-soft blue">{{ record.rate }}%</span>
              </template>
            </template>
          </a-table>
        </template>
        <div class="drawer-actions">
          <a-button @click="msg.success('已创建服务工单（演示）')">创建工单</a-button>
          <a-button type="primary" @click="notifyOne(detail)">发送提醒</a-button>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { message } from 'ant-design-vue';
import { BellOutlined, DownloadOutlined, FileProtectOutlined, RiseOutlined, ClockCircleOutlined, ThunderboltOutlined } from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import StatCard from '../components/StatCard.vue';
import { guaranteeRecords, companies } from '../data/mock';

const msg = message;
const tab = ref('report');
const tabs = [
  { key: 'report', label: '年报申报', count: 2914, icon: FileProtectOutlined },
  { key: 'tech', label: '科技企业培育', count: 23, icon: RiseOutlined },
  { key: 'expire', label: '政策到期提醒', count: 238, icon: ClockCircleOutlined },
  { key: 'match', label: '政策智能匹配', count: 1656, icon: ThunderboltOutlined },
];
const currentTabLabel = computed(() => tabs.find((t) => t.key === tab.value).label);
const keyword = ref('');
const parkFilter = ref();
const statusFilter = ref();
const ownerFilter = ref();
const reportStatuses = ['未报送:当年', '未报送:连续2年', '已申报', '已报送'];
const statsMap = {
  report: [
    { title: '应报送企业', value: '2,914', unit: '家', tone: 'info', foot: '2025 年度年报' },
    { title: '已报送', value: '2,674', unit: '家', tone: 'success', foot: '同比增长 3.2%' },
    { title: '未报送', value: '240', unit: '家', tone: 'danger', foot: '连续两年未报 30 家' },
    { title: '报送率', value: '91.8', unit: '%', tone: 'purple', foot: '目标 95%' },
    { title: '服务覆盖率', value: '86.4', unit: '%', tone: 'warning', foot: '已走访提醒 162 家' },
  ],
  tech: [
    { title: '培育库企业', value: '23', unit: '家', tone: 'info', foot: '本年度新增 4 家' },
    { title: '高新技术企业', value: '12', unit: '家', tone: 'success' },
    { title: '科技型中小企业', value: '18', unit: '家', tone: 'purple' },
    { title: '待申报高企', value: '6', unit: '家', tone: 'warning' },
    { title: '培育成功率', value: '78.3', unit: '%', tone: 'success', foot: '高于全市均值' },
  ],
  expire: [
    { title: '临期政策', value: '238', unit: '项', tone: 'warning', foot: '90 天内到期' },
    { title: '30 天内到期', value: '46', unit: '项', tone: 'danger' },
    { title: '已提醒企业', value: '1,862', unit: '家', tone: 'info' },
    { title: '提醒触达率', value: '94.2', unit: '%', tone: 'success' },
    { title: '续申报转化', value: '62.8', unit: '%', tone: 'purple' },
  ],
  match: [
    { title: '可匹配企业', value: '1,656', unit: '家', tone: 'info' },
    { title: '平均匹配政策', value: '4.2', unit: '项', tone: 'purple' },
    { title: '高匹配企业', value: '386', unit: '家', tone: 'success', foot: '匹配度 ≥ 90%' },
    { title: '已发起申报', value: '214', unit: '家', tone: 'warning' },
    { title: '预计补贴总额', value: '8,620', unit: '万元', tone: 'danger' },
  ],
};
const currentStats = computed(() => statsMap[tab.value]);

const techRows = companies.slice(0, 10).map((c, i) => ({
  id: 'T' + (i + 1), name: c.name, park: c.park, owner: ['李婷', '王凯', '陈晨', '周敏'][i % 4],
  status: ['高企培育中', '科技型中小企业', '待申报高企', '高企培育中'][i % 4], date: `2026-${String(10 - (i % 3)).padStart(2, '0')}-1${i % 9}`, address: c.address,
}));
const expireRows = companies.slice(2, 12).map((c, i) => ({
  id: 'X' + (i + 1), name: c.name, park: c.park, owner: ['顾龙飞', '李婷', '王凯', '刘洋'][i % 4],
  status: ['即将到期', '已提醒', '待续报'][i % 3], date: `2026-${String(12).padStart(2, '0')}-${String(5 + i).padStart(2, '0')}`, days: [12, 26, 45, 68, 30, 55, 88, 21, 39, 72][i], address: c.address,
}));
const matchRows = companies.slice(5, 15).map((c, i) => ({
  id: 'M' + (i + 1), name: c.name, park: c.park, owner: ['李婷', '王凯', '陈晨', '顾龙飞'][i % 4],
  status: ['待匹配', '已匹配', '申报中'][i % 3], date: '2026-11-1' + (i % 7), match: [96, 92, 89, 95, 87, 91, 84, 93, 88, 90][i], address: c.address,
}));
const activeRows = computed(() => {
  if (tab.value === 'report') return guaranteeRecords;
  if (tab.value === 'tech') return techRows;
  if (tab.value === 'expire') return expireRows;
  return matchRows;
});
const filtered = computed(() => activeRows.value.filter((r) => {
  if (keyword.value && !r.name.includes(keyword.value)) return false;
  if (parkFilter.value && r.park !== parkFilter.value) return false;
  if (statusFilter.value && r.status !== statusFilter.value) return false;
  if (ownerFilter.value && r.owner !== ownerFilter.value) return false;
  return true;
}));
const baseColumns = [
  { title: '企业名称', key: 'name', width: 300 },
  { title: '所属园区', dataIndex: 'park', ellipsis: true },
  { title: '负责人', dataIndex: 'owner', width: 90 },
];
const columnsMap = {
  report: [
    ...baseColumns,
    { title: '年报状态', key: 'status', width: 140 },
    { title: '最近申报时间', dataIndex: 'date', width: 120 },
    { title: '注册地址', dataIndex: 'address', ellipsis: true },
    { title: '操作', key: 'action', width: 140 },
  ],
  tech: [
    ...baseColumns,
    { title: '培育阶段', key: 'status', width: 130 },
    { title: '更新时间', dataIndex: 'date', width: 120 },
    { title: '注册地址', dataIndex: 'address', ellipsis: true },
    { title: '操作', key: 'action', width: 140 },
  ],
  expire: [
    ...baseColumns,
    { title: '提醒状态', key: 'status', width: 110 },
    { title: '到期日期', dataIndex: 'date', width: 120 },
    { title: '剩余天数', key: 'days', width: 100 },
    { title: '注册地址', dataIndex: 'address', ellipsis: true },
    { title: '操作', key: 'action', width: 140 },
  ],
  match: [
    ...baseColumns,
    { title: '匹配状态', key: 'status', width: 110 },
    { title: '最高匹配度', key: 'match', width: 160 },
    { title: '更新时间', dataIndex: 'date', width: 120 },
    { title: '注册地址', dataIndex: 'address', ellipsis: true },
    { title: '操作', key: 'action', width: 140 },
  ],
};
const columns = computed(() => columnsMap[tab.value]);
function switchTab(k) {
  tab.value = k;
  keyword.value = '';
  parkFilter.value = undefined;
  statusFilter.value = undefined;
  ownerFilter.value = undefined;
}
const detailOpen = ref(false);
const detail = ref(null);
function openDetail(row) {
  detail.value = row;
  detailOpen.value = true;
}
const history = [
  { year: '2024 年报', date: '2025-05-18', status: '已报送' },
  { year: '2023 年报', date: '2024-06-02', status: '已报送' },
  { year: '2022 年报', date: '-', status: '未报送' },
];
const historyColumns = [
  { title: '年度', dataIndex: 'year' },
  { title: '报送时间', dataIndex: 'date' },
  { title: '状态', key: 'status', width: 100 },
];
const matchedPolicies = [
  { name: '上海市"专精特新"中小企业认定', rate: 96, amount: '最高 50 万元' },
  { name: '上海市科技型中小企业技术创新资金', rate: 91, amount: '最高 30 万元' },
  { name: '浦东新区企业研发机构认定补贴', rate: 88, amount: '最高 100 万元' },
];
const policyColumns = [
  { title: '政策名称', dataIndex: 'name' },
  { title: '匹配度', key: 'rate', width: 90 },
  { title: '补贴额度', dataIndex: 'amount', width: 130 },
];
function notifyOne(row) {
  msg.success(`已向「${row.name}」负责人发送${tab.value === 'report' ? '年报' : '政策'}提醒（演示）`);
}
function bulkNotify() {
  msg.success(`已向 ${filtered.value.length} 家企业批量发送提醒（演示）`);
}
</script>

<style scoped>
.grid5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
.danger-text { color: #d92d20; font-weight: 600; }
.detail-sub { font-weight: 600; margin-bottom: 10px; }
.match-cell { display: flex; align-items: center; gap: 8px; }
.match-cell :deep(.ant-progress) { flex: 1; margin: 0; }
.drawer-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
@media (max-width: 1400px) { .grid5 { grid-template-columns: repeat(3, 1fr); } }
</style>
