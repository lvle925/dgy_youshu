<template>
  <div>
    <PageCard>
      <div class="policy-tabs">
        <span
          v-for="t in tabs"
          :key="t.key"
          class="utab"
          :class="{ active: activeTab === t.key }"
          @click="activeTab = t.key"
        >{{ t.label }}</span>
        <div class="policy-tab-actions">
          <a-button @click="exportData"><DownloadOutlined /> 导出</a-button>
          <a-button type="primary" @click="openAdd"><PlusOutlined /> 新增政策</a-button>
        </div>
      </div>

      <template v-if="activeTab === 'project'">
        <div v-if="selectedChips.length" class="selected-bar mb12">
          <span>已选条件</span>
          <span v-for="s in selectedChips" :key="s.key" class="selected-tag">{{ s.value }} <CloseOutlined @click="s.clear()" /></span>
          <span class="clear-link" @click="resetFilters">全部清除</span>
        </div>
        <FilterChips label="地区" :options="districts" v-model="filters.district" :limit="16" />
        <FilterChips label="补贴类型" :options="subsidyTypes" v-model="filters.type" :limit="14" />
        <FilterChips label="级别" :options="levels" v-model="filters.level" :limit="4" />
        <FilterChips label="补贴行业" :options="industries" v-model="filters.industry" :limit="6" />
        <div class="filter-row" style="margin-top: 10px">
          <span class="filter-label">关键词</span>
          <a-input v-model:value="keywordInput" placeholder="请输入政策项目名称" style="width: 240px" allow-clear @press-enter="applyKeyword" />
          <a-button type="primary" @click="applyKeyword">搜索</a-button>
          <a-button @click="resetFilters">重置</a-button>
          <span class="text-muted" style="margin-left: 8px">共筛选出 {{ filteredPolicies.length }} 条政策</span>
        </div>
      </template>
    </PageCard>

    <template v-if="activeTab === 'project'">
      <div class="policy-stats">
        <div class="policy-stat"><span class="ps-label">政策条数：</span><b>2,355</b><span>条</span></div>
        <div class="policy-stat"><BankOutlined class="ps-icon" /><span>资助企业总数：</span><b>70,401</b><span>家</span></div>
        <div class="policy-stat"><span class="ps-coin">¥</span><span>资助总额合计：</span><b>1,364,006.59</b><span>万元</span></div>
        <div class="policy-stat"><span class="ps-max">MAX</span><span>单个企业获批政策最多：</span><b>306</b><span>个</span></div>
        <div class="policy-stat"><span class="ps-max">MAX</span><span>单个企业资助总额最高：</span><b>26,658.92</b><span>万元</span></div>
      </div>

      <PageCard flush>
        <a-table
          :columns="policyColumns"
          :data-source="pagedPolicies"
          :pagination="pagination"
          :row-key="(r) => r.id"
          size="middle"
          :scroll="{ x: 1100 }"
          @change="onTableChange"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'name'">
              <a class="link" @click="$router.push('/policy/detail/' + record.id)">{{ record.name }}</a>
            </template>
            <template v-else-if="column.key === 'stars'">
              <span class="stars">
                <span v-for="n in 5" :key="n" :class="{ off: n > record.stars }">★</span>
              </span>
            </template>
            <template v-else-if="column.key === 'companies'">
              {{ record.companies.toLocaleString() }} 家
            </template>
            <template v-else-if="column.key === 'industry'">
              <span class="ellipsis-2">{{ record.industry }}</span>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button type="primary" size="small" @click="openPoster(record)">生成海报</a-button>
            </template>
          </template>
        </a-table>
      </PageCard>
    </template>

    <template v-else-if="activeTab === 'notice'">
      <PageCard flush>
        <div class="simple-filter">
          <a-input-search v-model:value="noticeKeyword" placeholder="搜索通知标题" style="width: 280px" />
          <a-select v-model:value="noticeType" style="width: 140px">
            <a-select-option value="">全部类型</a-select-option>
            <a-select-option v-for="t in ['申报通知', '结果公示', '政策调整']" :key="t" :value="t">{{ t }}</a-select-option>
          </a-select>
          <span class="text-muted">共 {{ filteredNotices.length }} 条通知</span>
        </div>
        <a-table :columns="noticeColumns" :data-source="filteredNotices" :pagination="{ pageSize: 8 }" :row-key="(r) => r.id" size="middle">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'title'">
              <a class="link" @click="openNotice(record)">{{ record.title }}</a>
            </template>
            <template v-else-if="column.key === 'type'">
              <span class="tag-soft" :class="record.type === '申报通知' ? 'blue' : record.type === '结果公示' ? 'green' : 'orange'">{{ record.type }}</span>
            </template>
            <template v-else-if="column.key === 'action'">
              <a @click="openNotice(record)">查看详情</a>
            </template>
          </template>
        </a-table>
      </PageCard>
    </template>

    <template v-else-if="activeTab === 'public'">
      <PageCard flush>
        <div class="simple-filter">
          <a-input-search v-model:value="publicKeyword" placeholder="搜索公示名单" style="width: 280px" />
          <span class="text-muted">共 {{ filteredPublic.length }} 份公示名单</span>
        </div>
        <a-table :columns="publicColumns" :data-source="filteredPublic" :pagination="{ pageSize: 8 }" :row-key="(r) => r.id" size="middle">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'title'">
              <a class="link" @click="openPublic(record)">{{ record.title }}</a>
            </template>
            <template v-else-if="column.key === 'count'">{{ record.count.toLocaleString() }} 家</template>
            <template v-else-if="column.key === 'action'">
              <a @click="openPublic(record)">查看名单</a>
            </template>
          </template>
        </a-table>
      </PageCard>
    </template>

    <template v-else-if="activeTab === 'topic'">
      <PageCard flush>
        <div class="simple-filter">
          <a-input-search v-model:value="topicKeyword" placeholder="搜索项目课题" style="width: 280px" />
          <span class="text-muted">共 {{ filteredTopics.length }} 个课题</span>
        </div>
        <a-table :columns="topicColumns" :data-source="filteredTopics" :pagination="{ pageSize: 8 }" :row-key="(r) => r.id" size="middle">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <span class="tag-soft" :class="record.status === '申报中' ? 'green' : 'gray'">{{ record.status }}</span>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button type="primary" size="small" :disabled="record.status !== '申报中'" @click="topicApply(record)">申报</a-button>
            </template>
          </template>
        </a-table>
      </PageCard>
    </template>

    <template v-else>
      <PageCard title="一键政策匹配">
        <a-alert type="info" show-icon message="填写企业基本信息，系统将基于政策条件智能匹配可申报政策。" style="margin-bottom: 16px" />
        <a-form layout="vertical" class="match-form">
          <div class="grid3">
            <a-form-item label="企业名称"><a-input v-model:value="matchForm.name" placeholder="请输入企业名称" /></a-form-item>
            <a-form-item label="所属行业">
              <a-select v-model:value="matchForm.industry" placeholder="请选择所属行业">
                <a-select-option v-for="i in industriesShort" :key="i" :value="i">{{ i }}</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="企业规模">
              <a-select v-model:value="matchForm.scale" placeholder="请选择企业规模">
                <a-select-option v-for="s in ['微型', '小型', '中型', '大型']" :key="s" :value="s">{{ s }}</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="注册地区">
              <a-select v-model:value="matchForm.district" placeholder="请选择注册地区">
                <a-select-option v-for="d in districts" :key="d" :value="d">{{ d }}</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="上年度研发投入（万元）"><a-input-number v-model:value="matchForm.rd" :min="0" style="width: 100%" /></a-form-item>
            <a-form-item label="有效知识产权数量"><a-input-number v-model:value="matchForm.ip" :min="0" style="width: 100%" /></a-form-item>
          </div>
          <div class="flex-center">
            <a-button type="primary" size="large" :loading="matching" @click="runMatch">开始匹配</a-button>
          </div>
        </a-form>
      </PageCard>
      <PageCard v-if="matchResults.length" title="匹配结果" :sub="`共匹配到 ${matchResults.length} 条政策`">
        <a-table :columns="matchColumns" :data-source="matchResults" :pagination="false" :row-key="(r) => r.policy.id" size="middle">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <a class="link" @click="$router.push('/policy/detail/' + record.policy.id)">{{ record.policy.name }}</a>
            </template>
            <template v-else-if="column.key === 'match'">
              <a-progress :percent="record.score" size="small" :stroke-color="'#1652B8'" />
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button size="small" type="primary" @click="openPoster(record.policy)">生成海报</a-button>
            </template>
          </template>
        </a-table>
      </PageCard>
    </template>

    <a-modal v-model:open="posterOpen" title="政策海报" width="480px" :footer="null">
      <div class="poster-wrap">
        <div class="poster">
          <div class="poster-brand">有数计划 · 政策服务</div>
          <div class="poster-title">{{ posterPolicy?.name }}</div>
          <div class="poster-meta">
            <div><span>政策级别</span><b>{{ posterPolicy?.level }}</b></div>
            <div><span>组织部门</span><b>{{ posterPolicy?.org }}</b></div>
            <div><span>补贴类型</span><b>{{ posterPolicy?.type }}</b></div>
            <div><span>申报截止</span><b>{{ posterPolicy?.deadline }}</b></div>
          </div>
          <div class="poster-line"></div>
          <div class="poster-summary">最高资助金额：{{ ((posterPolicy?.amount || 0) / 10).toFixed(2) }} 万元</div>
          <div class="poster-foot">
            <div class="qr"></div>
            <div>扫码查看政策详情<br /><span>有数计划平台 · 政策智能匹配</span></div>
          </div>
        </div>
        <div class="poster-actions">
          <a-button @click="copyPoster">复制海报链接</a-button>
          <a-button type="primary" @click="downloadPoster">下载海报</a-button>
        </div>
      </div>
    </a-modal>

    <a-drawer v-model:open="noticeOpen" title="通知详情" width="620px">
      <template v-if="notice">
        <h3 class="drawer-title">{{ notice.title }}</h3>
        <div class="drawer-meta">
          <span>{{ notice.org }}</span><span>{{ notice.date }}</span>
          <span class="tag-soft blue">{{ notice.type }}</span>
          <span class="text-muted">浏览量 {{ notice.views }}</span>
        </div>
        <a-divider />
        <p>各区相关单位：</p>
        <p>根据本市产业政策工作安排，现组织开展相关申报工作。请各单位高度重视，对照通知要求，认真组织符合条件的企业做好申报准备，并于截止日期前完成线上提交。</p>
        <p>一、申报对象：在本市注册登记、具有独立法人资格，且符合政策支持方向的企业。</p>
        <p>二、申报时间：{{ notice.date }} 至 2026-12-31，逾期不予受理。</p>
        <p>三、申报方式：登录"一网通办"或"有数计划平台"进行线上填报。</p>
        <p>四、咨询电话：021-6828 8888。</p>
        <p style="text-align: right">{{ notice.org }}<br />{{ notice.date }}</p>
      </template>
    </a-drawer>

    <a-drawer v-model:open="publicOpen" title="公示名单" width="620px">
      <template v-if="publicItem">
        <h3 class="drawer-title">{{ publicItem.title }}</h3>
        <div class="drawer-meta">
          <span>{{ publicItem.org }}</span><span>{{ publicItem.date }}</span>
          <span class="tag-soft green">公示中</span>
        </div>
        <a-divider />
        <p class="text-muted">共 {{ publicItem.count.toLocaleString() }} 家企业，以下为部分名单：</p>
        <a-table
          :columns="[{ title: '序号', dataIndex: 'idx', width: 60 }, { title: '企业名称', dataIndex: 'name' }, { title: '所属区', dataIndex: 'district', width: 100 }]"
          :data-source="publicCompanyRows"
          :pagination="false"
          size="small"
        />
      </template>
    </a-drawer>

    <a-modal v-model:open="addOpen" title="新增政策" width="680px" @ok="savePolicy">
      <a-form layout="vertical">
        <div class="grid2">
          <a-form-item label="政策名称" required><a-input v-model:value="addForm.name" placeholder="请输入政策名称" /></a-form-item>
          <a-form-item label="组织部门" required><a-input v-model:value="addForm.org" placeholder="请输入组织部门" /></a-form-item>
          <a-form-item label="政策级别">
            <a-select v-model:value="addForm.level"><a-select-option v-for="l in levels" :key="l" :value="l">{{ l }}</a-select-option></a-select>
          </a-form-item>
          <a-form-item label="补贴类型">
            <a-select v-model:value="addForm.type"><a-select-option v-for="t in subsidyTypes" :key="t" :value="t">{{ t }}</a-select-option></a-select>
          </a-form-item>
          <a-form-item label="申报截止日期"><a-input v-model:value="addForm.deadline" placeholder="YYYY-MM-DD" /></a-form-item>
          <a-form-item label="所属地区">
            <a-select v-model:value="addForm.district"><a-select-option v-for="d in districts" :key="d" :value="d">{{ d }}</a-select-option></a-select>
          </a-form-item>
        </div>
        <a-form-item label="政策简介"><a-textarea v-model:value="addForm.content" :rows="3" placeholder="请输入政策简介" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { api } from '../api';
import { message } from 'ant-design-vue';
import { DownloadOutlined, PlusOutlined, CloseOutlined, BankOutlined } from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import FilterChips from '../components/FilterChips.vue';
import {
  policyNotices, policyPublicList, policyTopics,
  districts, subsidyTypes, levels, industries, industriesShort, companyNames,
} from '../data/mock';

const tabs = [
  { key: 'project', label: '政策项目' },
  { key: 'notice', label: '通知文件' },
  { key: 'public', label: '公示名单' },
  { key: 'topic', label: '项目课题' },
  { key: 'match', label: '一键政策匹配' },
];
const activeTab = ref('project');
const policyList = ref([]);
onMounted(async () => { try { policyList.value = await api.list('policies'); } catch { message.error('无法加载政策'); } });
const filters = reactive({ district: '', type: '', level: '', industry: '' });
const keywordInput = ref('');
const keyword = ref('');
const page = ref(1);
const pageSize = ref(8);
const sortField = ref('');
const sortOrder = ref('');

const selectedChips = computed(() => [
  { key: 'district', value: filters.district, clear: () => (filters.district = '') },
  { key: 'type', value: filters.type, clear: () => (filters.type = '') },
  { key: 'level', value: filters.level, clear: () => (filters.level = '') },
  { key: 'industry', value: filters.industry, clear: () => (filters.industry = '') },
].filter((i) => i.value));

const filteredPolicies = computed(() => {
  let list = policyList.value.filter((p) => {
    if (filters.district && p.district !== filters.district && !(p.district === '上海市' && filters.district)) return false;
    if (filters.type && p.type !== filters.type) return false;
    if (filters.level && p.level !== filters.level) return false;
    if (filters.industry && !p.industry.includes(filters.industry)) return false;
    if (keyword.value && !p.name.includes(keyword.value)) return false;
    return true;
  });
  if (sortField.value === 'companies') {
    list = [...list].sort((a, b) => (sortOrder.value === 'ascend' ? a.companies - b.companies : b.companies - a.companies));
  }
  return list;
});
const pagedPolicies = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return filteredPolicies.value.slice(start, start + pageSize.value);
});
const pagination = computed(() => ({
  current: page.value,
  pageSize: pageSize.value,
  total: filteredPolicies.value.length,
  showSizeChanger: true,
  showTotal: (t) => `共 ${t} 条`,
}));
function onTableChange(pag, _f, sorter) {
  page.value = pag.current;
  pageSize.value = pag.pageSize;
  if (sorter && sorter.field) {
    sortField.value = sorter.field;
    sortOrder.value = sorter.order;
  }
}
function applyKeyword() {
  keyword.value = keywordInput.value.trim();
  page.value = 1;
}
function resetFilters() {
  filters.district = '';
  filters.type = '';
  filters.level = '';
  filters.industry = '';
  keywordInput.value = '';
  keyword.value = '';
  page.value = 1;
}

const policyColumns = [
  { title: '政策项目名称', key: 'name', width: 300 },
  { title: '级别', dataIndex: 'level', width: 80 },
  { title: '组织部门', dataIndex: 'org', width: 220 },
  { title: '推荐等级', key: 'stars', width: 130 },
  { title: '补贴类型', dataIndex: 'type', width: 100 },
  { title: '获批企业', key: 'companies', dataIndex: 'companies', width: 120, sorter: true },
  { title: '补贴行业', key: 'industry', width: 200 },
  { title: '操作', key: 'action', width: 100, fixed: 'right' },
];

const noticeKeyword = ref('');
const noticeType = ref('');
const filteredNotices = computed(() => policyNotices.filter((n) => {
  if (noticeKeyword.value && !n.title.includes(noticeKeyword.value)) return false;
  if (noticeType.value && n.type !== noticeType.value) return false;
  return true;
}));
const noticeColumns = [
  { title: '通知标题', key: 'title' },
  { title: '发布部门', dataIndex: 'org', width: 230 },
  { title: '类型', key: 'type', width: 100 },
  { title: '发布日期', dataIndex: 'date', width: 110 },
  { title: '浏览量', dataIndex: 'views', width: 90 },
  { title: '操作', key: 'action', width: 90 },
];
const noticeOpen = ref(false);
const notice = ref(null);
function openNotice(row) {
  notice.value = row;
  noticeOpen.value = true;
}

const publicKeyword = ref('');
const filteredPublic = computed(() => policyPublicList.filter((n) => !publicKeyword.value || n.title.includes(publicKeyword.value)));
const publicColumns = [
  { title: '名单名称', key: 'title' },
  { title: '批次', dataIndex: 'batch', width: 90 },
  { title: '发布部门', dataIndex: 'org', width: 230 },
  { title: '公示日期', dataIndex: 'date', width: 110 },
  { title: '企业数', key: 'count', width: 100 },
  { title: '操作', key: 'action', width: 100 },
];
const publicOpen = ref(false);
const publicItem = ref(null);
const publicCompanyRows = computed(() => companyNames.slice(0, 10).map((name, i) => ({ idx: i + 1, name, district: districts[i % districts.length] })));
function openPublic(row) {
  publicItem.value = row;
  publicOpen.value = true;
}

const topicKeyword = ref('');
const filteredTopics = computed(() => policyTopics.filter((n) => !topicKeyword.value || n.title.includes(topicKeyword.value)));
const topicColumns = [
  { title: '课题名称', dataIndex: 'title' },
  { title: '发布单位', dataIndex: 'org', width: 220 },
  { title: '研究领域', dataIndex: 'field', width: 110 },
  { title: '课题经费', dataIndex: 'budget', width: 100 },
  { title: '申报截止', dataIndex: 'deadline', width: 110 },
  { title: '状态', key: 'status', width: 90 },
  { title: '操作', key: 'action', width: 90 },
];
function topicApply(row) {
  message.success(`已提交「${row.title}」课题申报意向`);
}

const posterOpen = ref(false);
const posterPolicy = ref(null);
function openPoster(row) {
  posterPolicy.value = row;
  posterOpen.value = true;
}
function copyPoster() {
  message.success('海报链接已复制（演示）');
}
function downloadPoster() {
  message.success('海报已生成，正在下载（演示）');
}

const matchForm = reactive({ name: '', industry: '', scale: '', district: '浦东新区', rd: 500, ip: 12 });
const matching = ref(false);
const matchResults = ref([]);
const matchColumns = [
  { title: '政策名称', key: 'name' },
  { title: '级别', dataIndex: ['policy', 'level'], width: 80 },
  { title: '补贴类型', dataIndex: ['policy', 'type'], width: 100 },
  { title: '申报截止', dataIndex: ['policy', 'deadline'], width: 110 },
  { title: '匹配度', key: 'match', width: 180 },
  { title: '操作', key: 'action', width: 100 },
];
function runMatch() {
  if (!matchForm.name.trim()) {
    message.warning('请填写企业名称');
    return;
  }
  matching.value = true;
  setTimeout(() => {
    matching.value = false;
    matchResults.value = policyList.value
      .filter((p) => p.level !== '国家级')
      .slice(0, 6)
      .map((p, i) => ({ policy: p, score: 96 - i * 7 }));
    message.success('政策匹配完成，共匹配到 6 条政策');
  }, 600);
}

const addOpen = ref(false);
const addForm = reactive({ name: '', org: '', level: '省级', type: '研发投入', deadline: '', district: '浦东新区', content: '' });
function openAdd() {
  Object.assign(addForm, { name: '', org: '', level: '省级', type: '研发投入', deadline: '', district: '浦东新区', content: '' });
  addOpen.value = true;
}
async function savePolicy() {
  if (!addForm.name || !addForm.org) {
    message.warning('请填写政策名称和组织部门');
    return;
  }
  try { policyList.value.unshift(await api.create('policies', {
    name: addForm.name,
    level: addForm.level,
    org: addForm.org,
    stars: 4,
    type: addForm.type,
    companies: 0,
    industry: '制造业；信息传输、软件和信息技术服务业',
    district: addForm.district,
    date: '2026-11-17',
    amount: 0,
    deadline: addForm.deadline || '2026-12-31',
    status: '申报中',
    hot: 0,
    content: addForm.content,
    requirements: [],
    materials: [],
  })); } catch { message.error('保存失败'); return; }
  addOpen.value = false;
  activeTab.value = 'project';
  message.success('政策新增成功');
}
function exportData() {
  message.success('已导出当前筛选结果（演示）');
}
</script>

<style scoped>
.policy-tabs { display: flex; align-items: center; gap: 30px; border-bottom: 1px solid var(--border); margin-bottom: 14px; flex-wrap: wrap; }
.policy-tab-actions { margin-left: auto; display: flex; gap: 8px; margin-bottom: 8px; }
.policy-stats {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin: 0 0 14px;
}
.policy-stat {
  display: flex; align-items: center; gap: 6px; background: #fff; border-radius: 6px;
  padding: 10px 16px; font-size: 12px; color: #657384; box-shadow: 0 1px 2px rgba(16, 24, 40, .03);
}
.policy-stat b { color: #657384; font-size: 14px; }
.policy-stat .ps-label { color: #1652B8; font-weight: 600; }
.policy-stat .ps-icon { color: #1652B8; }
.policy-stat .ps-coin { width: 17px; height: 17px; border: 1px solid #1652B8; border-radius: 50%; color: #1652B8; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; }
.policy-stat .ps-max { color: #1652B8; font-weight: 700; font-size: 11px; background: #F2F4F7; border-radius: 3px; padding: 2px 5px; }
.ellipsis-2 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; max-width: 200px; }
.simple-filter { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #F2F4F7; flex-wrap: wrap; }
.match-form { max-width: 980px; margin: 0 auto; }
.poster-wrap { display: flex; flex-direction: column; align-items: center; gap: 16px; }
.poster {
  width: 360px; min-height: 500px; border-radius: 12px; padding: 26px 24px; color: #fff;
  background: linear-gradient(155deg, #1652B8 0%, #1652B8 55%, #1652B8 100%);
  position: relative; overflow: hidden;
}
.poster::after {
  content: ''; position: absolute; width: 260px; height: 260px; border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, .16); right: -110px; bottom: -70px;
  box-shadow: 0 0 0 40px rgba(255, 255, 255, .04);
}
.poster-brand { font-size: 11px; color: rgba(255, 255, 255, .7); letter-spacing: 2px; }
.poster-title { font-size: 22px; font-weight: 600; line-height: 1.5; margin: 26px 0 22px; }
.poster-meta { display: grid; gap: 10px; font-size: 12px; }
.poster-meta div { display: flex; justify-content: space-between; gap: 12px; }
.poster-meta span { color: rgba(255, 255, 255, .62); }
.poster-meta b { font-weight: 500; text-align: right; }
.poster-line { height: 1px; background: rgba(255, 255, 255, .22); margin: 20px 0; }
.poster-summary { font-size: 14px; }
.poster-foot { position: absolute; bottom: 24px; left: 24px; right: 24px; display: flex; gap: 12px; align-items: center; font-size: 11px; color: rgba(255, 255, 255, .78); line-height: 1.7; }
.poster-foot span { color: rgba(255, 255, 255, .5); font-size: 10px; }
.qr {
  width: 54px; height: 54px; border-radius: 4px; flex-shrink: 0;
  background: repeating-conic-gradient(#fff 0% 25%, #1652B8 0% 50%) 0 0 / 12px 12px;
  border: 3px solid #fff;
}
.poster-actions { display: flex; gap: 10px; }
.drawer-title { font-size: 17px; margin: 0 0 8px; line-height: 1.5; }
.drawer-meta { display: flex; gap: 14px; align-items: center; color: #657384; font-size: 12px; flex-wrap: wrap; }
</style>
