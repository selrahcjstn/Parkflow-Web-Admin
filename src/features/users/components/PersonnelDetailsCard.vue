<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import UiInput from '@/components/ui/UiInput.vue'

const props = defineProps<{
  idCardNumber: string
  department: string
  roleLabel: string
  idError?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:idCardNumber', val: string): void
  (e: 'update:department', val: string): void
}>()
</script>

<template>
  <UiCard class="p-6 space-y-6">
    <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
      <div class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
      </div>
      <div>
        <h3 class="text-base font-semibold text-slate-900 dark:text-white">3. {{ roleLabel }} Institutional Records</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400">Official faculty/personnel ID and department placement</p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <UiInput
        :model-value="idCardNumber"
        label="Employee ID number"
        placeholder="e.g. EMP-2026-089"
        :error="idError || ''"
        required
        @update:model-value="emit('update:idCardNumber', String($event))"
      />

      <UiInput
        :model-value="department"
        label="Assigned Department / College Unit"
        placeholder="e.g. College of Science / General Services"
        required
        @update:model-value="emit('update:department', String($event))"
      />
    </div>
  </UiCard>
</template>
