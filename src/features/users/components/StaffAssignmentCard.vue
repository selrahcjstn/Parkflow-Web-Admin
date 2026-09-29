<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import UiSelect from '@/components/ui/UiSelect.vue'

type AccountType = 'Guard' | 'Admin'

const props = defineProps<{
  accountType: AccountType
  assignedGate: number
  roleLevel: number
}>()

const emit = defineEmits<{
  (e: 'update:assignedGate', val: number): void
  (e: 'update:roleLevel', val: number): void
}>()

const gateOptions = [
  { label: 'Gate 1', value: 1 },
  { label: 'Gate 2', value: 2 },
  { label: 'Gate 3', value: 3 },
  { label: 'Gate 4', value: 4 },
  { label: 'Gate 5', value: 5 }
]

const roleLevelOptions = [
  { label: 'System Administrator (Standard Admin)', value: 2 }
]
</script>

<template>
  <UiCard class="p-6 space-y-6">
    <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
      <div class="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      </div>
      <div>
        <h3 class="text-base font-semibold text-slate-900 dark:text-white">
          3. {{ accountType === 'Guard' ? 'Guard Deployment Post' : 'Admin Authority Level' }}
        </h3>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          {{ accountType === 'Guard' ? 'Physical campus gate post assignment and terminal authorization' : 'Administrative clearance level and management scope' }}
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div v-if="accountType === 'Guard'" class="space-y-1.5">
        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          Assigned Gate Entrance <span class="text-red-500 font-bold">*</span>
        </label>
        <UiSelect
          :model-value="assignedGate"
          :options="gateOptions"
          @update:model-value="emit('update:assignedGate', Number($event))"
        />
      </div>

      <div v-else class="space-y-1.5">
        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          Admin Authority Level <span class="text-red-500 font-bold">*</span>
        </label>
        <UiSelect
          :model-value="roleLevel"
          :options="roleLevelOptions"
          @update:model-value="emit('update:roleLevel', Number($event))"
        />
      </div>
    </div>
  </UiCard>
</template>
