<template>
  <div v-if="policy">
    <div class="detail-back"><a @click="$router.back()"><ArrowLeftOutlined /> 返回</a></div>
    <PageCard>
      <div class="detail-hero">
        <div>
          <div class="detail-title">{{ policy.name }}</div>
          <div class="detail-tags">
            <span class="tag-soft blue">{{ policy.level }}</span>
            <span class="tag-soft purple">{{ policy.type }}</span>
            <span class="tag-soft green">{{ policy.status }}</span>
            <span class="tag-soft gray">政策编号 {{ policy.id }}</span>
          </div>
          <div class="detail-meta">
            <span><BankOutlined /> {{ policy.org }}</span>
            <span><EnvironmentOutlined /> {{ policy.district }}</span>
            <span><CalendarOutlined /> 申报截止 {{ policy.deadline }}</span>
            <span><EyeOutlined /> {{ policy.hot.toLocaleString() }} 次浏览</span>
          </div>
        </div>
        <div class="detail-actions">
          <a-button @click="msg.success('已收藏该政策（演示）')"><StarOutlined /> 收藏</a-button>
          <a-button @click="msg.success('分享链接已复制（演示）')"><ShareAltOutlined /> 分享</a-button>
          <a-button type="primary" @click="posterOpen = true"><FileImageOutlined /> 生成海报</a-button>
        </div>
      </div>
    </PageCard>

    <div class="grid4 stat-row" style="margin-bottom: 0">
      <StatCard title="获批企业数" :value="policy.companies.toLocaleString()" unit="家" tone="info" />
      <StatCard title="资助总额" :value="policy.amount.toFixed(2)" unit="万元" tone="purple" />
      <StatCard title="最高单笔资助" value="2,680.00" unit="万元" tone="success" />
      <div class="stat-card">
        <div class="stat-head">推荐等级</div>
        <div class="stars" style="font-size: 26px; margin: 14px 0 8px">
          <span v-for="n in 5" :key="n" :class="{ off: n > policy.stars }">★</span>
        </div>
        <div class="stat-foot">综合热度、补贴力度与申报条件评估</div>
      </div>
    </div>

    <div class="detail-layout">
      <div>
        <PageCard title="政策正文">
          <div class="article">
            <p>{{ policy.content }}</p>
            <h4>一、支持对象</h4>
            <p>在本市依法注册登记、具有独立法人资格，符合本市产业发展导向，且生产经营状况良好的企业。</p>
            <h4>二、申报条件</h4>
            <ul>
              <li v-for="r in policy.requirements" :key="r">{{ r }}</li>
            </ul>
            <h4>三、支持方式</h4>
            <p>采取事后资助方式，根据项目评审结果给予一定比例的经费支持，单个项目资助金额最高不超过 500 万元。</p>
            <h4>四、申报材料</h4>
            <ul>
              <li v-for="m in policy.materials" :key="m">{{ m }}</li>
            </ul>
            <h4>五、申报流程</h4>
            <a-steps :current="1" size="small" style="margin: 16px 0 8px">
              <a-step title="在线填报" description="企业注册并提交材料" />
              <a-step title="区级初审" description="属地主管部门审核" />
              <a-step title="专家评审" description="组织专家综合评审" />
              <a-step title="公示拨付" description="公示无异议后拨付" />
            </a-steps>
          </div>
        </PageCard>

        <PageCard title="获批企业（部分）">
          <a-table :columns="companyColumns" :data-source="companyRows" :pagination="{ pageSize: 5 }" size="middle" :row-key="(r) => r.id">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'name'">
                <a class="link" @click="$router.push('/subsidy/company/' + record.id)">{{ record.name }}</a>
              </template>
              <template v-else-if="column.key === 'amount'">{{ record.amount }} 万元</template>
            </template>
          </a-table>
        </PageCard>
      </div>

      <div class="detail-side">
        <PageCard title="政策概览">
          <a-descriptions :column="1" size="small">
            <a-descriptions-item label="政策级别">{{ policy.level }}</a-descriptions-item>
            <a-descriptions-item label="补贴类型">{{ policy.type }}</a-descriptions-item>
            <a-descriptions-item label="组织部门">{{ policy.org }}</a-descriptions-item>
            <a-descriptions-item label="适用行业">{{ policy.industry }}</a-descriptions-item>
            <a-descriptions-item label="申报截止">{{ policy.deadline }}</a-descriptions-item>
            <a-descriptions-item label="申报状态"><span class="tag-soft green">{{ policy.status }}</span></a-descriptions-item>
          </a-descriptions>
        </PageCard>
        <PageCard title="相关政策">
          <div v-for="p in relatedPolicies" :key="p.id" class="related-item" @click="$router.push('/policy/detail/' + p.id)">
            <div class="related-name">{{ p.name }}</div>
            <div class="related-meta">{{ p.level }} · {{ p.type }} · {{ p.companies.toLocaleString() }} 家企业获批</div>
          </div>
        </PageCard>
        <PageCard title="办理咨询">
          <div class="contact-line"><PhoneOutlined /> 021-6828 8888</div>
          <div class="contact-line"><MailOutlined /> policy@example.com</div>
          <div class="contact-line"><ClockCircleOutlined /> 工作日 9:00 - 17:30</div>
        </PageCard>
      </div>
    </div>

    <a-modal v-model:open="posterOpen" title="政策海报" width="480px" :footer="null">
      <div class="poster-wrap">
        <div class="poster">
          <div class="poster-brand">有数计划 · 政策服务</div>
          <div class="poster-title">{{ policy.name }}</div>
          <div class="poster-meta">
            <div><span>政策级别</span><b>{{ policy.level }}</b></div>
            <div><span>组织部门</span><b>{{ policy.org }}</b></div>
            <div><span>补贴类型</span><b>{{ policy.type }}</b></div>
            <div><span>申报截止</span><b>{{ policy.deadline }}</b></div>
          </div>
          <div class="poster-line"></div>
          <div class="poster-summary">最高资助金额：{{ (policy.amount / 10).toFixed(2) }} 万元</div>
          <div class="poster-foot">
            <div class="qr"></div>
            <div>扫码查看政策详情<br /><span>有数计划平台 · 政策智能匹配</span></div>
          </div>
        </div>
        <a-button type="primary" @click="msg.success('海报已生成，正在下载（演示）')">下载海报</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { message } from 'ant-design-vue';
import {
  ArrowLeftOutlined, BankOutlined, EnvironmentOutlined, CalendarOutlined, EyeOutlined,
  StarOutlined, ShareAltOutlined, FileImageOutlined, PhoneOutlined, MailOutlined, ClockCircleOutlined,
} from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import StatCard from '../components/StatCard.vue';
import { policies, companies } from '../data/mock';

const msg = message;
const route = useRoute();
const policy = computed(() => policies.find((p) => p.id === route.params.id) || policies[0]);
const relatedPolicies = computed(() => policies.filter((p) => p.id !== policy.value.id && p.type === policy.value.type).slice(0, 3).concat(policies.filter((p) => p.id !== policy.value.id).slice(0, 2)).slice(0, 4));
const companyColumns = [
  { title: '企业名称', key: 'name' },
  { title: '所属区', dataIndex: 'district', width: 100 },
  { title: '获补金额', key: 'amount', width: 110 },
  { title: '获补时间', dataIndex: 'settleDate', width: 110 },
];
const companyRows = companies.slice(0, 8).map((c, i) => ({ id: c.id, name: c.name, district: c.district, amount: (326.8 - i * 31.2).toFixed(2), settleDate: c.settleDate }));
const posterOpen = ref(false);
</script>

<style scoped>
.detail-back { margin-bottom: 10px; font-size: 12.5px; color: #8b93a7; }
.detail-hero { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; }
.detail-title { font-size: 21px; font-weight: 600; line-height: 1.5; color: #1f2937; }
.detail-tags { display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0; }
.detail-meta { display: flex; gap: 20px; flex-wrap: wrap; color: #667085; font-size: 12.5px; }
.detail-meta .anticon { margin-right: 4px; color: #98a2b3; }
.detail-actions { display: flex; gap: 8px; flex-shrink: 0; }
.detail-layout { display: grid; grid-template-columns: 1fr 320px; gap: 14px; margin-top: 14px; }
.article { font-size: 13px; color: #4b5563; line-height: 2; }
.article h4 { font-size: 14px; color: #1f2937; margin: 18px 0 6px; }
.article ul { padding-left: 20px; margin: 6px 0; }
.related-item { padding: 9px 0; border-bottom: 1px solid #f4f5f9; cursor: pointer; }
.related-item:last-child { border-bottom: none; }
.related-name { font-size: 12.5px; color: #344054; line-height: 1.6; }
.related-name:hover { color: #4a62e7; }
.related-meta { font-size: 11px; color: #98a2b3; margin-top: 3px; }
.contact-line { font-size: 12.5px; color: #4b5563; padding: 6px 0; }
.contact-line .anticon { color: #4a62e7; margin-right: 7px; }
.poster-wrap { display: flex; flex-direction: column; align-items: center; gap: 16px; }
.poster { width: 360px; min-height: 500px; border-radius: 12px; padding: 26px 24px; color: #fff; background: linear-gradient(155deg, #1b2a6b 0%, #344ec2 55%, #4a62e7 100%); position: relative; overflow: hidden; }
.poster-brand { font-size: 11px; color: rgba(255, 255, 255, .7); letter-spacing: 2px; }
.poster-title { font-size: 22px; font-weight: 600; line-height: 1.5; margin: 26px 0 22px; }
.poster-meta { display: grid; gap: 10px; font-size: 12px; }
.poster-meta div { display: flex; justify-content: space-between; gap: 12px; }
.poster-meta span { color: rgba(255, 255, 255, .62); }
.poster-meta b { font-weight: 500; text-align: right; }
.poster-line { height: 1px; background: rgba(255, 255, 255, .22); margin: 20px 0; }
.poster-summary { font-size: 14px; }
.poster-foot { position: absolute; bottom: 24px; left: 24px; right: 24px; display: flex; gap: 12px; align-items: center; font-size: 11px; color: rgba(255, 255, 255, .78); line-height: 1.7; }
.poster-foot span { color: rgba(255, 255, 255, .5); font-size: 10px; }
.qr { width: 54px; height: 54px; border-radius: 4px; flex-shrink: 0; background: repeating-conic-gradient(#fff 0% 25%, #1b2a6b 0% 50%) 0 0 / 12px 12px; border: 3px solid #fff; }
@media (max-width: 1200px) { .detail-layout { grid-template-columns: 1fr; } }
</style>
