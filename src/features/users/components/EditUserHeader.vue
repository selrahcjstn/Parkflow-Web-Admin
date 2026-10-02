<script setup lang="ts">
import UiButton from '@/components/ui/UiButton.vue'

defineProps<{
  isSubmitting?: boolean
}>()

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'submit'): void
}>()
</script>

<template>
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
    <div>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-rose-400 transition-colors cursor-pointer mb-2"
        @click="emit('back')"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to Users Directory
      </button>

      <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        Edit Client Profile & Clearance
      </h1>
      <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
        Update client information, clearance status, vehicle privileges, and account credentials.
      </p>
    </div>

    <!-- Action Buttons -->
    <div class="flex items-center gap-3">
      <UiButton
        type="button"
        variant="outline"
        size="md"
        @click="emit('back')"
      >
        Cancel
      </UiButton>
      <UiButton
        type="button"
        variant="primary"
        size="md"
        :is-loading="isSubmitting"
        @click="emit('submit')"
      >
        Save Profile Changes
      </UiButton>
    </div>
  </div>
</template>
