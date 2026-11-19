<template>
  <div>
    <div class="page-head">
      <h2>项目线索</h2>
      <p>汇总项目线索动态，跟踪线索进展并及时更新跟进结果</p>
    </div>
    <a-alert type="info" show-icon style="margin-bottom: 14px">
      <template #message>线索数据最近更新于 2026-11-17 08:00，系统每日自动同步企业扩张与投资动态。</template>
    </a-alert>

    <div class="stat-row grid4" style="margin-bottom: 14px">
      <StatCard title="项目线索" value="268" unit="条" tone="info" />
      <StatCard title="今日新增" value="12" unit="条" tone="success" />
      <StatCard title="待更新" value="36" unit="条" tone="warning" />
      <StatCard title="本月签约" value="8" unit="个" tone="purple" />
    </div>

    <PageCard>
      <div class="filter-row">
        <a-input-search v-model:value="keyword" placeholder="搜索企业 / 项目名称" style="width: 240px" />
        <a-select v-model:value="status" placeholder="线索状态" style="width: 140px" allow-clear>
          <a-select-option v-for="s in ['待更新', '跟进中', '已签约', '已失效']" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-range-picker v-model:value="dateRange" />
        <a-button type="primary">查询</a-button>
        <div style="margin-left: auto">
          <a-button @click="msg.success('线索模板已下载（演示）')"><DownloadOutlined /> 下载模板</a-button>
          <a-button @click="importOpen = true"><UploadOutlined /> 批量导入</a-button>
          <a-button type="primary" @click="msg.success('已触发数据同步（演示）')"><SyncOutlined /> 立即同步</a-button>
        </div>
      </div>
    </PageCard>

    <PageCard title="线索动态列表" :sub="`共 ${filtered.length} 条`">
      <a-table :columns="columns" :data-source="filtered" :pagination="{ pageSize: 8 }" :row-key="(r) => r.id" size="middle">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'company'">
            <a class="link" @click="$router.push('/clue/detail/' + record.id)">{{ record.company }}</a>
          </template>
          <template v-else-if="column.key === 'status'">
            <span class="tag-soft" :class="record.status === '已签约' ? 'green' : record.status === '跟进中' ? 'blue' : record.status === '待更新' ? 'orange' : 'gray'">{{ record.status }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a @click="openUpdate(record)">更新动态</a>
            <a-divider type="vertical" />
            <a @click="$router.push('/clue/detail/' + record.id)">详情</a>
          </template>
        </template>
      </a-table>
    </PageCard>

    <a-modal v-model:open="updateOpen" title="更新线索动态" @ok="saveUpdate">
      <a-form layout="vertical">
        <a-form-item label="企业名称"><a-input :value="current?.company" disabled /></a-form-item>
        <a-form-item label="最新进展">
          <a-select v-model:value="updateForm.type">
            <a-select-option value="企业实地考察">企业实地考察</a-select-option>
            <a-select-option value="政策方案沟通">政策方案沟通</a-select-option>
            <a-select-option value="载体方案确认">载体方案确认</a-select-option>
            <a-select-option value="签约落地">签约落地</a-select-option>
            <a-select-option value="暂缓推进">暂缓推进</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="线索状态">
          <a-radio-group v-model:value="updateForm.status">
            <a-radio value="跟进中">跟进中</a-radio>
            <a-radio value="已签约">已签约</a-radio>
            <a-radio value="已失效">已失效</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="进展说明"><a-textarea v-model:value="updateForm.note" :rows="3" placeholder="请输入进展说明" /></a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="importOpen" title="批量导入线索" @ok="doImport">
      <a-upload-dragger :before-upload="() => false" accept=".xlsx,.xls,.csv">
        <p class="ant-upload-drag-icon"><InboxOutlined /></p>
        <p class="ant-upload-text">点击或拖拽文件到此处上传</p>
        <p class="ant-upload-hint">支持 .xlsx / .xls / .csv 格式，单次最多导入 1000 条线索</p>
      </a-upload-dragger>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { api } from '../api';
import { message } from 'ant-design-vue';
import { DownloadOutlined, UploadOutlined, SyncOutlined, InboxOutlined } from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import StatCard from '../components/StatCard.vue';


const msg = message;
const keyword = ref('');
const status = ref();
const dateRange = ref();
const rows = ref([]);
onMounted(async () => { try { rows.value = (await api.list('clues')).map(c => ({ ...c, project: c.intent, amount: c.amount || '—', updated: c.updated || c.date, note: c.note || '暂无动态' })); } catch { msg.error('无法加载线索'); } });
const filtered = computed(() => rows.value.filter((r) => {
  if (keyword.value && !r.company.includes(keyword.value) && !r.project.includes(keyword.value)) return false;
  if (status.value && r.status !== status.value) return false;
  return true;
}));
const columns = [
  { title: '企业名称', key: 'company', width: 280 },
  { title: '项目线索', dataIndex: 'project', width: 190 },
  { title: '预计投资', dataIndex: 'amount', width: 110 },
  { title: '所属行业', dataIndex: 'industry', width: 100 },
  { title: '最新动态', dataIndex: 'note', width: 200 },
  { title: '状态', key: 'status', width: 90 },
  { title: '更新时间', dataIndex: 'updated', width: 110 },
  { title: '操作', key: 'action', width: 130 },
];
const updateOpen = ref(false);
const current = ref(null);
const updateForm = reactive({ type: '企业实地考察', status: '跟进中', note: '' });
function openUpdate(row) {
  current.value = row;
  Object.assign(updateForm, { type: '企业实地考察', status: row.status === '已签约' ? '已签约' : '跟进中', note: '' });
  updateOpen.value = true;
}
async function saveUpdate() {
  if (!updateForm.note.trim()) {
    msg.warning('请填写进展说明');
    return;
  }
  const row = rows.value.find((r) => r.id === current.value.id);
  try { Object.assign(row, await api.update('clues', { ...row, note: updateForm.type + '：' + updateForm.note, status: updateForm.status, updated: new Date().toISOString().slice(0, 10) })); } catch { msg.error('保存失败'); return; }
  updateOpen.value = false;
  msg.success('线索动态已更新');
}
const importOpen = ref(false);
function doImport() {
  importOpen.value = false;
  msg.success('文件已上传，正在解析（演示）');
}
</script>
