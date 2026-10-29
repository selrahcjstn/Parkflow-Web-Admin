<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import UiInput from '@/components/ui/UiInput.vue'
import { parkingVehicleGroups, type VehicleParkingSettings } from '../types'
defineProps<{ settings: { carParking: VehicleParkingSettings; motorcycleParking: VehicleParkingSettings; feeCalculationMode: string } }>()
const rates = [
  { key: 'entryFee', label: 'Manual / reservation entry' },
  { key: 'studentEntryFee', label: 'Student scheduled entry' },
  { key: 'facultyEntryFee', label: 'Faculty entry' },
  { key: 'personnelEntryFee', label: 'University personnel entry' },
  { key: 'visitorFee', label: 'Visitor per visit' },
  { key: 'vipEntryFee', label: 'VIP / special pass' },
  { key: 'violationRatePerHour', label: 'Overstay / penalty rate' },
  { key: 'baseFee', label: 'One-time penalty base' },
  { key: 'dailyOverstayFee', label: 'Manual / reservation daily overstay' },
] as const
</script>
<template>
  <UiCard custom-class="p-6 space-y-5">
    <div><h3 class="text-sm font-bold text-text">Parking fees and penalties</h3>
      <p class="mt-1 text-sm text-muted">Amounts are in pesos. Zero totals require no payment. Changes apply to new checkouts; recorded transactions keep their original amounts.</p></div>
    <label class="block text-sm text-text">Scheduled overstay calculation
      <select v-model="settings.feeCalculationMode" class="mt-2 block rounded-lg border border-border bg-surface p-2 text-text">
        <option value="per_hour">Per started hour</option><option value="per_day">Per day</option>
        <option value="one_time">One time</option><option value="one_time_hourly">Base plus hourly</option><option value="no_fee">No scheduled overstay fee</option>
      </select>
    </label>
    <div class="grid gap-6 lg:grid-cols-2">
      <section v-for="group in parkingVehicleGroups" :key="group.key" class="space-y-3">
        <h4 class="font-semibold text-text">{{ group.label }}</h4>
        <div class="grid gap-3 sm:grid-cols-2">
          <label v-for="rate in rates" :key="rate.key" class="text-xs text-muted">{{ rate.label }} (₱)
            <UiInput v-model.number="settings[group.key][rate.key]" type="number" min="0" step="0.01" :aria-label="`${group.label}: ${rate.label}`" />
          </label>
        </div>
      </section>
    </div>
  </UiCard>
</template>
