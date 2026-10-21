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
    reservationAllocationSlots: number
    maxVehiclesPerUser: number
    lastResetDate?: string
  }
  isSaving?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'open-reset-modal'): void
  (e: 'save'): void
  (e: 'update-reservation-allocation', value: number): void
}>()

const academicYearOptions = computed(() => {
  const year = new Date().getFullYear()
  const years = new Set(Array.from({ length: 8 }, (_, i) => `${year - 2 + i}-${year - 1 + i}`))
  // Keep an existing configured year selectable even outside the rolling range.
  if (/^\d{4}-\d{4}$/.test(props.settings.academicYear)) years.add(props.settings.academicYear)
  return [...years].sort().map((value) => ({ label: value, value }))
})

const semesterOptions = [
  { label: '1st Semester', value: '1st Semester' },
  { label: '2nd Semester', value: '2nd Semester' },
  { label: 'Summer / Midyear', value: 'Summer' },
]

const allocationError = computed(() => {
  const slots = props.settings.reservationAllocationSlots
  return !Number.isInteger(slots) || slots < 0 || slots > props.settings.totalCapacity
    ? 'Enter a whole number from 0 to the total parking capacity.'
    : ''
})

const formattedResetDate = computed(() => {
  if (!props.settings.lastResetDate) return 'No reset record found'
  const date = new Date(props.settings.lastResetDate)
  if (isNaN(date.getTime())) return props.settings.lastResetDate
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
})
</script>

<template>
  <UiCard custom-class="p-4 sm:p-6">
    <div class="border-b border-border pb-4">
      <h3 class="text-base font-semibold text-text">Campus capacity &amp; academic term</h3>
      <p class="mt-1 text-sm text-muted">
        Set parking limits and the academic term required for student CORs.
      </p>
    </div>

    <section
      class="grid gap-4 border-b border-border py-5 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-8"
    >
      <div>
        <h4 class="text-sm font-semibold text-text">Academic term</h4>
        <p class="mt-1 text-xs leading-relaxed text-muted">
          Uploaded CORs must match both selections.
        </p>
      </div>
      <div class="grid max-w-xl gap-4 sm:grid-cols-2">
        <UiSelect
          v-model="settings.academicYear"
          label="Academic year"
          :options="academicYearOptions"
          :disabled="disabled"
          required
        />
        <UiSelect
          v-model="settings.currentSemester"
          label="Current semester"
          :options="semesterOptions"
          :disabled="disabled"
          required
        />
      </div>
    </section>

    <section
      class="grid gap-4 border-b border-border py-5 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-8"
    >
      <div>
        <h4 class="text-sm font-semibold text-text">Parking capacity</h4>
        <p class="mt-1 text-xs leading-relaxed text-muted">
          Reservation spaces are included in the campus total.
        </p>
      </div>
      <div class="max-w-xl space-y-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <UiInput
            v-model.number="settings.totalCapacity"
            label="Total parking spaces"
            type="number"
            min="1"
            step="1"
            :disabled="disabled"
            required
          />
          <UiInput
            :model-value="settings.reservationAllocationSlots"
            @update:model-value="emit('update-reservation-allocation', Number($event))"
            label="Reservation spaces"
            type="number"
            min="0"
            :max="settings.totalCapacity"
            step="1"
            :error="allocationError"
            hint="Set to 0 to disable new reservations."
            :disabled="disabled"
            required
          />
        </div>
        <div class="rounded-lg border border-border bg-surface-muted px-3 py-2.5">
          <p class="text-sm font-medium text-text">
            {{ settings.reservationAllocationSlots }} reservation spaces out of
            {{ settings.totalCapacity }} total spaces
          </p>
          <p class="mt-1 text-xs leading-relaxed text-muted">
            Pending and approved bookings count during their time window. A space becomes available
            again when a booking ends.
          </p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <UiInput
            v-model.number="settings.maxVehiclesPerUser"
            label="Maximum vehicles per user"
            type="number"
            min="1"
            step="1"
            :disabled="disabled"
          />
        </div>
      </div>
    </section>

    <section class="grid gap-4 py-5 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-8">
      <div>
        <h4 class="text-sm font-semibold text-text">Semester transition</h4>
        <p class="mt-1 text-xs leading-relaxed text-muted">Start a new COR submission cycle.</p>
      </div>
      <div
        class="max-w-xl rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30"
      >
        <p class="text-xs leading-relaxed text-amber-800 dark:text-amber-200">
          Resets student schedule and COR clearance states. Students will need to upload their COR
          for the new semester.
        </p>
        <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p class="text-xs text-amber-700 dark:text-amber-300">
            Last reset: {{ formattedResetDate }}
          </p>
          <UiButton
            variant="danger"
            size="sm"
            :disabled="disabled"
            @click="emit('open-reset-modal')"
          >
            Reset schedules
          </UiButton>
        </div>
      </div>
    </section>

    <div class="flex justify-end border-t border-border pt-4">
      <UiButton
        variant="primary"
        size="sm"
        :loading="isSaving"
        :disabled="disabled || !!allocationError"
        @click="emit('save')"
      >
        Save capacity &amp; term
      </UiButton>
    </div>
  </UiCard>
</template>
