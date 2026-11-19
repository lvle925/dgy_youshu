<template>
  <a-config-provider :locale="zhCN" :theme="{ token: { colorPrimary: '#1652B8', colorText: '#141B24', colorTextSecondary: '#526071', colorTextTertiary: '#8492A6', colorBgContainer: '#FFFFFF', colorBorder: '#DCE4EF', colorBgLayout: '#F2F4F7', borderRadius: 8, fontSize: 14 } }">
    <router-view />
  </a-config-provider>
</template>

<script setup>
import zhCN from 'ant-design-vue/es/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

dayjs.locale('zh-cn');
</script>
