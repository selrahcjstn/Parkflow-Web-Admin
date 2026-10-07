<script setup lang="ts">
defineProps<{
  hover?: boolean
  customClass?: string
}>()
</script>

<template>
  <div
    :class="[
      'bg-surface border border-border rounded-card transition-colors shadow-soft',
      customClass && /\bp-\d+\b|\bp-0\b/.test(customClass) ? '' : 'p-6',
      hover ? 'hover:border-primary/30' : '',
      customClass || '',
    ]"
  >
    <slot />
  </div>
</template>
