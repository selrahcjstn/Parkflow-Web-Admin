<script setup lang="ts">
import UiButton from '@/components/ui/UiButton.vue'

withDefaults(defineProps<{
  title: string
  subtitle?: string
  loading?: boolean
  error?: string
  empty?: boolean
  emptyMessage?: string
  /** Height reserved while loading so the layout does not jump. */
  minHeight?: string
  /** Size to content instead of stretching to the row height. */
  autoHeight?: boolean
}>(), { emptyMessage: 'No data to show yet.', minHeight: '220px' })

defineEmits<{ (e: 'retry'): void }>()
</script>

<template>
  <section class="flex min-w-0 flex-col rounded-card border border-border bg-surface p-4 sm:p-5" :class="autoHeight ? '' : 'h-full'">
    <header class="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h2 class="m-0 text-[15px] font-semibold text-text">{{ title }}</h2>
        <p v-if="subtitle" class="m-0 mt-0.5 text-[12.5px] text-muted">{{ subtitle }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2"><slot name="actions" /></div>
    </header>

    <div v-if="loading" class="animate-pulse rounded-lg bg-surface-muted" :style="{ minHeight }" role="status" aria-label="Loading" />

    <div v-else-if="error && empty" class="flex flex-col items-center justify-center gap-3 text-center" :style="{ minHeight }" role="alert">
      <p class="m-0 max-w-xs text-sm text-muted">{{ error }}</p>
      <UiButton variant="secondary" size="sm" @click="$emit('retry')">Try again</UiButton>
    </div>

    <div v-else-if="empty" class="flex items-center justify-center text-center" :style="{ minHeight }">
      <p class="m-0 max-w-xs text-sm text-muted">{{ emptyMessage }}</p>
    </div>

    <template v-else>
      <p v-if="error" class="m-0 mb-3 rounded-md bg-warning-bg px-3 py-2 text-[12.5px] text-text" role="alert">
        {{ error }} Showing the last loaded data.
      </p>
      <div class="min-w-0 flex-1"><slot /></div>
      <footer v-if="$slots.footer" class="mt-4 border-t border-border pt-3 text-[12.5px] text-muted"><slot name="footer" /></footer>
    </template>
  </section>
</template>
