<template>
  <section class="page-card" :class="{ flush }">
    <div v-if="title || $slots.extra" class="page-card-hd" :class="{ 'no-mb': noBody }">
      <div class="card-title">
        <slot name="icon"><PlatformIcon v-if="title" :name="iconForTitle(title)" /></slot>
        <span>{{ title }}</span>
        <span v-if="sub" class="card-sub">{{ sub }}</span>
      </div>
      <div><slot name="extra" /></div>
    </div>
    <slot />
  </section>
</template>

<script setup>
import PlatformIcon from './PlatformIcon.vue';
import { iconForTitle } from '../icon-assets';
defineProps({
  title: { type: String, default: '' },
  sub: { type: String, default: '' },
  flush: { type: Boolean, default: false },
  noBody: { type: Boolean, default: false },
});
</script>
