<template>
  <div>
    <PageCard>
      <div class="model-head">
        <div>
          <div class="model-title">{{ model.name }}</div>
          <div class="model-meta">
            <span>更新日期：{{ model.updated }}</span>
            <span>企业数量：{{ model.count }} 家</span>
            <span>覆盖地区：{{ model.region }}</span>
          </div>
        </div>
        <div class="flex gap8">
          <a-button @click="msg.success('模型配置已打开（演示）')"><SettingOutlined /> 模型配置</a-button>
          <a-button danger @click="deleteOpen = true">删除</a-button>
        </div>
      </div>
    </PageCard>

    <PageCard>
      <div class="flex-between mb12">
        <div class="card-title"><span class="rule-bar"></span> 模型描述 <span class="tag-soft blue">{{ matchRules.length }} 条规则</span></div>
        <span class="text-muted">基于产业、布局、资本与情感多维规则智能匹配目标企业</span>
      </div>
      <div class="rule-grid">
        <div v-for="(r, i) in matchRules" :key="r" class="rule-item">
          <span class="rule-idx">{{ i + 1 }}</span>
          <span>{{ r }}</span>
        </div>
      </div>
    </PageCard>

    <PageCard>
      <div class="underline-tabs">
        <span class="utab" :class="{ active: tab === 'match' }" @click="tab = 'match'">企业匹配</span>
        <span class="utab" :class="{ active: tab === 'analysis' }" @click="tab = 'analysis'">企业分析</span>
      </div>

      <template v-if="tab === 'match'">
        <div class="toolbar">
          <div class="toolbar-left">
            <div class="segmented">
              <span class="seg" :class="{ active: view === 'card' }" @click="view = 'card'">卡片</span>
              <span class="seg" :class="{ active: view === 'list' }" @click="view = 'list'">列表</span>
            </div>
          </div>
          <div class="toolbar-right">
            <a-input-search v-model:value="keyword" placeholder="请输入公司企业名称" style="width: 240px" />
            <a-dropdown>
              <a-button><SortAscendingOutlined /> 排序</a-button>
              <template #overlay>
                <a-menu @click="({ key }) => (sortBy = key)">
                  <a-menu-item key="score">按匹配度</a-menu-item>
                  <a-menu-item key="name">按企业名称</a-menu-item>
                  <a-menu-item key="capital">按注册资本</a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
            <a-button @click="moreOpen = !moreOpen"><FilterOutlined /> 更多筛选</a-button>
            <a-button type="primary" @click="msg.success('匹配企业已导出（演示）')">导出</a-button>
          </div>
        </div>
        <div class="filter-board">
          <FilterChips label="主导产业" :options="['全部', '石油化工', '新材料', '装备制造', '生命健康', '科技型企业', '新能源']" v-model="industry" :limit="7" />
          <div class="chip-row">
            <div class="chip-label">规则命中</div>
            <div class="chips">
              <span v-for="t in ruleFilters" :key="t" class="chip" :class="{ active: activeRules.includes(t) }" @click="toggleRule(t)">{{ t }}</span>
            </div>
          </div>
          <FilterChips label="上线季度" :options="['第1季', '第2季', '第3季', '第4季']" v-model="quarter" :limit="4" />
          <div v-if="moreOpen" class="more-filter-panel">
            <span>注册资本不低于</span>
            <a-input-number v-model:value="minCapital" :min="0" style="width: 140px" addon-after="万元" />
            <span style="margin-left: 20px">联系人</span>
            <a-input v-model:value="contactFilter" placeholder="请输入联系人" style="width: 160px" />
          </div>
        </div>

        <div v-if="view === 'card'" class="match-grid">
          <div v-for="c in sortedCompanies" :key="c.id" class="match-card" @click="openCompany(c)">
            <div class="match-card-head">
              <div class="match-avatar">{{ c.name.slice(0, 1) }}</div>
              <div class="match-name">{{ c.name }}</div>
              <div class="match-score">{{ c.score }}<span>分</span></div>
            </div>
            <div class="match-tags">
              <span v-for="t in c.tags" :key="t" class="tag-soft blue">{{ t }}</span>
            </div>
            <div class="match-info">
              <span>所属行业：{{ c.industry }}</span>
              <span>注册资本：{{ c.capital }}</span>
              <span>所在地区：{{ c.park }}</span>
              <span>联系人：{{ c.contact }}</span>
            </div>
            <div class="match-foot">
              <span class="text-muted">更新于 2026-11-16</span>
              <a class="link">查看详情 <ArrowRightOutlined /></a>
            </div>
          </div>
        </div>
        <a-table v-else :columns="columns" :data-source="sortedCompanies" :pagination="{ pageSize: 8 }" :row-key="(r) => r.id" size="middle">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'"><a class="link" @click="openCompany(record)">{{ record.name }}</a></template>
            <template v-else-if="column.key === 'score'"><span class="score-text">{{ record.score }} 分</span></template>
            <template v-else-if="column.key === 'tags'">
              <span v-for="t in record.tags" :key="t" class="tag-soft blue" style="margin-right: 4px">{{ t }}</span>
            </template>
          </template>
        </a-table>
      </template>

      <template v-else>
        <div class="grid2">
          <div>
            <div class="card-title mb12">企业产业分布</div>
            <ChartBox :option="industryPie" :height="260" />
          </div>
          <div>
            <div class="card-title mb12">匹配度分布</div>
            <ChartBox :option="scoreBar" :height="260" />
          </div>
          <div>
            <div class="card-title mb12">规则命中次数</div>
            <ChartBox :option="ruleBar" :height="260" />
          </div>
          <div>
            <div class="card-title mb12">企业上线季度</div>
            <ChartBox :option="quarterLine" :height="260" />
          </div>
        </div>
      </template>
    </PageCard>

    <a-modal v-model:open="deleteOpen" title="删除模型" @ok="doDelete">
      <p>确定要删除「{{ model.name }}」吗？删除后关联的匹配记录将不可恢复。</p>
    </a-modal>

    <a-drawer v-model:open="detailOpen" title="匹配企业详情" width="480px">
      <template v-if="current">
        <h3 class="drawer-company">{{ current.name }}</h3>
        <div class="flex gap8 mb12">
          <span class="tag-soft blue">{{ current.industry }}</span>
          <span class="tag-soft green">匹配度 {{ current.score }} 分</span>
        </div>
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="注册资本">{{ current.capital }}</a-descriptions-item>
          <a-descriptions-item label="所在地区">{{ current.park }}</a-descriptions-item>
          <a-descriptions-item label="联系人">{{ current.contact }}</a-descriptions-item>
          <a-descriptions-item label="命中规则">
            <span v-for="t in current.tags" :key="t" class="tag-soft orange" style="margin-right: 4px">{{ t }}</span>
          </a-descriptions-item>
        </a-descriptions>
        <a-divider />
        <h4 style="font-size: 13px">推荐理由</h4>
        <p class="reason-text">该企业符合模型主导产业方向，近一年有对外投资与业务扩张行为，所在地区存在产业限制，具备向上海外溢的潜力，建议优先对接。</p>
        <div class="drawer-actions">
          <a-button @click="msg.success('已加入跟进列表（演示）')">加入跟进</a-button>
          <a-button type="primary" @click="msg.success('已创建外呼任务（演示）')">发起外呼</a-button>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { message } from 'ant-design-vue';
import { SettingOutlined, SortAscendingOutlined, FilterOutlined, ArrowRightOutlined } from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import FilterChips from '../components/FilterChips.vue';
import ChartBox from '../components/ChartBox.vue';
import { matchRules, matchCompanies } from '../data/mock';

const msg = message;
const model = { name: '洛阳中关村产业精准招商模型', updated: '2026-05-09', count: 1000, region: '江苏、广东、浙江、河南' };
const tab = ref('match');
const view = ref('card');
const keyword = ref('');
const sortBy = ref('score');
const moreOpen = ref(false);
const industry = ref('全部');
const quarter = ref('');
const ruleFilters = ['项目线索', '业务布局', '对外投资', '成本敏感', '指标敏感', '注册地址变更', '租期敏感', '股东变更', '融资成功', '链主供应商', '链主客户', '项目考察', '领导考察'];
const activeRules = ref(['项目线索']);
const minCapital = ref(0);
const contactFilter = ref('');
const deleteOpen = ref(false);
const detailOpen = ref(false);
const current = ref(null);

function toggleRule(t) {
  activeRules.value = activeRules.value.includes(t)
    ? activeRules.value.filter((i) => i !== t)
    : [...activeRules.value, t];
}
const sortedCompanies = computed(() => {
  let list = matchCompanies.filter((c) => {
    if (keyword.value && !c.name.includes(keyword.value)) return false;
    if (industry.value && industry.value !== '全部' && c.industry !== industry.value) return false;
    if (contactFilter.value && !c.contact.includes(contactFilter.value)) return false;
    return true;
  });
  if (sortBy.value === 'score') list = [...list].sort((a, b) => b.score - a.score);
  if (sortBy.value === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  if (sortBy.value === 'capital') list = [...list].sort((a, b) => parseFloat(b.capital) - parseFloat(a.capital));
  return list;
});
const columns = [
  { title: '企业名称', key: 'name' },
  { title: '所属行业', dataIndex: 'industry', width: 110 },
  { title: '注册资本', dataIndex: 'capital', width: 110 },
  { title: '命中规则', key: 'tags', width: 260 },
  { title: '匹配度', key: 'score', width: 100 },
  { title: '联系人', dataIndex: 'contact', width: 90 },
];
function openCompany(c) {
  current.value = c;
  detailOpen.value = true;
}
function doDelete() {
  deleteOpen.value = false;
  msg.success('模型删除操作已记录（演示环境不会实际删除）');
}
const industryPie = {
  tooltip: { trigger: 'item' },
  legend: { bottom: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { fontSize: 11, color: '#657384' } },
  series: [{
    type: 'pie', radius: ['42%', '68%'], center: ['50%', '44%'], label: { show: false },
    data: [
      { value: 38, name: '装备制造', itemStyle: { color: '#1652B8' } },
      { value: 26, name: '新材料', itemStyle: { color: '#1652B8' } },
      { value: 18, name: '石油化工', itemStyle: { color: '#1652B8' } },
      { value: 12, name: '生命健康', itemStyle: { color: '#1652B8' } },
      { value: 6, name: '新能源', itemStyle: { color: '#657384' } },
    ],
  }],
};
const scoreBar = {
  grid: { left: 36, right: 18, top: 20, bottom: 26 },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: ['60-70', '70-80', '80-85', '85-90', '90-95', '95+'], axisLabel: { fontSize: 10, color: '#657384' }, axisLine: { lineStyle: { color: '#F2F4F7' } }, axisTick: { show: false } },
  yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#657384' }, splitLine: { lineStyle: { color: '#F2F4F7', type: 'dashed' } } },
  series: [{ type: 'bar', barWidth: 22, data: [46, 128, 210, 286, 198, 132], itemStyle: { color: '#1652B8', borderRadius: [3, 3, 0, 0] } }],
};
const ruleBar = {
  grid: { left: 100, right: 20, top: 10, bottom: 20 },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#657384' }, splitLine: { lineStyle: { color: '#F2F4F7', type: 'dashed' } } },
  yAxis: { type: 'category', data: ['领导考察', '项目考察', '链主客户', '融资成功', '股东变更', '对外投资'], axisLabel: { fontSize: 10, color: '#657384' }, axisLine: { show: false }, axisTick: { show: false } },
  series: [{ type: 'bar', barWidth: 12, data: [42, 76, 108, 146, 182, 236], itemStyle: { color: '#1652B8', borderRadius: [0, 5, 5, 0] } }],
};
const quarterLine = {
  grid: { left: 40, right: 20, top: 20, bottom: 26 },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: ['第1季', '第2季', '第3季', '第4季'], axisLabel: { fontSize: 10, color: '#657384' }, axisLine: { lineStyle: { color: '#F2F4F7' } }, axisTick: { show: false } },
  yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#657384' }, splitLine: { lineStyle: { color: '#F2F4F7', type: 'dashed' } } },
  series: [{ type: 'line', smooth: true, symbol: 'circle', symbolSize: 5, data: [186, 265, 318, 231], lineStyle: { color: '#1652B8', width: 2 }, itemStyle: { color: '#1652B8' }, areaStyle: { color: 'rgba(139,92,246,.1)' } }],
};
</script>

<style scoped>
.model-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.model-title { font-size: 18px; font-weight: 600; color: #303b49; }
.model-meta { display: flex; gap: 28px; flex-wrap: wrap; margin-top: 10px; font-size: 12.5px; color: #657384; }
.rule-bar { width: 3px; height: 14px; background: #1652B8; border-radius: 2px; display: inline-block; }
.rule-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.rule-item { display: flex; gap: 8px; align-items: flex-start; border: 1px solid #F2F4F7; border-radius: 5px; padding: 9px 10px; font-size: 12px; color: #657384; line-height: 1.6; background: #F2F4F7; }
.rule-idx { width: 17px; height: 17px; border-radius: 50%; border: 1px solid #F2F4F7; color: #1652B8; font-size: 10px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
.filter-board { background: #F2F4F7; border: 1px solid #F2F4F7; border-radius: 6px; padding: 10px 12px; margin-bottom: 14px; }
.more-filter-panel { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 8px; padding-top: 10px; border-top: 1px dashed #F2F4F7; font-size: 12px; color: #657384; }
.match-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.match-card { border: 1px solid #F2F4F7; border-radius: 8px; padding: 15px; cursor: pointer; transition: all .16s; }
.match-card:hover { border-color: #cfd6df; box-shadow: 0 8px 20px rgba(20, 37, 100, .07); }
.match-card-head { display: flex; align-items: center; gap: 9px; }
.match-avatar { width: 32px; height: 32px; border-radius: 6px; background: #F2F4F7; color: #1652B8; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }
.match-name { font-size: 13px; font-weight: 600; color: #657384; line-height: 1.4; flex: 1; }
.match-score { color: #1652B8; font-size: 22px; font-weight: 700; line-height: 1; flex-shrink: 0; }
.match-score span { font-size: 10px; font-weight: 400; color: #657384; margin-left: 2px; }
.match-tags { display: flex; gap: 5px; flex-wrap: wrap; margin: 10px 0; min-height: 22px; }
.match-info { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11.5px; color: #657384; }
.match-foot { display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #F2F4F7; padding-top: 10px; margin-top: 12px; font-size: 11px; }
.score-text { color: #1652B8; font-weight: 600; }
.drawer-company { margin: 0 0 10px; font-size: 17px; line-height: 1.5; }
.reason-text { font-size: 12.5px; color: #657384; line-height: 2; }
.drawer-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
@media (max-width: 1400px) { .rule-grid, .match-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
