<template>
  <div>
    <PageCard>
      <div class="filter-row">
        <a-input-search v-model:value="keyword" placeholder="搜索操作人 / 操作内容" style="width: 240px" />
        <a-select v-model:value="userFilter" placeholder="操作人" style="width: 130px" allow-clear>
          <a-select-option v-for="u in users" :key="u" :value="u">{{ u }}</a-select-option>
        </a-select>
        <a-select v-model:value="moduleFilter" placeholder="功能模块" style="width: 150px" allow-clear>
          <a-select-option v-for="m in modules" :key="m" :value="m">{{ m }}</a-select-option>
        </a-select>
        <a-range-picker v-model:value="range" />
        <a-button type="primary">查询</a-button>
        <a-button style="margin-left: auto" @click="msg.success('操作日志已导出（演示）')"><DownloadOutlined /> 导出日志</a-button>
      </div>
    </PageCard>
    <PageCard title="操作日志" :sub="`共 ${filtered.length} 条记录`">
      <a-table :columns="columns" :data-source="filtered" :pagination="{ pageSize: 10 }" row-key="id" size="middle">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'user'">
            <span class="member-avatar">{{ record.user.slice(0, 1) }}</span>
            <b style="margin-left: 8px">{{ record.user }}</b>
          </template>
          <template v-else-if="column.key === 'target'">
            <span class="ellipsis" style="max-width: 340px; display: inline-block; vertical-align: middle">{{ record.target }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a @click="detail = record; detailOpen = true">详情</a>
          </template>
        </template>
      </a-table>
    </PageCard>

    <a-drawer v-model:open="detailOpen" title="日志详情" width="480px">
      <template v-if="detail">
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="操作人">{{ detail.user }}</a-descriptions-item>
          <a-descriptions-item label="功能模块">{{ detail.module }}</a-descriptions-item>
          <a-descriptions-item label="操作行为">{{ detail.action }}</a-descriptions-item>
          <a-descriptions-item label="操作对象">{{ detail.target }}</a-descriptions-item>
          <a-descriptions-item label="IP 地址">{{ detail.ip }}</a-descriptions-item>
          <a-descriptions-item label="操作时间">{{ detail.time }}</a-descriptions-item>
          <a-descriptions-item label="请求结果"><a-tag color="success">成功</a-tag></a-descriptions-item>
        </a-descriptions>
        <div class="request-block">
          <div class="request-title">请求参数</div>
          <pre>{
  "targetId": "{{ detail.id }}",
  "module": "{{ detail.module }}",
  "action": "{{ detail.action }}",
  "source": "web-admin"
}</pre>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { message } from 'ant-design-vue';
import { DownloadOutlined } from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import { logs } from '../data/mock';

const msg = message;
const keyword = ref('');
const userFilter = ref();
const moduleFilter = ref();
const range = ref();
const users = [...new Set(logs.map((l) => l.user))];
const modules = [...new Set(logs.map((l) => l.module))];
const filtered = computed(() => logs.filter((l) => {
  if (keyword.value && !l.target.includes(keyword.value) && !l.action.includes(keyword.value)) return false;
  if (userFilter.value && l.user !== userFilter.value) return false;
  if (moduleFilter.value && l.module !== moduleFilter.value) return false;
  return true;
}));
const columns = [
  { title: '操作人', key: 'user', width: 130 },
  { title: '功能模块', dataIndex: 'module', width: 130 },
  { title: '操作行为', dataIndex: 'action', width: 140 },
  { title: '操作对象', key: 'target' },
  { title: 'IP 地址', dataIndex: 'ip', width: 140 },
  { title: '操作时间', dataIndex: 'time', width: 150 },
  { title: '操作', key: 'action', width: 80 },
];
const detailOpen = ref(false);
const detail = ref(null);
</script>

<style scoped>
.member-avatar { width: 26px; height: 26px; border-radius: 50%; background: #eef1fe; color: #4a62e7; display: inline-grid; place-items: center; font-size: 12px; font-weight: 600; }
.request-block { margin-top: 20px; background: #0f172a; border-radius: 8px; padding: 14px 16px; }
.request-title { color: #94a3b8; font-size: 12px; margin-bottom: 8px; }
.request-block pre { color: #d7e2f0; font-size: 12px; line-height: 1.7; margin: 0; white-space: pre-wrap; }
</style>
