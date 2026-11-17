<template>
  <div class="grid2" style="grid-template-columns: 210px 1fr; align-items: start">
    <PageCard no-body>
      <div class="setting-nav">
        <div v-for="m in menus" :key="m.key" class="setting-nav-item" :class="{ active: active === m.key }" @click="active = m.key">
          <component :is="m.icon" />
          {{ m.label }}
        </div>
      </div>
    </PageCard>

    <div>
      <PageCard v-if="active === 'basic'" title="基本信息" sub="配置平台对外展示的名称、联系方式等基础资料">
        <a-form layout="vertical" style="max-width: 720px">
          <div class="grid2">
            <a-form-item label="平台名称"><a-input v-model:value="cfg.portalName" /></a-form-item>
            <a-form-item label="联系电话"><a-input v-model:value="cfg.contact" /></a-form-item>
          </div>
          <a-form-item label="平台标语"><a-input v-model:value="cfg.slogan" /></a-form-item>
          <div class="grid2">
            <a-form-item label="联系邮箱"><a-input v-model:value="cfg.email" /></a-form-item>
            <a-form-item label="平台地址"><a-input v-model:value="cfg.address" /></a-form-item>
          </div>
          <a-form-item label="平台 Logo">
            <div class="logo-upload" @click="msg.success('演示环境暂不支持上传，已保留默认 Logo')">
              <span class="logo-mark">临</span>
              <div>
                <div style="font-weight: 500">更换 Logo</div>
                <div class="text-muted">支持 PNG / JPG，建议尺寸 240 × 240</div>
              </div>
            </div>
          </a-form-item>
          <a-form-item label="平台简介">
            <a-textarea v-model:value="intro" :rows="4" />
          </a-form-item>
          <a-button type="primary" @click="msg.success('基本信息已保存')">保存修改</a-button>
        </a-form>
      </PageCard>

      <PageCard v-if="active === 'decorate'" title="门店装修" sub="调整招商门户的主色与首页模块，修改后实时预览">
        <div class="grid2" style="align-items: start">
          <div>
            <a-form layout="vertical">
              <a-form-item label="主题色">
                <div class="flex gap8">
                  <span v-for="c in colors" :key="c" class="color-dot" :class="{ active: themeColor === c }" :style="{ background: c }" @click="themeColor = c"></span>
                </div>
              </a-form-item>
              <a-form-item label="Banner 标题"><a-input v-model:value="bannerTitle" /></a-form-item>
              <a-form-item label="Banner 副标题"><a-input v-model:value="bannerSub" /></a-form-item>
              <a-form-item label="首页展示模块">
                <a-checkbox-group v-model:value="modules" :options="allModules" />
              </a-form-item>
              <a-form-item label="页脚备案信息"><a-input v-model:value="footer" /></a-form-item>
              <a-button type="primary" @click="msg.success('装修方案已发布')">发布装修</a-button>
            </a-form>
          </div>
          <div class="preview-phone">
            <div class="preview-head" :style="{ background: themeColor }">
              <div class="flex" style="justify-content: space-between; align-items: center">
                <b>{{ cfg.portalName }}</b>
                <span style="opacity: 0.8">上海 ▾</span>
              </div>
              <div class="preview-banner">
                <div class="preview-banner-title">{{ bannerTitle }}</div>
                <div class="preview-banner-sub">{{ bannerSub }}</div>
                <span class="preview-search">搜索政策 / 园区 / 企业</span>
              </div>
            </div>
            <div class="preview-body">
              <div class="preview-modules">
                <div v-for="m in modules" :key="m" class="preview-module">
                  <i :style="{ background: themeColor }"></i>{{ m }}
                </div>
              </div>
              <div class="preview-card">
                <b>热门政策</b>
                <div class="preview-line"></div>
                <div class="preview-line short"></div>
              </div>
              <div class="preview-card">
                <b>推荐园区</b>
                <div class="preview-line"></div>
                <div class="preview-line short"></div>
              </div>
            </div>
          </div>
        </div>
      </PageCard>

      <PageCard v-if="active === 'modules'" title="模块配置" sub="控制门户端各业务模块的展示与排序">
        <div class="module-row" v-for="(m, i) in moduleConfig" :key="m.name">
          <span class="module-drag">⋮⋮</span>
          <div class="module-info"><b>{{ m.name }}</b><span class="text-muted">{{ m.desc }}</span></div>
          <a-tag :color="m.enabled ? 'blue' : 'default'">{{ m.enabled ? '已启用' : '已停用' }}</a-tag>
          <a-switch v-model:checked="m.enabled" size="small" />
          <a-button size="small" :disabled="i === 0" @click="moveModule(i, -1)">上移</a-button>
        </div>
        <a-button type="primary" style="margin-top: 16px" @click="msg.success('模块配置已保存')">保存配置</a-button>
      </PageCard>

      <PageCard v-if="active === 'security'" title="账号安全" sub="管理登录密码与二次校验方式">
        <a-form layout="vertical" style="max-width: 480px">
          <a-form-item label="当前密码"><a-input-password placeholder="请输入当前密码" /></a-form-item>
          <a-form-item label="新密码"><a-input-password placeholder="8-20 位，包含字母与数字" /></a-form-item>
          <a-form-item label="确认新密码"><a-input-password placeholder="请再次输入新密码" /></a-form-item>
          <a-form-item label="登录保护">
            <div class="flex" style="justify-content: space-between"><span>异地登录短信提醒</span><a-switch v-model:checked="smsAlert" /></div>
            <div class="flex" style="justify-content: space-between; margin-top: 12px"><span>连续 5 次失败锁定账号</span><a-switch v-model:checked="lockLimit" /></div>
          </a-form-item>
          <a-button type="primary" @click="msg.success('密码已更新（演示）')">更新密码</a-button>
        </a-form>
      </PageCard>

      <PageCard v-if="active === 'notice'" title="消息通知" sub="选择需要接收的平台提醒">
        <div class="notice-row" v-for="n in notices" :key="n.key">
          <div><b>{{ n.label }}</b><div class="text-muted">{{ n.desc }}</div></div>
          <a-switch v-model:checked="n.on" />
        </div>
        <a-button type="primary" style="margin-top: 18px" @click="msg.success('通知设置已保存')">保存设置</a-button>
      </PageCard>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { message } from 'ant-design-vue';
import { ShopOutlined, AppstoreOutlined, SafetyCertificateOutlined, BellOutlined, InfoCircleOutlined } from '@ant-design/icons-vue';
import PageCard from '../components/PageCard.vue';
import { settingConfig } from '../data/mock';

const msg = message;
const active = ref('basic');
const menus = [
  { key: 'basic', label: '基本信息', icon: InfoCircleOutlined },
  { key: 'decorate', label: '门店装修', icon: ShopOutlined },
  { key: 'modules', label: '模块配置', icon: AppstoreOutlined },
  { key: 'security', label: '账号安全', icon: SafetyCertificateOutlined },
  { key: 'notice', label: '消息通知', icon: BellOutlined },
];
const cfg = reactive({ ...settingConfig });
const intro = ref('上海临港产业招商服务平台面向全球企业与投资机构，提供政策查询、园区载体、商机对接、企业服务等一站式招商服务。');
const colors = ['#4a62e7', '#2f6fed', '#0e9384', '#7c3aed', '#d97706', '#dc2626'];
const themeColor = ref('#4a62e7');
const bannerTitle = ref('汇聚全球创新资源');
const bannerSub = ref('共建世界级产业集群 · 临港新片区欢迎您');
const footer = ref('© 2026 上海临港产业招商服务平台 沪ICP备2026008888号');
const allModules = ['政策服务', '园区载体', '商机大厅', '企业服务', '招投标查询', '迁移预警'];
const modules = ref([...settingConfig.modules]);
const moduleConfig = reactive([
  { name: '政策服务', desc: '政策项目、通知文件、公示名单', enabled: true },
  { name: '园区载体', desc: '园区、楼宇与载体资源', enabled: true },
  { name: '商机大厅', desc: '招商模型与匹配企业', enabled: true },
  { name: '企业服务', desc: '企服保障与走访管理', enabled: true },
  { name: '招投标查询', desc: '招标公告与中标企业', enabled: true },
  { name: '迁移预警', desc: '企业迁出风险预警', enabled: false },
]);
function moveModule(i, delta) {
  const j = i + delta;
  if (j < 0 || j >= moduleConfig.length) return;
  const [row] = moduleConfig.splice(i, 1);
  moduleConfig.splice(j, 0, row);
}
const smsAlert = ref(true);
const lockLimit = ref(true);
const notices = reactive([
  { key: 'policy', label: '政策更新提醒', desc: '国家、市、区级新政策发布时通知', on: true },
  { key: 'clue', label: '商机线索提醒', desc: '新线索指派给我时通知', on: true },
  { key: 'migration', label: '迁移预警提醒', desc: '关注企业出现高风险信号时通知', on: true },
  { key: 'billing', label: '接口余额提醒', desc: '账户余额低于 1000 元时通知', on: false },
  { key: 'visit', label: '走访工单提醒', desc: '待走访工单超期时通知', on: true },
]);
</script>

<style scoped>
.setting-nav { padding: 10px; }
.setting-nav-item { display: flex; align-items: center; gap: 10px; padding: 11px 14px; border-radius: 8px; font-size: 13.5px; color: #4b5563; cursor: pointer; margin-bottom: 4px; }
.setting-nav-item:hover { background: #f5f7fe; color: #4a62e7; }
.setting-nav-item.active { background: #eef1fe; color: #4a62e7; font-weight: 600; }
.logo-upload { display: flex; align-items: center; gap: 14px; border: 1px dashed #d4d9e8; border-radius: 8px; padding: 14px; cursor: pointer; }
.logo-upload:hover { border-color: #4a62e7; }
.logo-mark { width: 48px; height: 48px; border-radius: 10px; background: linear-gradient(135deg, #4a62e7, #2f6fed); color: #fff; display: grid; place-items: center; font-size: 20px; font-weight: 700; }
.color-dot { width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; }
.color-dot.active { border-color: #1f2a44; transform: scale(1.08); }
.preview-phone { max-width: 340px; border: 1px solid #e4e7ec; border-radius: 18px; overflow: hidden; background: #f5f7fb; min-height: 540px; box-shadow: 0 12px 30px rgba(15, 30, 80, 0.08); }
.preview-head { color: #fff; padding: 14px 14px 0; font-size: 12px; }
.preview-banner { margin-top: 14px; padding: 18px 14px; background: rgba(255, 255, 255, 0.12); border-radius: 10px 10px 0 0; }
.preview-banner-title { font-size: 17px; font-weight: 700; }
.preview-banner-sub { font-size: 10px; opacity: 0.8; margin: 4px 0 10px; }
.preview-search { display: block; background: #fff; color: #9aa3b5; border-radius: 14px; padding: 6px 12px; font-size: 10px; }
.preview-body { padding: 14px; }
.preview-modules { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.preview-module { background: #fff; border-radius: 8px; padding: 10px 4px; font-size: 9.5px; text-align: center; color: #4b5563; display: flex; flex-direction: column; align-items: center; gap: 5px; }
.preview-module i { width: 20px; height: 20px; border-radius: 7px; opacity: 0.85; }
.preview-card { background: #fff; border-radius: 10px; padding: 12px; margin-top: 10px; font-size: 11px; }
.preview-line { height: 7px; background: #eef1f6; border-radius: 4px; margin-top: 9px; }
.preview-line.short { width: 62%; }
.module-row { display: flex; align-items: center; gap: 14px; padding: 14px 6px; border-bottom: 1px solid #f2f4f7; }
.module-drag { color: #c0c6d4; letter-spacing: -2px; }
.module-info { flex: 1; display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
.notice-row { display: flex; justify-content: space-between; align-items: center; gap: 20px; padding: 15px 4px; border-bottom: 1px solid #f2f4f7; font-size: 13px; }
</style>
