<template>
  <div>
    <div class="billing-hero">
      <div class="billing-left">
        <div class="billing-label">账户可用余额（元）</div>
        <div class="billing-balance">¥ {{ billing.balance.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}</div>
        <div class="billing-sub">企业标准版 · 有效期至 {{ billing.expire }}</div>
        <div class="flex gap8" style="margin-top: 18px">
          <a-button type="primary" @click="rechargeOpen = true"><PlusOutlined /> 账户充值</a-button>
          <a-button ghost style="color: #fff; border-color: rgba(255,255,255,.5)" @click="msg.success('发票申请已提交（演示）')">发票申请</a-button>
        </div>
      </div>
      <div class="billing-right">
        <div class="billing-mini"><span>本月消费</span><b>¥ {{ billing.monthlyUsage.toLocaleString() }}</b></div>
        <a-divider type="vertical" style="height: 46px; border-color: rgba(255,255,255,.25)" />
        <div class="billing-mini"><span>本月接口调用</span><b>{{ billing.apiCalls.toLocaleString() }} 次</b></div>
        <a-divider type="vertical" style="height: 46px; border-color: rgba(255,255,255,.25)" />
        <div class="billing-mini"><span>调用成功率</span><b>{{ billing.successRate }}%</b></div>
      </div>
    </div>

    <div class="grid2" style="grid-template-columns: 1.5fr 1fr">
      <PageCard title="接口消费趋势" sub="近 7 天各接口调用与消费金额">
        <ChartBox :option="trendOption" :height="290" />
      </PageCard>
      <PageCard title="套餐与配额">
        <div class="plan-head">
          <div>
            <div class="plan-name">{{ billing.plan }}</div>
            <div class="text-muted">到期时间：{{ billing.expire }}</div>
          </div>
          <span class="tag-soft green">生效中</span>
        </div>
        <div class="quota-list">
          <div v-for="q in quotas" :key="q.name" class="quota-row">
            <div class="flex" style="justify-content: space-between"><span>{{ q.name }}</span><span class="text-muted">{{ q.used }} / {{ q.total }}</span></div>
            <a-progress :percent="Math.round((q.used / q.total) * 100)" size="small" :stroke-color="q.used / q.total > 0.8 ? '#1652B8' : '#1652B8'" :show-info="false" />
          </div>
        </div>
        <a-button block style="margin-top: 8px" @click="msg.success('套餐续费请联系客户经理 021-6828 8888')">套餐续费</a-button>
      </PageCard>
    </div>

    <PageCard>
      <div class="filter-row">
        <a-radio-group v-model:value="typeFilter" button-style="solid">
          <a-radio-button value="">全部</a-radio-button>
          <a-radio-button value="接口调用">消费明细</a-radio-button>
          <a-radio-button value="充值">充值记录</a-radio-button>
        </a-radio-group>
        <a-range-picker v-model:value="range" />
        <a-button type="primary">查询</a-button>
        <a-button style="margin-left: auto" @click="msg.success('账单已导出（演示）')"><DownloadOutlined /> 导出账单</a-button>
      </div>
    </PageCard>
    <PageCard title="账单明细" :sub="`共 ${filtered.length} 条`">
      <a-table :columns="columns" :data-source="filtered" :pagination="{ pageSize: 8 }" row-key="id" size="middle">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'type'">
            <span class="tag-soft" :class="record.type === '充值' ? 'green' : 'blue'">{{ record.type }}</span>
          </template>
          <template v-else-if="column.key === 'amount'">
            <b :style="{ color: record.type === '充值' ? '#2fa45f' : '#303b49' }">{{ record.type === '充值' ? '+' : '-' }} ¥{{ record.amount.toFixed(2) }}</b>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-badge status="success" :text="record.status" />
          </template>
        </template>
      </a-table>
    </PageCard>

    <a-modal v-model:open="rechargeOpen" title="账户充值" width="480px" @ok="doRecharge">
      <div class="recharge-amount">
        <span>¥</span>
        <a-input-number v-model:value="rechargeAmount" :min="100" :step="100" style="width: 100%" />
      </div>
      <div class="amount-options">
        <span v-for="a in [1000, 2000, 5000, 10000]" :key="a" class="amount-chip" :class="{ active: rechargeAmount === a }" @click="rechargeAmount = a">¥{{ a.toLocaleString() }}</span>
      </div>
      <a-form layout="vertical" style="margin-top: 16px">
        <a-form-item label="支付方式">
          <a-radio-group v-model:value="payType">
            <a-radio value="对公转账">对公转账</a-radio>
            <a-radio value="微信支付">微信支付</a-radio>
            <a-radio value="支付宝">支付宝</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="发票">
          <a-checkbox v-model:checked="needInvoice">需要开具增值税专用发票</a-checkbox>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { message } from 'ant-design-vue';
import { PlusOutlined, DownloadOutlined } from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import ChartBox from '../components/ChartBox.vue';
import { billing as seed } from '../data/mock';

const msg = message;
const billing = seed;
const records = ref([...seed.records]);
const typeFilter = ref('');
const range = ref();
const filtered = computed(() => records.value.filter((r) => !typeFilter.value || r.type === typeFilter.value));
const columns = [
  { title: '单号', dataIndex: 'id', width: 100 },
  { title: '类型', key: 'type', width: 100 },
  { title: '项目', dataIndex: 'item' },
  { title: '数量', dataIndex: 'count', width: 110 },
  { title: '金额', key: 'amount', width: 140 },
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '状态', key: 'status', width: 110 },
];
const quotas = [
  { name: '企业工商查询', used: 12680, total: 50000 },
  { name: '企业风险查询', used: 8420, total: 20000 },
  { name: 'AI 外呼通话', used: 1260, total: 5000 },
  { name: '政策数据同步', used: 3560, total: 10000 },
];
const rechargeOpen = ref(false);
const rechargeAmount = ref(5000);
const payType = ref('对公转账');
const needInvoice = ref(true);
function doRecharge() {
  records.value.unshift({ id: 'B' + (100 + records.value.length), type: '充值', item: '账户充值', count: 1, amount: rechargeAmount.value, date: '2026-11-17', status: '已到账' });
  rechargeOpen.value = false;
  msg.success(`充值 ¥${rechargeAmount.value.toLocaleString()} 成功（演示）`);
}
const trendOption = {
  tooltip: { trigger: 'axis' },
  legend: { top: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 4, textStyle: { fontSize: 11, color: '#657384' } },
  grid: { left: 45, right: 40, top: 34, bottom: 26 },
  xAxis: { type: 'category', data: ['11-11', '11-12', '11-13', '11-14', '11-15', '11-16', '11-17'], axisLabel: { fontSize: 10, color: '#657384' }, axisLine: { lineStyle: { color: '#F2F4F7' } }, axisTick: { show: false } },
  yAxis: [
    { type: 'value', name: '金额(元)', nameTextStyle: { fontSize: 10, color: '#657384' }, axisLabel: { fontSize: 10, color: '#657384' }, splitLine: { lineStyle: { color: '#F2F4F7', type: 'dashed' } } },
    { type: 'value', name: '调用次数', nameTextStyle: { fontSize: 10, color: '#657384' }, axisLabel: { fontSize: 10, color: '#657384' }, splitLine: { show: false } },
  ],
  series: [
    { name: '消费金额', type: 'bar', barWidth: 18, data: [820, 640, 910, 1180, 1420, 1560, 680], itemStyle: { color: '#F2F4F7', borderRadius: [4, 4, 0, 0] } },
    { name: '接口调用', type: 'line', yAxisIndex: 1, smooth: true, symbol: 'circle', symbolSize: 5, data: [6400, 5200, 7100, 8600, 9800, 11200, 5100], lineStyle: { color: '#1652B8', width: 2 }, itemStyle: { color: '#1652B8' } },
  ],
};
</script>

<style scoped>
.billing-hero { background: linear-gradient(120deg, #1652B8 0%, #1652B8 58%, #1652B8 100%); border-radius: 12px; color: #fff; padding: 26px 30px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 18px; box-shadow: 0 12px 28px rgba(74, 98, 231, 0.22); }
.billing-label { font-size: 13px; opacity: 0.8; }
.billing-balance { font-size: 34px; font-weight: 700; margin: 8px 0 4px; letter-spacing: 0.5px; }
.billing-sub { font-size: 12px; opacity: 0.75; }
.billing-right { display: flex; align-items: center; gap: 26px; padding-right: 8px; }
.billing-mini { display: flex; flex-direction: column; gap: 6px; font-size: 12px; opacity: 0.85; }
.billing-mini b { font-size: 19px; font-weight: 600; }
.plan-head { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14px; border-bottom: 1px solid #F2F4F7; }
.plan-name { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
.quota-list { padding: 14px 0 6px; display: flex; flex-direction: column; gap: 12px; font-size: 12.5px; }
.quota-row :deep(.ant-progress) { margin: 2px 0 0; }
.recharge-amount { display: flex; align-items: center; gap: 8px; font-size: 22px; }
.amount-options { display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
.amount-chip { border: 1px solid #F2F4F7; border-radius: 7px; padding: 7px 16px; cursor: pointer; font-size: 13px; }
.amount-chip.active { border-color: #1652B8; color: #1652B8; background: #F2F4F7; font-weight: 600; }
</style>
