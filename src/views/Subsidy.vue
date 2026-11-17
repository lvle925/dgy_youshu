<template>
  <div>
    <div class="subsidy-hero">
      <div class="hero-content">
        <h2>企业查询</h2>
        <p>覆盖全市 108,256 家企业信息，支持按产业、区域、规模多维检索</p>
        <div class="hero-search">
          <a-input v-model:value="keyword" size="large" placeholder="请输入企业名称、统一社会信用代码或关键词" allow-clear>
            <template #prefix><SearchOutlined style="color: #98a2b3" /></template>
          </a-input>
          <a-button type="primary" size="large" @click="msg.success('查询完成')">搜索企业</a-button>
        </div>
        <div class="hero-tags">
          <span>热门搜索：</span>
          <a v-for="t in ['专精特新', '高新技术企业', '生物医药', '集成电路', '人工智能']" :key="t" @click="keyword = t">{{ t }}</a>
        </div>
      </div>
    </div>

    <div class="stat-row grid4" style="margin-bottom: 14px">
      <StatCard title="企业总数" value="108,256" unit="家" tone="info" foot="较上月新增 1,286 家" />
      <StatCard title="高新技术企业" value="12,680" unit="家" tone="success" />
      <StatCard title="专精特新企业" value="3,862" unit="家" tone="purple" />
      <StatCard title="上市企业" value="486" unit="家" tone="warning" />
    </div>

    <PageCard>
      <FilterChips label="所属区域" :options="districts" v-model="filters.district" :limit="12" />
      <FilterChips label="所属行业" :options="industriesShort" v-model="filters.industry" :limit="10" />
      <FilterChips label="企业规模" :options="['微型', '小型', '中型', '大型']" v-model="filters.scale" :limit="4" />
      <FilterChips label="企业标签" :options="tags" v-model="filters.tag" :limit="6" />
      <div class="flex gap8" style="margin-top: 10px">
        <a-button @click="advanced = !advanced">更多筛选 <DownOutlined /></a-button>
        <a-button @click="resetFilters">重置筛选</a-button>
        <span class="text-muted" style="margin-left: auto">共找到 {{ filtered.length }} 家企业</span>
        <a-button @click="msg.success('企业名单已导出（演示）')"><DownloadOutlined /> 导出名单</a-button>
      </div>
      <div v-if="advanced" class="advanced-panel">
        <span>注册资本（万元）</span>
        <a-slider v-model:value="capitalRange" range :min="0" :max="10000" :step="100" style="width: 260px" />
        <span style="margin-left: 20px">成立年份</span>
        <a-select v-model:value="filters.year" style="width: 140px">
          <a-select-option value="">全部年份</a-select-option>
          <a-select-option v-for="y in ['2020年后', '2015-2020', '2010-2015', '2010年前']" :key="y" :value="y">{{ y }}</a-select-option>
        </a-select>
      </div>
    </PageCard>

    <PageCard flush>
      <a-table
        :columns="columns"
        :data-source="filtered"
        :pagination="{ pageSize: 8, showTotal: (t) => `共 ${t} 条` }"
        :row-key="(r) => r.id"
        size="middle"
        :scroll="{ x: 1050 }"
        :row-selection="{ selectedRowKeys, onChange: onSelectChange }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="company-cell">
              <div class="company-cell-logo">{{ record.shortName.slice(0, 1) }}</div>
              <div>
                <a class="link" @click="$router.push('/subsidy/company/' + record.id)">{{ record.name }}</a>
                <div class="company-cell-code">{{ record.code }}</div>
              </div>
            </div>
          </template>
          <template v-else-if="column.key === 'tags'">
            <span v-for="t in record.tags.slice(0, 2)" :key="t" class="tag-soft blue" style="margin-right: 4px">{{ t }}</span>
          </template>
          <template v-else-if="column.key === 'score'">
            <span class="score-text">{{ record.score }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a @click="$router.push('/subsidy/company/' + record.id)">查看详情</a>
          </template>
        </template>
      </a-table>
    </PageCard>

    <div v-if="selectedRowKeys.length" class="compare-bar">
      <span>已选 {{ selectedRowKeys.length }} 家企业</span>
      <a-button size="small" type="primary" @click="compareOpen = true">企业对比</a-button>
      <a-button size="small" @click="selectedRowKeys = []">清空</a-button>
    </div>

    <a-modal v-model:open="compareOpen" title="企业对比" width="900px" :footer="null">
      <a-table :columns="compareColumns" :data-source="compareRows" :pagination="false" size="middle" :row-key="(r) => r.field" bordered>
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'field'"><b>{{ record.field }}</b></template>
        </template>
      </a-table>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { message } from 'ant-design-vue';
import { SearchOutlined, DownloadOutlined, DownOutlined } from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import StatCard from '../components/StatCard.vue';
import FilterChips from '../components/FilterChips.vue';
import { companies, districts, industriesShort } from '../data/mock';

const msg = message;
const keyword = ref('');
const advanced = ref(false);
const capitalRange = ref([500, 10000]);
const filters = reactive({ district: '', industry: '', scale: '', tag: '', year: '' });
const tags = ['高新技术企业', '专精特新', '科技型中小企业', '创新型中小企业', '上市企业', '独角兽'];
const selectedRowKeys = ref([]);
const compareOpen = ref(false);

const filtered = computed(() => companies.filter((c) => {
  if (keyword.value && !c.name.includes(keyword.value) && !c.tags.join('').includes(keyword.value)) return false;
  if (filters.district && c.district !== filters.district) return false;
  if (filters.industry && c.industry !== filters.industry) return false;
  if (filters.scale && c.scale !== filters.scale) return false;
  if (filters.tag && !c.tags.includes(filters.tag)) return false;
  return true;
}));
const columns = [
  { title: '企业名称', key: 'name', width: 330 },
  { title: '所属行业', dataIndex: 'industry', width: 110 },
  { title: '所属区域', dataIndex: 'district', width: 100 },
  { title: '注册资本', dataIndex: 'regCapital', width: 110 },
  { title: '社保人数', dataIndex: 'socialSecurity', width: 90 },
  { title: '企业标签', key: 'tags', width: 180 },
  { title: '综合评分', key: 'score', width: 90 },
  { title: '操作', key: 'action', width: 90, fixed: 'right' },
];
function onSelectChange(keys) {
  selectedRowKeys.value = keys;
}
function resetFilters() {
  Object.assign(filters, { district: '', industry: '', scale: '', tag: '', year: '' });
  keyword.value = '';
}
const compareRows = computed(() => {
  const selected = companies.filter((c) => selectedRowKeys.value.includes(c.id));
  const fields = [
    { field: '企业名称', get: (c) => c.name },
    { field: '所属行业', get: (c) => c.industry },
    { field: '注册资本', get: (c) => c.regCapital },
    { field: '社保人数', get: (c) => c.socialSecurity + ' 人' },
    { field: '企业规模', get: (c) => c.scale },
    { field: '综合评分', get: (c) => c.score },
    { field: '所属园区', get: (c) => c.park },
  ];
  return fields.map((f) => {
    const row = { field: f.field };
    selected.forEach((c, i) => (row['c' + i] = f.get(c)));
    return row;
  });
});
const compareColumns = computed(() => {
  const selected = companies.filter((c) => selectedRowKeys.value.includes(c.id));
  return [
    { title: '对比项', key: 'field', dataIndex: 'field', width: 120 },
    ...selected.map((c, i) => ({ title: c.shortName, key: 'c' + i, dataIndex: 'c' + i })),
  ];
});
</script>

<style scoped>
.subsidy-hero {
  background: linear-gradient(120deg, #1f358f 0%, #3d56d8 55%, #5b74f0 100%);
  border-radius: 8px; padding: 26px 30px; color: #fff; margin-bottom: 14px; position: relative; overflow: hidden;
}
.subsidy-hero::after { content: ''; position: absolute; right: -60px; top: -80px; width: 300px; height: 300px; border: 1px solid rgba(255,255,255,.14); border-radius: 50%; box-shadow: 0 0 0 46px rgba(255,255,255,.05); }
.hero-content { position: relative; z-index: 2; max-width: 760px; }
.subsidy-hero h2 { margin: 0 0 5px; font-size: 22px; }
.subsidy-hero p { margin: 0 0 16px; font-size: 12.5px; color: rgba(255,255,255,.72); }
.hero-search { display: flex; gap: 8px; max-width: 680px; }
.hero-search .ant-input-affix-wrapper { flex: 1; border-radius: 6px; }
.hero-tags { display: flex; gap: 12px; margin-top: 12px; font-size: 11.5px; color: rgba(255,255,255,.62); flex-wrap: wrap; }
.hero-tags a { color: rgba(255,255,255,.9); }
.hero-tags a:hover { text-decoration: underline; }
.advanced-panel { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 12px; padding-top: 12px; border-top: 1px dashed #eef0f5; font-size: 12px; color: #667085; }
.company-cell { display: flex; gap: 9px; align-items: center; }
.company-cell-logo { width: 30px; height: 30px; border-radius: 6px; background: #eef1fe; color: #4a62e7; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
.company-cell-code { font-size: 10.5px; color: #98a2b3; margin-top: 2px; }
.score-text { color: #4a62e7; font-weight: 600; }
.compare-bar {
  position: fixed; left: 50%; bottom: 40px; transform: translateX(-50%); background: #fff;
  border-radius: 8px; box-shadow: 0 8px 24px rgba(16, 24, 40, .16); padding: 10px 16px;
  display: flex; align-items: center; gap: 12px; z-index: 200; font-size: 12px; color: #344054;
}
</style>
