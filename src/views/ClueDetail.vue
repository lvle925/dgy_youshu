<template>
  <div v-if="clue">
    <div class="detail-back"><a @click="$router.back()"><ArrowLeftOutlined /> 返回</a></div>
    <PageCard>
      <div class="detail-hero">
        <div>
          <div class="detail-title">{{ clue.company }}</div>
          <div class="detail-tags">
            <span class="tag-soft" :class="clue.level === 'A' ? 'red' : clue.level === 'B' ? 'orange' : 'gray'">{{ clue.level }} 级线索</span>
            <span class="tag-soft blue">{{ clue.industry }}</span>
            <span class="tag-soft green">{{ clue.status }}</span>
            <span class="tag-soft gray">{{ clue.source }}</span>
          </div>
          <div class="detail-meta">
            <span><EnvironmentOutlined /> {{ clue.region }}</span>
            <span><UserOutlined /> {{ clue.contact }} {{ clue.phone }}</span>
            <span><CalendarOutlined /> 创建于 {{ clue.date }}</span>
          </div>
        </div>
        <div class="detail-actions">
          <a-button @click="followOpen = true"><EditOutlined /> 添加跟进</a-button>
          <a-button @click="msg.success('已转入 AI 外呼任务（演示）')"><PhoneOutlined /> 转外呼</a-button>
          <a-button type="primary" @click="statusChange">标记已签约</a-button>
        </div>
      </div>
    </PageCard>

    <div class="stat-row grid4" style="margin-bottom: 0">
      <StatCard title="线索评分" :value="clue.score" unit="分" tone="info" foot="综合企业实力与意向评估" />
      <StatCard title="意向等级" :value="clue.level + ' 级'" tone="danger" foot="高意向，建议优先跟进" />
      <StatCard title="预计投资额" value="5.2" unit="亿元" tone="purple" />
      <StatCard title="累计跟进" value="4" unit="次" tone="success" foot="最近跟进 2026-11-15" />
    </div>

    <div class="detail-layout">
      <div>
        <PageCard title="线索需求">
          <p class="clue-desc">{{ clue.desc }}</p>
          <a-descriptions :column="2" size="small" bordered>
            <a-descriptions-item label="投资意向">{{ clue.intent }}</a-descriptions-item>
            <a-descriptions-item label="意向园区">{{ clue.park }}</a-descriptions-item>
            <a-descriptions-item label="预计用地">研发办公 3000㎡</a-descriptions-item>
            <a-descriptions-item label="预计人数">150 - 200 人</a-descriptions-item>
            <a-descriptions-item label="落地时间">2027 年第二季度</a-descriptions-item>
            <a-descriptions-item label="对接部门">招商运营部</a-descriptions-item>
          </a-descriptions>
        </PageCard>

        <PageCard title="跟进记录">
          <a-timeline style="margin-top: 12px">
            <a-timeline-item v-for="(f, i) in followUps" :key="i" :color="i === 0 ? '#1652B8' : '#F2F4F7'">
              <div class="follow-row">
                <span class="follow-user">{{ f.user }}</span>
                <span class="follow-date">{{ f.date }}</span>
              </div>
              <div class="follow-text">{{ f.text }}</div>
            </a-timeline-item>
          </a-timeline>
        </PageCard>
      </div>

      <div class="detail-side">
        <PageCard title="企业画像">
          <div class="score-ring">
            <a-progress type="circle" :percent="clue.score" :size="120" :stroke-color="'#1652B8'" />
            <div class="score-label">综合匹配度</div>
          </div>
          <a-descriptions :column="1" size="small">
            <a-descriptions-item label="企业名称">{{ clue.company }}</a-descriptions-item>
            <a-descriptions-item label="所属行业">{{ clue.industry }}</a-descriptions-item>
            <a-descriptions-item label="所在地区">{{ clue.region }}</a-descriptions-item>
            <a-descriptions-item label="线索来源">{{ clue.source }}</a-descriptions-item>
            <a-descriptions-item label="负责人">{{ clue.contact }}</a-descriptions-item>
          </a-descriptions>
        </PageCard>
        <PageCard title="匹配园区">
          <div class="match-park">
            <div class="match-park-name">{{ clue.park }}</div>
            <a-progress :percent="94" size="small" :stroke-color="'#1652B8'" />
            <div class="text-muted">载体条件、产业方向与政策匹配度较高</div>
          </div>
          <a-button block @click="$router.push('/parksBuildings/index')">查看园区详情</a-button>
        </PageCard>
      </div>
    </div>

    <a-modal v-model:open="followOpen" title="添加跟进记录" @ok="saveFollow">
      <a-form layout="vertical">
        <a-form-item label="跟进方式">
          <a-radio-group v-model:value="followForm.type">
            <a-radio value="电话">电话</a-radio>
            <a-radio value="微信">微信</a-radio>
            <a-radio value="上门">上门</a-radio>
            <a-radio value="会议">会议</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="跟进内容">
          <a-textarea v-model:value="followForm.text" :rows="4" placeholder="请输入本次跟进内容" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { api } from '../api';
import { useRoute } from 'vue-router';
import { message } from 'ant-design-vue';
import {
  ArrowLeftOutlined, EnvironmentOutlined, UserOutlined, CalendarOutlined, EditOutlined,
  PhoneOutlined,
} from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import StatCard from '../components/StatCard.vue';


const msg = message;
const route = useRoute();
const clues = ref([]);
onMounted(async () => { try { clues.value = await api.list('clues'); } catch { msg.error('无法加载线索'); } });
const clue = computed(() => clues.value.find((c) => c.id === route.params.id));
const followOpen = ref(false);
const followForm = ref({ type: '电话', text: '' });
const followUps = computed(() => clue.value?.followUps || []);
async function saveFollow() {
  if (!followForm.value.text.trim()) { msg.warning('请填写跟进内容'); return; }
  const entry = { user: '本地用户', date: new Date().toLocaleString('zh-CN'), text: `【${followForm.value.type}】${followForm.value.text}` };
  try { Object.assign(clue.value, await api.update('clues', { ...clue.value, followUps: [entry, ...followUps.value] })); }
  catch { msg.error('保存失败'); return; }
  followOpen.value = false; followForm.value.text = ''; msg.success('跟进记录已添加');
}
async function statusChange() {
  try { Object.assign(clue.value, await api.update('clues', { ...clue.value, status: '已签约' })); msg.success('线索已标记为已签约'); }
  catch { msg.error('保存失败'); }
}
</script>

<style scoped>
.detail-back { margin-bottom: 10px; font-size: 12.5px; color: #657384; }
.detail-hero { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; }
.detail-title { font-size: 21px; font-weight: 600; line-height: 1.5; }
.detail-tags { display: flex; gap: 8px; flex-wrap: wrap; margin: 9px 0; }
.detail-meta { display: flex; gap: 20px; flex-wrap: wrap; color: #657384; font-size: 12.5px; }
.detail-meta .anticon { margin-right: 4px; color: #657384; }
.detail-actions { display: flex; gap: 8px; flex-shrink: 0; }
.detail-layout { display: grid; grid-template-columns: 1fr 320px; gap: 14px; margin-top: 14px; }
.clue-desc { font-size: 13px; color: #657384; line-height: 2; margin: 0 0 14px; }
.follow-row { display: flex; gap: 12px; align-items: center; font-size: 12px; margin-bottom: 4px; }
.follow-user { font-weight: 600; color: #657384; }
.follow-date { color: #657384; }
.follow-text { font-size: 12.5px; color: #657384; line-height: 1.8; }
.score-ring { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 8px 0 14px; }
.score-label { font-size: 12px; color: #657384; }
.match-park { padding: 4px 0 14px; }
.match-park-name { font-size: 13px; font-weight: 600; margin-bottom: 10px; color: #657384; }
@media (max-width: 1200px) { .detail-layout { grid-template-columns: 1fr; } }
</style>
