<template>
  <div>
    <div class="page-head">
      <h2>企业扩张</h2>
      <p>捕捉企业增资扩产、新设分支与迁移选址信号，抢占招商先机</p>
    </div>
    <div class="stat-row grid4" style="margin-bottom: 14px">
      <StatCard title="线索总数" value="1,682" unit="条" tone="info" />
      <StatCard title="A 级线索" value="286" unit="条" tone="danger" foot="高意向，建议优先跟进" />
      <StatCard title="跟进中" value="468" unit="条" tone="warning" />
      <StatCard title="已签约" value="126" unit="条" tone="success" foot="转化率 7.5%" />
    </div>

    <PageCard>
      <div class="filter-row">
        <a-input-search v-model:value="keyword" placeholder="搜索企业名称" style="width: 220px" />
        <a-select v-model:value="filters.region" placeholder="所在地区" style="width: 150px" allow-clear>
          <a-select-option v-for="r in regions" :key="r" :value="r">{{ r }}</a-select-option>
        </a-select>
        <a-select v-model:value="filters.industry" placeholder="所属行业" style="width: 140px" allow-clear>
          <a-select-option v-for="i in industriesShort" :key="i" :value="i">{{ i }}</a-select-option>
        </a-select>
        <a-select v-model:value="filters.level" placeholder="意向等级" style="width: 120px" allow-clear>
          <a-select-option value="A">A 级</a-select-option>
          <a-select-option value="B">B 级</a-select-option>
          <a-select-option value="C">C 级</a-select-option>
        </a-select>
        <a-select v-model:value="filters.status" placeholder="跟进状态" style="width: 130px" allow-clear>
          <a-select-option v-for="s in ['跟进中', '已对接', '已签约', '已搁置']" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-button type="primary">查询</a-button>
        <div style="margin-left: auto">
          <a-button type="primary" @click="addOpen = true"><PlusOutlined /> 新增线索</a-button>
        </div>
      </div>
    </PageCard>

    <PageCard title="线索列表" :sub="`共 ${filtered.length} 条线索`">
      <template #extra>
        <a-button @click="msg.success('线索数据已导出（演示）')"><DownloadOutlined /> 导出</a-button>
      </template>
      <a-table :columns="columns" :data-source="filtered" :pagination="{ pageSize: 8 }" :row-key="(r) => r.id" size="middle" :scroll="{ x: 1100 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'company'">
            <a class="link" @click="$router.push('/clue/detail/' + record.id)">{{ record.company }}</a>
          </template>
          <template v-else-if="column.key === 'level'">
            <span class="tag-soft" :class="record.level === 'A' ? 'red' : record.level === 'B' ? 'orange' : 'gray'">{{ record.level }} 级</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <span class="tag-soft" :class="record.status === '已签约' ? 'green' : record.status === '跟进中' ? 'blue' : record.status === '已对接' ? 'teal' : 'gray'">{{ record.status }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a @click="$router.push('/clue/detail/' + record.id)">查看详情</a>
            <a-divider type="vertical" />
            <a @click="msg.success('已加入重点跟进（演示）')">跟进</a>
          </template>
        </template>
      </a-table>
    </PageCard>

    <a-modal v-model:open="addOpen" title="新增商机线索" width="640px" @ok="saveClue">
      <a-form layout="vertical">
        <div class="grid2">
          <a-form-item label="企业名称" required><a-input v-model:value="addForm.company" placeholder="请输入企业名称" /></a-form-item>
          <a-form-item label="意向类型"><a-input v-model:value="addForm.intent" placeholder="如：拟设立研发中心" /></a-form-item>
          <a-form-item label="所在地区"><a-input v-model:value="addForm.region" placeholder="如：江苏省苏州市" /></a-form-item>
          <a-form-item label="所属行业">
            <a-select v-model:value="addForm.industry"><a-select-option v-for="i in industriesShort" :key="i" :value="i">{{ i }}</a-select-option></a-select>
          </a-form-item>
          <a-form-item label="意向等级">
            <a-select v-model:value="addForm.level"><a-select-option value="A">A 级</a-select-option><a-select-option value="B">B 级</a-select-option><a-select-option value="C">C 级</a-select-option></a-select>
          </a-form-item>
          <a-form-item label="线索来源">
            <a-select v-model:value="addForm.source"><a-select-option v-for="s in ['产业链招商', '商机摸排', '展会活动', '企业扩张']" :key="s" :value="s">{{ s }}</a-select-option></a-select>
          </a-form-item>
        </div>
        <a-form-item label="线索描述"><a-textarea v-model:value="addForm.desc" :rows="3" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { message } from 'ant-design-vue';
import { PlusOutlined, DownloadOutlined } from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import StatCard from '../components/StatCard.vue';
import { clues as seedClues, industriesShort } from '../data/mock';

const msg = message;
const keyword = ref('');
const filters = reactive({ region: undefined, industry: undefined, level: undefined, status: undefined });
const rows = ref([...seedClues]);
const regions = ['北京市', '江苏省苏州市', '广东省深圳市', '浙江省杭州市', '江苏省南京市', '广东省广州市', '四川省成都市', '湖北省武汉市', '陕西省西安市', '安徽省合肥市'];
const filtered = computed(() => rows.value.filter((r) => {
  if (keyword.value && !r.company.includes(keyword.value)) return false;
  if (filters.region && r.region !== filters.region) return false;
  if (filters.industry && r.industry !== filters.industry) return false;
  if (filters.level && r.level !== filters.level) return false;
  if (filters.status && r.status !== filters.status) return false;
  return true;
}));
const columns = [
  { title: '企业名称', key: 'company', width: 280 },
  { title: '意向类型', dataIndex: 'intent', width: 190 },
  { title: '所在地区', dataIndex: 'region', width: 120 },
  { title: '所属行业', dataIndex: 'industry', width: 100 },
  { title: '意向等级', key: 'level', width: 90 },
  { title: '线索来源', dataIndex: 'source', width: 110 },
  { title: '跟进状态', key: 'status', width: 100 },
  { title: '创建时间', dataIndex: 'date', width: 110 },
  { title: '操作', key: 'action', width: 130, fixed: 'right' },
];
const addOpen = ref(false);
const addForm = reactive({ company: '', intent: '', region: '', industry: '集成电路', level: 'A', source: '商机摸排', desc: '' });
function saveClue() {
  if (!addForm.company) {
    msg.warning('请填写企业名称');
    return;
  }
  rows.value.unshift({
    id: 'D' + (100 + rows.value.length), company: addForm.company, intent: addForm.intent || '待补充', region: addForm.region || '-', industry: addForm.industry,
    level: addForm.level, source: addForm.source, contact: '顾龙飞', phone: '-', date: '2026-11-17', status: '跟进中', park: '张江人工智能岛', score: 88, desc: addForm.desc,
  });
  addOpen.value = false;
  addForm.company = '';
  msg.success('商机线索新增成功');
}
</script>
