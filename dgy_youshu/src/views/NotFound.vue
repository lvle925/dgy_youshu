<template>
  <div class="not-found">
    <a-result status="404" title="404" sub-title="抱歉，您访问的页面不存在。">
      <template #extra>
        <a-button type="primary" @click="$router.push('/home/index')">返回首页</a-button>
      </template>
    </a-result>
  </div>
</template>

<style scoped>
.not-found { background: #fff; border-radius: 8px; padding: 60px 0; }
</style>
