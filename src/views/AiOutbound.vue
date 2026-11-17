<template>
  <div>
    <PageCard>
      <div class="ai-head">
        <div>
          <div class="detail-title"><RobotOutlined style="color: #4a62e7" /> AI 外呼中心</div>
          <div class="text-muted">智能外呼提升招商触达效率，通话数据自动沉淀至线索池</div>
        </div>
        <div class="flex gap8">
          <span class="ai-status"><i></i> 线路正常</span>
          <a-button type="primary" @click="addOpen = true"><PlusOutlined /> 新建外呼任务</a-button>
        </div>
      </div>
      <div class="pill-tabs">
        <span v-for="t in tabs" :key="t.key" class="pill-tab" :class="{ active: activeTab === t.key }" @click="switchTab(t)">
          <component :is="t.icon" />
          {{ t.label }}
          <span class="pill-count">{{ t.count }}</span>
        </span>
      </div>
    </PageCard>

    <template v-if="activeTab === 'tasks'">
      <div class="stat-row grid4" style="margin-bottom: 14px">
        <StatCard title="外呼任务" value="26" unit="个" tone="info" foot="进行中 8 个" />
        <StatCard title="累计外呼" value="12,680" unit="通" tone="purple" />
        <StatCard title="接通率" value="76.8" unit="%" tone="success" />
        <StatCard title="意向客户" value="386" unit="个" tone="warning" foot="意向率 4.0%" />
      </div>
      <PageCard>
        <div class="filter-row">
          <a-input-search v-model:value="taskKeyword" placeholder="搜索任务名称" style="width: 240px" />
          <a-select v-model:value="taskStatus" placeholder="任务状态" style="width: 140px" allow-clear>
            <a-select-option v-for="s in ['进行中', '已完成', '待启动', '已暂停']" :key="s" :value="s">{{ s }}</a-select-option>
          </a-select>
          <a-select v-model:value="taskScene" placeholder="外呼场景" style="width: 160px" allow-clear>
            <a-select-option v-for="s in ['招商线索首访', '园区服务回访', '政策宣讲邀约', '政策申报提醒', '安商稳商关怀']" :key="s" :value="s">{{ s }}</a-select-option>
          </a-select>
          <a-button type="primary">查询</a-button>
        </div>
      </PageCard>
      <PageCard title="外呼任务列表">
        <a-table :columns="taskColumns" :data-source="filteredTasks" :pagination="{ pageSize: 6 }" :row-key="(r) => r.id" size="middle">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'progress'">
              <div class="task-progress">
                <a-progress :percent="Math.round((record.connected / record.total) * 100)" size="small" :stroke-color="'#4a62e7'" />
                <span>{{ record.connected }} / {{ record.total }}</span>
              </div>
            </template>
            <template v-else-if="column.key === 'status'">
              <span class="tag-soft" :class="record.status === '进行中' ? 'blue' : record.status === '已完成' ? 'green' : record.status === '待启动' ? 'orange' : 'gray'">{{ record.status }}</span>
            </template>
            <template v-else-if="column.key === 'action'">
              <a v-if="record.status === '进行中'" @click="toggleTask(record, '已暂停')">暂停</a>
              <a v-else-if="record.status === '已暂停' || record.status === '待启动'" @click="toggleTask(record, '进行中')">启动</a>
              <a v-else @click="msg.info('任务已结束')">查看</a>
              <a-divider type="vertical" />
              <a @click="openScript(record)">话术配置</a>
            </template>
          </template>
        </a-table>
      </PageCard>
    </template>

    <template v-else-if="activeTab === 'records'">
      <div class="stat-row grid4" style="margin-bottom: 14px">
        <StatCard title="通话总数" value="12,680" unit="通" tone="info" />
        <StatCard title="接通率" value="76.8" unit="%" tone="success" />
        <StatCard title="平均通话时长" value="02:46" tone="purple" />
        <StatCard title="高意向客户" value="126" unit="个" tone="warning" />
      </div>
      <PageCard>
        <div class="filter-row">
          <a-input-search v-model:value="recordKeyword" placeholder="搜索企业名称 / 手机号" style="width: 250px" />
          <a-select v-model:value="recordResult" placeholder="通话结果" style="width: 140px" allow-clear>
            <a-select-option v-for="s in ['有意向', '需跟进', '未接通', '拒绝']" :key="s" :value="s">{{ s }}</a-select-option>
          </a-select>
          <a-select v-model:value="recordIntent" placeholder="意向等级" style="width: 130px" allow-clear>
            <a-select-option value="高">高</a-select-option>
            <a-select-option value="中">中</a-select-option>
            <a-select-option value="低">低</a-select-option>
          </a-select>
          <a-range-picker />
          <a-button type="primary">查询</a-button>
          <a-button style="margin-left: auto" @click="msg.success('通话记录已导出（演示）')"><DownloadOutlined /> 导出</a-button>
        </div>
      </PageCard>
      <PageCard title="通话记录" :sub="`共 ${filteredRecords.length} 条`">
        <a-table :columns="recordColumns" :data-source="filteredRecords" :pagination="{ pageSize: 8 }" :row-key="(r) => r.id" size="middle">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'result'">
              <span class="tag-soft" :class="record.result === '有意向' ? 'green' : record.result === '需跟进' ? 'blue' : record.result === '未接通' ? 'gray' : 'red'">{{ record.result }}</span>
            </template>
            <template v-else-if="column.key === 'intent'">
              <span class="tag-soft" :class="record.intent === '高' ? 'red' : record.intent === '中' ? 'orange' : 'gray'">{{ record.intent }}</span>
            </template>
            <template v-else-if="column.key === 'action'">
              <a @click="openAudio(record)"><PlayCircleOutlined /> 录音</a>
              <a-divider type="vertical" />
              <a @click="msg.success('已加入线索池（演示）')">加入线索</a>
            </template>
          </template>
        </a-table>
      </PageCard>
    </template>

    <template v-else>
      <div class="stat-row grid4" style="margin-bottom: 14px">
        <StatCard title="累计外呼" value="12,680" unit="通" tone="info" foot="较上月 +18.2%" />
        <StatCard title="有效通话" value="9,742" unit="通" tone="success" />
        <StatCard title="意向转化" value="386" unit="个" tone="purple" foot="意向转化率 4.0%" />
        <StatCard title="节省人力" value="1,280" unit="小时" tone="warning" />
      </div>
      <div class="grid2">
        <PageCard title="近 7 日外呼趋势">
          <ChartBox :option="trendOption" :height="280" />
        </PageCard>
        <PageCard title="通话结果分布">
          <ChartBox :option="resultOption" :height="280" />
        </PageCard>
        <PageCard title="意向等级分布">
          <ChartBox :option="intentOption" :height="280" />
        </PageCard>
        <PageCard title="场景外呼效果">
          <ChartBox :option="sceneOption" :height="280" />
        </PageCard>
      </div>
    </template>

    <a-modal v-model:open="addOpen" title="新建外呼任务" width="620px" @ok="saveTask">
      <a-form layout="vertical">
        <a-form-item label="任务名称" required><a-input v-model:value="taskForm.name" placeholder="请输入任务名称" /></a-form-item>
        <div class="grid2">
          <a-form-item label="外呼场景">
            <a-select v-model:value="taskForm.scene"><a-select-option v-for="s in ['招商线索首访', '园区服务回访', '政策宣讲邀约', '政策申报提醒', '安商稳商关怀']" :key="s" :value="s">{{ s }}</a-select-option></a-select>
          </a-form-item>
          <a-form-item label="外呼话术">
            <a-select v-model:value="taskForm.script"><a-select-option v-for="s in ['招商邀约话术 V3', '园区服务回访话术 V2', '政策宣讲邀约话术 V1', '申报提醒话术 V2']" :key="s" :value="s">{{ s }}</a-select-option></a-select>
          </a-form-item>
          <a-form-item label="目标企业数"><a-input-number v-model:value="taskForm.total" :min="1" style="width: 100%" /></a-form-item>
          <a-form-item label="负责人">
            <a-select v-model:value="taskForm.owner"><a-select-option v-for="o in ['顾龙飞', '李婷', '王凯', '陈晨']" :key="o" :value="o">{{ o }}</a-select-option></a-select>
          </a-form-item>
        </div>
        <a-form-item label="目标企业"><a-textarea v-model:value="taskForm.targets" :rows="3" placeholder="可从企业查询 / 商机大厅批量导入目标企业" /></a-form-item>
      </a-form>
    </a-modal>

    <a-drawer v-model:open="scriptOpen" title="AI 外呼话术配置" width="560px">
      <template v-if="currentTask">
        <div class="flex gap8 mb16">
          <span class="tag-soft blue">{{ currentTask.scene }}</span>
          <span class="tag-soft gray">{{ currentTask.script }}</span>
        </div>
        <a-form layout="vertical">
          <a-form-item label="话术名称"><a-input v-model:value="scriptForm.name" /></a-form-item>
          <a-form-item label="开场白"><a-textarea v-model:value="scriptForm.opening" :rows="3" /></a-form-item>
          <a-form-item label="核心卖点"><a-textarea v-model:value="scriptForm.selling" :rows="3" /></a-form-item>
          <a-form-item label="异议处理"><a-textarea v-model:value="scriptForm.objection" :rows="3" /></a-form-item>
          <a-form-item label="意向识别关键词">
            <a-select v-model:value="scriptForm.keywords" mode="tags" style="width: 100%" placeholder="输入关键词后回车" />
          </a-form-item>
          <a-form-item label="外呼时间">
            <a-time-range-picker v-model:value="scriptForm.time" format="HH:mm" style="width: 100%" />
          </a-form-item>
        </a-form>
        <div class="drawer-actions">
          <a-button @click="msg.success('话术测试已发起（演示）')">试听</a-button>
          <a-button type="primary" @click="saveScript">保存配置</a-button>
        </div>
      </template>
    </a-drawer>

    <a-modal v-model:open="audioOpen" title="通话录音" width="520px" :footer="null">
      <template v-if="currentRecord">
        <div class="audio-head">
          <div>
            <div class="audio-company">{{ currentRecord.company }}</div>
            <div class="text-muted">{{ currentRecord.phone }} · {{ currentRecord.time }} · 时长 {{ currentRecord.duration }}</div>
          </div>
          <span class="tag-soft" :class="currentRecord.result === '有意向' ? 'green' : 'blue'">{{ currentRecord.result }}</span>
        </div>
        <div class="audio-player">
          <PlayCircleOutlined class="audio-play" />
          <div class="waveform">
            <span v-for="n in 40" :key="n" :style="{ height: 6 + ((n * 13) % 26) + 'px' }"></span>
          </div>
          <span class="audio-time">{{ currentRecord.duration }}</span>
        </div>
        <a-divider />
        <div class="transcript">
          <div class="tr-row"><b>AI：</b>您好，这里是临港新片区招商服务中心，请问是{{ currentRecord.company }}吗？</div>
          <div class="tr-row"><b>客户：</b>是的，请问有什么事？</div>
          <div class="tr-row"><b>AI：</b>我们注意到贵司近期有扩大研发布局的计划，临港新片区在载体、人才与政策方面都有专项支持，想邀请您来园区实地考察。</div>
          <div class="tr-row"><b>客户：</b>可以，先把资料发我看看，下周可能有时间过去。</div>
          <div class="tr-row"><b>AI：</b>好的，稍后我们会将园区资料与政策汇编发送到您的手机，感谢您的时间。</div>
        </div>
        <div class="drawer-actions">
          <a-button @click="msg.success('录音下载中（演示）')">下载录音</a-button>
          <a-button type="primary" @click="msg.success('已标记为高意向客户（演示）')">标记高意向</a-button>
        </div>
      </template>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import {
  RobotOutlined, PlusOutlined, UnorderedListOutlined, PhoneOutlined, DashboardOutlined,
  DownloadOutlined, PlayCircleOutlined,
} from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import StatCard from '../components/StatCard.vue';
import ChartBox from '../components/ChartBox.vue';
import { aiTasks, aiRecords } from '../data/mock';

const msg = message;
const route = useRoute();
const router = useRouter();
const activeTab = computed(() => (route.name === 'AiRecords' ? 'records' : route.name === 'AiDashboard' ? 'dashboard' : 'tasks'));
const tabs = [
  { key: 'tasks', label: '外呼任务', icon: UnorderedListOutlined, path: '/business/aiOutbound/tasks', count: 26 },
  { key: 'records', label: '通话记录', icon: PhoneOutlined, path: '/business/aiOutbound/records', count: 12680 },
  { key: 'dashboard', label: '数据看板', icon: DashboardOutlined, path: '/business/aiOutbound/dashboard', count: 0 },
];
function switchTab(t) {
  router.push(t.path);
}

const taskKeyword = ref('');
const taskStatus = ref();
const taskScene = ref();
const tasks = ref([...aiTasks]);
const filteredTasks = computed(() => tasks.value.filter((t) => {
  if (taskKeyword.value && !t.name.includes(taskKeyword.value)) return false;
  if (taskStatus.value && t.status !== taskStatus.value) return false;
  if (taskScene.value && t.scene !== taskScene.value) return false;
  return true;
}));
const taskColumns = [
  { title: '任务名称', dataIndex: 'name' },
  { title: '外呼场景', dataIndex: 'scene', width: 130 },
  { title: '外呼话术', dataIndex: 'script', width: 150 },
  { title: '任务进度', key: 'progress', width: 220 },
  { title: '意向客户', dataIndex: 'intent', width: 90 },
  { title: '负责人', dataIndex: 'owner', width: 90 },
  { title: '创建时间', dataIndex: 'created', width: 110 },
  { title: '状态', key: 'status', width: 90 },
  { title: '操作', key: 'action', width: 130 },
];
function toggleTask(row, status) {
  row.status = status;
  msg.success(`任务已${status === '进行中' ? '启动' : '暂停'}`);
}

const recordKeyword = ref('');
const recordResult = ref();
const recordIntent = ref();
const records = ref([...aiRecords]);
const filteredRecords = computed(() => records.value.filter((r) => {
  if (recordKeyword.value && !r.company.includes(recordKeyword.value) && !r.phone.includes(recordKeyword.value)) return false;
  if (recordResult.value && r.result !== recordResult.value) return false;
  if (recordIntent.value && r.intent !== recordIntent.value) return false;
  return true;
}));
const recordColumns = [
  { title: '企业名称', dataIndex: 'company' },
  { title: '手机号', dataIndex: 'phone', width: 120 },
  { title: '外呼任务', dataIndex: 'task', width: 210 },
  { title: '通话时长', dataIndex: 'duration', width: 90 },
  { title: '通话结果', key: 'result', width: 90 },
  { title: '意向等级', key: 'intent', width: 90 },
  { title: '通话时间', dataIndex: 'time', width: 140 },
  { title: '操作', key: 'action', width: 150 },
];

const addOpen = ref(false);
const taskForm = reactive({ name: '', scene: '招商线索首访', script: '招商邀约话术 V3', total: 100, owner: '顾龙飞', targets: '' });
function saveTask() {
  if (!taskForm.name) {
    msg.warning('请填写任务名称');
    return;
  }
  tasks.value.unshift({ id: 'AI' + (100 + tasks.value.length), name: taskForm.name, scene: taskForm.scene, status: '待启动', total: taskForm.total, connected: 0, intent: 0, owner: taskForm.owner, created: '2026-11-17', script: taskForm.script });
  addOpen.value = false;
  taskForm.name = '';
  msg.success('外呼任务创建成功');
}

const scriptOpen = ref(false);
const currentTask = ref(null);
const scriptForm = reactive({
  name: '招商邀约话术 V3',
  opening: '您好，这里是临港新片区招商服务中心，请问是{{企业名称}}吗？',
  selling: '临港新片区拥有完善的产业载体、人才政策与专项资金支持，可为贵司提供定制化落地服务。',
  objection: '如企业表示暂时没有计划，可约定后续发送资料并在一个月后回访。',
  keywords: ['扩产', '研发中心', '选址', '政策'],
  time: null,
});
function openScript(row) {
  currentTask.value = row;
  scriptOpen.value = true;
}
function saveScript() {
  scriptOpen.value = false;
  msg.success('话术配置已保存');
}

const audioOpen = ref(false);
const currentRecord = ref(null);
function openAudio(row) {
  currentRecord.value = row;
  audioOpen.value = true;
}

const trendOption = {
  tooltip: { trigger: 'axis' },
  legend: { top: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 4, textStyle: { fontSize: 11, color: '#667085' } },
  grid: { left: 45, right: 20, top: 34, bottom: 26 },
  xAxis: { type: 'category', data: ['11-11', '11-12', '11-13', '11-14', '11-15', '11-16', '11-17'], axisLabel: { fontSize: 10, color: '#98a2b3' }, axisLine: { lineStyle: { color: '#e4e7ec' } }, axisTick: { show: false } },
  yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#98a2b3' }, splitLine: { lineStyle: { color: '#f2f4f7', type: 'dashed' } } },
  series: [
    { name: '外呼量', type: 'bar', barWidth: 14, data: [1260, 1480, 1620, 1580, 1860, 2100, 920], itemStyle: { color: '#c7d2fe', borderRadius: [3, 3, 0, 0] } },
    { name: '接通量', type: 'line', smooth: true, symbol: 'circle', symbolSize: 4, data: [960, 1120, 1250, 1190, 1420, 1600, 706], lineStyle: { color: '#4a62e7', width: 2 }, itemStyle: { color: '#4a62e7' } },
  ],
};
const resultOption = {
  tooltip: { trigger: 'item' },
  legend: { bottom: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { fontSize: 11, color: '#667085' } },
  series: [{
    type: 'pie', radius: ['42%', '68%'], center: ['50%', '44%'], label: { show: false },
    data: [
      { value: 386, name: '有意向', itemStyle: { color: '#2fa45f' } },
      { value: 1260, name: '需跟进', itemStyle: { color: '#4a62e7' } },
      { value: 2860, name: '未接通', itemStyle: { color: '#cbd5e1' } },
      { value: 420, name: '拒绝', itemStyle: { color: '#f5a623' } },
    ],
  }],
};
const intentOption = {
  grid: { left: 36, right: 18, top: 20, bottom: 26 },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: ['高意向', '中意向', '低意向', '无意向'], axisLabel: { fontSize: 10, color: '#98a2b3' }, axisLine: { lineStyle: { color: '#e4e7ec' } }, axisTick: { show: false } },
  yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#98a2b3' }, splitLine: { lineStyle: { color: '#f2f4f7', type: 'dashed' } } },
  series: [{ type: 'bar', barWidth: 26, data: [386, 1260, 1820, 2860], itemStyle: { color: '#8b5cf6', borderRadius: [4, 4, 0, 0] } }],
};
const sceneOption = {
  grid: { left: 100, right: 30, top: 10, bottom: 20 },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#98a2b3' }, splitLine: { lineStyle: { color: '#f2f4f7', type: 'dashed' } } },
  yAxis: { type: 'category', data: ['安商稳商关怀', '园区服务回访', '政策宣讲邀约', '政策申报提醒', '招商线索首访'], axisLabel: { fontSize: 10, color: '#667085' }, axisLine: { show: false }, axisTick: { show: false } },
  series: [{ type: 'bar', barWidth: 13, data: [62, 74, 81, 88, 96], itemStyle: { color: '#52c7b8', borderRadius: [0, 5, 5, 0] } }],
};
</script>

<style scoped>
.ai-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; gap: 16px; }
.detail-title { font-size: 19px; font-weight: 600; display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.ai-status { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #2fa45f; background: #f2fbf5; border: 1px solid #ccecd6; border-radius: 14px; padding: 4px 12px; }
.ai-status i { width: 6px; height: 6px; border-radius: 50%; background: #2fa45f; }
.task-progress { display: flex; flex-direction: column; gap: 2px; font-size: 11px; color: #98a2b3; }
.task-progress :deep(.ant-progress) { margin: 0; }
.drawer-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
.audio-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.audio-company { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
.audio-player { display: flex; align-items: center; gap: 12px; background: #f7f9fe; border-radius: 8px; padding: 14px 16px; margin-top: 14px; }
.audio-play { font-size: 30px; color: #4a62e7; cursor: pointer; }
.waveform { flex: 1; display: flex; align-items: center; gap: 2px; height: 38px; overflow: hidden; }
.waveform span { flex: 1; background: #c7d2fe; border-radius: 2px; }
.audio-time { font-size: 12px; color: #8b93a7; }
.transcript { font-size: 12.5px; color: #4b5563; line-height: 2; }
.tr-row b { color: #4a62e7; }
</style>
