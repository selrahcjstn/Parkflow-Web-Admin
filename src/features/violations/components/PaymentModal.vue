<script setup lang="ts">
import type { Violation } from '../types'
import UiModal from '@/components/ui/UiModal.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiInput from '@/components/ui/UiInput.vue'

const props = defineProps<{
  isOpen: boolean
  violation: Violation | null
  referenceInput: string
  isProcessing: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:referenceInput', val: string): void
  (e: 'submit'): void
}>()
</script>

<template>
  <UiModal
    :is-open="isOpen"
    title="Settle Violation Fine"
    size="sm"
    @close="emit('close')"
  >
    <form @submit.prevent="emit('submit')" class="space-y-4">
      <div v-if="!violation" class="space-y-2">
        <UiInput
          :model-value="referenceInput"
          label="Reference Code"
          placeholder="VIO-YYYYMMDD-XXXX"
          hint="Verify reference code printed on the ticket receipt."
          required
          @update:model-value="emit('update:referenceInput', String($event))"
        />
      </div>

      <div v-else class="space-y-2.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 text-xs">
        <div class="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-700/40">
          <span class="text-slate-500 dark:text-slate-400 font-medium">Ticket Reference</span>
          <span class="font-mono font-bold text-slate-900 dark:text-white">{{ violation.referenceNumber }}</span>
        </div>
        <div class="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-700/40">
          <span class="text-slate-500 dark:text-slate-400 font-medium">Violation Type</span>
          <span class="font-semibold text-rose-600 dark:text-rose-400">{{ violation.violationType }}</span>
        </div>
        <div class="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-700/40">
          <span class="text-slate-500 dark:text-slate-400 font-medium">Owner Name</span>
          <span class="font-semibold text-slate-900 dark:text-white">{{ violation.firstName }} {{ violation.lastName }}</span>
        </div>
        <div class="flex justify-between items-center py-1 pt-2 border-t border-slate-200 dark:border-slate-700 font-bold">
          <span class="text-slate-700 dark:text-slate-300">Amount Charged</span>
          <span class="text-base text-emerald-600 dark:text-emerald-400 font-extrabold">₱{{ violation.penaltyFee.toFixed(2) }}</span>
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <UiButton
          type="button"
          variant="secondary"
          size="sm"
          :disabled="isProcessing"
          @click="emit('close')"
        >
          Cancel
        </UiButton>
        <UiButton
          type="submit"
          variant="success"
          size="sm"
          :loading="isProcessing"
        >
          Receive Settlement
        </UiButton>
      </div>
    </form>
  </UiModal>
</template>
