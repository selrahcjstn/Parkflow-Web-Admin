<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import UiButton from '@/components/ui/UiButton.vue'

const props = defineProps<{
  settings: {
    violationRatePerHour: number
    feeCalculationMode: 'per_hour' | 'per_day' | 'one_time' | 'one_time_hourly' | 'no_fee'
    baseFee: number
    isGracePeriodEnabled: boolean
    gracePeriodMinutes: number
    isEarlyParkingAllowed: boolean
    earlyParkingMinutes: number
  }
  isSaving?: boolean
}>()

const emit = defineEmits<{
  (e: 'save'): void
}>()

const feeCalculationModeOptions = [
  { label: '₱ Rate Per Hour (Standard Overstay)', value: 'per_hour' },
  { label: '₱ Fixed Rate Per Day', value: 'per_day' },
  { label: '₱ One-Time Flat Fee', value: 'one_time' },
  { label: '₱ One-Time Flat Fee + Hourly Surcharge', value: 'one_time_hourly' },
  { label: 'Free Parking (No Violation Charges)', value: 'no_fee' }
]
</script>

<template>
  <UiCard custom-class="p-6 space-y-5">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </div>
      <div>
        <h3 class="text-sm font-bold text-slate-900 dark:text-white">Overstay Fee & Timing Rules</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure overstay penalty mode, rate, grace period, and early entry allowance
        </p>
      </div>
    </div>

    <div class="space-y-4">
      <!-- Fee Calculation Mode -->
      <div>
        <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
          Fee Calculation Mode
        </label>
        <UiSelect
          v-model="settings.feeCalculationMode"
          :options="feeCalculationModeOptions"
          size="md"
        />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Base Fee -->
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Base / Flat Fee (₱)
          </label>
          <UiInput
            v-model.number="settings.baseFee"
            type="number"
            size="md"
            min="0"
          />
        </div>

        <!-- Hourly Rate -->
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Violation Rate Per Hour (₱)
          </label>
          <UiInput
            v-model.number="settings.violationRatePerHour"
            type="number"
            size="md"
            min="0"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
        <!-- Grace Period -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold text-slate-700 dark:text-slate-300">
              Grace Period (Minutes)
            </label>
            <input
              v-model="settings.isGracePeriodEnabled"
              type="checkbox"
              class="w-4 h-4 rounded text-[#D22730] focus:ring-[#D22730] cursor-pointer"
            />
          </div>
          <UiInput
            v-model.number="settings.gracePeriodMinutes"
            type="number"
            size="md"
            min="0"
            :disabled="!settings.isGracePeriodEnabled"
          />
        </div>

        <!-- Early Parking -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold text-slate-700 dark:text-slate-300">
              Early Entry Window (Minutes)
            </label>
            <input
              v-model="settings.isEarlyParkingAllowed"
              type="checkbox"
              class="w-4 h-4 rounded text-[#D22730] focus:ring-[#D22730] cursor-pointer"
            />
          </div>
          <UiInput
            v-model.number="settings.earlyParkingMinutes"
            type="number"
            size="md"
            min="0"
            :disabled="!settings.isEarlyParkingAllowed"
          />
        </div>
      </div>

      <!-- Action Footer -->
      <div class="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
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
          Save Rates & Billing Policy
        </UiButton>
      </div>
    </div>
  </UiCard>
</template>
