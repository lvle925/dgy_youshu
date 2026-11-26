<template>
  <div class="chip-row">
    <div v-if="label" class="chip-label">{{ label }}</div>
    <div class="chips">
      <span
        v-for="opt in visibleOptions"
        :key="opt"
        class="chip"
        :class="{ active: modelValue === opt }"
        @click="pick(opt)"
      >{{ opt }}</span>
      <span v-if="options.length > limit" class="chip more" @click="expanded = !expanded">
        {{ expanded ? '收起' : '更多' }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  label: { type: String, default: '' },
  options: { type: Array, required: true },
  modelValue: { type: [String, Number], default: '' },
  limit: { type: Number, default: 12 },
});
const emit = defineEmits(['update:modelValue']);
const expanded = ref(false);
const visibleOptions = computed(() => (expanded.value ? props.options : props.options.slice(0, props.limit)));
function pick(opt) {
  emit('update:modelValue', props.modelValue === opt ? '' : opt);
}
</script>
