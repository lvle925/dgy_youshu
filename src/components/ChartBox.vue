<template>
  <div ref="el" class="chart-box" :style="{ height: height + 'px' }"></div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts';

const props = defineProps({
  option: { type: Object, required: true },
  height: { type: Number, default: 300 },
});
const el = ref(null);
let chart = null;
let ro = null;

onMounted(() => {
  chart = echarts.init(el.value);
  chart.setOption(props.option);
  ro = new ResizeObserver(() => chart && chart.resize());
  ro.observe(el.value);
});
watch(
  () => props.option,
  (val) => chart && chart.setOption(val, true),
  { deep: true }
);
onBeforeUnmount(() => {
  if (ro) ro.disconnect();
  if (chart) chart.dispose();
  chart = null;
});
</script>

<style scoped>
.chart-box { width: 100%; }
</style>
