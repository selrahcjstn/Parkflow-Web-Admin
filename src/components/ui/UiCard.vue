<script setup lang="ts">
defineProps<{
  hover?: boolean
  customClass?: string
}>()
</script>

<template>
  <div
    :class="[
      'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl transition-all duration-200 shadow-xs',
      customClass && /\bp-\d+\b|\bp-0\b/.test(customClass) ? '' : 'p-6',
      hover ? 'hover:border-rose-300/80 dark:hover:border-rose-900/60 hover:shadow-md' : '',
      customClass || ''
    ]"
  >
    <slot />
  </div>
</template>
