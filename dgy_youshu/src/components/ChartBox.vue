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
  chart = echarts.init(el.value, {
    color: ['#1652B8', '#4F80C4', '#82A6D5', '#A9C0DE', '#CCD9E9', '#526071'],
    textStyle: { color: '#526071', fontFamily: 'Microsoft YaHei, sans-serif' },
    title: { textStyle: { color: '#141B24' }, subtextStyle: { color: '#8492A6' } },
    legend: { textStyle: { color: '#526071' } },
    categoryAxis: { axisLine: { lineStyle: { color: '#DCE4EF' } }, axisLabel: { color: '#526071' } },
    valueAxis: { axisLabel: { color: '#526071' }, splitLine: { lineStyle: { color: '#EEF2F7' } } },
  });
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
