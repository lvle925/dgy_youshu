<template>
  <div>
    <PageCard>
      <div class="pill-tabs" style="margin-bottom: 0">
        <span v-for="t in tabs" :key="t.key" class="pill-tab" :class="{ active: tab === t.key }" @click="tab = t.key">
          <component :is="t.icon" />
          {{ t.label }} <span class="pill-count">{{ t.count }}</span>
        </span>
      </div>
    </PageCard>

    <div class="stat-row grid4" style="margin-bottom: 14px">
      <StatCard v-if="tab === 'orders'" title="走访工单" value="126" unit="个" tone="info" foot="待走访 42 个" />
      <StatCard v-if="tab === 'orders'" title="本月已完成" value="68" unit="个" tone="success" foot="完成率 78.2%" />
      <StatCard v-if="tab === 'orders'" title="超期工单" value="6" unit="个" tone="danger" foot="需优先处理" />
      <StatCard v-if="tab === 'orders'" title="平均响应时长" value="1.6" unit="天" tone="purple" />
      <StatCard v-if="tab === 'records'" title="走访记录" value="486" unit="条" tone="info" />
      <StatCard v-if="tab === 'records'" title="本月走访" value="32" unit="次" tone="success" />
      <StatCard v-if="tab === 'records'" title="覆盖企业" value="268" unit="家" tone="purple" />
      <StatCard v-if="tab === 'records'" title="问题解决率" value="92.6" unit="%" tone="warning" />
    </div>

    <PageCard>
      <div class="filter-row">
        <a-input-search v-model:value="keyword" placeholder="搜索工单标题 / 企业名称" style="width: 250px" />
        <a-select v-model:value="ownerFilter" placeholder="负责人" style="width: 130px" allow-clear>
          <a-select-option v-for="o in ['顾龙飞', '李婷', '王凯', '陈晨', '周敏', '刘洋']" :key="o" :value="o">{{ o }}</a-select-option>
        </a-select>
        <a-select v-if="tab === 'orders'" v-model:value="statusFilter" placeholder="工单状态" style="width: 130px" allow-clear>
          <a-select-option v-for="s in ['待走访', '走访中', '已完成']" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-select v-if="tab === 'orders'" v-model:value="priorityFilter" placeholder="优先级" style="width: 110px" allow-clear>
          <a-select-option value="高">高</a-select-option>
          <a-select-option value="中">中</a-select-option>
          <a-select-option value="低">低</a-select-option>
        </a-select>
        <a-range-picker v-if="tab === 'records'" />
        <a-button type="primary">查询</a-button>
        <div style="margin-left: auto" class="flex gap8">
          <a-button @click="msg.success('走访数据已导出（演示）')"><DownloadOutlined /> 导出</a-button>
          <a-button type="primary" @click="addOpen = true"><PlusOutlined /> 新增工单</a-button>
        </div>
      </div>
    </PageCard>

    <PageCard v-if="tab === 'orders'" title="走访工单" :sub="`共 ${filteredOrders.length} 个工单`">
      <a-table :columns="orderColumns" :data-source="filteredOrders" :pagination="{ pageSize: 8 }" row-key="id" size="middle">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'title'">
            <a @click="openDetail(record)">{{ record.title }}</a>
            <div class="text-muted">来源：{{ record.source }}</div>
          </template>
          <template v-else-if="column.key === 'priority'">
            <span class="tag-soft" :class="record.priority === '高' ? 'red' : record.priority === '中' ? 'orange' : 'gray'">{{ record.priority }}</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <span class="tag-soft" :class="record.status === '已完成' ? 'green' : record.status === '走访中' ? 'blue' : 'orange'">{{ record.status }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a @click="openDetail(record)">详情</a>
            <a-divider type="vertical" />
            <a v-if="record.status !== '已完成'" @click="openComplete(record)">完成走访</a>
            <span v-else class="text-muted">已归档</span>
          </template>
        </template>
      </a-table>
    </PageCard>

    <PageCard v-else title="走访记录" :sub="`共 ${filteredRecords.length} 条记录`">
      <a-table :columns="recordColumns" :data-source="filteredRecords" :pagination="{ pageSize: 8 }" row-key="id" size="middle">
        <template #bodyCell="{ column, key, record }">
          <template v-if="column.key === 'title'">
            <b>{{ record.title }}</b>
            <div class="text-muted">{{ record.company }}</div>
          </template>
          <template v-else-if="column.key === 'action'">
            <a @click="openRecord(record)">走访详情</a>
          </template>
        </template>
      </a-table>
    </PageCard>

    <a-modal v-model:open="addOpen" title="新增走访工单" width="620px" @ok="saveOrder">
      <a-form layout="vertical">
        <a-form-item label="工单标题" required><a-input v-model:value="form.title" placeholder="请输入工单标题" /></a-form-item>
        <div class="grid2">
          <a-form-item label="走访企业"><a-select v-model:value="form.company" show-search><a-select-option v-for="c in companies" :key="c.name" :value="c.name">{{ c.name }}</a-select-option></a-select></a-form-item>
          <a-form-item label="负责人"><a-select v-model:value="form.owner"><a-select-option v-for="o in ['顾龙飞', '李婷', '王凯', '陈晨', '周敏', '刘洋']" :key="o" :value="o">{{ o }}</a-select-option></a-select></a-form-item>
          <a-form-item label="计划日期"><a-date-picker v-model:value="form.planDate" style="width: 100%" /></a-form-item>
          <a-form-item label="优先级"><a-select v-model:value="form.priority"><a-select-option value="高">高</a-select-option><a-select-option value="中">中</a-select-option><a-select-option value="低">低</a-select-option></a-select></a-form-item>
          <a-form-item label="工单来源"><a-select v-model:value="form.source"><a-select-option v-for="s in ['手动创建', '迁移预警', '企业档案', '企服保障', '政策管理', '园区管理']" :key="s" :value="s">{{ s }}</a-select-option></a-select></a-form-item>
        </div>
        <a-form-item label="走访目的"><a-textarea v-model:value="form.note" :rows="3" placeholder="请描述本次走访的目标与关注事项" /></a-form-item>
      </a-form>
    </a-modal>

    <a-drawer v-model:open="detailOpen" :title="detail?.title" width="560px">
      <template v-if="detail">
        <div class="flex gap8 mb16">
          <span class="tag-soft" :class="detail.status === '已完成' ? 'green' : 'orange'">{{ detail.status }}</span>
          <span class="tag-soft" :class="detail.priority === '高' ? 'red' : 'orange'">{{ detail.priority }}优先级</span>
          <span class="tag-soft gray">{{ detail.source }}</span>
        </div>
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="工单编号">{{ detail.id }}</a-descriptions-item>
          <a-descriptions-item label="负责人">{{ detail.owner }}</a-descriptions-item>
          <a-descriptions-item label="计划日期">{{ detail.planDate }}</a-descriptions-item>
          <a-descriptions-item label="创建人">{{ detail.creator }}</a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ detail.created }}</a-descriptions-item>
        </a-descriptions>
        <a-divider />
        <div style="font-weight: 600; margin-bottom: 12px">工单流转</div>
        <a-timeline>
          <a-timeline-item color="#4a62e7"><b>2026-11-16 10:20</b> 创建工单，指派给 {{ detail.owner }}</a-timeline-item>
          <a-timeline-item color="#52c7b8"><b>2026-11-16 14:05</b> 已联系企业，约定走访时间</a-timeline-item>
          <a-timeline-item :color="detail.status === '已完成' ? '#2fa45f' : '#d4d9e8'"><b>{{ detail.status === '已完成' ? detail.planDate : '待定' }}</b> {{ detail.status === '已完成' ? '完成现场走访，已提交走访记录' : '等待现场走访' }}</a-timeline-item>
        </a-timeline>
        <div class="drawer-actions">
          <a-button v-if="detail.status !== '已完成'" type="primary" @click="openComplete(detail)">完成走访</a-button>
          <a-button v-else @click="msg.success('走访报告已下载（演示）')">下载走访报告</a-button>
        </div>
      </template>
    </a-drawer>

    <a-modal v-model:open="completeOpen" title="完成走访" width="560px" @ok="saveComplete">
      <a-form layout="vertical">
        <a-form-item label="走访企业"><a-input :value="current?.title" disabled /></a-form-item>
        <a-form-item label="走访结果"><a-textarea v-model:value="completeForm.result" :rows="4" placeholder="请填写企业诉求、沟通结果与后续计划" /></a-form-item>
        <div class="grid2">
          <a-form-item label="走访时长"><a-input v-model:value="completeForm.duration" placeholder="如：45 分钟" /></a-form-item>
          <a-form-item label="现场照片">
            <a-button block @click="msg.success('演示环境暂不支持上传')"><CameraOutlined /> 上传照片</a-button>
          </a-form-item>
        </div>
      </a-form>
    </a-modal>

    <a-modal v-model:open="recordOpen" title="走访详情" width="560px" :footer="null">
      <template v-if="currentRecord">
        <div class="record-company">{{ currentRecord.company }}</div>
        <a-descriptions :column="2" bordered size="small" style="margin-top: 14px">
          <a-descriptions-item label="走访主题" :span="2">{{ currentRecord.title }}</a-descriptions-item>
          <a-descriptions-item label="走访人">{{ currentRecord.owner }}</a-descriptions-item>
          <a-descriptions-item label="走访日期">{{ currentRecord.date }}</a-descriptions-item>
          <a-descriptions-item label="走访时长">{{ currentRecord.duration }}</a-descriptions-item>
          <a-descriptions-item label="工单">{{ currentRecord.id }}</a-descriptions-item>
          <a-descriptions-item label="走访结果" :span="2">{{ currentRecord.result }}</a-descriptions-item>
        </a-descriptions>
        <div class="drawer-actions">
          <a-button @click="msg.success('已生成走访纪要（演示）')">生成走访纪要</a-button>
        </div>
      </template>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { message } from 'ant-design-vue';
import { PlusOutlined, DownloadOutlined, FileDoneOutlined, ScheduleOutlined, CameraOutlined } from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import StatCard from '../components/StatCard.vue';
import { visitOrders as seedOrders, visitRecords as seedRecords, companies } from '../data/mock';

const msg = message;
const tab = ref('orders');
const tabs = [
  { key: 'orders', label: '走访工单', count: 126, icon: ScheduleOutlined },
  { key: 'records', label: '走访记录', count: 486, icon: FileDoneOutlined },
];
const orders = ref(seedOrders.map((o) => ({ ...o })));
const records = ref(seedRecords.map((r) => ({ ...r })));
const keyword = ref('');
const ownerFilter = ref();
const statusFilter = ref();
const priorityFilter = ref();
const filteredOrders = computed(() => orders.value.filter((o) => {
  if (keyword.value && !o.title.includes(keyword.value)) return false;
  if (ownerFilter.value && o.owner !== ownerFilter.value) return false;
  if (statusFilter.value && o.status !== statusFilter.value) return false;
  if (priorityFilter.value && o.priority !== priorityFilter.value) return false;
  return true;
}));
const filteredRecords = computed(() => records.value.filter((r) => {
  if (keyword.value && !r.title.includes(keyword.value) && !r.company.includes(keyword.value)) return false;
  if (ownerFilter.value && r.owner !== ownerFilter.value) return false;
  return true;
}));
const orderColumns = [
  { title: '工单标题', key: 'title', width: 300 },
  { title: '负责人', dataIndex: 'owner', width: 90 },
  { title: '计划日期', dataIndex: 'planDate', width: 110 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '优先级', key: 'priority', width: 90 },
  { title: '状态', key: 'status', width: 100 },
  { title: '创建时间', dataIndex: 'created', width: 110 },
  { title: '操作', key: 'action', width: 130 },
];
const recordColumns = [
  { title: '走访主题 / 企业', key: 'title', width: 320 },
  { title: '走访人', dataIndex: 'owner', width: 90 },
  { title: '走访日期', dataIndex: 'date', width: 110 },
  { title: '走访时长', dataIndex: 'duration', width: 100 },
  { title: '走访结果', dataIndex: 'result', ellipsis: true },
  { title: '操作', key: 'action', width: 90 },
];
const addOpen = ref(false);
const form = reactive({ title: '', company: '', owner: '顾龙飞', planDate: null, priority: '中', source: '手动创建', note: '' });
function saveOrder() {
  if (!form.title) {
    msg.warning('请填写工单标题');
    return;
  }
  orders.value.unshift({
    id: 'V' + (100 + orders.value.length), title: form.title, source: form.source, owner: form.owner,
    planDate: form.planDate ? form.planDate.format('YYYY-MM-DD') : '2026-11-25', creator: '顾龙飞', priority: form.priority, status: '待走访', created: '2026-11-17',
  });
  addOpen.value = false;
  form.title = '';
  msg.success('走访工单已创建');
}
const detailOpen = ref(false);
const detail = ref(null);
const current = ref(null);
function openDetail(row) {
  detail.value = row;
  current.value = row;
  detailOpen.value = true;
}
const completeOpen = ref(false);
const completeForm = reactive({ result: '', duration: '45 分钟' });
function openComplete(row) {
  current.value = row;
  completeForm.result = '';
  completeOpen.value = true;
}
function saveComplete() {
  if (!completeForm.result) {
    msg.warning('请填写走访结果');
    return;
  }
  current.value.status = '已完成';
  records.value.unshift({ id: 'VR' + (100 + records.value.length), title: current.value.title, company: current.value.title, owner: current.value.owner, date: '2026-11-17', result: completeForm.result, duration: completeForm.duration });
  completeOpen.value = false;
  detailOpen.value = false;
  msg.success('走访已完成，记录已归档');
}
const recordOpen = ref(false);
const currentRecord = ref(null);
function openRecord(row) {
  currentRecord.value = row;
  recordOpen.value = true;
}
</script>

<style scoped>
.drawer-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.record-company { font-size: 16px; font-weight: 600; }
</style>
