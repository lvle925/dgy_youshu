<template>
  <div>
    <div class="stat-row grid4" style="margin-bottom: 14px">
      <StatCard title="园区总数" value="6" unit="个" tone="info" foot="运营中 5 个 / 建设中 1 个" />
      <StatCard title="楼宇总数" value="268" unit="栋" tone="purple" />
      <StatCard title="入驻企业" value="3,105" unit="家" tone="success" foot="本月新增 1 家" />
      <StatCard title="平均入驻率" value="89.6" unit="%" tone="warning" foot="较上月 +1.2%" />
    </div>
    <PageCard>
      <div class="filter-row">
        <a-input-search v-model:value="keyword" placeholder="搜索园区名称" style="width: 240px" />
        <a-select v-model:value="districtFilter" placeholder="所在区域" style="width: 150px" allow-clear>
          <a-select-option v-for="d in districts" :key="d" :value="d">{{ d }}</a-select-option>
        </a-select>
        <a-select v-model:value="statusFilter" placeholder="运营状态" style="width: 130px" allow-clear>
          <a-select-option value="运营中">运营中</a-select-option>
          <a-select-option value="建设中">建设中</a-select-option>
        </a-select>
        <a-button type="primary">查询</a-button>
        <div style="margin-left: auto" class="flex gap8">
          <a-radio-group v-model:value="viewMode" button-style="solid" size="small">
            <a-radio-button value="card">卡片</a-radio-button>
            <a-radio-button value="table">列表</a-radio-button>
          </a-radio-group>
          <a-button type="primary" @click="editing = null; Object.assign(form, { name: '', district: '浦东新区', status: '运营中', buildings: 10, area: '', manager: '顾龙飞', industry: '生物医药', desc: '' }); formOpen = true"><PlusOutlined /> 新增园区</a-button>
        </div>
      </div>
    </PageCard>

    <div v-if="viewMode === 'card'" class="campus-grid">
      <div v-for="c in filtered" :key="c.id" class="campus-card">
        <div class="campus-cover">
          <span class="tag-soft" :class="c.status === '运营中' ? 'green' : 'orange'" style="position: absolute; top: 12px; right: 12px">{{ c.status }}</span>
          <div class="campus-cover-icon"><BankOutlined /></div>
          <span class="campus-cover-name">{{ c.name }}</span>
        </div>
        <div class="campus-body">
          <div class="campus-meta">
            <span><EnvironmentOutlined /> {{ c.district }}</span>
            <span><BuildOutlined /> {{ c.buildings }} 栋</span>
          </div>
          <div class="campus-kpis">
            <div><b>{{ c.enterprises }}</b><span>入驻企业</span></div>
            <div><b>{{ c.area }}</b><span>载体面积</span></div>
            <div><b>{{ c.occupancy }}%</b><span>入驻率</span></div>
          </div>
          <a-progress :percent="c.occupancy" size="small" :stroke-color="c.occupancy > 90 ? '#2fa45f' : '#1652B8'" />
          <div class="campus-owner"><UserOutlined /> 园区负责人：{{ c.manager }}</div>
        </div>
        <div class="campus-actions">
          <a @click="openBuildings(c)">楼宇管理</a>
          <a-divider type="vertical" />
          <a @click="editCampus(c)">编辑</a>
          <a-divider type="vertical" />
          <router-link :to="`/park/detail/${c.id}`">园区详情</router-link>
        </div>
      </div>
    </div>

    <PageCard v-else title="园区列表">
      <a-table :columns="columns" :data-source="filtered" :pagination="{ pageSize: 8 }" row-key="id" size="middle">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'occupancy'">
            <div style="max-width: 160px"><a-progress :percent="record.occupancy" size="small" :stroke-color="'#1652B8'" /></div>
          </template>
          <template v-else-if="column.key === 'status'">
            <span class="tag-soft" :class="record.status === '运营中' ? 'green' : 'orange'">{{ record.status }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a @click="openBuildings(record)">楼宇</a>
            <a-divider type="vertical" />
            <a @click="editCampus(record)">编辑</a>
          </template>
        </template>
      </a-table>
    </PageCard>

    <a-modal v-model:open="formOpen" :title="editing ? '编辑园区' : '新增园区'" width="620px" @ok="saveCampus">
      <a-form layout="vertical">
        <a-form-item label="园区名称" required><a-input v-model:value="form.name" placeholder="请输入园区名称" /></a-form-item>
        <div class="grid2">
          <a-form-item label="所在区域">
            <a-select v-model:value="form.district"><a-select-option v-for="d in ['浦东新区', '徐汇区', '嘉定区', '松江区', '奉贤区', '闵行区']" :key="d" :value="d">{{ d }}</a-select-option></a-select>
          </a-form-item>
          <a-form-item label="运营状态">
            <a-select v-model:value="form.status"><a-select-option value="运营中">运营中</a-select-option><a-select-option value="建设中">建设中</a-select-option></a-select>
          </a-form-item>
          <a-form-item label="楼宇数量"><a-input-number v-model:value="form.buildings" :min="1" style="width: 100%" /></a-form-item>
          <a-form-item label="载体面积"><a-input v-model:value="form.area" placeholder="如：10.2 万㎡" /></a-form-item>
          <a-form-item label="园区负责人">
            <a-select v-model:value="form.manager"><a-select-option v-for="u in ['顾龙飞', '李婷', '王凯', '陈晨', '周敏', '刘洋']" :key="u" :value="u">{{ u }}</a-select-option></a-select>
          </a-form-item>
          <a-form-item label="主导产业">
            <a-select v-model:value="form.industry"><a-select-option v-for="i in ['生物医药', '集成电路', '人工智能', '数字经济', '新能源']" :key="i" :value="i">{{ i }}</a-select-option></a-select>
          </a-form-item>
        </div>
        <a-form-item label="园区简介"><a-textarea v-model:value="form.desc" :rows="3" /></a-form-item>
      </a-form>
    </a-modal>

    <a-drawer v-model:open="buildingOpen" :title="`楼宇管理 · ${currentCampus?.name || ''}`" width="680px">
      <template v-if="currentCampus">
        <div class="flex gap8" style="margin-bottom: 14px">
          <a-button type="primary" size="small" @click="msg.success('新增楼宇成功（演示）')"><PlusOutlined /> 新增楼宇</a-button>
          <a-button size="small" @click="msg.success('楼宇数据已导出（演示）')">导出</a-button>
        </div>
        <a-table :columns="buildingColumns" :data-source="buildings" :pagination="{ pageSize: 6 }" size="small" row-key="id">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <span class="tag-soft" :class="record.status === '满租' ? 'orange' : record.status === '招商中' ? 'green' : 'blue'">{{ record.status }}</span>
            </template>
            <template v-else-if="column.key === 'action'">
              <a @click="msg.info(`${record.name} 详情（演示）`)">详情</a>
            </template>
          </template>
        </a-table>
      </template>
    </a-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { api } from '../api';
import { message } from 'ant-design-vue';
import { PlusOutlined, BankOutlined, EnvironmentOutlined, BuildOutlined, UserOutlined } from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import StatCard from '../components/StatCard.vue';
import { districts } from '../data/mock';

const msg = message;
const keyword = ref('');
const districtFilter = ref();
const statusFilter = ref();
const viewMode = ref('card');
const campus = ref([]);
onMounted(async () => { try { campus.value = await api.list('campusList'); } catch { msg.error('无法连接后端，园区数据未加载'); } });
const filtered = computed(() => campus.value.filter((c) => {
  if (keyword.value && !c.name.includes(keyword.value)) return false;
  if (districtFilter.value && c.district !== districtFilter.value) return false;
  if (statusFilter.value && c.status !== statusFilter.value) return false;
  return true;
}));
const columns = [
  { title: '园区名称', dataIndex: 'name' },
  { title: '区域', dataIndex: 'district', width: 100 },
  { title: '楼宇数', dataIndex: 'buildings', width: 90 },
  { title: '入驻企业', dataIndex: 'enterprises', width: 100 },
  { title: '载体面积', dataIndex: 'area', width: 110 },
  { title: '入驻率', key: 'occupancy', width: 180 },
  { title: '负责人', dataIndex: 'manager', width: 100 },
  { title: '状态', key: 'status', width: 100 },
  { title: '操作', key: 'action', width: 110 },
];
const formOpen = ref(false);
const editing = ref(null);
const form = reactive({ name: '', district: '浦东新区', status: '运营中', buildings: 10, area: '', manager: '顾龙飞', industry: '生物医药', desc: '' });
function editCampus(row) {
  editing.value = row;
  Object.assign(form, row, { industry: '生物医药' });
  formOpen.value = true;
}
async function saveCampus() {
  if (!form.name) {
    msg.warning('请填写园区名称');
    return;
  }
  try {
    if (editing.value) {
      const saved = await api.update('campusList', { ...editing.value, ...form });
      Object.assign(editing.value, saved);
      msg.success('园区信息已更新');
    } else {
      const saved = await api.create('campusList', { ...form, enterprises: 0, occupancy: 0 });
      campus.value.push(saved);
      msg.success('园区已新增');
    }
  } catch { msg.error('保存失败，请检查后端服务'); return; }
  formOpen.value = false;
}
const buildingOpen = ref(false);
const currentCampus = ref(null);
const buildings = ref([]);
function openBuildings(c) {
  currentCampus.value = c;
  buildings.value = Array.from({ length: Math.min(c.buildings, 8) }, (_, i) => ({
    id: 'B' + (i + 1),
    name: `${c.name.slice(0, 6)}${i + 1}号楼`,
    floors: 5 + (i % 8),
    area: 8000 + i * 3200,
    occupancy: Math.max(62, Math.min(100, c.occupancy - (i % 4) * 6)),
    enterprises: Math.floor(c.enterprises / 8) + (i % 5) * 3,
    status: i === 0 ? '满租' : i % 3 === 0 ? '装修中' : '招商中',
  }));
  buildingOpen.value = true;
}
const buildingColumns = [
  { title: '楼宇名称', dataIndex: 'name' },
  { title: '楼层', dataIndex: 'floors', width: 70 },
  { title: '面积(㎡)', dataIndex: 'area', width: 100 },
  { title: '入驻率', dataIndex: 'occupancy', width: 80, customRender: ({ text }) => text + '%' },
  { title: '企业数', dataIndex: 'enterprises', width: 80 },
  { title: '状态', key: 'status', width: 90 },
  { title: '操作', key: 'action', width: 70 },
];
</script>

<style scoped>
.campus-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.campus-card { background: #fff; border-radius: 10px; box-shadow: 0 2px 10px rgba(23, 35, 80, 0.05); overflow: hidden; transition: all 0.2s; }
.campus-card:hover { box-shadow: 0 10px 24px rgba(23, 35, 80, 0.1); transform: translateY(-2px); }
.campus-cover { position: relative; height: 104px; background: linear-gradient(120deg, #1652B8, #1652B8); display: flex; align-items: flex-end; padding: 14px 16px; gap: 10px; color: #fff; }
.campus-cover-icon { position: absolute; top: 18px; left: 16px; width: 38px; height: 38px; border-radius: 10px; background: rgba(255, 255, 255, 0.16); display: grid; place-items: center; font-size: 20px; }
.campus-cover-name { font-size: 15px; font-weight: 600; }
.campus-body { padding: 14px 16px 8px; }
.campus-meta { display: flex; gap: 14px; font-size: 12px; color: #657384; margin-bottom: 12px; }
.campus-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 10px; }
.campus-kpis div { display: flex; flex-direction: column; gap: 2px; }
.campus-kpis b { font-size: 15px; color: #303b49; }
.campus-kpis span { font-size: 11px; color: #657384; }
.campus-owner { font-size: 12px; color: #657384; padding: 8px 0 4px; }
.campus-actions { display: flex; align-items: center; padding: 9px 16px; border-top: 1px solid #F2F4F7; font-size: 12.5px; }
.campus-actions a { color: #1652B8; }
@media (max-width: 1400px) { .campus-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
