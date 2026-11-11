<script setup lang="ts">
import { computed } from 'vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiInput from '@/components/ui/UiInput.vue'
import { parkingVehicleGroups, type VehicleParkingSettings } from '../types'

const props = defineProps<{ settings: { carParking: VehicleParkingSettings; motorcycleParking: VehicleParkingSettings; feeCalculationMode: string } }>()

type Key = 'violationRatePerHour' | 'baseFee' | 'dailyOverstayFee'
const modes: Record<string, { label: string; summary: string; fields: Key[] }> = {
  per_hour: { label: 'Per hour (default)', summary: 'Charged for every hour, or part of an hour, the vehicle stays past its allowed time. The longer the overstay, the higher the fee.', fields: ['violationRatePerHour'] },
  one_time: { label: 'One-time fee', summary: 'A single fixed fee as soon as the vehicle overstays. It does not grow with the number of hours.', fields: ['baseFee'] },
  one_time_hourly: { label: 'One-time fee + per hour', summary: 'A fixed starting fee, plus an amount for every hour (or part of an hour) of overstay.', fields: ['baseFee', 'violationRatePerHour'] },
  per_day: { label: 'Per day', summary: 'A fixed fee for each 24 hours (or part of 24 hours) of overstay.', fields: ['dailyOverstayFee'] },
  no_fee: { label: 'No overstay fee', summary: 'Overstaying is recorded but never charged.', fields: [] },
}
const labels: Record<Key, { label: string; hint: string }> = {
  violationRatePerHour: { label: 'Fee per hour', hint: 'per started hour' },
  baseFee: { label: 'One-time fee', hint: 'charged once' },
  dailyOverstayFee: { label: 'Fee per day', hint: 'per started day' },
}
const mode = computed(() => modes[props.settings.feeCalculationMode] ?? modes.per_hour!)

// Live example from the car settings so the admin can see exactly what a driver would pay.
const example = computed(() => {
  const c = props.settings.carParking
  const hour = Number(c.violationRatePerHour) || 0, base = Number(c.baseFee) || 0, day = Number(c.dailyOverstayFee) || 0
  const hours = 3
  const total = { per_hour: hours * hour, one_time: base, one_time_hourly: base + hours * hour, per_day: day, no_fee: 0 }[props.settings.feeCalculationMode] ?? hours * hour
  return `A car that overstays by 2 hours 10 minutes (3 started hours) pays ₱${total.toLocaleString('en-PH', { maximumFractionDigits: 2 })}.`
})

const entryFees = [
  { key: 'entryFee', label: 'Manual / reservation entry' },
  { key: 'studentEntryFee', label: 'Student entry' },
  { key: 'facultyEntryFee', label: 'Faculty entry' },
  { key: 'personnelEntryFee', label: 'University staff entry' },
  { key: 'visitorFee', label: 'Visitor per visit' },
  { key: 'vipEntryFee', label: 'VIP / special pass' },
] as const
</script>
<template>
  <UiCard custom-class="p-6 space-y-6">
    <div>
      <h3 class="text-sm font-bold text-text">Overstay fees</h3>
      <p class="mt-1 text-sm text-muted">Parking is free during a driver's allowed time. A fee applies only when a vehicle stays longer. Amounts are in pesos. Changes apply to new checkouts; recorded charges keep their amounts.</p>
    </div>

    <div class="space-y-2">
      <label class="block text-sm font-medium text-text">How overstay is charged
        <select v-model="settings.feeCalculationMode" class="mt-2 block w-full max-w-sm rounded-lg border border-border bg-surface p-2 text-text">
          <option v-for="(m, id) in modes" :key="id" :value="id">{{ m.label }}</option>
        </select>
      </label>
      <p class="m-0 text-sm text-text-secondary">{{ mode.summary }}</p>
      <p class="m-0 rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm text-text">{{ example }}</p>
    </div>

    <div v-if="mode.fields.length" class="grid gap-6 lg:grid-cols-2">
      <section v-for="group in parkingVehicleGroups" :key="group.key" class="space-y-3">
        <h4 class="m-0 font-semibold text-text">{{ group.label }}</h4>
        <div class="grid gap-3 sm:grid-cols-2">
          <label v-for="field in mode.fields" :key="field" class="text-xs text-muted">{{ labels[field].label }} (₱, {{ labels[field].hint }})
            <UiInput v-model.number="settings[group.key][field]" type="number" min="0" step="0.01" :aria-label="`${group.label}: ${labels[field].label}`" />
          </label>
        </div>
      </section>
    </div>

    <details class="rounded-lg border border-border p-4">
      <summary class="cursor-pointer text-sm font-semibold text-text">Optional entry fees (leave at 0 to keep parking free)</summary>
      <p class="mt-2 text-xs text-muted">Charged once per visit on top of any overstay fee, based on who is parking.</p>
      <div class="mt-3 grid gap-6 lg:grid-cols-2">
        <section v-for="group in parkingVehicleGroups" :key="group.key" class="space-y-3">
          <h4 class="m-0 text-sm font-semibold text-text">{{ group.label }}</h4>
          <div class="grid gap-3 sm:grid-cols-2">
            <label v-for="fee in entryFees" :key="fee.key" class="text-xs text-muted">{{ fee.label }} (₱)
              <UiInput v-model.number="settings[group.key][fee.key]" type="number" min="0" step="0.01" :aria-label="`${group.label}: ${fee.label}`" />
            </label>
          </div>
        </section>
      </div>
    </details>
  </UiCard>
</template>
