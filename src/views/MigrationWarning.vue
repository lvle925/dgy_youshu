<template>
  <div>
    <PageCard>
      <div class="mig-head">
        <div>
          <div class="detail-title"><AlertOutlined style="color: #d97706" /> 迁移预警</div>
          <div class="text-muted">基于经营、人才、招聘、投资等多维信号，识别企业迁出风险并提前干预</div>
        </div>
        <div class="flex gap8">
          <a-button @click="msg.success('预警报告已导出（演示）')"><DownloadOutlined /> 导出预警报告</a-button>
          <a-button type="primary" ghost @click="ruleOpen = true"><SettingOutlined /> 预警规则</a-button>
        </div>
      </div>
      <div class="mig-stats">
        <div class="mig-stat high">
          <div class="mig-icon"><WarningOutlined /></div>
          <div><div class="mig-value">{{ riskCounts.high }}</div><div class="mig-label">高风险企业</div></div>
          <span class="mig-tip">建议立即走访</span>
        </div>
        <div class="mig-stat mid">
          <div class="mig-icon"><AlertOutlined /></div>
          <div><div class="mig-value">{{ riskCounts.mid }}</div><div class="mig-label">中风险企业</div></div>
          <span class="mig-tip">建议重点跟进</span>
        </div>
        <div class="mig-stat low">
          <div class="mig-icon"><EyeOutlined /></div>
          <div><div class="mig-value">{{ riskCounts.low.toLocaleString() }}</div><div class="mig-label">低风险企业</div></div>
          <span class="mig-tip">保持动态监测</span>
        </div>
        <div class="mig-stat safe">
          <div class="mig-icon"><SafetyCertificateOutlined /></div>
          <div><div class="mig-value">{{ riskCounts.safe.toLocaleString() }}</div><div class="mig-label">安全企业</div></div>
          <span class="mig-tip">经营状态稳定</span>
        </div>
      </div>
    </PageCard>

    <PageCard>
      <div class="filter-row" style="margin-bottom: 12px">
        <a-input-search v-model:value="keyword" placeholder="搜索企业名称" style="width: 230px" />
        <a-select v-model:value="parkFilter" placeholder="所属园区" style="width: 210px" allow-clear>
          <a-select-option v-for="p in ['临港新片区', '临港奉贤', '张江科学城', '漕河泾开发区']" :key="p" :value="p">{{ p }}</a-select-option>
        </a-select>
        <a-select v-model:value="feedbackFilter" placeholder="反馈状态" style="width: 130px" allow-clear>
          <a-select-option v-for="f in ['未反馈', '跟进中', '已反馈']" :key="f" :value="f">{{ f }}</a-select-option>
        </a-select>
        <a-button type="primary">查询</a-button>
      </div>
      <div class="mig-seg">
        <span v-for="s in segments" :key="s.value" class="mig-seg-item" :class="{ active: riskFilter === s.value }" @click="riskFilter = s.value">
          {{ s.label }} <b>{{ s.count }}</b>
        </span>
      </div>
      <div class="mig-checks">
        <span class="text-muted" style="font-size: 12.5px">快速筛选：</span>
        <a-checkbox-group v-model:value="quickFilters" :options="quickOptions" />
      </div>
    </PageCard>

    <PageCard title="预警企业清单" :sub="`共 ${filtered.length} 家企业`">
      <a-table :columns="columns" :data-source="filtered" :pagination="{ pageSize: 8 }" row-key="id" size="middle">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <router-link :to="`/subsidy/company/${record.id}`" style="font-weight: 500">{{ record.name }}</router-link>
            <div v-if="record.tags.length" style="margin-top: 3px">
              <span v-for="t in record.tags" :key="t" class="tag-soft blue" style="margin-right: 4px">{{ t }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'risk'">
            <span class="tag-soft" :class="record.risk === '高风险' ? 'red' : record.risk === '中风险' ? 'orange' : 'blue'">{{ record.risk }}</span>
          </template>
          <template v-else-if="column.key === 'score'">
            <div class="score-cell">
              <span class="score-num" :style="{ color: record.score >= 90 ? '#d92d20' : record.score >= 70 ? '#d97706' : '#4a62e7' }">{{ record.score }}</span>
              <a-progress :percent="record.score" :show-info="false" size="small" :stroke-color="record.score >= 90 ? '#f97066' : record.score >= 70 ? '#f5a623' : '#4a62e7'" />
            </div>
          </template>
          <template v-else-if="column.key === 'trend'">
            <span :class="record.trend === '上升' ? 'trend-up' : record.trend === '下降' ? 'trend-down' : 'trend-flat'">
              {{ record.trend === '上升' ? '↑' : record.trend === '下降' ? '↓' : '—' }} {{ record.trend }}
            </span>
          </template>
          <template v-else-if="column.key === 'feedback'">
            <span class="tag-soft" :class="record.feedback === '已反馈' ? 'green' : record.feedback === '跟进中' ? 'blue' : 'gray'">{{ record.feedback }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a @click="openDetail(record)">详情</a>
            <a-divider type="vertical" />
            <a @click="openFollow(record)">跟进</a>
          </template>
        </template>
      </a-table>
    </PageCard>

    <a-drawer v-model:open="detailOpen" :title="current?.name" width="720px">
      <template v-if="current">
        <div class="risk-hero">
          <div class="risk-ring" :style="{ borderColor: current.score >= 90 ? '#d92d20' : current.score >= 70 ? '#f5a623' : '#4a62e7', color: current.score >= 90 ? '#d92d20' : current.score >= 70 ? '#d97706' : '#4a62e7' }">
            <b>{{ current.score }}</b><span>风险分</span>
          </div>
          <div class="risk-hero-info">
            <div class="flex gap8" style="align-items: center">
              <span class="tag-soft" :class="current.risk === '高风险' ? 'red' : 'orange'">{{ current.risk }}</span>
              <span class="tag-soft gray">{{ current.drive }}</span>
              <span class="tag-soft gray">{{ current.park }}</span>
            </div>
            <div class="risk-hero-sub">迁出意向城市：<b>{{ current.intent === '-' ? '暂无明确意向' : current.intent }}</b> · 反馈状态：{{ current.feedback }}</div>
            <div v-for="t in current.tags" :key="t" class="tag-soft blue" style="margin-right: 4px">{{ t }}</div>
          </div>
        </div>
        <div class="grid2" style="margin-top: 16px">
          <div class="signal-card push">
            <div class="signal-title"><PushpinOutlined /> 推力信号（迁出驱动）</div>
            <div class="signal-tags">
              <span v-for="s in current.push.split(' + ')" :key="s" class="tag-soft red">{{ s }}</span>
            </div>
            <div class="signal-desc">近 90 天出现经营波动、人才流失等负向信号，建议关注企业实际经营场地与用工变化。</div>
          </div>
          <div class="signal-card pull">
            <div class="signal-title"><AimOutlined /> 拉力信号（迁入吸引）</div>
            <div class="signal-tags">
              <span v-for="s in current.pull.split(' + ')" :key="s" class="tag-soft blue">{{ s }}</span>
            </div>
            <div class="signal-desc">目标城市在成本、土地、市场等方面形成吸引，需针对性提供留企方案。</div>
          </div>
        </div>
        <a-divider />
        <div style="font-weight: 600; margin-bottom: 12px">风险信号明细</div>
        <a-table :columns="signalColumns" :data-source="signals" :pagination="false" size="small">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'level'">
              <span class="tag-soft" :class="record.level === '高' ? 'red' : 'orange'">{{ record.level }}</span>
            </template>
          </template>
        </a-table>
        <div class="drawer-actions">
          <a-button @click="msg.success('已创建走访工单（演示）')">发起走访</a-button>
          <a-button type="primary" @click="openFollow(current)">提交跟进反馈</a-button>
        </div>
      </template>
    </a-drawer>

    <a-modal v-model:open="followOpen" title="企业跟进反馈" width="540px" @ok="saveFollow">
      <template v-if="current">
        <div class="follow-company">{{ current.name }}</div>
        <a-form layout="vertical" style="margin-top: 14px">
          <a-form-item label="反馈状态">
            <a-radio-group v-model:value="followForm.status">
              <a-radio value="已反馈">已反馈</a-radio>
              <a-radio value="跟进中">跟进中</a-radio>
              <a-radio value="未反馈">未反馈</a-radio>
            </a-radio-group>
          </a-form-item>
          <a-form-item label="企业迁出意向">
            <a-select v-model:value="followForm.intent">
              <a-select-option value="无迁出意向">无迁出意向</a-select-option>
              <a-select-option value="有迁出意向">有迁出意向</a-select-option>
              <a-select-option value="观望中">观望中</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="意向城市"><a-input v-model:value="followForm.city" placeholder="如：苏州、杭州；无则留空" /></a-form-item>
          <a-form-item label="跟进记录"><a-textarea v-model:value="followForm.note" :rows="4" placeholder="记录企业诉求、沟通结果及下一步计划" /></a-form-item>
        </a-form>
      </template>
    </a-modal>

    <a-modal v-model:open="ruleOpen" title="预警规则配置" width="560px" :footer="null">
      <a-form layout="vertical">
        <div v-for="r in rules" :key="r.name" class="rule-row">
          <div><b>{{ r.name }}</b><div class="text-muted">{{ r.desc }}</div></div>
          <a-switch v-model:checked="r.on" size="small" />
        </div>
        <a-button type="primary" block style="margin-top: 16px" @click="ruleOpen = false; msg.success('预警规则已保存')">保存规则</a-button>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { message } from 'ant-design-vue';
import {
  AlertOutlined, WarningOutlined, EyeOutlined, SafetyCertificateOutlined, DownloadOutlined,
  SettingOutlined, PushpinOutlined, AimOutlined,
} from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import { migrationStats, migrationEnterprises } from '../data/mock';

const msg = message;
const riskCounts = migrationStats;
const rows = ref(migrationEnterprises.map((e) => ({ ...e })));
const keyword = ref('');
const parkFilter = ref();
const feedbackFilter = ref();
const riskFilter = ref('all');
const quickFilters = ref(['企业迁出']);
const quickOptions = ['企业迁出', '有迁出意向', '无迁出意向', '未反馈'];
const segments = computed(() => [
  { label: '全部企业', value: 'all', count: '3,105家' },
  { label: '高风险', value: '高风险', count: riskCounts.high },
  { label: '中风险', value: '中风险', count: riskCounts.mid },
  { label: '低风险', value: '低风险', count: riskCounts.low },
  { label: '安全', value: '安全', count: riskCounts.safe },
]);
const filtered = computed(() => rows.value.filter((e) => {
  if (riskFilter.value !== 'all' && e.risk !== riskFilter.value) return false;
  if (keyword.value && !e.name.includes(keyword.value)) return false;
  if (parkFilter.value && e.park !== parkFilter.value) return false;
  if (feedbackFilter.value && e.feedback !== feedbackFilter.value) return false;
  return true;
}));
const columns = [
  { title: '企业名称', key: 'name', width: 290 },
  { title: '风险等级', key: 'risk', width: 95 },
  { title: '风险评分', key: 'score', width: 150 },
  { title: '趋势', key: 'trend', width: 90 },
  { title: '主导因素', dataIndex: 'drive', width: 100 },
  { title: '推力信号', dataIndex: 'push', width: 150 },
  { title: '拉力信号', dataIndex: 'pull', width: 160 },
  { title: '所属园区', dataIndex: 'park', width: 110 },
  { title: '意向城市', dataIndex: 'intent', width: 90 },
  { title: '企业反馈', key: 'feedback', width: 95 },
  { title: '操作', key: 'action', width: 110 },
];
const detailOpen = ref(false);
const current = ref(null);
const signals = [
  { name: '招聘岗位数量', value: '-42%', period: '近 3 个月', level: '高', desc: '招聘网站岗位发布数持续下降' },
  { name: '社保缴纳人数', value: '-18%', period: '近 6 个月', level: '高', desc: '参保人数连续两季度减少' },
  { name: '办公场地租约', value: '8 个月', period: '剩余租期', level: '中', desc: '租约将于 2027 年 6 月到期' },
  { name: '对外投资新增', value: '2 笔', period: '近 12 个月', level: '中', desc: '在苏州、杭州新设子公司' },
  { name: '经营异常记录', value: '0 条', period: '近 3 年', level: '低', desc: '未发现经营异常' },
];
const signalColumns = [
  { title: '信号类型', dataIndex: 'name', width: 130 },
  { title: '当前值', dataIndex: 'value', width: 100 },
  { title: '统计周期', dataIndex: 'period', width: 110 },
  { title: '风险等级', key: 'level', width: 90 },
  { title: '说明', dataIndex: 'desc' },
];
function openDetail(row) {
  current.value = row;
  detailOpen.value = true;
}
const followOpen = ref(false);
const followForm = reactive({ status: '跟进中', intent: '观望中', city: '', note: '' });
function openFollow(row) {
  current.value = row;
  Object.assign(followForm, { status: row.feedback === '未反馈' ? '跟进中' : row.feedback, intent: row.intent === '-' ? '观望中' : '有迁出意向', city: row.intent === '-' ? '' : row.intent, note: '' });
  followOpen.value = true;
}
function saveFollow() {
  current.value.feedback = followForm.status;
  if (followForm.city) current.value.intent = followForm.city;
  msg.success('跟进反馈已提交');
  followOpen.value = false;
}
const ruleOpen = ref(false);
const rules = reactive([
  { name: '招聘岗位骤降', desc: '近 3 个月招聘岗位数下降超过 30%', on: true },
  { name: '社保人数下降', desc: '连续两个季度社保缴纳人数下降超过 15%', on: true },
  { name: '租约临期', desc: '办公场地租约剩余不足 12 个月', on: true },
  { name: '对外投资', desc: '近 12 个月在省外新设子公司或分支机构', on: true },
  { name: '经营异常', desc: '被列入经营异常名录或出现司法风险', on: true },
  { name: '股权变更', desc: '发生大股东变更或控制权转移', on: false },
]);
</script>

<style scoped>
.mig-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 18px; flex-wrap: wrap; }
.detail-title { font-size: 19px; font-weight: 600; display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.mig-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.mig-stat { display: flex; align-items: center; gap: 12px; border-radius: 10px; padding: 18px 18px; position: relative; }
.mig-stat.high { background: #fef3f2; }
.mig-stat.mid { background: #fff7e8; }
.mig-stat.low { background: #eef4ff; }
.mig-stat.safe { background: #f2fbf5; }
.mig-icon { width: 40px; height: 40px; border-radius: 10px; background: #fff; display: grid; place-items: center; font-size: 19px; }
.mig-stat.high .mig-icon { color: #d92d20; }
.mig-stat.mid .mig-icon { color: #d97706; }
.mig-stat.low .mig-icon { color: #4a62e7; }
.mig-stat.safe .mig-icon { color: #2fa45f; }
.mig-value { font-size: 26px; font-weight: 700; color: #1f2a44; line-height: 1.2; }
.mig-label { font-size: 12.5px; color: #667085; }
.mig-tip { position: absolute; right: 14px; top: 14px; font-size: 10.5px; color: #98a2b3; }
.mig-seg { display: flex; gap: 6px; border-bottom: 1px solid #f0f2f8; flex-wrap: wrap; }
.mig-seg-item { padding: 9px 14px; font-size: 13px; color: #667085; cursor: pointer; border-bottom: 2px solid transparent; }
.mig-seg-item b { color: #4a62e7; margin-left: 4px; font-weight: 600; }
.mig-seg-item.active { color: #4a62e7; font-weight: 600; border-bottom-color: #4a62e7; }
.mig-checks { display: flex; align-items: center; gap: 18px; padding-top: 12px; }
.score-cell { display: flex; flex-direction: column; gap: 2px; max-width: 130px; }
.score-num { font-weight: 700; font-size: 14px; }
.score-cell :deep(.ant-progress) { margin: 0; }
.trend-up { color: #d92d20; }
.trend-down { color: #2fa45f; }
.trend-flat { color: #98a2b3; }
.risk-hero { display: flex; gap: 18px; align-items: center; background: #f8faff; border-radius: 12px; padding: 18px; }
.risk-ring { width: 86px; height: 86px; border-radius: 50%; border: 5px solid; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #fff; flex: none; }
.risk-ring b { font-size: 26px; line-height: 1.1; }
.risk-ring span { font-size: 10.5px; color: #98a2b3; }
.risk-hero-info { display: flex; flex-direction: column; gap: 7px; font-size: 12.5px; }
.risk-hero-sub { color: #667085; }
.signal-card { border-radius: 10px; padding: 16px; border: 1px solid #f0f2f8; }
.signal-title { font-weight: 600; font-size: 13.5px; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
.signal-card.push .signal-title { color: #d92d20; }
.signal-card.pull .signal-title { color: #4a62e7; }
.signal-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.signal-desc { font-size: 12px; color: #8b93a7; line-height: 1.7; }
.drawer-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
.follow-company { font-weight: 600; font-size: 15px; }
.rule-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 12px 0; border-bottom: 1px solid #f2f4f7; font-size: 13px; }
@media (max-width: 1300px) { .mig-stats { grid-template-columns: repeat(2, 1fr); } }
</style>
