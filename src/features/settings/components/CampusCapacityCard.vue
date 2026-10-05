<script setup lang="ts">
import { computed } from 'vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import UiButton from '@/components/ui/UiButton.vue'

const props = defineProps<{
  settings: {
    academicYear: string
    currentSemester: string
    totalCapacity: number
    maxVehiclesPerUser: number
    lastResetDate?: string
  }
  isSaving?: boolean
}>()

const emit = defineEmits<{
  (e: 'open-reset-modal'): void
  (e: 'save'): void
}>()

const semesterOptions = [
  { label: '1st Semester', value: '1st Semester' },
  { label: '2nd Semester', value: '2nd Semester' },
  { label: 'Summer Term / Midyear', value: 'Summer Term' }
]

const formattedResetDate = computed(() => {
  if (!props.settings.lastResetDate) return 'No reset record found'
  try {
    const d = new Date(props.settings.lastResetDate)
    if (isNaN(d.getTime())) return props.settings.lastResetDate
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  } catch {
    return props.settings.lastResetDate
  }
})
</script>

<template>
  <UiCard custom-class="p-6 space-y-5">
    <!-- Header with BulSU Red Badge -->
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-[#7B1113] dark:text-[#E25C65]">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-900 dark:text-white">Campus Capacity & Semester Cycle</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage overall parking bay capacity, vehicle quotas, and academic term schedules
          </p>
        </div>
      </div>
    </div>

    <!-- Active Term & Capacity Status Overview Bar -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
      <div class="flex flex-col">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Academic Year</span>
        <span class="font-bold text-slate-900 dark:text-white">{{ settings.academicYear || 'Not Set' }}</span>
      </div>
      <div class="flex flex-col">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Term</span>
        <span class="font-bold text-[#7B1113] dark:text-[#E25C65]">{{ settings.currentSemester || '1st Semester' }}</span>
      </div>
      <div class="flex flex-col">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bay Capacity</span>
        <span class="font-bold text-slate-900 dark:text-white">{{ settings.totalCapacity || 500 }} Slots</span>
      </div>
    </div>

    <div class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Total Capacity -->
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Total Campus Bay Capacity
          </label>
          <UiInput
            v-model.number="settings.totalCapacity"
            type="number"
            size="md"
            min="10"
            placeholder="500"
          />
        </div>

        <!-- Max Vehicles per user -->
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Max Vehicles Per User
          </label>
          <UiInput
            v-model.number="settings.maxVehiclesPerUser"
            type="number"
            size="md"
            min="1"
            placeholder="5"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Academic Year -->
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Academic Year
          </label>
          <UiInput
            v-model="settings.academicYear"
            type="text"
            placeholder="e.g. 2026-2027"
            size="md"
          />
        </div>

        <!-- Current Semester -->
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Current Academic Term
          </label>
          <UiSelect
            v-model="settings.currentSemester"
            :options="semesterOptions"
            size="md"
          />
        </div>
      </div>

      <!-- Semester Reset Callout -->
      <div class="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-amber-900 dark:text-amber-200">Semester Transition Reset</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">Term Action</span>
          </div>
          <p class="text-[11px] text-amber-700 dark:text-amber-300">
            Resets all student class schedule records and COR clearance states for the new semester cycle.
          </p>
          <div class="flex items-center gap-1.5 text-[10.5px] text-amber-800 dark:text-amber-400 font-medium pt-0.5">
            <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Last Term Reset: <strong>{{ formattedResetDate }}</strong></span>
          </div>
        </div>
        <UiButton
          variant="danger"
          size="sm"
          @click="emit('open-reset-modal')"
        >
          <template #prefix>
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </template>
          Reset Schedules
        </UiButton>
      </div>

      <!-- Card Action Footer -->
      <div class="pt-2 flex justify-end">
        <UiButton
          variant="primary"
          size="sm"
          :loading="isSaving"
          @click="emit('save')"
        >
          <template #prefix>
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
          </template>
          Save Capacity & Term
        </UiButton>
      </div>
    </div>
  </UiCard>
</template>
