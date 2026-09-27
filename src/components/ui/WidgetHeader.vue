<script setup lang="ts">
defineProps<{
  title: string
  count?: number
  actionText?: string
}>()

defineEmits<{
  (e: 'action'): void
}>()
</script>

<template>
  <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800/80">
    <div class="flex items-center gap-2.5 min-w-0">
      <h3 class="text-base font-bold text-slate-900 dark:text-white tracking-tight m-0 truncate">
        {{ title }}
      </h3>
      <span
        v-if="count !== undefined && count !== null"
        class="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
      >
        {{ count }}
      </span>
      <slot name="subtitle" />
    </div>

    <div class="flex items-center gap-2 flex-shrink-0">
      <slot name="extra" />
      <button
        v-if="actionText"
        type="button"
        @click="$emit('action')"
        class="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:underline transition-colors cursor-pointer bg-transparent border-none p-0"
      >
        <span>{{ actionText }}</span>
        <span>→</span>
      </button>
      <slot name="action" />
    </div>
  </div>
</template>
