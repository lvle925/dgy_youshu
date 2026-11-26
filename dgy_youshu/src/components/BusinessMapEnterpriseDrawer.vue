<template>
  <a-drawer
    :open="open"
    width="min(760px, 100vw)"
    class="enterprise-analysis-drawer"
    @update:open="emit('update:open', $event)"
  >
    <template #title>
      <div class="drawer-title">
        <span>框选企业分析</span>
        <span class="demo-badge">演示数据</span>
      </div>
    </template>

    <div class="analysis-intro">
      按框选范围内的注册、办公点位分别统计；异地企业不会因另一处地址在框外而被排除。
    </div>

    <div class="analysis-summary" aria-label="框选企业统计">
      <button
        v-for="card in summaryCards"
        :key="card.key"
        type="button"
        class="summary-item"
        :class="{ active: card.active }"
        :aria-label="`查看${card.title}列表`"
        @click="showSummary(card)"
      >
        <span>{{ card.title }}</span>
        <strong>{{ card.count }}</strong>
        <small>{{ card.note }}</small>
      </button>
    </div>

    <div class="mode-switch">
      <a-radio-group v-model:value="activeMode" option-type="button" button-style="solid" @change="handleModeChange">
        <a-radio-button value="registration">注册企业</a-radio-button>
        <a-radio-button value="office">办公企业</a-radio-button>
      </a-radio-group>
      <a-radio-group
        v-model:value="activeFilter"
        :options="filterOptions"
        option-type="button"
        button-style="solid"
        size="small"
      />
    </div>

    <div class="list-heading">
      <div>
        <h3>{{ currentListTitle }}</h3>
        <p>{{ currentListDescription }}</p>
      </div>
      <span class="list-total">共 <strong>{{ visibleItems.length }}</strong> 家</span>
    </div>

    <div v-if="visibleItems.length" class="enterprise-list">
      <article v-for="company in pagedItems" :key="company.id" class="enterprise-item">
        <div class="enterprise-head">
          <div>
            <h4>{{ company.name }}</h4>
            <p>{{ company.industry }} · {{ company.scale }} · 注册资本 {{ company.regCapital }}</p>
          </div>
          <a-tag v-if="activeMode === 'registration' && company.potentialLoss" color="orange">潜在流失</a-tag>
          <a-tag v-else-if="activeMode === 'office' && company.potentialAttraction" color="green">潜在招引</a-tag>
          <a-tag v-else color="blue">{{ activeMode === 'registration' ? '本地注册' : '本地办公' }}</a-tag>
        </div>
        <div class="address-grid">
          <div class="address-row">
            <span class="address-label">注册地址</span>
            <div>
              <span>{{ company.registrationLocation.address }}</span>
              <small>{{ company.registrationLocation.city }} · {{ company.registrationLocation.district }}</small>
            </div>
          </div>
          <div class="address-row">
            <span class="address-label">办公地址</span>
            <div>
              <span>{{ company.officeLocation.address }}</span>
              <small>{{ company.officeLocation.city }} · {{ company.officeLocation.district }}</small>
            </div>
          </div>
        </div>
      </article>
    </div>
    <a-empty v-else class="analysis-empty" description="当前框选范围内暂无符合条件的企业" />

    <div v-if="visibleItems.length > pageSize" class="list-pagination">
      <a-pagination
        v-model:current="currentPage"
        :total="visibleItems.length"
        :page-size="pageSize"
        :show-size-changer="false"
        size="small"
      />
    </div>
  </a-drawer>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  analysis: {
    type: Object,
    default: () => ({ registered: [], offices: [], potentialLoss: [], potentialAttraction: [] }),
  },
});
const emit = defineEmits(['update:open']);

const activeMode = ref('registration');
const activeFilter = ref('all');
const currentPage = ref(1);
const pageSize = 6;

const summaryCards = computed(() => [
  {
    key: 'registered', title: '注册企业', count: props.analysis.registered.length,
    note: '框内注册点位', mode: 'registration', filter: 'all',
    active: activeMode.value === 'registration' && activeFilter.value === 'all',
  },
  {
    key: 'offices', title: '办公企业', count: props.analysis.offices.length,
    note: '框内办公点位', mode: 'office', filter: 'all',
    active: activeMode.value === 'office' && activeFilter.value === 'all',
  },
  {
    key: 'potentialLoss', title: '潜在流失', count: props.analysis.potentialLoss.length,
    note: '本地注册 · 异地办公', mode: 'registration', filter: 'special',
    active: activeMode.value === 'registration' && activeFilter.value === 'special',
  },
  {
    key: 'potentialAttraction', title: '潜在招引', count: props.analysis.potentialAttraction.length,
    note: '本地办公 · 异地注册', mode: 'office', filter: 'special',
    active: activeMode.value === 'office' && activeFilter.value === 'special',
  },
]);

const filterOptions = computed(() => activeMode.value === 'registration'
  ? [{ label: '全部注册企业', value: 'all' }, { label: '仅看潜在流失', value: 'special' }]
  : [{ label: '全部办公企业', value: 'all' }, { label: '仅看潜在招引', value: 'special' }]);

const visibleItems = computed(() => {
  if (activeMode.value === 'registration') {
    return activeFilter.value === 'special' ? props.analysis.potentialLoss : props.analysis.registered;
  }
  return activeFilter.value === 'special' ? props.analysis.potentialAttraction : props.analysis.offices;
});

const pagedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return visibleItems.value.slice(start, start + pageSize);
});

const currentListTitle = computed(() => {
  if (activeMode.value === 'registration') return activeFilter.value === 'special' ? '潜在流失企业' : '注册企业列表';
  return activeFilter.value === 'special' ? '潜在招引企业' : '办公企业列表';
});

const currentListDescription = computed(() => {
  if (activeMode.value === 'registration') {
    return activeFilter.value === 'special' ? '注册地址在框选范围内，实际办公地址在上海市外。' : '注册地址点位位于当前框选范围内的企业。';
  }
  return activeFilter.value === 'special' ? '实际办公地址在框选范围内，注册地址在上海市外。' : '实际办公点位位于当前框选范围内的企业。';
});

function showSummary(card) {
  activeMode.value = card.mode;
  activeFilter.value = card.filter;
  currentPage.value = 1;
}

function handleModeChange() {
  activeFilter.value = 'all';
  currentPage.value = 1;
}
watch(activeFilter, () => { currentPage.value = 1; });
watch(visibleItems, (items) => {
  const lastPage = Math.max(1, Math.ceil(items.length / pageSize));
  if (currentPage.value > lastPage) currentPage.value = lastPage;
});
watch(() => props.open, (open) => {
  if (open) {
    activeMode.value = 'registration';
    activeFilter.value = 'all';
    currentPage.value = 1;
  }
});
</script>

<style scoped>
.drawer-title { display:flex; align-items:center; gap:10px; color:#303b49; }
.demo-badge { padding:2px 7px; border:1px solid #c8d6ea; border-radius:4px; color:#1652b8; background:#f3f7fc; font-size:11px; font-weight:500; }
.analysis-intro { margin-bottom:16px; padding:10px 12px; border-radius:6px; background:#f4f7fa; color:#5f6873; font-size:12px; line-height:1.7; }
.analysis-summary { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; }
.summary-item { min-width:0; padding:12px 10px; border:1px solid #e1e7ee; border-radius:7px; background:#fbfcfe; text-align:left; cursor:pointer; transition:border-color .18s ease,background-color .18s ease; }
.summary-item:hover { border-color:#8aa9d4; background:#f5f8fd; }
.summary-item.active { border-color:#1652b8; background:#f0f5fc; }
.summary-item:focus-visible { outline:2px solid #1652b8; outline-offset:2px; }
.summary-item span,.summary-item small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.summary-item span { color:#4c5967; font-size:12px; }
.summary-item strong { display:block; margin:3px 0 1px; color:#23364a; font-size:25px; line-height:1.3; }
.summary-item small { color:#6c7782; font-size:10.5px; }
.mode-switch { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; margin:20px 0; padding-bottom:16px; border-bottom:1px solid #edf0f3; }
.list-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:12px; }
.list-heading h3 { margin:0; color:#303b49; font-size:15px; font-weight:650; }
.list-heading p { margin:4px 0 0; color:#707a85; font-size:12px; line-height:1.6; }
.list-total { flex:none; padding-top:2px; color:#66717e; font-size:12px; }
.list-total strong { color:#1652b8; font-size:18px; }
.enterprise-list { display:flex; flex-direction:column; gap:10px; }
.enterprise-item { padding:14px; border:1px solid #e4e9ef; border-radius:7px; background:#fff; }
.enterprise-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
.enterprise-head h4 { margin:0; color:#2d3b49; font-size:14px; font-weight:650; line-height:1.55; }
.enterprise-head p { margin:4px 0 0; color:#687582; font-size:12px; }
.enterprise-head :deep(.ant-tag) { flex:none; margin-inline-end:0; }
.address-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:12px; padding-top:11px; border-top:1px solid #f0f2f5; }
.address-row { display:flex; align-items:flex-start; gap:8px; min-width:0; color:#4c5864; font-size:12px; line-height:1.65; }
.address-label { flex:none; color:#77818b; }
.address-row small { display:block; color:#7b858f; font-size:11px; }
.analysis-empty { margin:54px 0; }
.list-pagination { display:flex; justify-content:flex-end; margin-top:18px; }
@media (max-width:640px) {
  .analysis-summary { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .address-grid { grid-template-columns:1fr; }
  .mode-switch { align-items:flex-start; flex-direction:column; }
  .enterprise-head { flex-direction:column; gap:7px; }
}
@media (prefers-reduced-motion:reduce) {
  .summary-item { transition:none; }
}
</style>
