<template>
  <div class="investment-page">
    <div class="page-head investment-head">
      <div>
        <h2>投融引育</h2>
        <p>以投融资数据连接属地企业培育与增量项目招引，提升线索发现和跟进效率</p>
      </div>
      <span class="tag-soft blue">演示数据</span>
    </div>

    <div class="stat-row grid4">
      <StatCard title="属地融资事件" :value="localFinancingRows.length" unit="起" tone="info" foot="覆盖区内重点产业企业" />
      <StatCard title="披露融资总额" :value="totalLocalAmount" unit="亿元" tone="success" foot="按公开披露金额汇总" />
      <StatCard title="高成长企业" :value="growthEnterpriseRows.length" unit="家" tone="purple" foot="自动匹配可申报政策" />
      <StatCard title="待处理风险" :value="pendingRiskCount" unit="项" tone="danger" foot="建议优先联系高等级风险企业" />
    </div>

    <PageCard flush>
      <div class="underline-tabs investment-tabs" role="tablist" aria-label="投融引育业务板块">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          role="tab"
          class="utab investment-tab"
          :class="{ active: activeTab === tab.key }"
          :aria-selected="activeTab === tab.key"
          @click="activeTab = tab.key"
        >{{ tab.label }}</button>
      </div>
    </PageCard>

    <template v-if="activeTab === 'overview'">
      <div class="overview-grid">
        <PageCard title="属地投融资趋势" sub="近 6 个月事件数量与披露金额">
          <ChartBox :option="trendChartOption" :height="286" />
        </PageCard>
        <PageCard title="资本关注赛道" sub="全国披露融资金额，单位：亿元">
          <ChartBox :option="overviewTrackOption" :height="286" />
        </PageCard>
      </div>
      <div class="overview-grid">
        <PageCard title="高成长企业优先跟进" sub="结合融资信号与扩产机会生成">
          <template #extra><a-button type="link" size="small" @click="activeTab = 'growth'">查看全部</a-button></template>
          <div class="work-list">
            <div v-for="row in growthEnterpriseRows.slice(0, 3)" :key="row.id" class="work-row">
              <div class="work-main">
                <a-button type="link" class="work-name" @click="openDetail(row, 'growth')">{{ row.company }}</a-button>
                <div class="work-desc">{{ row.signal }} · {{ row.opportunity }}</div>
                <div class="tag-list"><span v-for="policy in row.policies" :key="policy" class="tag-soft blue">{{ policy }}</span></div>
              </div>
              <a-button size="small" :disabled="row.status === '已服务'" @click="openFollow(row, 'growth')">{{ row.status === '待跟进' ? '分配跟进' : row.status }}</a-button>
            </div>
          </div>
        </PageCard>
        <PageCard title="企业异动风险提醒" sub="关注控制权、并购及注册地变化">
          <template #extra><a-button type="link" size="small" @click="activeTab = 'risk'">查看全部</a-button></template>
          <div class="work-list">
            <div v-for="row in riskWarningRows.slice(0, 3)" :key="row.id" class="work-row">
              <div class="work-main">
                <a-button type="link" class="work-name" @click="openDetail(row, 'risk')">{{ row.company }}</a-button>
                <div class="work-desc">{{ row.riskType }} · {{ row.town }} · {{ row.date }}</div>
                <span class="tag-soft" :class="row.level === '高' ? 'red' : 'orange'">{{ row.level }}风险</span>
              </div>
              <a-button size="small" @click="openFollow(row, 'risk')">{{ row.status === '待跟进' ? '立即跟进' : row.status }}</a-button>
            </div>
          </div>
        </PageCard>
      </div>
    </template>

    <template v-else-if="activeTab === 'ledger'">
      <PageCard>
        <div class="filter-row">
          <a-input v-model:value="ledgerKeyword" placeholder="搜索企业、投资方或资金用途" style="width: 240px" allow-clear />
          <a-select v-model:value="ledgerFilters.town" placeholder="所属街镇" style="width: 130px" allow-clear>
            <a-select-option v-for="town in towns" :key="town" :value="town">{{ town }}</a-select-option>
          </a-select>
          <a-select v-model:value="ledgerFilters.industry" placeholder="产业赛道" style="width: 130px" allow-clear>
            <a-select-option v-for="industry in localIndustries" :key="industry" :value="industry">{{ industry }}</a-select-option>
          </a-select>
          <a-select v-model:value="ledgerFilters.round" placeholder="融资轮次" style="width: 130px" allow-clear>
            <a-select-option v-for="round in localRounds" :key="round" :value="round">{{ round }}</a-select-option>
          </a-select>
          <a-button @click="resetLedger">重置</a-button>
          <div class="filter-actions"><a-button type="primary" @click="exportLedger"><DownloadOutlined /> 导出台账</a-button></div>
        </div>
      </PageCard>
      <PageCard title="属地投融资台账" :sub="`共 ${filteredLedger.length} 起事件，金额单位按披露口径展示`">
        <a-table :columns="ledgerColumns" :data-source="filteredLedger" :pagination="{ pageSize: 8 }" :row-key="(row) => row.id" size="middle" :scroll="{ x: 1260 }">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'company'"><a-button type="link" class="table-link" @click="openDetail(record, 'ledger')">{{ record.company }}</a-button></template>
            <template v-else-if="column.key === 'amount'"><span class="amount-text">{{ formatAmount(record.amount) }}</span></template>
            <template v-else-if="column.key === 'action'"><a-button type="link" size="small" @click="openDetail(record, 'ledger')">查看详情</a-button></template>
          </template>
        </a-table>
      </PageCard>
    </template>

    <template v-else-if="activeTab === 'growth'">
      <PageCard title="高成长企业识别" sub="获得股权融资或科创类大额授信的属地企业">
        <template #extra><a-button type="primary" @click="exportGrowth"><DownloadOutlined /> 导出培育清单</a-button></template>
        <a-table :columns="growthColumns" :data-source="growthEnterpriseRows" :pagination="false" :row-key="(row) => row.id" size="middle" :scroll="{ x: 1240 }">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'company'"><a-button type="link" class="table-link" @click="openDetail(record, 'growth')">{{ record.company }}</a-button></template>
            <template v-else-if="column.key === 'growthType'"><span class="tag-soft green">{{ record.growthType }}</span></template>
            <template v-else-if="column.key === 'policies'"><div class="tag-list"><span v-for="policy in record.policies" :key="policy" class="tag-soft blue">{{ policy }}</span></div></template>
            <template v-else-if="column.key === 'status'"><span class="tag-soft" :class="statusTone(record.status)">{{ record.status }}</span></template>
            <template v-else-if="column.key === 'action'"><a-button type="link" size="small" :disabled="record.status === '已服务'" @click="openFollow(record, 'growth')">{{ record.status === '待跟进' ? '分配跟进' : '更新跟进' }}</a-button></template>
          </template>
        </a-table>
      </PageCard>
    </template>

    <template v-else-if="activeTab === 'risk'">
      <a-alert type="warning" show-icon message="风险预警用于辅助企服人员提前介入，不构成企业经营风险结论；请结合走访及企业确认情况研判。" style="margin-bottom: 14px" />
      <PageCard title="企业异动风险预警" :sub="`共 ${riskWarningRows.length} 项预警`">
        <template #extra><a-button @click="exportRisks"><DownloadOutlined /> 导出预警清单</a-button></template>
        <a-table :columns="riskColumns" :data-source="riskWarningRows" :pagination="false" :row-key="(row) => row.id" size="middle" :scroll="{ x: 1160 }">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'company'"><a-button type="link" class="table-link" @click="openDetail(record, 'risk')">{{ record.company }}</a-button></template>
            <template v-else-if="column.key === 'level'"><span class="tag-soft" :class="record.level === '高' ? 'red' : 'orange'">{{ record.level }}风险</span></template>
            <template v-else-if="column.key === 'status'"><span class="tag-soft" :class="statusTone(record.status)">{{ record.status }}</span></template>
            <template v-else-if="column.key === 'action'">
              <a-button type="link" size="small" @click="openDetail(record, 'risk')">预警详情</a-button>
              <a-button type="link" size="small" @click="openFollow(record, 'risk')">分配跟进</a-button>
            </template>
          </template>
        </a-table>
      </PageCard>
    </template>

    <template v-else-if="activeTab === 'heat'">
      <PageCard>
        <div class="filter-row">
          <span class="filter-label">统计范围</span>
          <a-radio-group v-model:value="heatRegion" button-style="solid">
            <a-radio-button value="全国">全国</a-radio-button>
            <a-radio-button value="长三角">长三角</a-radio-button>
          </a-radio-group>
          <a-select v-model:value="heatIndustry" style="width: 150px">
            <a-select-option value="全部">全部主导产业</a-select-option>
            <a-select-option v-for="track in financingTrackRows" :key="track.id" :value="track.industry">{{ track.industry }}</a-select-option>
          </a-select>
          <a-button @click="exportTracks"><DownloadOutlined /> 导出分析</a-button>
        </div>
      </PageCard>
      <PageCard title="赛道融资热力分析" :sub="`${heatRegion} · 融资次数与披露金额`">
        <ChartBox :option="heatChartOption" :height="330" />
      </PageCard>
      <PageCard title="细分赛道表现" :sub="`共 ${filteredTracks.length} 个赛道`">
        <a-table :columns="trackColumns" :data-source="filteredTracks" :pagination="false" :row-key="(row) => row.id" size="middle">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'amount'">{{ heatRegion === '全国' ? record.amount : record.deltaAmount }} 亿元</template>
            <template v-else-if="column.key === 'count'">{{ heatRegion === '全国' ? record.count : record.deltaCount }} 起</template>
            <template v-else-if="column.key === 'mom'"><span :class="record.mom >= 0 ? 'trend-up' : 'trend-down'">{{ record.mom >= 0 ? '+' : '' }}{{ record.mom }}%</span></template>
          </template>
        </a-table>
      </PageCard>
    </template>

    <template v-else-if="activeTab === 'targets'">
      <PageCard>
        <div class="filter-row">
          <a-input v-model:value="targetKeyword" placeholder="搜索企业或业务方向" style="width: 220px" allow-clear />
          <a-select v-model:value="targetFilters.industry" placeholder="目标赛道" style="width: 130px" allow-clear>
            <a-select-option v-for="industry in targetIndustries" :key="industry" :value="industry">{{ industry }}</a-select-option>
          </a-select>
          <a-select v-model:value="targetFilters.round" placeholder="融资轮次" style="width: 130px" allow-clear>
            <a-select-option v-for="round in targetRounds" :key="round" :value="round">{{ round }}</a-select-option>
          </a-select>
          <a-select v-model:value="targetFilters.region" placeholder="企业地域" style="width: 160px" allow-clear>
            <a-select-option v-for="region in targetRegions" :key="region" :value="region">{{ region }}</a-select-option>
          </a-select>
          <a-select v-model:value="targetFilters.scale" placeholder="企业规模" style="width: 130px" allow-clear>
            <a-select-option value="初创型">初创型</a-select-option><a-select-option value="成长型">成长型</a-select-option><a-select-option value="规模以上">规模以上</a-select-option>
          </a-select>
          <a-button @click="resetTargets">重置</a-button>
          <div class="filter-actions"><a-button type="primary" @click="exportTargets"><DownloadOutlined /> 导出招引清单</a-button></div>
        </div>
      </PageCard>
      <PageCard title="优质招引标的库" :sub="`筛选出 ${filteredTargets.length} 家获投企业，按产业匹配度排序`">
        <a-table :columns="targetColumns" :data-source="filteredTargets" :pagination="{ pageSize: 8 }" :row-key="(row) => row.id" size="middle" :scroll="{ x: 1360 }">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'company'"><a-button type="link" class="table-link" @click="openDetail(record, 'target')">{{ record.company }}</a-button></template>
            <template v-else-if="column.key === 'amount'"><span class="amount-text">{{ formatAmount(record.amount) }}</span></template>
            <template v-else-if="column.key === 'score'"><span class="score-text">{{ record.score }}</span> 分</template>
            <template v-else-if="column.key === 'status'"><span class="tag-soft" :class="statusTone(record.status)">{{ record.status }}</span></template>
            <template v-else-if="column.key === 'action'">
              <a-button type="link" size="small" @click="openDetail(record, 'target')">详情</a-button>
              <a-button type="link" size="small" @click="openFollow(record, 'target')">{{ record.status === '待对接' ? '加入招引清单' : '更新跟进' }}</a-button>
            </template>
          </template>
        </a-table>
      </PageCard>
    </template>

    <template v-else>
      <PageCard>
        <div class="filter-row">
          <a-input v-model:value="institutionKeyword" placeholder="搜索机构或过往案例" style="width: 220px" allow-clear />
          <a-select v-model:value="institutionFilters.track" placeholder="投向赛道" style="width: 150px" allow-clear>
            <a-select-option v-for="industry in institutionTracks" :key="industry" :value="industry">{{ industry }}</a-select-option>
          </a-select>
          <a-select v-model:value="institutionFilters.stage" placeholder="投资阶段" style="width: 150px" allow-clear>
            <a-select-option value="早期">早期（天使—A轮）</a-select-option><a-select-option value="中后期">中后期（B轮以后）</a-select-option>
          </a-select>
          <a-button @click="resetInstitutions">重置</a-button>
          <div class="filter-actions"><a-button @click="exportInstitutions"><DownloadOutlined /> 导出机构库</a-button></div>
        </div>
      </PageCard>
      <PageCard title="投资机构对接库" :sub="`共 ${filteredInstitutions.length} 家机构，支持以投带引项目对接`">
        <a-table :columns="institutionColumns" :data-source="filteredInstitutions" :pagination="false" :row-key="(row) => row.id" size="middle" :scroll="{ x: 1160 }">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'"><a-button type="link" class="table-link" @click="openDetail(record, 'institution')">{{ record.name }}</a-button></template>
            <template v-else-if="column.key === 'status'"><span class="tag-soft" :class="statusTone(record.status)">{{ record.status }}</span></template>
            <template v-else-if="column.key === 'action'"><a-button type="link" size="small" @click="openFollow(record, 'institution')">{{ record.status === '待对接' ? '发起对接' : '更新对接' }}</a-button></template>
          </template>
        </a-table>
      </PageCard>
    </template>

    <a-drawer v-model:open="detailOpen" :title="detailTitle" width="540">
      <template v-if="selectedRow && detailKind === 'ledger'">
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="企业名称">{{ selectedRow.company }}</a-descriptions-item>
          <a-descriptions-item label="属地范围">{{ selectedRow.town }} · {{ selectedRow.park }}</a-descriptions-item>
          <a-descriptions-item label="产业赛道">{{ selectedRow.industry }}</a-descriptions-item>
          <a-descriptions-item label="融资轮次">{{ selectedRow.round }}</a-descriptions-item>
          <a-descriptions-item label="披露金额">{{ formatAmount(selectedRow.amount) }}</a-descriptions-item>
          <a-descriptions-item label="投资方">{{ selectedRow.investors }}</a-descriptions-item>
          <a-descriptions-item label="融资日期">{{ selectedRow.date }}</a-descriptions-item>
          <a-descriptions-item label="资金用途">{{ selectedRow.purpose }}</a-descriptions-item>
          <a-descriptions-item label="债权授信">{{ selectedRow.credit }}</a-descriptions-item>
          <a-descriptions-item label="股权变更">{{ selectedRow.equity }}</a-descriptions-item>
          <a-descriptions-item label="信息来源">{{ selectedRow.source }}</a-descriptions-item>
        </a-descriptions>
      </template>
      <template v-else-if="selectedRow && detailKind === 'growth'">
        <a-alert type="success" show-icon :message="selectedRow.signal" style="margin-bottom: 16px" />
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="企业名称">{{ selectedRow.company }}</a-descriptions-item>
          <a-descriptions-item label="所属区域">{{ selectedRow.town }}</a-descriptions-item>
          <a-descriptions-item label="产业赛道">{{ selectedRow.industry }}</a-descriptions-item>
          <a-descriptions-item label="识别类型">{{ selectedRow.growthType }}</a-descriptions-item>
          <a-descriptions-item label="扩产机会">{{ selectedRow.opportunity }}</a-descriptions-item>
          <a-descriptions-item label="跟进人员">{{ selectedRow.owner || '暂未分配' }}</a-descriptions-item>
        </a-descriptions>
        <div class="drawer-section"><h4>匹配政策</h4><div class="tag-list"><span v-for="policy in selectedRow.policies" :key="policy" class="tag-soft blue">{{ policy }}</span></div></div>
      </template>
      <template v-else-if="selectedRow && detailKind === 'risk'">
        <a-alert :type="selectedRow.level === '高' ? 'error' : 'warning'" show-icon :message="`${selectedRow.level}风险 · ${selectedRow.riskType}`" style="margin-bottom: 16px" />
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="企业名称">{{ selectedRow.company }}</a-descriptions-item>
          <a-descriptions-item label="所属区域">{{ selectedRow.town }}</a-descriptions-item>
          <a-descriptions-item label="产业赛道">{{ selectedRow.industry }}</a-descriptions-item>
          <a-descriptions-item label="预警日期">{{ selectedRow.date }}</a-descriptions-item>
          <a-descriptions-item label="异动说明">{{ selectedRow.detail }}</a-descriptions-item>
          <a-descriptions-item label="跟进人员">{{ selectedRow.owner || '暂未分配' }}</a-descriptions-item>
          <a-descriptions-item label="当前状态">{{ selectedRow.status }}</a-descriptions-item>
        </a-descriptions>
      </template>
      <template v-else-if="selectedRow && detailKind === 'target'">
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="企业名称">{{ selectedRow.company }}</a-descriptions-item>
          <a-descriptions-item label="所在地域">{{ selectedRow.region }}</a-descriptions-item>
          <a-descriptions-item label="产业赛道">{{ selectedRow.industry }}</a-descriptions-item>
          <a-descriptions-item label="企业规模">{{ selectedRow.scale }}</a-descriptions-item>
          <a-descriptions-item label="融资情况">{{ selectedRow.round }} · {{ formatAmount(selectedRow.amount) }}</a-descriptions-item>
          <a-descriptions-item label="投资方">{{ selectedRow.investors }}</a-descriptions-item>
          <a-descriptions-item label="业务方向">{{ selectedRow.business }}</a-descriptions-item>
          <a-descriptions-item label="产业匹配度">{{ selectedRow.score }} 分</a-descriptions-item>
        </a-descriptions>
        <a-button type="primary" block style="margin-top: 18px" @click="openFollow(selectedRow, 'target')">{{ selectedRow.status === '待对接' ? '加入招引清单并分配' : '更新跟进信息' }}</a-button>
      </template>
      <template v-else-if="selectedRow && detailKind === 'institution'">
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="机构名称">{{ selectedRow.name }}</a-descriptions-item>
          <a-descriptions-item label="机构类型">{{ selectedRow.type }}</a-descriptions-item>
          <a-descriptions-item label="投资阶段">{{ selectedRow.stages }}</a-descriptions-item>
          <a-descriptions-item label="投向赛道">{{ selectedRow.tracks }}</a-descriptions-item>
          <a-descriptions-item label="过往案例">{{ selectedRow.cases }}</a-descriptions-item>
          <a-descriptions-item label="属地投资">{{ selectedRow.local }}</a-descriptions-item>
          <a-descriptions-item label="建议对接">{{ selectedRow.contact }}</a-descriptions-item>
        </a-descriptions>
      </template>
    </a-drawer>

    <a-modal v-model:open="followOpen" :title="followKind === 'institution' ? '投资机构对接' : '分配跟进'" width="560px">
      <a-form layout="vertical">
        <a-form-item label="跟进对象"><a-input :value="followName" disabled /></a-form-item>
        <a-form-item label="跟进人员" required>
          <a-select v-model:value="followForm.owner" placeholder="请选择跟进人员">
            <a-select-option v-for="owner in owners" :key="owner" :value="owner">{{ owner }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="工作要求"><a-textarea v-model:value="followForm.note" :rows="4" placeholder="填写对接重点、拟核实事项或服务安排" /></a-form-item>
      </a-form>
      <template #footer>
        <a-button @click="followOpen = false">取消</a-button>
        <a-button type="primary" @click="saveFollow">确认分配</a-button>
      </template>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { message } from 'ant-design-vue';
import { DownloadOutlined } from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import StatCard from '../components/StatCard.vue';
import ChartBox from '../components/ChartBox.vue';
import {
  monthlyInvestmentTrend,
  localFinancingRows,
  growthEnterpriseRows as growthSeedRows,
  riskWarningRows as riskSeedRows,
  financingTrackRows,
  targetEnterpriseRows as targetSeedRows,
  investmentInstitutionRows as institutionSeedRows,
} from '../data/investment';

const growthEnterpriseRows = reactive(growthSeedRows.map((row) => ({ ...row })));
const riskWarningRows = reactive(riskSeedRows.map((row) => ({ ...row })));
const targetEnterpriseRows = reactive(targetSeedRows.map((row) => ({ ...row })));
const investmentInstitutionRows = reactive(institutionSeedRows.map((row) => ({ ...row })));

const msg = message;
const tabs = [
  { key: 'overview', label: '综合概览' },
  { key: 'ledger', label: '属地投融资台账' },
  { key: 'growth', label: '高成长企业' },
  { key: 'risk', label: '异动风险预警' },
  { key: 'heat', label: '赛道融资热力' },
  { key: 'targets', label: '优质招引标的' },
  { key: 'institutions', label: '投资机构对接' },
];
const activeTab = ref('overview');
const owners = ['顾龙飞', '李婷', '王凯', '陈晨'];
const totalLocalAmount = (localFinancingRows.reduce((sum, row) => sum + row.amount, 0) / 10000).toFixed(1);
const pendingRiskCount = computed(() => riskWarningRows.filter((row) => row.status === '待跟进').length);
const unique = (rows, key) => [...new Set(rows.map((row) => row[key]))];
const includesKeyword = (row, fields, keyword) => !keyword || fields.some((field) => String(row[field] || '').includes(keyword.trim()));

function formatAmount(amount) {
  return amount >= 10000 ? `${(amount / 10000).toFixed(1)} 亿元` : `${amount.toLocaleString()} 万元`;
}
function statusTone(status) {
  if (['跟进中', '更新跟进'].includes(status)) return 'blue';
  if (['已服务', '已建立联系'].includes(status)) return 'green';
  if (status === '待跟进') return 'orange';
  return 'gray';
}

const trendChartOption = {
  tooltip: { trigger: 'axis' },
  legend: { data: ['融资事件（起）', '披露金额（亿元）'], top: 0 },
  grid: { left: 44, right: 48, top: 44, bottom: 30 },
  xAxis: { type: 'category', data: monthlyInvestmentTrend.map((row) => row.month) },
  yAxis: [{ type: 'value', name: '事件（起）' }, { type: 'value', name: '金额（亿元）' }],
  series: [
    { name: '融资事件（起）', type: 'bar', barWidth: 22, data: monthlyInvestmentTrend.map((row) => row.count) },
    { name: '披露金额（亿元）', type: 'line', smooth: true, yAxisIndex: 1, data: monthlyInvestmentTrend.map((row) => row.amount) },
  ],
};
const overviewTrackOption = {
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: 70, right: 30, top: 16, bottom: 30 },
  xAxis: { type: 'value', name: '亿元' },
  yAxis: { type: 'category', data: financingTrackRows.slice(0, 5).reverse().map((row) => row.industry) },
  series: [{ type: 'bar', barWidth: 18, data: financingTrackRows.slice(0, 5).reverse().map((row) => row.amount) }],
};

const ledgerKeyword = ref('');
const ledgerFilters = reactive({ town: undefined, industry: undefined, round: undefined });
const towns = unique(localFinancingRows, 'town');
const localIndustries = unique(localFinancingRows, 'industry');
const localRounds = unique(localFinancingRows, 'round');
const filteredLedger = computed(() => localFinancingRows.filter((row) => (
  includesKeyword(row, ['company', 'investors', 'purpose'], ledgerKeyword.value)
  && (!ledgerFilters.town || row.town === ledgerFilters.town)
  && (!ledgerFilters.industry || row.industry === ledgerFilters.industry)
  && (!ledgerFilters.round || row.round === ledgerFilters.round)
)));
function resetLedger() {
  ledgerKeyword.value = '';
  Object.assign(ledgerFilters, { town: undefined, industry: undefined, round: undefined });
}
const ledgerColumns = [
  { title: '企业名称', key: 'company', width: 230, fixed: 'left' },
  { title: '所属街镇', dataIndex: 'town', width: 100 },
  { title: '所在园区', dataIndex: 'park', width: 140 },
  { title: '产业赛道', dataIndex: 'industry', width: 110 },
  { title: '融资轮次', dataIndex: 'round', width: 100 },
  { title: '披露金额', key: 'amount', width: 120 },
  { title: '投资方', dataIndex: 'investors', width: 210 },
  { title: '融资日期', dataIndex: 'date', width: 115 },
  { title: '资金用途', dataIndex: 'purpose', width: 250, ellipsis: true },
  { title: '操作', key: 'action', width: 90, fixed: 'right' },
];
const growthColumns = [
  { title: '企业名称', key: 'company', width: 220, fixed: 'left' },
  { title: '所属街镇', dataIndex: 'town', width: 100 },
  { title: '产业赛道', dataIndex: 'industry', width: 110 },
  { title: '成长信号', dataIndex: 'signal', width: 190 },
  { title: '识别类型', key: 'growthType', width: 110 },
  { title: '匹配政策', key: 'policies', width: 250 },
  { title: '扩产及服务机会', dataIndex: 'opportunity', width: 300, ellipsis: true },
  { title: '跟进人员', dataIndex: 'owner', width: 100 },
  { title: '状态', key: 'status', width: 100 },
  { title: '操作', key: 'action', width: 100, fixed: 'right' },
];
const riskColumns = [
  { title: '企业名称', key: 'company', width: 220 },
  { title: '所属街镇', dataIndex: 'town', width: 100 },
  { title: '产业赛道', dataIndex: 'industry', width: 110 },
  { title: '异动类型', dataIndex: 'riskType', width: 160 },
  { title: '风险等级', key: 'level', width: 100 },
  { title: '预警日期', dataIndex: 'date', width: 115 },
  { title: '跟进人员', dataIndex: 'owner', width: 100 },
  { title: '状态', key: 'status', width: 100 },
  { title: '操作', key: 'action', width: 170, fixed: 'right' },
];

const heatRegion = ref('全国');
const heatIndustry = ref('全部');
const filteredTracks = computed(() => financingTrackRows.filter((row) => heatIndustry.value === '全部' || row.industry === heatIndustry.value));
const heatChartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['融资次数（起）', '披露金额（亿元）'], top: 0 },
  grid: { left: 48, right: 52, top: 46, bottom: 34 },
  xAxis: { type: 'category', data: filteredTracks.value.map((row) => row.industry) },
  yAxis: [{ type: 'value', name: '次数（起）' }, { type: 'value', name: '金额（亿元）' }],
  series: [
    { name: '融资次数（起）', type: 'bar', barWidth: 26, data: filteredTracks.value.map((row) => heatRegion.value === '全国' ? row.count : row.deltaCount) },
    { name: '披露金额（亿元）', type: 'line', smooth: true, yAxisIndex: 1, data: filteredTracks.value.map((row) => heatRegion.value === '全国' ? row.amount : row.deltaAmount) },
  ],
}));
const trackColumns = [
  { title: '产业赛道', dataIndex: 'industry' },
  { title: '融资次数', key: 'count' },
  { title: '披露金额', key: 'amount' },
  { title: '环比趋势', key: 'mom' },
  { title: '热门细分领域', dataIndex: 'hot' },
];

const targetKeyword = ref('');
const targetFilters = reactive({ industry: undefined, round: undefined, region: undefined, scale: undefined });
const targetIndustries = unique(targetEnterpriseRows, 'industry');
const targetRounds = unique(targetEnterpriseRows, 'round');
const targetRegions = unique(targetEnterpriseRows, 'region');
const filteredTargets = computed(() => targetEnterpriseRows.filter((row) => (
  includesKeyword(row, ['company', 'business'], targetKeyword.value)
  && (!targetFilters.industry || row.industry === targetFilters.industry)
  && (!targetFilters.round || row.round === targetFilters.round)
  && (!targetFilters.region || row.region === targetFilters.region)
  && (!targetFilters.scale || row.scale === targetFilters.scale)
)).sort((a, b) => b.score - a.score));
function resetTargets() {
  targetKeyword.value = '';
  Object.assign(targetFilters, { industry: undefined, round: undefined, region: undefined, scale: undefined });
}
const targetColumns = [
  { title: '企业名称', key: 'company', width: 240, fixed: 'left' },
  { title: '所在地域', dataIndex: 'region', width: 150 },
  { title: '产业赛道', dataIndex: 'industry', width: 110 },
  { title: '融资轮次', dataIndex: 'round', width: 105 },
  { title: '披露金额', key: 'amount', width: 120 },
  { title: '企业规模', dataIndex: 'scale', width: 110 },
  { title: '业务方向', dataIndex: 'business', width: 250, ellipsis: true },
  { title: '主要投资方', dataIndex: 'investors', width: 190 },
  { title: '匹配度', key: 'score', width: 95 },
  { title: '跟进人员', dataIndex: 'owner', width: 100, customRender: ({ text }) => text || '—' },
  { title: '状态', key: 'status', width: 100 },
  { title: '操作', key: 'action', width: 160, fixed: 'right' },
];

const institutionKeyword = ref('');
const institutionFilters = reactive({ track: undefined, stage: undefined });
const institutionTracks = [...new Set(investmentInstitutionRows.flatMap((row) => row.tracks.split('、')))];
const filteredInstitutions = computed(() => investmentInstitutionRows.filter((row) => (
  includesKeyword(row, ['name', 'cases'], institutionKeyword.value)
  && (!institutionFilters.track || row.tracks.includes(institutionFilters.track))
  && (!institutionFilters.stage || (institutionFilters.stage === '早期' ? row.stages.includes('天使轮') : !row.stages.includes('天使轮')))
)));
function resetInstitutions() {
  institutionKeyword.value = '';
  Object.assign(institutionFilters, { track: undefined, stage: undefined });
}
const institutionColumns = [
  { title: '机构名称', key: 'name', width: 150 },
  { title: '机构类型', dataIndex: 'type', width: 120 },
  { title: '投资阶段', dataIndex: 'stages', width: 160 },
  { title: '投向赛道', dataIndex: 'tracks', width: 260 },
  { title: '过往案例', dataIndex: 'cases', width: 270, ellipsis: true },
  { title: '属地投资情况', dataIndex: 'local', width: 170 },
  { title: '对接状态', key: 'status', width: 110 },
  { title: '操作', key: 'action', width: 100, fixed: 'right' },
];

const detailOpen = ref(false);
const detailKind = ref('');
const selectedRow = ref(null);
const detailTitle = computed(() => selectedRow.value?.company || selectedRow.value?.name || '详情');
function openDetail(row, kind) {
  selectedRow.value = row;
  detailKind.value = kind;
  detailOpen.value = true;
}

const followOpen = ref(false);
const followKind = ref('');
const followTarget = ref(null);
const followForm = reactive({ owner: undefined, note: '' });
const followName = computed(() => followTarget.value?.company || followTarget.value?.name || '');
function openFollow(row, kind) {
  followTarget.value = row;
  followKind.value = kind;
  Object.assign(followForm, { owner: row.owner || undefined, note: '' });
  followOpen.value = true;
}
function saveFollow() {
  if (!followForm.owner) {
    msg.warning('请选择跟进人员');
    return;
  }
  const row = followTarget.value;
  if (followKind.value === 'institution') {
    row.contact = followForm.owner;
    row.status = '跟进中';
  } else {
    row.owner = followForm.owner;
    row.status = followKind.value === 'target' ? '跟进中' : row.status === '已服务' ? '已服务' : '跟进中';
  }
  followOpen.value = false;
  msg.success(followKind.value === 'institution' ? '机构对接信息已更新' : `已分配给 ${followForm.owner} 跟进`);
}

function downloadCsv(filename, columns, rows) {
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const content = [columns.map((column) => escape(column.title)).join(','), ...rows.map((row) => columns.map((column) => escape(column.format ? column.format(row[column.key], row) : row[column.key])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([`\ufeff${content}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  msg.success(`已导出 ${rows.length} 条数据`);
}
function exportLedger() {
  downloadCsv('属地投融资台账', [
    { title: '企业名称', key: 'company' }, { title: '所属街镇', key: 'town' }, { title: '所在园区', key: 'park' },
    { title: '产业赛道', key: 'industry' }, { title: '融资轮次', key: 'round' }, { title: '披露金额', key: 'amount', format: (value) => formatAmount(value) },
    { title: '投资方', key: 'investors' }, { title: '融资日期', key: 'date' }, { title: '资金用途', key: 'purpose' },
  ], filteredLedger.value);
}
function exportGrowth() {
  downloadCsv('高成长企业培育清单', [
    { title: '企业名称', key: 'company' }, { title: '所属街镇', key: 'town' }, { title: '产业赛道', key: 'industry' },
    { title: '成长信号', key: 'signal' }, { title: '匹配政策', key: 'policies', format: (value) => value.join('、') },
    { title: '扩产及服务机会', key: 'opportunity' }, { title: '跟进人员', key: 'owner' }, { title: '状态', key: 'status' },
  ], growthEnterpriseRows);
}
function exportRisks() {
  downloadCsv('企业异动风险预警', [
    { title: '企业名称', key: 'company' }, { title: '所属街镇', key: 'town' }, { title: '异动类型', key: 'riskType' },
    { title: '风险等级', key: 'level' }, { title: '预警日期', key: 'date' }, { title: '异动说明', key: 'detail' },
    { title: '跟进人员', key: 'owner' }, { title: '状态', key: 'status' },
  ], riskWarningRows);
}
function exportTracks() {
  downloadCsv(`${heatRegion.value}赛道融资热力分析`, [
    { title: '产业赛道', key: 'industry' }, { title: '融资次数（起）', key: 'count', format: (value, row) => heatRegion.value === '全国' ? value : row.deltaCount },
    { title: '披露金额（亿元）', key: 'amount', format: (value, row) => heatRegion.value === '全国' ? value : row.deltaAmount },
    { title: '环比趋势（%）', key: 'mom' }, { title: '热门细分领域', key: 'hot' },
  ], filteredTracks.value);
}
function exportTargets() {
  downloadCsv('优质招引标的清单', [
    { title: '企业名称', key: 'company' }, { title: '所在地域', key: 'region' }, { title: '产业赛道', key: 'industry' },
    { title: '融资轮次', key: 'round' }, { title: '披露金额', key: 'amount', format: (value) => formatAmount(value) },
    { title: '企业规模', key: 'scale' }, { title: '业务方向', key: 'business' }, { title: '主要投资方', key: 'investors' },
    { title: '匹配度', key: 'score' }, { title: '跟进人员', key: 'owner' }, { title: '状态', key: 'status' },
  ], filteredTargets.value);
}
function exportInstitutions() {
  downloadCsv('投资机构对接库', [
    { title: '机构名称', key: 'name' }, { title: '机构类型', key: 'type' }, { title: '投资阶段', key: 'stages' },
    { title: '投向赛道', key: 'tracks' }, { title: '过往案例', key: 'cases' }, { title: '属地投资情况', key: 'local' },
    { title: '对接团队', key: 'contact' }, { title: '状态', key: 'status' },
  ], filteredInstitutions.value);
}
</script>

<style scoped>
.investment-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.investment-tabs { gap: 24px; margin: 0; padding: 0 16px; overflow-x: auto; }
.investment-tab { border: 0; background: transparent; font-family: inherit; }
.investment-tab:focus-visible, .work-name:focus-visible, .table-link:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.overview-grid { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 14px; }
.overview-grid .page-card { min-width: 0; }
.filter-actions { margin-left: auto; }
.work-list { display: flex; flex-direction: column; }
.work-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); }
.work-row:last-child { border-bottom: 0; padding-bottom: 0; }
.work-row:first-child { padding-top: 0; }
.work-main { min-width: 0; }
.work-name, .table-link { height: auto; padding: 0; text-align: left; white-space: normal; line-height: 1.5; }
.work-name { font-weight: 600; }
.work-desc { margin: 4px 0 8px; color: var(--muted); font-size: 12px; line-height: 1.6; }
.tag-list { display: flex; flex-wrap: wrap; gap: 6px; }
.amount-text, .score-text { color: var(--primary); font-weight: 600; }
.drawer-section { margin-top: 18px; }
.drawer-section h4 { margin: 0 0 10px; font-size: 14px; }
@media (max-width: 1200px) {
  .overview-grid { grid-template-columns: 1fr; }
  .investment-tabs { gap: 18px; }
}
@media (max-width: 760px) {
  .filter-actions { margin-left: 0; }
}
</style>
