<template>
  <div>
    <div class="page-head">
      <h2>商机摸排</h2>
      <p>围绕目标企业开展需求摸排，沉淀高质量招商线索</p>
    </div>
    <div class="stat-row grid4" style="margin-bottom: 14px">
      <StatCard title="摸排任务" value="86" unit="个" tone="info" foot="本月新增 24 个" />
      <StatCard title="摸排中" value="32" unit="个" tone="warning" />
      <StatCard title="已转线索" value="46" unit="个" tone="success" foot="转化率 53.5%" />
      <StatCard title="预计投资额" value="42.6" unit="亿元" tone="purple" />
    </div>

    <PageCard>
      <div class="filter-row">
        <a-input-search v-model:value="keyword" placeholder="搜索企业名称" style="width: 230px" />
        <a-select v-model:value="filters.park" placeholder="选择园区" style="width: 250px" allow-clear>
          <a-select-option v-for="p in parkNames" :key="p" :value="p">{{ p }}</a-select-option>
        </a-select>
        <a-select v-model:value="filters.status" placeholder="摸排状态" style="width: 140px" allow-clear>
          <a-select-option v-for="s in ['待跟进', '摸排中', '已确认', '已完成']" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-select v-model:value="filters.owner" placeholder="负责人" style="width: 130px" allow-clear>
          <a-select-option v-for="o in ['顾龙飞', '李婷', '王凯', '陈晨']" :key="o" :value="o">{{ o }}</a-select-option>
        </a-select>
        <a-button type="primary">查询</a-button>
        <div style="margin-left: auto">
          <a-button type="primary" @click="openAdd"><PlusOutlined /> 新增摸排</a-button>
        </div>
      </div>
    </PageCard>

    <PageCard title="摸排任务列表" :sub="`共 ${filtered.length} 个任务`">
      <a-table :columns="columns" :data-source="filtered" :pagination="{ pageSize: 8 }" :row-key="(r) => r.id" size="middle">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'company'">
            <a class="link" @click="openDetail(record)">{{ record.company }}</a>
            <div class="cell-tags">
              <span v-for="t in record.tags" :key="t" class="tag-soft blue">{{ t }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'status'">
            <span class="tag-soft" :class="record.status === '已完成' ? 'green' : record.status === '摸排中' ? 'blue' : 'orange'">{{ record.status }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a @click="openDetail(record)">详情</a>
            <a-divider type="vertical" />
            <a @click="toClue(record)">转线索</a>
          </template>
        </template>
      </a-table>
    </PageCard>

    <a-drawer v-model:open="detailOpen" title="摸排详情" width="520px">
      <template v-if="current">
        <h3 class="drawer-company">{{ current.company }}</h3>
        <div class="flex gap8 mb16">
          <span class="tag-soft blue">{{ current.industry }}</span>
          <span class="tag-soft green">{{ current.status }}</span>
        </div>
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="意向园区">{{ current.park }}</a-descriptions-item>
          <a-descriptions-item label="空间需求">{{ current.demand }}</a-descriptions-item>
          <a-descriptions-item label="负责人">{{ current.owner }}</a-descriptions-item>
          <a-descriptions-item label="更新时间">{{ current.updated }}</a-descriptions-item>
          <a-descriptions-item label="企业标签">
            <span v-for="t in current.tags" :key="t" class="tag-soft blue" style="margin-right: 5px">{{ t }}</span>
          </a-descriptions-item>
        </a-descriptions>
        <a-divider />
        <h4 style="font-size: 13px">摸排记录</h4>
        <a-timeline style="margin-top: 12px">
          <a-timeline-item color="#4a62e7">2026-11-16 电话沟通企业选址需求，确认研发办公面积约 3000㎡</a-timeline-item>
          <a-timeline-item color="#c7d2fe">2026-11-12 发送园区载体资料与政策汇编</a-timeline-item>
          <a-timeline-item color="#c7d2fe">2026-11-08 通过产业链活动首次接触企业</a-timeline-item>
        </a-timeline>
        <div class="drawer-actions">
          <a-button @click="msg.success('已添加跟进记录（演示）')">添加跟进</a-button>
          <a-button type="primary" @click="toClue(current)">转为商机线索</a-button>
        </div>
      </template>
    </a-drawer>

    <a-modal v-model:open="addOpen" title="新增摸排任务" @ok="saveTask">
      <a-form layout="vertical">
        <a-form-item label="企业名称" required><a-input v-model:value="addForm.company" placeholder="请输入企业名称" /></a-form-item>
        <div class="grid2">
          <a-form-item label="意向园区">
            <a-select v-model:value="addForm.park"><a-select-option v-for="p in parkNames" :key="p" :value="p">{{ p }}</a-select-option></a-select>
          </a-form-item>
          <a-form-item label="所属行业">
            <a-select v-model:value="addForm.industry"><a-select-option v-for="i in industriesShort" :key="i" :value="i">{{ i }}</a-select-option></a-select>
          </a-form-item>
          <a-form-item label="空间需求"><a-input v-model:value="addForm.demand" placeholder="如：研发办公 2000㎡" /></a-form-item>
          <a-form-item label="负责人">
            <a-select v-model:value="addForm.owner"><a-select-option v-for="o in ['顾龙飞', '李婷', '王凯', '陈晨']" :key="o" :value="o">{{ o }}</a-select-option></a-select>
          </a-form-item>
        </div>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { PlusOutlined } from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import StatCard from '../components/StatCard.vue';
import { investigationTasks, parkNames, industriesShort } from '../data/mock';

const msg = message;
const router = useRouter();
const keyword = ref('');
const filters = reactive({ park: undefined, status: undefined, owner: undefined });
const rows = ref([...investigationTasks]);
const filtered = computed(() => rows.value.filter((r) => {
  if (keyword.value && !r.company.includes(keyword.value)) return false;
  if (filters.park && r.park !== filters.park) return false;
  if (filters.status && r.status !== filters.status) return false;
  if (filters.owner && r.owner !== filters.owner) return false;
  return true;
}));
const columns = [
  { title: '企业名称', key: 'company', width: 320 },
  { title: '意向园区', dataIndex: 'park', width: 260 },
  { title: '所属行业', dataIndex: 'industry', width: 100 },
  { title: '空间需求', dataIndex: 'demand', width: 150 },
  { title: '负责人', dataIndex: 'owner', width: 90 },
  { title: '状态', key: 'status', width: 90 },
  { title: '更新时间', dataIndex: 'updated', width: 110 },
  { title: '操作', key: 'action', width: 110 },
];
const detailOpen = ref(false);
const current = ref(null);
function openDetail(row) {
  current.value = row;
  detailOpen.value = true;
}
function toClue(row) {
  msg.success(`已将「${row.company}」转为商机线索`);
  detailOpen.value = false;
}
const addOpen = ref(false);
const addForm = reactive({ company: '', park: parkNames[0], industry: industriesShort[0], demand: '', owner: '顾龙飞' });
function openAdd() {
  Object.assign(addForm, { company: '', park: parkNames[0], industry: industriesShort[0], demand: '', owner: '顾龙飞' });
  addOpen.value = true;
}
function saveTask() {
  if (!addForm.company) {
    msg.warning('请填写企业名称');
    return;
  }
  rows.value.unshift({ id: 'M' + (100 + rows.value.length), company: addForm.company, park: addForm.park, industry: addForm.industry, demand: addForm.demand || '-', owner: addForm.owner, status: '待跟进', updated: '2026-11-17', tags: [] });
  addOpen.value = false;
  msg.success('摸排任务新增成功');
}
</script>

<style scoped>
.cell-tags { display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap; }
.drawer-company { margin: 0 0 10px; font-size: 17px; line-height: 1.5; }
.drawer-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
</style>
