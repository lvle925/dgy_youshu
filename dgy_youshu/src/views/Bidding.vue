<template>
  <div>
    <div class="bid-banner">
      <div class="bid-banner-head">
        <div>
          <div class="bid-title"><FundProjectionScreenOutlined /> 招投标查询</div>
          <div class="bid-sub">覆盖全国 2,800+ 招标平台，实时更新招标公告与中标信息，助力招商线索挖掘</div>
        </div>
        <div class="bid-banner-stats">
          <div><b>86,240</b><span>招标公告</span></div>
          <div><b>63,185</b><span>中标公告</span></div>
          <div><b>128,600</b><span>标讯企业</span></div>
        </div>
      </div>
      <div class="bid-search">
        <a-input v-model:value="keyword" size="large" placeholder="输入关键词搜索标讯，如：智慧园区、临港、数据平台" allow-clear @press-enter="msg.success('搜索完成（演示）')">
          <template #prefix><SearchOutlined style="color: #657384" /></template>
          <template #suffix><a-button type="primary" @click="msg.success('搜索完成（演示）')">搜索</a-button></template>
        </a-input>
        <a-button size="large" class="ai-dim" @click="aiOpen = true"><ThunderboltOutlined /> AI 拓词</a-button>
        <a-button size="large" class="advanced-btn" @click="advancedOpen = true"><FilterOutlined /> 高级筛选</a-button>
      </div>
      <div class="bid-tabs">
        <span v-for="t in tabs" :key="t" class="bid-tab" :class="{ active: activeTab === t }" @click="activeTab = t">{{ t }}</span>
        <span class="bid-source">数据来源：全国公共资源交易平台 · 更新于 2026-11-17 11:20</span>
      </div>
    </div>

    <div class="bid-layout">
      <div class="bid-main">
        <PageCard v-if="activeTab !== '标讯企业'" title="最新标讯" :sub="`找到 ${filteredBids.length} 条相关标讯`">
          <template #extra>
            <a-select v-model:value="sortBy" size="small" style="width: 120px">
              <a-select-option value="time">发布时间</a-select-option>
              <a-select-option value="budget">预算金额</a-select-option>
            </a-select>
          </template>
          <div class="bid-chips">
            <span v-for="c in quickChips" :key="c.value" class="bid-chip" :class="{ active: regionFilter === c.value }" @click="regionFilter = c.value">{{ c.label }}</span>
          </div>
          <div v-for="b in filteredBids" :key="b.id" class="bid-item">
            <div class="bid-item-main">
              <a @click="openBid(b)" class="bid-item-title">{{ b.title }}</a>
              <div class="bid-meta">
                <span><BankOutlined /> {{ b.buyer }}</span>
                <span><EnvironmentOutlined /> {{ b.region }}</span>
                <span><CalendarOutlined /> {{ b.date }}</span>
                <span v-if="b.deadline">截止 {{ b.deadline }}</span>
              </div>
              <div class="bid-tags">
                <span class="tag-soft blue">{{ b.type }}</span>
                <span class="tag-soft" :class="b.status === '报名中' ? 'green' : b.status === '即将截止' ? 'orange' : 'gray'">{{ b.status }}</span>
                <span v-if="b.winner" class="tag-soft teal">中标：{{ b.winner }}</span>
              </div>
            </div>
            <div class="bid-item-side">
              <div class="bid-budget">{{ b.budget }}</div>
              <div class="bid-budget-label">预算金额</div>
              <a-button size="small" type="primary" ghost @click="openBid(b)">查看详情</a-button>
            </div>
          </div>
          <EmptyBox v-if="!filteredBids.length" />
        </PageCard>

        <PageCard v-else title="标讯企业" :sub="`共 ${biddingCompanies.length + 3} 家活跃企业`">
          <div class="company-bid-grid">
            <div v-for="(c, i) in allBidCompanies" :key="c.name" class="company-bid-card">
              <div class="flex" style="justify-content: space-between; align-items: flex-start">
                <span class="company-bid-logo">{{ c.name.slice(0, 1) }}</span>
                <span class="tag-soft blue">{{ c.industry }}</span>
              </div>
              <div class="company-bid-name">{{ c.name }}</div>
              <div class="company-bid-meta"><b>{{ c.count }}</b> 条标讯记录 · 近一年中标 {{ Math.max(2, Math.floor(c.count / 8)) }} 次</div>
              <a-button size="small" block @click="msg.info(`${c.name} 标讯档案（演示）`)">查看企业档案</a-button>
            </div>
          </div>
        </PageCard>
      </div>

      <div class="bid-side">
        <PageCard title="线索推荐" sub="基于企业画像智能匹配">
          <div v-for="r in biddingRecommend" :key="r.id" class="rec-item">
            <div class="flex" style="justify-content: space-between; align-items: flex-start">
              <a class="rec-title" @click="openRecommend(r)">{{ r.title }}</a>
              <span class="match-badge">{{ r.match }}分</span>
            </div>
            <div class="text-muted" style="font-size: 12px; margin: 4px 0 8px">{{ r.buyer }}</div>
            <div class="flex" style="justify-content: space-between; align-items: center">
              <span class="rec-budget">{{ r.budget }}</span>
              <a-button size="small" type="link" style="padding: 0" @click="subscribeOpen = true; currentRecommend = r">订阅</a-button>
            </div>
          </div>
        </PageCard>
        <PageCard title="最新中标公司">
          <div v-for="(c, i) in biddingCompanies" :key="c.name" class="winner-item">
            <span class="winner-rank" :class="{ top: i < 3 }">{{ i + 1 }}</span>
            <div class="winner-info">
              <b>{{ c.name }}</b>
              <span class="text-muted">{{ c.industry }} · 中标 {{ c.count }} 次</span>
            </div>
          </div>
        </PageCard>
      </div>
    </div>

    <a-drawer v-model:open="bidOpen" :title="bidDetail?.title" width="640px">
      <template v-if="bidDetail">
        <div class="flex gap8 mb16">
          <span class="tag-soft blue">{{ bidDetail.type }}</span>
          <span class="tag-soft" :class="bidDetail.status === '报名中' ? 'green' : 'orange'">{{ bidDetail.status }}</span>
        </div>
        <a-descriptions :column="2" bordered size="small">
          <a-descriptions-item label="项目编号">{{ bidDetail.id }}-2026</a-descriptions-item>
          <a-descriptions-item label="预算金额">{{ bidDetail.budget }}</a-descriptions-item>
          <a-descriptions-item label="采购单位" :span="2">{{ bidDetail.buyer }}</a-descriptions-item>
          <a-descriptions-item label="项目区域">{{ bidDetail.region }}</a-descriptions-item>
          <a-descriptions-item label="发布时间">{{ bidDetail.date }}</a-descriptions-item>
          <a-descriptions-item v-if="bidDetail.deadline" label="报名截止">{{ bidDetail.deadline }}</a-descriptions-item>
          <a-descriptions-item v-if="bidDetail.winner" label="中标单位">{{ bidDetail.winner }}</a-descriptions-item>
        </a-descriptions>
        <a-divider />
        <div style="font-weight: 600; margin-bottom: 10px">项目概况</div>
        <p class="bid-desc">本项目围绕园区数字化运营与产业服务能力提升，建设包括智慧运营管理、企业服务、数据分析在内的综合平台，要求投标人具备相关行业经验与本地化服务能力。</p>
        <div style="font-weight: 600; margin: 16px 0 10px">投标人资格要求</div>
        <ul class="bid-list">
          <li>具有独立法人资格，注册资金不低于 500 万元</li>
          <li>近三年内具有至少 2 个同类项目业绩</li>
          <li>未被列入失信被执行人名单</li>
          <li>本项目不接受联合体投标</li>
        </ul>
        <div class="drawer-actions">
          <a-button @click="msg.success('已加入线索池（演示）')">加入线索池</a-button>
          <a-button type="primary" @click="subscribeOpen = true; currentRecommend = { title: bidDetail.title }">订阅提醒</a-button>
        </div>
      </template>
    </a-drawer>

    <a-drawer v-model:open="advancedOpen" title="高级筛选" width="420px">
      <a-form layout="vertical">
        <a-form-item label="公告类型">
          <a-checkbox-group v-model:value="advanced.type" :options="['招标公告', '中标公告', '招标预告', '变更公告']" />
        </a-form-item>
        <a-form-item label="预算金额">
          <a-slider v-model:value="advanced.budget" range :min="0" :max="20000" :step="100" />
          <div class="text-muted" style="font-size: 12px">{{ advanced.budget[0] }} 万元 — {{ advanced.budget[1] }} 万元</div>
        </a-form-item>
        <a-form-item label="发布时间">
          <a-select v-model:value="advanced.period" :options="['近 3 天', '近 7 天', '近 30 天', '近 90 天'].map((v) => ({ value: v, label: v }))" />
        </a-form-item>
        <a-form-item label="项目区域">
          <a-select v-model:value="advanced.region" :options="districts.map((d) => ({ value: d, label: d }))" allow-clear placeholder="请选择区域" />
        </a-form-item>
        <a-form-item label="行业领域">
          <a-checkbox-group v-model:value="advanced.industry" :options="['智慧城市', '信息化建设', '园区运营', '生物医药', '新能源']" />
        </a-form-item>
        <div class="drawer-actions">
          <a-button @click="resetAdvanced">重置</a-button>
          <a-button type="primary" @click="advancedOpen = false; msg.success('筛选已应用（演示）')">应用筛选</a-button>
        </div>
      </a-form>
    </a-drawer>

    <a-modal v-model:open="aiOpen" title="AI 拓词" width="520px" :footer="null">
      <div class="text-muted" style="margin-bottom: 12px">输入业务描述，AI 将为您扩展搜索关键词</div>
      <a-textarea v-model:value="aiInput" :rows="3" placeholder="例如：我们做智慧园区综合管理平台，希望寻找上海区域的招标项目" />
      <a-button type="primary" block style="margin: 12px 0" @click="generateWords"><ThunderboltOutlined /> 智能生成关键词</a-button>
      <div v-if="aiWords.length" class="ai-words">
        <span v-for="w in aiWords" :key="w" class="ai-word" @click="keyword = w; aiOpen = false">{{ w }}</span>
      </div>
    </a-modal>

    <a-modal v-model:open="subscribeOpen" title="订阅标讯提醒" width="480px" @ok="msg.success('订阅成功，相关标讯发布后将短信通知（演示）'); subscribeOpen = false">
      <div class="sub-title">{{ currentRecommend?.title }}</div>
      <a-form layout="vertical" style="margin-top: 14px">
        <a-form-item label="提醒方式">
          <a-checkbox-group v-model:value="subscribeWays" :options="['站内信', '短信', '邮件']" />
        </a-form-item>
        <a-form-item label="提醒频率">
          <a-radio-group v-model:value="subscribeFreq"><a-radio value="realtime">实时提醒</a-radio><a-radio value="daily">每日汇总</a-radio></a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { message } from 'ant-design-vue';
import {
  FundProjectionScreenOutlined, SearchOutlined, ThunderboltOutlined, FilterOutlined,
  BankOutlined, EnvironmentOutlined, CalendarOutlined,
} from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import EmptyBox from '../components/EmptyBox.vue';
import { biddingRows, biddingRecommend, biddingCompanies, districts } from '../data/mock';

const msg = message;
const keyword = ref('');
const activeTab = ref('全部标讯');
const tabs = ['全部标讯', '招标公告', '中标公告', '标讯企业'];
const sortBy = ref('time');
const regionFilter = ref('all');
const quickChips = [
  { label: '全部区域', value: 'all' },
  { label: '浦东新区', value: '上海市浦东新区' },
  { label: '徐汇区', value: '上海市徐汇区' },
  { label: '奉贤区', value: '上海市奉贤区' },
  { label: '松江区', value: '上海市松江区' },
  { label: '杨浦区', value: '上海市杨浦区' },
  { label: '闵行区', value: '上海市闵行区' },
];
const filteredBids = computed(() => {
  let list = biddingRows.filter((b) => {
    if (activeTab.value === '招标公告' && b.type !== '招标公告') return false;
    if (activeTab.value === '中标公告' && b.type !== '中标公告') return false;
    if (regionFilter.value !== 'all' && b.region !== regionFilter.value) return false;
    if (keyword.value && !b.title.includes(keyword.value) && !b.buyer.includes(keyword.value)) return false;
    return true;
  });
  if (sortBy.value === 'time') list = [...list].sort((a, b) => b.date.localeCompare(a.date));
  return list;
});
const allBidCompanies = computed(() => [...biddingCompanies, { name: '上海隧道工程有限公司', count: 58, industry: '建筑工程' }, { name: '上海仪电物联技术股份有限公司', count: 46, industry: '电子信息' }, { name: '上海同济工程项目管理咨询有限公司', count: 39, industry: '工程咨询' }]);
const bidOpen = ref(false);
const bidDetail = ref(null);
function openBid(b) {
  bidDetail.value = b;
  bidOpen.value = true;
}
const advancedOpen = ref(false);
const advanced = reactive({ type: ['招标公告', '中标公告'], budget: [0, 10000], period: '近 30 天', region: undefined, industry: ['智慧城市', '信息化建设'] });
function resetAdvanced() {
  Object.assign(advanced, { type: ['招标公告', '中标公告'], budget: [0, 10000], period: '近 30 天', region: undefined, industry: [] });
}
const aiOpen = ref(false);
const aiInput = ref('');
const aiWords = ref([]);
function generateWords() {
  aiWords.value = ['智慧园区综合管理平台', '园区数字化运营', '产业服务平台建设', '临港 信息化项目', '智慧运营 中标'];
  msg.success('已生成 5 个推荐关键词');
}
const subscribeOpen = ref(false);
const currentRecommend = ref(null);
const subscribeWays = ref(['站内信', '短信']);
const subscribeFreq = ref('realtime');
function openRecommend(r) {
  msg.info(`线索：${r.title}（来源：智能匹配 ${r.match} 分）`);
}
</script>

<style scoped>
.bid-banner { background: linear-gradient(120deg, #303b49 0%, #1652B8 52%, #1652B8 100%); border-radius: 12px; padding: 22px 26px 0; color: #fff; position: relative; overflow: hidden; }
.bid-banner::after { content: ''; position: absolute; right: -60px; top: -80px; width: 320px; height: 320px; border-radius: 50%; background: rgba(255, 255, 255, 0.06); }
.bid-banner::before { content: ''; position: absolute; right: 120px; bottom: -120px; width: 240px; height: 240px; border-radius: 50%; background: rgba(255, 255, 255, 0.05); }
.bid-banner-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; flex-wrap: wrap; }
.bid-title { font-size: 22px; font-weight: 700; display: flex; align-items: center; gap: 10px; }
.bid-sub { font-size: 12.5px; opacity: 0.75; margin-top: 6px; }
.bid-banner-stats { display: flex; gap: 34px; padding-top: 4px; }
.bid-banner-stats div { display: flex; flex-direction: column; gap: 3px; }
.bid-banner-stats b { font-size: 19px; font-weight: 700; }
.bid-banner-stats span { font-size: 11.5px; opacity: 0.7; }
.bid-search { display: flex; gap: 10px; margin: 20px 0 16px; position: relative; z-index: 1; flex-wrap: wrap; }
.bid-search :deep(.ant-input-affix-wrapper) { flex: 1; min-width: 280px; border-radius: 8px; }
.bid-search :deep(.ant-input-suffix) { margin-left: 8px; }
.ai-dim { background: rgba(255, 255, 255, 0.14); color: #fff; border-color: rgba(255, 255, 255, 0.3); }
.ai-dim:hover { background: rgba(255, 255, 255, 0.24); color: #fff; border-color: rgba(255, 255, 255, 0.5); }
.advanced-btn { background: transparent; color: #fff; border-color: rgba(255, 255, 255, 0.35); }
.advanced-btn:hover { background: rgba(255, 255, 255, 0.12); color: #fff; border-color: rgba(255, 255, 255, 0.5); }
.bid-tabs { display: flex; align-items: center; gap: 26px; border-top: 1px solid rgba(255, 255, 255, 0.12); padding: 2px 0 0; position: relative; z-index: 1; flex-wrap: wrap; }
.bid-tab { padding: 12px 2px; font-size: 13.5px; opacity: 0.72; cursor: pointer; border-bottom: 2px solid transparent; }
.bid-tab.active { opacity: 1; font-weight: 600; border-bottom-color: #fff; }
.bid-source { margin-left: auto; font-size: 11px; opacity: 0.6; }
.bid-layout { display: grid; grid-template-columns: 1fr 330px; gap: 14px; }
.bid-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.bid-chip { font-size: 12px; padding: 4px 12px; border-radius: 14px; background: #F2F4F7; color: #657384; cursor: pointer; border: 1px solid transparent; }
.bid-chip.active { background: #F2F4F7; color: #1652B8; border-color: #F2F4F7; font-weight: 600; }
.bid-item { display: flex; justify-content: space-between; gap: 16px; padding: 16px 4px; border-bottom: 1px solid #F2F4F7; }
.bid-item:last-child { border-bottom: none; }
.bid-item-main { flex: 1; min-width: 0; }
.bid-item-title { font-size: 14px; font-weight: 600; color: #303b49; display: block; margin-bottom: 8px; }
.bid-item-title:hover { color: #1652B8; }
.bid-meta { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 12px; color: #657384; margin-bottom: 9px; }
.bid-meta span { display: inline-flex; align-items: center; gap: 4px; }
.bid-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.bid-item-side { text-align: right; flex: none; }
.bid-budget { font-size: 16px; font-weight: 700; color: #1652B8; }
.bid-budget-label { font-size: 11px; color: #657384; margin: 2px 0 10px; }
.bid-side { display: flex; flex-direction: column; gap: 14px; }
.rec-item { padding: 13px 0; border-bottom: 1px solid #F2F4F7; }
.rec-item:last-child { border-bottom: none; padding-bottom: 4px; }
.rec-title { font-size: 13px; font-weight: 500; color: #303b49; line-height: 1.5; }
.rec-title:hover { color: #1652B8; }
.match-badge { flex: none; font-size: 11px; color: #1652B8; background: #F2F4F7; padding: 2px 7px; border-radius: 10px; }
.rec-budget { font-size: 13px; font-weight: 600; color: #1652B8; }
.winner-item { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #F2F4F7; }
.winner-item:last-child { border-bottom: none; }
.winner-rank { width: 20px; height: 20px; border-radius: 6px; background: #F2F4F7; color: #657384; display: grid; place-items: center; font-size: 11px; font-weight: 600; flex: none; }
.winner-rank.top { background: #F2F4F7; color: #1652B8; }
.winner-info { display: flex; flex-direction: column; gap: 2px; font-size: 12.5px; min-width: 0; }
.winner-info b { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.company-bid-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
.company-bid-card { border: 1px solid #F2F4F7; border-radius: 10px; padding: 16px; }
.company-bid-logo { width: 38px; height: 38px; border-radius: 10px; background: #F2F4F7; color: #1652B8; display: grid; place-items: center; font-size: 16px; font-weight: 700; }
.company-bid-name { font-weight: 600; margin: 10px 0 4px; font-size: 13.5px; }
.company-bid-meta { font-size: 12px; color: #657384; margin-bottom: 12px; }
.company-bid-meta b { color: #1652B8; }
.drawer-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
.bid-desc { font-size: 13px; color: #657384; line-height: 1.9; }
.bid-list { padding-left: 18px; font-size: 13px; color: #657384; line-height: 2; }
.ai-words { display: flex; flex-wrap: wrap; gap: 8px; }
.ai-word { font-size: 12.5px; background: #F2F4F7; color: #1652B8; border-radius: 14px; padding: 5px 13px; cursor: pointer; }
.ai-word:hover { background: #F2F4F7; }
.sub-title { font-weight: 600; font-size: 14px; }
@media (max-width: 1300px) { .bid-layout { grid-template-columns: 1fr; } .company-bid-grid { grid-template-columns: 1fr; } }
</style>
