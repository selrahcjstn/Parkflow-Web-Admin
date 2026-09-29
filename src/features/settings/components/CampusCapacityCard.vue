<script setup lang="ts">
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
}>()

const emit = defineEmits<{
  (e: 'open-reset-modal'): void
}>()

const semesterOptions = [
  { label: '1st Semester', value: '1st Semester' },
  { label: '2nd Semester', value: '2nd Semester' },
  { label: 'Summer Term / Midyear', value: 'Summer Term' }
]
</script>

<template>
  <UiCard custom-class="p-6 space-y-5">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
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
          Manage overall parking lot capacity, vehicle limits, and term schedules
        </p>
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
        <div class="space-y-0.5">
          <span class="text-xs font-bold text-amber-900 dark:text-amber-200 block">Semester Transition Reset</span>
          <p class="text-[11px] text-amber-700 dark:text-amber-300">
            Resets all student class schedule records and COR clearance states for the new semester cycle.
          </p>
        </div>
        <UiButton
          variant="danger"
          size="sm"
          @click="emit('open-reset-modal')"
        >
          Reset Schedules
        </UiButton>
      </div>
    </div>
  </UiCard>
</template>
