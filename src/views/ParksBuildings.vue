<template>
  <div>
    <div class="page-head">
      <h2>园区楼宇</h2>
      <p>汇聚区域内重点产业园区与商务楼宇，掌握载体空间与入驻动态</p>
    </div>
    <PageCard>
      <div class="filter-row">
        <span class="filter-label">所属区域</span>
        <a-select v-model:value="filters.district" style="width: 140px">
          <a-select-option value="">全部区域</a-select-option>
          <a-select-option v-for="d in districts" :key="d" :value="d">{{ d }}</a-select-option>
        </a-select>
        <span class="filter-label">载体类型</span>
        <a-select v-model:value="filters.type" style="width: 140px">
          <a-select-option value="">全部类型</a-select-option>
          <a-select-option value="特色产业园">特色产业园</a-select-option>
          <a-select-option value="综合园区">综合园区</a-select-option>
        </a-select>
        <a-input-search v-model:value="keyword" placeholder="请输入园区 / 楼宇名称" style="width: 250px" />
        <a-button type="primary">查询</a-button>
        <a-button @click="moreOpen = !moreOpen">更多筛选 <DownOutlined /></a-button>
        <div style="margin-left: auto">
          <a-button type="primary" @click="addOpen = true"><PlusOutlined /> 新增载体</a-button>
        </div>
      </div>
      <div v-if="moreOpen" class="more-filters">
        <span>产业方向</span>
        <a-checkable-tag v-for="t in ['生物医药', '集成电路', '人工智能', '数字经济', '新能源']" :key="t" :checked="moreTags.includes(t)" @change="(c) => toggleTag(t, c)">{{ t }}</a-checkable-tag>
        <span style="margin-left: 18px">可租面积</span>
        <a-slider v-model:value="areaRange" range :min="0" :max="200" style="width: 200px" />
      </div>
    </PageCard>

    <div class="stat-row grid4" style="margin-bottom: 0">
      <StatCard title="园区总数" value="15" unit="个" tone="info" foot="其中国家级 4 个" />
      <StatCard title="楼宇总数" value="268" unit="栋" tone="purple" foot="可租楼宇 86 栋" />
      <StatCard title="可租面积" value="36.8" unit="万㎡" tone="success" foot="较上月 +2.1 万㎡" />
      <StatCard title="平均入驻率" value="92.3" unit="%" tone="warning" foot="高于全市平均 3.2%" />
    </div>

    <PageCard>
      <div class="flex-between mb12">
        <div class="segmented">
          <span class="seg" :class="{ active: view === 'card' }" @click="view = 'card'">卡片</span>
          <span class="seg" :class="{ active: view === 'list' }" @click="view = 'list'">列表</span>
        </div>
        <span class="text-muted">共 {{ filteredParks.length }} 个载体</span>
      </div>
      <div v-if="view === 'card'" class="park-grid">
        <div v-for="p in filteredParks" :key="p.id" class="park-card" @click="$router.push('/park/detail/' + p.id)">
          <div class="park-top">
            <div class="park-badge">{{ p.name.slice(0, 2) }}</div>
            <div>
              <div class="park-card-name">{{ p.name }}</div>
              <div class="park-card-meta">{{ p.district }} · {{ p.type }}</div>
            </div>
            <span class="tag-soft" :class="p.occupancy > 90 ? 'green' : 'orange'">{{ p.occupancy > 90 ? '热租中' : '招商中' }}</span>
          </div>
          <div class="park-metrics">
            <div><em>楼宇</em><b>{{ p.buildings }} 栋</b></div>
            <div><em>入驻企业</em><b>{{ p.enterprises }} 家</b></div>
            <div><em>总面积</em><b>{{ p.area }}</b></div>
          </div>
          <div class="park-occupancy">
            <div class="flex-between"><span>入驻率</span><b>{{ p.occupancy }}%</b></div>
            <a-progress :percent="p.occupancy" show-info="false" :stroke-color="p.occupancy > 90 ? '#2fa45f' : '#4a62e7'" size="small" />
          </div>
          <div class="park-foot">
            <span><EnvironmentOutlined /> {{ p.address }}</span>
            <a class="link">查看详情 <ArrowRightOutlined /></a>
          </div>
        </div>
      </div>
      <a-table v-else :columns="columns" :data-source="filteredParks" :pagination="{ pageSize: 8 }" :row-key="(r) => r.id" size="middle">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <a class="link" @click="$router.push('/park/detail/' + record.id)">{{ record.name }}</a>
          </template>
          <template v-else-if="column.key === 'occupancy'">
            <a-progress :percent="record.occupancy" size="small" :stroke-color="'#4a62e7'" />
          </template>
          <template v-else-if="column.key === 'action'">
            <a @click="$router.push('/park/detail/' + record.id)">查看</a>
          </template>
        </template>
      </a-table>
    </PageCard>

    <a-modal v-model:open="addOpen" title="新增园区载体" @ok="savePark">
      <a-form layout="vertical">
        <a-form-item label="载体名称" required><a-input v-model:value="addForm.name" placeholder="请输入园区 / 楼宇名称" /></a-form-item>
        <div class="grid2">
          <a-form-item label="所属区域">
            <a-select v-model:value="addForm.district"><a-select-option v-for="d in districts" :key="d" :value="d">{{ d }}</a-select-option></a-select>
          </a-form-item>
          <a-form-item label="载体类型">
            <a-select v-model:value="addForm.type"><a-select-option value="特色产业园">特色产业园</a-select-option><a-select-option value="综合园区">综合园区</a-select-option></a-select>
          </a-form-item>
        </div>
        <a-form-item label="详细地址"><a-input v-model:value="addForm.address" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { message } from 'ant-design-vue';
import { PlusOutlined, DownOutlined, EnvironmentOutlined, ArrowRightOutlined } from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import StatCard from '../components/StatCard.vue';
import { parks as seedParks, districts } from '../data/mock';

const msg = message;
const filters = reactive({ district: '', type: '' });
const keyword = ref('');
const moreOpen = ref(false);
const moreTags = ref(['生物医药', '人工智能']);
const areaRange = ref([20, 120]);
const view = ref('card');
const parks = ref([...seedParks]);
const filteredParks = computed(() => parks.value.filter((p) => {
  if (filters.district && p.district !== filters.district) return false;
  if (filters.type && p.type !== filters.type) return false;
  if (keyword.value && !p.name.includes(keyword.value)) return false;
  return true;
}));
function toggleTag(t, checked) {
  moreTags.value = checked ? [...moreTags.value, t] : moreTags.value.filter((i) => i !== t);
}
const columns = [
  { title: '园区名称', key: 'name' },
  { title: '所属区域', dataIndex: 'district', width: 100 },
  { title: '类型', dataIndex: 'type', width: 110 },
  { title: '楼宇数', dataIndex: 'buildings', width: 80 },
  { title: '入驻企业', dataIndex: 'enterprises', width: 100 },
  { title: '总面积', dataIndex: 'area', width: 110 },
  { title: '入驻率', key: 'occupancy', width: 160 },
  { title: '操作', key: 'action', width: 80 },
];
const addOpen = ref(false);
const addForm = reactive({ name: '', district: '浦东新区', type: '特色产业园', address: '' });
function savePark() {
  if (!addForm.name) {
    msg.warning('请填写载体名称');
    return;
  }
  parks.value.unshift({ id: 'K' + (100 + parks.value.length), name: addForm.name, district: addForm.district, type: addForm.type, buildings: 0, area: '0 万㎡', occupancy: 0, enterprises: 0, manager: '顾龙飞', phone: '-', address: addForm.address || '-', intro: '新增园区载体。' });
  addOpen.value = false;
  msg.success('园区载体新增成功');
}
</script>

<style scoped>
.more-filters { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 12px; padding-top: 12px; border-top: 1px dashed #eef0f5; font-size: 12px; color: #667085; }
.park-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.park-card { border: 1px solid #e8ebf2; border-radius: 8px; padding: 16px; cursor: pointer; transition: all .16s; background: #fff; }
.park-card:hover { border-color: #b7c3f6; box-shadow: 0 8px 24px rgba(20, 37, 100, .08); transform: translateY(-2px); }
.park-top { display: flex; gap: 10px; align-items: flex-start; }
.park-badge { width: 38px; height: 38px; border-radius: 8px; background: linear-gradient(135deg, #4a62e7, #7c92ff); color: #fff; font-size: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.park-card-name { font-size: 13.5px; font-weight: 600; color: #344054; line-height: 1.5; }
.park-card-meta { font-size: 11px; color: #98a2b3; margin-top: 3px; }
.park-top .tag-soft { margin-left: auto; flex-shrink: 0; }
.park-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 14px 0 10px; background: #f8fafd; border-radius: 6px; padding: 10px; }
.park-metrics em { font-style: normal; display: block; font-size: 10.5px; color: #98a2b3; margin-bottom: 3px; }
.park-metrics b { font-size: 13px; color: #344054; font-weight: 600; }
.park-occupancy { font-size: 11px; color: #8b93a7; }
.park-occupancy b { color: #344054; }
.park-foot { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 12px; padding-top: 10px; border-top: 1px dashed #eef0f5; font-size: 11px; color: #98a2b3; }
.park-foot span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.park-foot .link { flex-shrink: 0; }
@media (max-width: 1400px) { .park-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 900px) { .park-grid { grid-template-columns: 1fr; } }
</style>
