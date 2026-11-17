<template>
  <div class="empty-box">
    <svg width="150" height="120" viewBox="0 0 150 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ebg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#6d8cff" />
          <stop offset="1" stop-color="#3b51d3" />
        </linearGradient>
      </defs>
      <ellipse cx="75" cy="103" rx="46" ry="8" fill="#eef1f8" />
      <rect x="38" y="20" width="78" height="72" rx="5" fill="#fff" stroke="#dbe2f1" />
      <rect x="38" y="20" width="78" height="14" rx="5" fill="url(#ebg)" />
      <rect x="48" y="44" width="46" height="4" rx="2" fill="#e4e9f5" />
      <rect x="48" y="54" width="58" height="4" rx="2" fill="#eef1f8" />
      <rect x="48" y="64" width="38" height="4" rx="2" fill="#eef1f8" />
      <circle cx="94" cy="78" r="15" fill="#fff" stroke="url(#ebg)" stroke-width="4" />
      <path d="M105 89L114 98" stroke="url(#ebg)" stroke-width="5" stroke-linecap="round" />
      <circle cx="94" cy="78" r="7" fill="#dfe6ff" />
    </svg>
    <div class="empty-text">{{ text }}</div>
  </div>
</template>

<script setup>
defineProps({ text: { type: String, default: '查找不到' } });
</script>

<style scoped>
.empty-box { padding: 38px 0 46px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.empty-text { color: #98a2b3; font-size: 13px; }
</style>
