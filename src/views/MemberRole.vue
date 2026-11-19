<template>
  <div>
    <div class="stat-row grid4" style="margin-bottom: 14px">
      <StatCard title="角色总数" :value="roleList.length" unit="个" tone="info" />
      <StatCard title="授权成员" value="49" unit="人" tone="success" />
      <StatCard title="权限点" value="86" unit="项" tone="purple" />
      <StatCard title="自定义角色" value="3" unit="个" tone="warning" />
    </div>
    <PageCard title="角色管理" sub="为不同岗位分配菜单权限与数据范围">
      <template #extra>
        <a-button type="primary" @click="openForm()"><PlusOutlined /> 新增角色</a-button>
      </template>
      <a-table :columns="columns" :data-source="roleList" :pagination="false" row-key="id" size="middle">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <b>{{ record.name }}</b>
            <div class="text-muted">{{ record.code }}</div>
          </template>
          <template v-else-if="column.key === 'perms'">
            <div class="perm-tags">
              <span v-for="p in record.perms.slice(0, 3)" :key="p" class="tag-soft blue">{{ p }}</span>
              <span v-if="record.perms.length > 3" class="tag-soft gray">+{{ record.perms.length - 3 }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'action'">
            <a @click="openPerm(record)">权限配置</a>
            <a-divider type="vertical" />
            <a @click="openForm(record)">编辑</a>
            <a-divider type="vertical" />
            <a style="color: #d92d20" @click="removeRole(record)">删除</a>
          </template>
        </template>
      </a-table>
    </PageCard>

    <a-modal v-model:open="formOpen" :title="editing ? '编辑角色' : '新增角色'" width="560px" @ok="saveRole">
      <a-form layout="vertical">
        <div class="grid2">
          <a-form-item label="角色名称" required><a-input v-model:value="form.name" placeholder="如：产业研究员" /></a-form-item>
          <a-form-item label="角色标识" required><a-input v-model:value="form.code" placeholder="如：researcher" /></a-form-item>
        </div>
        <a-form-item label="角色描述"><a-textarea v-model:value="form.desc" :rows="2" /></a-form-item>
        <a-form-item label="数据范围">
          <a-radio-group v-model:value="form.scope">
            <a-radio value="all">全部数据</a-radio>
            <a-radio value="park">本人负责园区</a-radio>
            <a-radio value="self">仅本人创建</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-drawer v-model:open="permOpen" :title="`权限配置 · ${current?.name || ''}`" width="560px">
      <div class="perm-tree">
        <div v-for="g in permGroups" :key="g.name" class="perm-group">
          <div class="perm-group-head">
            <a-checkbox :checked="g.children.every((c) => currentPerms.includes(c))" :indeterminate="g.children.some((c) => currentPerms.includes(c)) && !g.children.every((c) => currentPerms.includes(c))" @change="(e) => toggleGroup(g, e.target.checked)">
              <b>{{ g.name }}</b>
            </a-checkbox>
          </div>
          <a-checkbox-group v-model:value="currentPerms" :options="g.children" />
        </div>
      </div>
      <div class="drawer-actions">
        <a-button @click="permOpen = false">取消</a-button>
        <a-button type="primary" @click="savePerm">保存权限</a-button>
      </div>
    </a-drawer>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { api } from '../api';
import { message, Modal } from 'ant-design-vue';
import { PlusOutlined } from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import StatCard from '../components/StatCard.vue';


const msg = message;
const roleList = ref([]);
onMounted(async () => { try { roleList.value = await api.list('roles'); } catch { msg.error('无法加载角色'); } });
const columns = [
  { title: '角色名称', key: 'name', width: 220 },
  { title: '角色描述', dataIndex: 'desc' },
  { title: '成员数', dataIndex: 'members', width: 100 },
  { title: '功能权限', key: 'perms', width: 320 },
  { title: '操作', key: 'action', width: 200 },
];
const formOpen = ref(false);
const editing = ref(null);
const form = reactive({ name: '', code: '', desc: '', scope: 'all' });
function openForm(row) {
  editing.value = row || null;
  Object.assign(form, row ? { ...row } : { name: '', code: '', desc: '', scope: 'all' });
  formOpen.value = true;
}
async function saveRole() {
  if (!form.name.trim() || !form.code.trim()) { msg.warning('请填写角色名称与标识'); return; }
  try {
    if (editing.value) Object.assign(editing.value, await api.update('roles', { ...editing.value, ...form }));
    else roleList.value.push(await api.create('roles', { ...form, members: 0, perms: ['首页'] }));
    formOpen.value = false; msg.success('角色已保存');
  } catch { msg.error('保存失败'); }
}
function removeRole(row) {
  Modal.confirm({
    title: '删除角色',
    content: `确定删除「${row.name}」？该角色下 ${row.members} 名成员将失去对应权限。`,
    okText: '删除',
    okType: 'danger',
    onOk: async () => {
      try { await api.remove('roles', row.id); } catch { msg.error('删除失败'); return; }
      roleList.value = roleList.value.filter((r) => r.id !== row.id);
      msg.success('角色已删除');
    },
  });
}
const permOpen = ref(false);
const current = ref(null);
const currentPerms = ref([]);
const permGroups = [
  { name: '招商业务', children: ['政策管理', '产业链图谱', '园区楼宇', '商机地图', '企业查询'] },
  { name: '商机洞察', children: ['商机摸排', '商机大厅', '企业扩张', 'AI外呼中心', '项目线索'] },
  { name: '安商稳商', children: ['全景洞察', '园区管理', '企业档案', '迁移预警', '企服保障', '走访管理'] },
  { name: '平台管理', children: ['门店装修', '人员管理', '操作日志', '角色管理', '接口计费'] },
  { name: '数据能力', children: ['数据导出', '招投标查询'] },
];
function openPerm(row) {
  current.value = row;
  currentPerms.value = [...row.perms.filter((p) => p !== '全部菜单')];
  permOpen.value = true;
}
function toggleGroup(g, checked) {
  const rest = currentPerms.value.filter((p) => !g.children.includes(p));
  currentPerms.value = checked ? [...rest, ...g.children] : rest;
}
async function savePerm() {
  try { Object.assign(current.value, await api.update('roles', { ...current.value, perms: currentPerms.value })); } catch { msg.error('保存失败'); return; }
  permOpen.value = false;
  msg.success('权限配置已保存');
}
</script>

<style scoped>
.perm-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.perm-tree { display: flex; flex-direction: column; gap: 18px; }
.perm-group { border: 1px solid #F2F4F7; border-radius: 8px; padding: 12px 14px; }
.perm-group-head { margin-bottom: 10px; }
.perm-group :deep(.ant-checkbox-group) { display: flex; flex-wrap: wrap; gap: 6px 18px; padding-left: 24px; }
.drawer-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }
</style>
