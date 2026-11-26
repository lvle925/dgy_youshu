<template>
  <div>
    <PageCard>
      <div class="filter-row">
        <span class="filter-label">所属产业链</span>
        <a-select v-model:value="filters.chain" style="width: 150px">
          <a-select-option value="">全部产业链</a-select-option>
          <a-select-option v-for="c in chainOptions" :key="c" :value="c">{{ c }}</a-select-option>
        </a-select>
        <span class="filter-label">企业类型</span>
        <a-select v-model:value="filters.level" style="width: 140px">
          <a-select-option value="">全部类型</a-select-option>
          <a-select-option v-for="l in ['链主企业', '核心供应商', '配套企业']" :key="l" :value="l">{{ l }}</a-select-option>
        </a-select>
        <span class="filter-label">所属园区</span>
        <a-select v-model:value="filters.park" style="width: 240px">
          <a-select-option value="">全部园区</a-select-option>
          <a-select-option v-for="p in parkNames" :key="p" :value="p">{{ p }}</a-select-option>
        </a-select>
        <a-input-search v-model:value="keyword" placeholder="搜索企业名称 / 产品" style="width: 240px" />
        <a-button type="primary" @click="msg.success('筛选已应用')">查询</a-button>
      </div>
    </PageCard>

    <div class="stat-row grid4" style="margin-bottom: 0">
      <StatCard title="供应链企业" value="1,286" unit="家" tone="info" />
      <StatCard title="链主企业" value="26" unit="家" tone="purple" />
      <StatCard title="本地配套率" value="68.5" unit="%" tone="success" />
      <StatCard title="供需对接成功" value="342" unit="次" tone="warning" />
    </div>

    <PageCard title="供应链企业列表" :sub="`共 ${filtered.length} 家企业`">
      <template #extra>
        <a-button type="primary" @click="addOpen = true"><PlusOutlined /> 新增企业</a-button>
      </template>
      <a-table :columns="columns" :data-source="filtered" :pagination="{ pageSize: 8 }" :row-key="(r) => r.id" size="middle">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <a class="link" @click="openChain(record)">{{ record.name }}</a>
          </template>
          <template v-else-if="column.key === 'level'">
            <span class="tag-soft" :class="record.level === '链主企业' ? 'blue' : record.level === '核心供应商' ? 'green' : 'gray'">{{ record.level }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a @click="openChain(record)">查看上下游</a>
          </template>
        </template>
      </a-table>
    </PageCard>

    <a-drawer v-model:open="chainOpen" title="供应链上下游" width="540px">
      <template v-if="current">
        <h3 class="drawer-company">{{ current.name }}</h3>
        <div class="flex gap8" style="margin-bottom: 18px">
          <span class="tag-soft blue">{{ current.level }}</span>
          <span class="tag-soft green">{{ current.industry }}</span>
          <span class="tag-soft gray">{{ current.park }}</span>
        </div>
        <a-descriptions :column="2" size="small" bordered style="margin-bottom: 18px">
          <a-descriptions-item label="主营产品" :span="2">{{ current.products }}</a-descriptions-item>
          <a-descriptions-item label="合作伙伴">{{ current.partners }} 家</a-descriptions-item>
          <a-descriptions-item label="本地配套率">68%</a-descriptions-item>
        </a-descriptions>
        <div class="supply-chain">
          <div class="sc-col">
            <div class="sc-title">上游</div>
            <div v-for="i in 3" :key="i" class="sc-node up">原材料供应商 {{ i }}</div>
          </div>
          <div class="sc-mid">
            <div class="sc-title">本企业</div>
            <div class="sc-node main">{{ current.name }}</div>
          </div>
          <div class="sc-col">
            <div class="sc-title">下游</div>
            <div v-for="i in 3" :key="i" class="sc-node down">应用客户 {{ i }}</div>
          </div>
        </div>
      </template>
    </a-drawer>

    <a-modal v-model:open="addOpen" title="新增供应链企业" @ok="saveCompany">
      <a-form layout="vertical">
        <a-form-item label="企业名称" required><a-input v-model:value="addForm.name" placeholder="请输入企业名称" /></a-form-item>
        <a-form-item label="所属产业链">
          <a-select v-model:value="addForm.industry"><a-select-option v-for="c in chainOptions" :key="c" :value="c">{{ c }}</a-select-option></a-select>
        </a-form-item>
        <a-form-item label="企业类型">
          <a-select v-model:value="addForm.level"><a-select-option v-for="l in ['链主企业', '核心供应商', '配套企业']" :key="l" :value="l">{{ l }}</a-select-option></a-select>
        </a-form-item>
        <a-form-item label="主营产品"><a-input v-model:value="addForm.products" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { message } from 'ant-design-vue';
import { PlusOutlined } from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import StatCard from '../components/StatCard.vue';
import { supplyChainNodes, parkNames } from '../data/mock';

const msg = message;
const chainOptions = ['生物医药', '集成电路', '人工智能', '新能源', '数字经济', '软件信息', '建筑服务', '高端装备'];
const filters = reactive({ chain: '', level: '', park: '' });
const keyword = ref('');
const rows = ref([...supplyChainNodes]);
const filtered = computed(() => rows.value.filter((r) => {
  if (filters.chain && r.industry !== filters.chain) return false;
  if (filters.level && r.level !== filters.level) return false;
  if (filters.park && r.park !== filters.park) return false;
  if (keyword.value && !r.name.includes(keyword.value) && !r.products.includes(keyword.value)) return false;
  return true;
}));
const columns = [
  { title: '企业名称', key: 'name' },
  { title: '所属产业链', dataIndex: 'industry', width: 110 },
  { title: '供应链角色', key: 'level', width: 110 },
  { title: '主营产品', dataIndex: 'products', width: 200 },
  { title: '合作伙伴', dataIndex: 'partners', width: 90 },
  { title: '所属园区', dataIndex: 'park', width: 230 },
  { title: '操作', key: 'action', width: 100 },
];
const chainOpen = ref(false);
const current = ref(null);
function openChain(row) {
  current.value = row;
  chainOpen.value = true;
}
const addOpen = ref(false);
const addForm = reactive({ name: '', industry: '生物医药', level: '配套企业', products: '' });
function saveCompany() {
  if (!addForm.name) {
    msg.warning('请填写企业名称');
    return;
  }
  rows.value.unshift({ id: 'S' + (rows.value.length + 10), name: addForm.name, industry: addForm.industry, level: addForm.level, products: addForm.products || '待补充', partners: 0, park: '临港新片区生命蓝湾生物医药特色产业园' });
  addOpen.value = false;
  addForm.name = '';
  msg.success('企业新增成功');
}
</script>

<style scoped>
.drawer-company { margin: 0 0 10px; font-size: 17px; line-height: 1.5; }
.supply-chain { display: grid; grid-template-columns: 1fr 1.2fr 1fr; gap: 10px; align-items: center; }
.sc-title { font-size: 11px; color: #657384; text-align: center; margin-bottom: 8px; }
.sc-col { display: flex; flex-direction: column; gap: 8px; }
.sc-node { border: 1px solid #F2F4F7; background: #F2F4F7; border-radius: 6px; padding: 9px 8px; font-size: 11px; color: #657384; text-align: center; }
.sc-node.up { border-color: #F2F4F7; background: #F2F4F7; }
.sc-node.down { border-color: #F2F4F7; background: #F2F4F7; }
.sc-node.main { background: #1652B8; color: #fff; border-color: #1652B8; padding: 16px 8px; font-size: 12px; }
.sc-mid { display: flex; flex-direction: column; }
</style>
