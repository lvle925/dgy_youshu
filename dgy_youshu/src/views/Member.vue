<template>
  <div>
    <div class="stat-row grid4" style="margin-bottom: 14px">
      <StatCard title="成员总数" :value="members.length" unit="人" tone="info" :foot="`启用 ${members.filter(m => m.status === '启用').length} 人`" />
      <StatCard title="今日活跃" value="—" unit="人" tone="success" />
      <StatCard title="角色数" value="6" unit="个" tone="purple" />
      <StatCard title="待处理邀请" value="—" unit="个" tone="warning" />
    </div>
    <PageCard>
      <div class="filter-row">
        <a-input-search v-model:value="keyword" placeholder="搜索姓名 / 手机号" style="width: 230px" />
        <a-select v-model:value="roleFilter" placeholder="角色" style="width: 150px" allow-clear>
          <a-select-option v-for="r in roles" :key="r.name" :value="r.name">{{ r.name }}</a-select-option>
        </a-select>
        <a-select v-model:value="statusFilter" placeholder="状态" style="width: 120px" allow-clear>
          <a-select-option value="启用">启用</a-select-option>
          <a-select-option value="停用">停用</a-select-option>
        </a-select>
        <a-button type="primary" ghost @click="msg.success('已发送导出邮件（演示）')"><DownloadOutlined /> 导出</a-button>
        <a-button type="primary" style="margin-left: auto" @click="openAdd"><PlusOutlined /> 新增成员</a-button>
      </div>
    </PageCard>
    <PageCard title="人员列表" :sub="`共 ${filtered.length} 名成员`">
      <a-table :columns="columns" :data-source="filtered" :pagination="{ pageSize: 8 }" row-key="id" size="middle">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="member-cell">
              <span class="member-avatar">{{ record.name.slice(0, 1) }}</span>
              <div><b>{{ record.name }}</b><div class="text-muted">{{ record.phone }}</div></div>
            </div>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-badge :status="record.status === '启用' ? 'success' : 'default'" :text="record.status" />
          </template>
          <template v-else-if="column.key === 'action'">
            <a @click="openEdit(record)">编辑</a>
            <a-divider type="vertical" />
            <a @click="toggleStatus(record)">{{ record.status === '启用' ? '停用' : '启用' }}</a>
            <a-divider type="vertical" />
            <a @click="resetPassword(record)">重置密码</a>
          </template>
        </template>
      </a-table>
    </PageCard>

    <a-modal v-model:open="formOpen" :title="editing ? '编辑成员' : '新增成员'" width="600px" @ok="saveMember">
      <a-form layout="vertical">
        <div class="grid2">
          <a-form-item label="姓名" required><a-input v-model:value="form.name" placeholder="请输入姓名" /></a-form-item>
          <a-form-item label="手机号" required><a-input v-model:value="form.phone" placeholder="请输入 11 位手机号" /></a-form-item>
          <a-form-item label="所属部门">
            <a-select v-model:value="form.dept"><a-select-option v-for="d in ['招商运营部', '园区服务部', '数据运营部', '综合管理部']" :key="d" :value="d">{{ d }}</a-select-option></a-select>
          </a-form-item>
          <a-form-item label="角色">
            <a-select v-model:value="form.role"><a-select-option v-for="r in roles" :key="r.name" :value="r.name">{{ r.name }}</a-select-option></a-select>
          </a-form-item>
        </div>
        <a-form-item label="负责园区">
          <a-select v-model:value="form.park"><a-select-option value="全部园区">全部园区</a-select-option><a-select-option v-for="c in campusList" :key="c.name" :value="c.name">{{ c.name }}</a-select-option></a-select>
        </a-form-item>
        <a-form-item label="备注"><a-textarea v-model:value="form.remark" :rows="2" placeholder="选填" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { api } from '../api';
import { message, Modal } from 'ant-design-vue';
import { PlusOutlined, DownloadOutlined } from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import StatCard from '../components/StatCard.vue';
import { roles, campusList } from '../data/mock';

const msg = message;
const members = ref([]);
onMounted(async () => { try { members.value = await api.list('members'); } catch { msg.error('无法连接后端，成员数据未加载'); } });
const keyword = ref('');
const roleFilter = ref();
const statusFilter = ref();
const filtered = computed(() => members.value.filter((m) => {
  if (keyword.value && !m.name.includes(keyword.value) && !m.phone.includes(keyword.value)) return false;
  if (roleFilter.value && m.role !== roleFilter.value) return false;
  if (statusFilter.value && m.status !== statusFilter.value) return false;
  return true;
}));
const columns = [
  { title: '成员', key: 'name', width: 190 },
  { title: '角色', dataIndex: 'role', width: 130 },
  { title: '所属部门', dataIndex: 'dept', width: 120 },
  { title: '负责园区', dataIndex: 'park', ellipsis: true },
  { title: '状态', key: 'status', width: 90 },
  { title: '最近登录', dataIndex: 'lastLogin', width: 150 },
  { title: '操作', key: 'action', width: 210 },
];
const formOpen = ref(false);
const editing = ref(null);
const form = reactive({ name: '', phone: '', role: '招商专员', dept: '招商运营部', park: '全部园区', remark: '' });
function openAdd() {
  editing.value = null;
  Object.assign(form, { name: '', phone: '', role: '招商专员', dept: '招商运营部', park: '全部园区', remark: '' });
  formOpen.value = true;
}
function openEdit(row) {
  editing.value = row;
  Object.assign(form, row);
  formOpen.value = true;
}
async function saveMember() {
  if (!form.name || !form.phone) {
    msg.warning('请填写姓名与手机号');
    return;
  }
  try {
    if (editing.value) {
      const saved = await api.update('members', { ...editing.value, ...form });
      Object.assign(editing.value, saved);
      msg.success('成员信息已更新');
    } else {
      const saved = await api.create('members', { ...form, status: '启用', lastLogin: '-' });
      members.value.unshift(saved);
      msg.success('成员已添加');
    }
  } catch { msg.error('保存失败，请检查后端服务'); return; }
  formOpen.value = false;
}
async function toggleStatus(row) {
  try {
    const saved = await api.update('members', { ...row, status: row.status === '启用' ? '停用' : '启用' });
    Object.assign(row, saved);
    msg.success(`成员已${row.status}`);
  } catch { msg.error('保存失败，请检查后端服务'); }
}
function resetPassword(row) {
  Modal.confirm({
    title: '重置登录密码',
    content: `确定重置「${row.name}」的登录密码？重置后将通过短信发送临时密码。`,
    onOk: () => msg.success('密码已重置，临时密码已发送（演示）'),
  });
}
</script>

<style scoped>
.member-cell { display: flex; align-items: center; gap: 10px; }
.member-avatar { width: 32px; height: 32px; border-radius: 50%; background: #F2F4F7; color: #1652B8; display: grid; place-items: center; font-weight: 600; font-size: 13px; }
</style>
