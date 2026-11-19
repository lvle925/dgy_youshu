<template>
  <div>
    <PageCard>
      <div class="archive-head">
        <div class="archive-item" v-for="s in headStats" :key="s.label">
          <div class="archive-value" :style="{ color: s.color }">{{ s.value }}<span>{{ s.unit }}</span></div>
          <div class="archive-label">{{ s.label }}</div>
        </div>
        <div class="archive-side">
          <a-button type="primary" @click="importOpen = true"><UploadOutlined /> 导入企业</a-button>
          <a-button @click="msg.success('企业档案已导出（演示）')"><DownloadOutlined /> 导出档案</a-button>
        </div>
      </div>
    </PageCard>

    <PageCard>
      <div class="filter-row">
        <a-input-search v-model:value="keyword" placeholder="搜索企业名称 / 统一社会信用代码" style="width: 280px" />
        <a-select v-model:value="parkFilter" placeholder="所属园区" style="width: 230px" allow-clear show-search>
          <a-select-option v-for="p in parkNames" :key="p" :value="p">{{ p }}</a-select-option>
        </a-select>
        <a-select v-model:value="industryFilter" placeholder="所属行业" style="width: 140px" allow-clear>
          <a-select-option v-for="i in industriesShort" :key="i" :value="i">{{ i }}</a-select-option>
        </a-select>
        <a-select v-model:value="statusFilter" placeholder="企业状态" style="width: 130px" allow-clear>
          <a-select-option value="正常经营">正常经营</a-select-option>
          <a-select-option value="已迁出">已迁出</a-select-option>
          <a-select-option value="已消失">已消失</a-select-option>
        </a-select>
        <a-button type="primary">查询</a-button>
        <a-button @click="resetFilters">重置</a-button>
      </div>
    </PageCard>

    <PageCard title="企业档案" :sub="`共 ${filtered.length} 家企业`">
      <template #extra>
        <a-button size="small" @click="msg.success('已批量发送年报提醒（演示）')"><BellOutlined /> 批量提醒</a-button>
      </template>
      <a-table :columns="columns" :data-source="filtered" :pagination="{ pageSize: 10, showSizeChanger: false }" row-key="id" size="middle">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <router-link :to="`/subsidy/company/${record.id}`" style="font-weight: 500">{{ record.name }}</router-link>
            <div class="text-muted">{{ record.code }}</div>
          </template>
          <template v-else-if="column.key === 'tags'">
            <span v-for="t in record.tags" :key="t" class="tag-soft blue" style="margin-right: 4px">{{ t }}</span>
            <span v-if="!record.tags.length" class="text-muted">-</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <span class="tag-soft" :class="record.archiveStatus === '正常经营' ? 'green' : record.archiveStatus === '已迁出' ? 'orange' : 'gray'">{{ record.archiveStatus }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a @click="openDetail(record)">档案</a>
            <a-divider type="vertical" />
            <router-link :to="`/subsidy/company/${record.id}`">详情</router-link>
          </template>
        </template>
      </a-table>
    </PageCard>

    <a-drawer v-model:open="detailOpen" :title="detail?.name" width="680px">
      <template v-if="detail">
        <div class="archive-drawer-head">
          <span class="company-logo">{{ detail.shortName.slice(0, 1) }}</span>
          <div>
            <div style="font-size: 16px; font-weight: 600">{{ detail.name }}</div>
            <div class="text-muted">{{ detail.code }} · {{ detail.industry }} · {{ detail.scale }}企业</div>
            <div style="margin-top: 6px"><span v-for="t in detail.tags" :key="t" class="tag-soft blue" style="margin-right: 4px">{{ t }}</span></div>
          </div>
        </div>
        <a-descriptions title="工商信息" :column="2" bordered size="small" style="margin-top: 18px">
          <a-descriptions-item label="法定代表人">{{ detail.contact }}</a-descriptions-item>
          <a-descriptions-item label="注册资本">{{ detail.regCapital }}</a-descriptions-item>
          <a-descriptions-item label="成立日期">{{ detail.registerDate }}</a-descriptions-item>
          <a-descriptions-item label="入驻日期">{{ detail.settleDate }}</a-descriptions-item>
          <a-descriptions-item label="所属园区" :span="2">{{ detail.park }}</a-descriptions-item>
          <a-descriptions-item label="注册地址" :span="2">{{ detail.address }}</a-descriptions-item>
          <a-descriptions-item label="社保人数">{{ detail.socialSecurity }} 人</a-descriptions-item>
          <a-descriptions-item label="企业留存率">{{ detail.retentionRate }}%</a-descriptions-item>
        </a-descriptions>
        <a-divider />
        <div class="timeline-title">企业服务时间线</div>
        <a-timeline style="margin-top: 14px">
          <a-timeline-item color="#1652B8">
            <b>2026-11-16</b> 招商专员上门走访，收集场地扩租需求
          </a-timeline-item>
          <a-timeline-item color="#1652B8">
            <b>2026-09-18</b> 完成「上海市专精特新中小企业」政策申报辅导
          </a-timeline-item>
          <a-timeline-item color="#2fa45f">
            <b>2026-07-02</b> 完成高企认定材料审核，推荐至区科委
          </a-timeline-item>
          <a-timeline-item>
            <b>2025-12-20</b> 企业正式入驻园区，签订 5 年租赁协议
          </a-timeline-item>
        </a-timeline>
        <div class="drawer-actions">
          <a-button @click="msg.success('已创建走访工单（演示）')">发起走访</a-button>
          <a-button type="primary" @click="msg.success('政策匹配已完成（演示）')">政策匹配</a-button>
        </div>
      </template>
    </a-drawer>

    <a-modal v-model:open="importOpen" title="批量导入企业档案" width="520px" @ok="msg.success('导入任务已创建（演示）'); importOpen = false">
      <div class="import-box">
        <InboxOutlined style="font-size: 40px; color: #1652B8" />
        <div style="font-weight: 500; margin-top: 10px">点击或拖拽 Excel 文件到此处</div>
        <div class="text-muted">支持 .xlsx 格式，单次最多导入 500 家企业</div>
      </div>
      <a-alert style="margin-top: 14px" type="info" show-icon message="导入后将自动校验统一社会信用代码与园区归属，校验失败的数据可在导入记录中查看。" />
    </a-modal>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { message } from 'ant-design-vue';
import { UploadOutlined, DownloadOutlined, BellOutlined, InboxOutlined } from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import { companies, parkNames, industriesShort, archiveStats } from '../data/mock';

const msg = message;
const keyword = ref('');
const parkFilter = ref();
const industryFilter = ref();
const statusFilter = ref();
const headStats = [
  { label: '入驻企业总数', value: archiveStats.settled.toLocaleString(), unit: '家', color: '#303b49' },
  { label: '累计迁出', value: archiveStats.migrated, unit: '家', color: '#1652B8' },
  { label: '企业消失', value: archiveStats.vanished, unit: '家', color: '#d92d20' },
  { label: '平均入驻年限', value: archiveStats.avgYears, unit: '年', color: '#1652B8' },
  { label: '企业留存率', value: archiveStats.retention, unit: '', color: '#2fa45f' },
];
const rows = companies.map((c, i) => ({
  ...c,
  archiveStatus: i === 9 ? '已迁出' : i === 19 ? '已消失' : '正常经营',
}));
const filtered = computed(() => rows.filter((c) => {
  if (keyword.value && !c.name.includes(keyword.value) && !c.code.includes(keyword.value)) return false;
  if (parkFilter.value && c.park !== parkFilter.value) return false;
  if (industryFilter.value && c.industry !== industryFilter.value) return false;
  if (statusFilter.value && c.archiveStatus !== statusFilter.value) return false;
  return true;
}));
function resetFilters() {
  keyword.value = '';
  parkFilter.value = undefined;
  industryFilter.value = undefined;
  statusFilter.value = undefined;
}
const columns = [
  { title: '企业名称', key: 'name', width: 300 },
  { title: '所属园区', dataIndex: 'park', ellipsis: true },
  { title: '行业', dataIndex: 'industry', width: 100 },
  { title: '规模', dataIndex: 'scale', width: 70 },
  { title: '社保人数', dataIndex: 'socialSecurity', width: 90, sorter: (a, b) => a.socialSecurity - b.socialSecurity },
  { title: '入驻日期', dataIndex: 'settleDate', width: 110 },
  { title: '标签', key: 'tags', width: 220 },
  { title: '状态', key: 'status', width: 100 },
  { title: '操作', key: 'action', width: 110 },
];
const detailOpen = ref(false);
const detail = ref(null);
function openDetail(row) {
  detail.value = row;
  detailOpen.value = true;
}
const importOpen = ref(false);
</script>

<style scoped>
.archive-head { display: flex; align-items: center; gap: 0; flex-wrap: wrap; }
.archive-item { padding: 2px 28px 2px 0; margin-right: 28px; border-right: 1px dashed #F2F4F7; min-width: 128px; }
.archive-item:last-of-type { border-right: none; }
.archive-value { font-size: 28px; font-weight: 700; line-height: 1.2; }
.archive-value span { font-size: 12px; font-weight: 500; color: #657384; margin-left: 4px; }
.archive-label { font-size: 12.5px; color: #657384; margin-top: 4px; }
.archive-side { margin-left: auto; display: flex; gap: 10px; }
.archive-drawer-head { display: flex; gap: 14px; align-items: flex-start; }
.company-logo { width: 52px; height: 52px; border-radius: 12px; background: #F2F4F7; color: #1652B8; display: grid; place-items: center; font-size: 22px; font-weight: 700; }
.timeline-title { font-weight: 600; font-size: 14px; }
.drawer-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.import-box { border: 1px dashed #F2F4F7; border-radius: 10px; padding: 28px; text-align: center; cursor: pointer; }
.import-box:hover { border-color: #1652B8; background: #F2F4F7; }
@media (max-width: 1400px) { .archive-side { margin-left: 0; width: 100%; margin-top: 14px; } }
</style>
