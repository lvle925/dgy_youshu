<template>
  <span class="business-generated-icon" aria-hidden="true">
    <img :src="`/images/icons/${name}.webp`" alt="" width="128" height="128" decoding="async" />
  </span>
</template>

<script setup>
defineProps({ name: { type: String, default: 'dashboard' } });
</script>

<style scoped>
.business-generated-icon { display:inline-grid; width:28px; height:28px; flex:0 0 28px; place-items:center; vertical-align:middle; }
.business-generated-icon img { display:block; width:100%; height:100%; object-fit:contain; }
</style>
