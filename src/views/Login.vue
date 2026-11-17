<template>
  <div class="login-page">
    <div class="login-bg-shape shape-a"></div>
    <div class="login-bg-shape shape-b"></div>
    <div class="login-card">
      <div class="login-brand">
        <div class="brand-logo">
          <div class="brand-mark">CAICT</div>
          <span>有数计划</span>
        </div>
        <h1>产业招商数字化服务平台</h1>
        <p>聚政策、链产业、拓商机，助力区域经济高质量发展</p>
        <div class="brand-tags">
          <span>25,726+ 政策项目</span>
          <span>3,105+ 入驻企业</span>
          <span>15 个重点园区</span>
        </div>
        <div class="brand-art">
          <div class="art-ring r1"></div>
          <div class="art-ring r2"></div>
          <div class="art-ring r3"></div>
          <div class="art-core">数</div>
        </div>
        <div class="brand-foot">上海喜啦科技有限公司提供技术支持</div>
      </div>

      <div class="login-form">
        <h2>欢迎登录</h2>
        <p class="login-sub">登录有数计划平台，开启产业招商数字化之旅</p>
        <div class="login-tabs">
          <span :class="{ active: mode === 'account' }" @click="mode = 'account'">账号登录</span>
          <span :class="{ active: mode === 'sms' }" @click="mode = 'sms'">验证码登录</span>
        </div>
        <a-form layout="vertical" :model="form">
          <a-form-item label="手机号">
            <a-input v-model:value="form.phone" size="large" placeholder="请输入手机号" :maxlength="11">
              <template #prefix><MobileOutlined style="color: #98a2b3" /></template>
            </a-input>
          </a-form-item>
          <a-form-item v-if="mode === 'account'" label="密码">
            <a-input-password v-model:value="form.password" size="large" placeholder="请输入密码">
              <template #prefix><LockOutlined style="color: #98a2b3" /></template>
            </a-input-password>
          </a-form-item>
          <a-form-item v-else label="短信验证码">
            <div class="code-row">
              <a-input v-model:value="form.code" size="large" placeholder="请输入验证码" :maxlength="6">
                <template #prefix><SafetyOutlined style="color: #98a2b3" /></template>
              </a-input>
              <a-button size="large" :disabled="countdown > 0" @click="sendCode">
                {{ countdown > 0 ? countdown + 's 后重发' : '获取验证码' }}
              </a-button>
            </div>
          </a-form-item>
          <div class="login-options">
            <a-checkbox v-model:checked="form.remember">记住账号</a-checkbox>
            <a class="link" @click="helpOpen = true">忘记密码？</a>
          </div>
          <a-button type="primary" size="large" block :loading="loading" @click="submit">登 录</a-button>
        </a-form>
        <div class="demo-tip">
          <InfoCircleOutlined />
          <span>授权复刻演示环境：输入任意 11 位手机号与密码即可体验，不连接真实业务后台。</span>
        </div>
      </div>
    </div>
    <div class="login-footer">上海喜啦科技有限公司提供技术支持 · 有数计划平台复刻演示</div>

    <a-modal v-model:open="smsOpen" title="安全验证" :footer="null" width="420px" :mask-closable="false">
      <div class="sms-body">
        <p class="sms-hint">为保障账号安全，请完成短信验证。验证码已发送至 {{ maskedPhone }}</p>
        <a-input v-model:value="form.smsCode" size="large" placeholder="请输入 6 位验证码" :maxlength="6" @press-enter="verify" />
        <div class="sms-tip">演示环境：输入任意 6 位数字即可完成验证（例如 123456）。</div>
        <div class="sms-actions">
          <a-button @click="smsOpen = false">取消</a-button>
          <a-button type="primary" :loading="loading" @click="verify">确认登录</a-button>
        </div>
      </div>
    </a-modal>

    <a-modal v-model:open="helpOpen" title="找回密码" :footer="null" width="420px">
      <p class="sms-hint">演示环境暂不提供真实找回密码服务，请联系平台管理员或使用任意账号体验。</p>
      <div class="sms-tip">正式环境请联系：service@example.com</div>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { MobileOutlined, LockOutlined, SafetyOutlined, InfoCircleOutlined } from '@ant-design/icons-vue';

const router = useRouter();
const route = useRoute();
const mode = ref('account');
const loading = ref(false);
const smsOpen = ref(false);
const helpOpen = ref(false);
const countdown = ref(0);
let timer = null;
const form = reactive({ phone: '', password: '', code: '', smsCode: '', remember: true });

const maskedPhone = computed(() => form.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'));

function sendCode() {
  if (!/^1\d{10}$/.test(form.phone)) {
    message.warning('请输入正确的手机号');
    return;
  }
  countdown.value = 60;
  message.success('验证码已发送（演示环境）');
  timer = setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0) clearInterval(timer);
  }, 1000);
}

function submit() {
  if (!/^1\d{10}$/.test(form.phone)) {
    message.warning('请输入正确的手机号');
    return;
  }
  if (mode.value === 'account' && !form.password) {
    message.warning('请输入密码');
    return;
  }
  if (mode.value === 'sms') {
    if (!/^\d{6}$/.test(form.code)) {
      message.warning('请输入 6 位短信验证码');
      return;
    }
    completeLogin();
    return;
  }
  form.smsCode = '';
  smsOpen.value = true;
}

function verify() {
  if (!/^\d{6}$/.test(form.smsCode)) {
    message.warning('请输入 6 位验证码');
    return;
  }
  completeLogin();
}

function completeLogin() {
  loading.value = true;
  setTimeout(() => {
    loading.value = false;
    smsOpen.value = false;
    localStorage.setItem('DEMO_AUTH', '1');
    localStorage.setItem('DEMO_USER', '顾龙飞');
    message.success('登录成功');
    const redirect = route.query.redirect || '/home/index';
    router.push(typeof redirect === 'string' ? redirect : '/home/index');
  }, 500);
}

onBeforeUnmount(() => timer && clearInterval(timer));
</script>

<style scoped>
.login-page {
  min-height: 100vh; background: linear-gradient(135deg, #eef3ff 0%, #f8faff 46%, #e8f1ff 100%);
  display: flex; align-items: center; justify-content: center; padding: 30px 20px 56px;
  position: relative; overflow: hidden;
}
.login-bg-shape { position: absolute; border-radius: 50%; filter: blur(2px); opacity: .6; }
.shape-a { width: 520px; height: 520px; left: -180px; bottom: -220px; background: radial-gradient(circle, #c7d7ff, transparent 70%); }
.shape-b { width: 620px; height: 620px; right: -240px; top: -260px; background: radial-gradient(circle, #cfe4ff, transparent 70%); }
.login-card {
  width: 960px; max-width: 100%; min-height: 540px; background: #fff; border-radius: 14px;
  box-shadow: 0 24px 70px rgba(35, 62, 155, .16); display: flex; overflow: hidden; position: relative; z-index: 2;
}
.login-brand {
  width: 46%; padding: 34px 36px; background: linear-gradient(160deg, #1b2a6b 0%, #2e48b6 58%, #4a62e7 100%);
  color: #fff; display: flex; flex-direction: column; position: relative; overflow: hidden;
}
.brand-logo { display: flex; align-items: center; gap: 10px; font-size: 20px; font-weight: 600; letter-spacing: 1px; }
.brand-mark {
  width: 38px; height: 38px; border-radius: 6px; background: #fff; color: #22347f;
  display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800;
}
.login-brand h1 { font-size: 27px; line-height: 1.4; margin: 46px 0 12px; font-weight: 600; }
.login-brand p { font-size: 13px; color: rgba(255, 255, 255, .74); line-height: 1.9; margin: 0; }
.brand-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 24px; }
.brand-tags span {
  font-size: 11px; padding: 4px 10px; border-radius: 12px;
  background: rgba(255, 255, 255, .13); border: 1px solid rgba(255, 255, 255, .22);
}
.brand-art { position: absolute; right: -70px; bottom: 30px; width: 260px; height: 260px; }
.art-ring { position: absolute; border: 1px solid rgba(255, 255, 255, .22); border-radius: 50%; }
.r1 { inset: 0; }
.r2 { inset: 32px; }
.r3 { inset: 66px; }
.art-core {
  position: absolute; inset: 96px; border-radius: 50%; background: rgba(255, 255, 255, .15);
  border: 1px solid rgba(255, 255, 255, .35); display: flex; align-items: center; justify-content: center;
  font-size: 30px; font-weight: 300; color: #fff;
}
.brand-foot { margin-top: auto; font-size: 11px; color: rgba(255, 255, 255, .5); position: relative; z-index: 2; }
.login-form { flex: 1; padding: 44px 54px 30px; display: flex; flex-direction: column; }
.login-form h2 { font-size: 24px; margin: 0 0 8px; color: #1f2937; }
.login-sub { font-size: 12.5px; color: #98a2b3; margin: 0 0 22px; }
.login-tabs { display: flex; gap: 26px; border-bottom: 1px solid #eef0f5; margin-bottom: 20px; }
.login-tabs span { padding: 0 0 10px; font-size: 14px; color: #667085; cursor: pointer; border-bottom: 2px solid transparent; }
.login-tabs span.active { color: #4a62e7; border-color: #4a62e7; font-weight: 500; }
.login-options { display: flex; justify-content: space-between; align-items: center; margin: 2px 0 18px; font-size: 12px; }
.code-row { display: flex; gap: 10px; }
.code-row .ant-input-affix-wrapper { flex: 1; }
.demo-tip {
  margin-top: 18px; padding: 10px 12px; background: #f5f8ff; border: 1px dashed #c9d6f7;
  border-radius: 6px; color: #667085; font-size: 11.5px; line-height: 1.7; display: flex; gap: 7px;
}
.demo-tip .anticon { color: #4a62e7; margin-top: 2px; }
.login-footer { position: absolute; bottom: 18px; font-size: 11px; color: #8b93a7; }
.sms-hint { color: #4b5563; font-size: 13px; line-height: 1.8; }
.sms-tip { margin-top: 10px; font-size: 12px; color: #98a2b3; }
.sms-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
@media (max-width: 900px) {
  .login-brand { display: none; }
  .login-form { padding: 32px 26px; }
}
</style>
