<template>
  <div>
    <PageCard>
      <div class="chart-head">
        <div>
          <div class="detail-title">产业图谱</div>
          <div class="text-muted">以产业链为主线，洞察上中下游企业分布与协同关系</div>
        </div>
        <div class="flex gap8">
          <a-button><DownloadOutlined /> 导出图谱</a-button>
          <a-button type="primary" @click="msg.success('图谱已刷新（演示）')"><ReloadOutlined /> 刷新数据</a-button>
        </div>
      </div>
      <div class="underline-tabs" style="margin-bottom: 0">
        <span v-for="i in industryTabs" :key="i" class="utab" :class="{ active: industry === i }" @click="industry = i">{{ i }}</span>
      </div>
    </PageCard>

    <div class="stat-row grid4" style="margin-bottom: 0">
      <StatCard title="产业链企业总数" value="2,386" unit="家" tone="info" />
      <StatCard title="链主企业" value="32" unit="家" tone="purple" />
      <StatCard title="专精特新企业" value="186" unit="家" tone="success" />
      <StatCard title="近一年新增" value="264" unit="家" tone="warning" />
    </div>

    <PageCard title="产业链结构" :sub="industry + '产业链 · 点击节点查看企业明细'">
      <div class="chain">
        <div v-for="(layer, li) in chainData" :key="layer.name" class="chain-layer">
          <div class="layer-head">
            <span class="layer-no">{{ li + 1 }}</span>
            <span>{{ layer.name }}</span>
          </div>
          <div class="layer-nodes">
            <div v-for="node in layer.children" :key="node.name" class="chain-node" @click="openNode(node, layer.name)">
              <div class="node-name">{{ node.name }}</div>
              <div class="node-count">{{ node.count }} 家企业</div>
              <div class="node-bar"><span :style="{ width: Math.min(100, node.count / 2.2) + '%' }"></span></div>
              <div class="node-tags">
                <span v-for="c in node.companies.slice(0, 2)" :key="c">{{ c }}</span>
              </div>
            </div>
          </div>
          <div v-if="li < chainData.length - 1" class="chain-arrow"><ArrowDownOutlined /></div>
        </div>
      </div>
    </PageCard>

    <div class="grid2">
      <PageCard title="企业规模分布">
        <ChartBox :option="scaleOption" :height="250" />
      </PageCard>
      <PageCard title="各区产业链企业分布">
        <ChartBox :option="districtOption" :height="250" />
      </PageCard>
    </div>

    <a-drawer v-model:open="nodeOpen" :title="selectedNode?.name + ' · 企业明细'" width="480px">
      <template v-if="selectedNode">
        <div class="node-drawer-head">
          <span class="tag-soft blue">{{ selectedLayer }}</span>
          <span class="text-muted">共 {{ selectedNode.count }} 家企业</span>
        </div>
        <div v-for="(c, i) in selectedCompanies" :key="c" class="node-company">
          <div class="company-avatar">{{ c.slice(0, 1) }}</div>
          <div class="company-info">
            <div class="company-name">{{ c }}</div>
            <div class="company-meta">{{ selectedNode.name }} · {{ ['头部企业', '高成长企业', '创新型企业'][i % 3] }}</div>
          </div>
          <a class="link">查看</a>
        </div>
        <a-divider />
        <div class="text-muted">该环节企业主要分布在浦东新区、徐汇区、闵行区，近一年新增 26 家。</div>
      </template>
    </a-drawer>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { message } from 'ant-design-vue';
import { DownloadOutlined, ReloadOutlined, ArrowDownOutlined } from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import StatCard from '../components/StatCard.vue';
import ChartBox from '../components/ChartBox.vue';
import { industryChainTree, companyNames } from '../data/mock';

const msg = message;
const industryTabs = ['人工智能', '生物医药', '集成电路', '新能源汽车', '高端装备'];
const industry = ref('人工智能');
const chainData = computed(() => (industry.value === '人工智能' ? industryChainTree.children : industryChainTree.children));
const nodeOpen = ref(false);
const selectedNode = ref(null);
const selectedLayer = ref('');
const selectedCompanies = computed(() => (selectedNode.value ? [...selectedNode.value.companies, ...companyNames].slice(0, 6) : []));
function openNode(node, layer) {
  selectedNode.value = node;
  selectedLayer.value = layer;
  nodeOpen.value = true;
}

const scaleOption = {
  tooltip: { trigger: 'item' },
  legend: { bottom: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { fontSize: 11, color: '#667085' } },
  series: [{
    type: 'pie', radius: ['42%', '68%'], center: ['50%', '44%'],
    label: { show: false },
    data: [
      { value: 68, name: '大型企业', itemStyle: { color: '#4a62e7' } },
      { value: 42, name: '中型企业', itemStyle: { color: '#52c7b8' } },
      { value: 56, name: '小型企业', itemStyle: { color: '#8b5cf6' } },
      { value: 28, name: '微型企业', itemStyle: { color: '#f5a623' } },
    ],
  }],
};
const districtOption = {
  grid: { left: 40, right: 16, top: 20, bottom: 30 },
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'category', data: ['浦东', '徐汇', '闵行', '杨浦', '嘉定', '松江', '宝山', '静安'],
    axisLabel: { fontSize: 10, color: '#98a2b3' }, axisLine: { lineStyle: { color: '#e4e7ec' } }, axisTick: { show: false },
  },
  yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#98a2b3' }, splitLine: { lineStyle: { color: '#f2f4f7', type: 'dashed' } } },
  series: [{
    type: 'bar', barWidth: 18, data: [680, 420, 310, 260, 210, 186, 160, 140],
    itemStyle: { color: '#4a62e7', borderRadius: [3, 3, 0, 0] },
  }],
};
</script>

<style scoped>
.chart-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
.detail-title { font-size: 20px; font-weight: 600; margin-bottom: 5px; }
.chain { display: flex; flex-direction: column; gap: 4px; }
.chain-layer { position: relative; }
.layer-head { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 14px; color: #344054; margin-bottom: 12px; }
.layer-no { width: 20px; height: 20px; border-radius: 50%; background: #eef1fe; color: #4a62e7; font-size: 11px; display: flex; align-items: center; justify-content: center; }
.layer-nodes { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.chain-node { border: 1px solid #e7eaf3; border-radius: 8px; padding: 14px; cursor: pointer; transition: all .15s; background: #fbfcff; }
.chain-node:hover { border-color: #b7c3f6; box-shadow: 0 4px 14px rgba(74, 98, 231, .12); transform: translateY(-1px); }
.node-name { font-size: 13.5px; font-weight: 600; color: #344054; }
.node-count { font-size: 11px; color: #8b93a7; margin: 5px 0 8px; }
.node-bar { height: 5px; border-radius: 3px; background: #eef0f5; overflow: hidden; }
.node-bar span { display: block; height: 100%; background: linear-gradient(90deg, #4a62e7, #52c7b8); }
.node-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 9px; }
.node-tags span { font-size: 10px; color: #667085; background: #f2f4f8; border-radius: 2px; padding: 1px 6px; }
.chain-arrow { display: flex; justify-content: center; color: #b7c3f6; font-size: 18px; padding: 8px 0; }
.node-drawer-head { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; }
.node-company { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f4f5f9; }
.company-avatar { width: 34px; height: 34px; border-radius: 6px; background: #eef1fe; color: #4a62e7; display: flex; align-items: center; justify-content: center; font-size: 13px; }
.company-info { flex: 1; }
.company-name { font-size: 12.5px; color: #344054; }
.company-meta { font-size: 11px; color: #98a2b3; margin-top: 3px; }
</style>
