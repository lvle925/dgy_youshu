<template>
  <div class="auth-page">
    <section class="auth-card">
      <div class="brand">有数计划 <span>{{ isRemoteApi ? '产业服务平台' : '本地工作空间' }}</span></div>
      <h1>{{ initialized ? '欢迎回来' : '创建管理员' }}</h1>
      <p>{{ initialized ? '使用管理员账号登录。' : '首次使用，请创建管理员账号。' }}</p>
      <a-alert v-if="error" type="error" :message="error" show-icon />
      <a-form layout="vertical" @finish="submit">
        <a-form-item label="账号"><a-input v-model:value="username" size="large" autocomplete="username" placeholder="至少 3 个字符" /></a-form-item>
        <a-form-item label="密码"><a-input-password v-model:value="password" size="large" :autocomplete="initialized ? 'current-password' : 'new-password'" placeholder="至少 10 个字符" /></a-form-item>
        <a-form-item label="验证码"><div class="captcha-row"><a-input v-model:value="captcha" size="large" maxlength="4" autocomplete="off" placeholder="输入图片中的字符" /><button type="button" class="captcha-image" title="点击刷新验证码" :disabled="captchaLoading" @click="refreshCaptcha"><img v-if="captchaImage" :src="captchaImage" alt="验证码，点击刷新" /><span v-else>刷新验证码</span></button></div></a-form-item>
        <a-button html-type="submit" type="primary" size="large" block :loading="loading" :disabled="initialized === null || !captchaId">{{ initialized ? '登录' : '创建并登录' }}</a-button>
      </a-form>
      <small>{{ isRemoteApi ? '在线版本 · 数据保存在服务端数据库中' : '本地版本 · 数据保存在本机数据库中' }}</small>
    </section>
  </div>
</template>
<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiFetch, isRemoteApi, saveAuth } from '../http';
const initialized = ref(null), username = ref(''), password = ref(''), loading = ref(false), error = ref('');
const captcha = ref(''), captchaId = ref(''), captchaImage = ref(''), captchaLoading = ref(false);
const route = useRoute(), router = useRouter();
async function refreshCaptcha() { captchaLoading.value = true; captcha.value = ''; captchaId.value = ''; try { const r = await apiFetch('/api/auth/captcha', { cache: 'no-store' }); if (!r.ok) throw Error(); const data = await r.json(); captchaId.value = data.id; captchaImage.value = data.image; } catch { captchaImage.value = ''; error.value = '验证码加载失败，请点击刷新重试。'; } finally { captchaLoading.value = false; } }
onMounted(async () => { try { const r = await apiFetch('/api/auth/status'); if (!r.ok) throw Error(); const data = await r.json(); initialized.value = data.initialized; if (data.authenticated) router.replace('/home/index'); else await refreshCaptcha(); } catch { error.value = '无法连接后端服务，请稍后重试。'; } });
async function submit() {
  if (username.value.trim().length < 3 || password.value.length < 10) { error.value = '账号至少 3 个字符，密码至少 10 个字符。'; return; }
  if (captcha.value.trim().length !== 4) { error.value = '请输入图片中的4位验证码。'; return; }
  loading.value = true; error.value = '';
  try {
    const r = await apiFetch(`/api/auth/${initialized.value ? 'login' : 'setup'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username.value.trim(), password: password.value, captchaId: captchaId.value, captcha: captcha.value.trim() }) });
    if (!r.ok) { const result = await r.json().catch(() => ({})); throw Error(result.message || result.error || '登录失败，请检查输入。'); }
    const result = await r.json(); saveAuth(result);
    await router.replace(typeof route.query.redirect === 'string' ? route.query.redirect : '/home/index');
  } catch (e) { error.value = e.message || '无法连接后端服务。'; await refreshCaptcha(); }
  finally { loading.value = false; password.value = ''; }
}
</script>
<style scoped>
.auth-page { min-height:100vh; display:grid; place-items:center; background:#F2F4F7; padding:24px; }
.auth-card { background:white; border:1px solid #F2F4F7; border-radius:18px; padding:42px; width:min(100%,460px); box-shadow:0 18px 60px #1a355314; }
.brand { color:#1652B8; font-size:19px; font-weight:700; margin-bottom:42px; }.brand span { color:#657384; font-size:12px; font-weight:400; margin-left:8px; }
h1 { font-size:28px; margin:0 0 8px; color:#303b49; } p { color:#657384; margin-bottom:26px; } .ant-alert { margin-bottom:16px; } small { display:block; color:#657384; margin-top:24px; }
.captcha-row { display:flex; gap:10px; width:100%; }.captcha-image { width:132px; flex:none; border:1px solid #d8e1ec; border-radius:6px; background:#eff4fb; cursor:pointer; overflow:hidden; }.captcha-image img { display:block; width:100%; height:38px; object-fit:cover; }
</style>
