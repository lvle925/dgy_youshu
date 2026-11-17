<template>
  <div class="stat-card" :class="'tone-' + (tone || 'plain')">
    <div class="stat-head">
      <component :is="icon" v-if="icon" />
      <span>{{ title }}</span>
      <a-tooltip v-if="tip" :title="tip"><QuestionCircleOutlined style="font-size: 11px" /></a-tooltip>
    </div>
    <div class="stat-value">
      {{ value }}<span v-if="unit" class="unit">{{ unit }}</span>
    </div>
    <div v-if="foot || $slots.foot" class="stat-foot"><slot name="foot">{{ foot }}</slot></div>
  </div>
</template>

<script setup>
import { QuestionCircleOutlined } from '@ant-design/icons-vue';
defineProps({
  title: { type: String, required: true },
  value: { type: [String, Number], required: true },
  unit: { type: String, default: '' },
  tone: { type: String, default: 'plain' },
  foot: { type: String, default: '' },
  tip: { type: String, default: '' },
  icon: { type: [Object, Function], default: null },
});
</script>
