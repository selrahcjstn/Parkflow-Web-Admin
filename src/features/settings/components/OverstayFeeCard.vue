<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import UiInput from '@/components/ui/UiInput.vue'

defineProps<{
  settings: {
    personnelFreeParkingStart: string
    personnelFreeParkingEnd: string
    isGracePeriodEnabled: boolean
    gracePeriodMinutes: number
    isEarlyParkingAllowed: boolean
    earlyParkingMinutes: number
  }
}>()

const emit = defineEmits<{
  (
    e: 'update:personnel-hours',
    value: { personnelFreeParkingStart: string; personnelFreeParkingEnd: string },
  ): void
}>()

</script>

<template>
  <UiCard custom-class="p-6 space-y-5">
    <div class="flex items-center gap-3">
      <div
        class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      </div>
      <div>
        <h3 class="text-sm font-bold text-slate-900 dark:text-white">
          Parking Timing Rules
        </h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure exit grace, early entry allowance and staff timing windows
        </p>
      </div>
    </div>

    <div class="space-y-4">
      <div
        class="grid max-w-xl grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800"
      >
        <!-- Grace Period -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold text-slate-700 dark:text-slate-300">
              Grace Period (Minutes)
            </label>
            <input
              v-model="settings.isGracePeriodEnabled"
              type="checkbox"
              class="w-4 h-4 rounded text-[#7B1113] focus:ring-[#7B1113] cursor-pointer"
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
              class="w-4 h-4 rounded text-[#7B1113] focus:ring-[#7B1113] cursor-pointer"
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

      <section class="space-y-4 border-t border-border pt-4">
        <div>
          <h4 class="text-sm font-semibold text-text">University staff parking</h4>
          <p class="mt-1 text-sm leading-relaxed text-muted">
            Faculty and university staff may enter anytime with an approved employee ID, license and vehicle.
            These staff timing hours apply every day, including Sunday. No uploaded schedule is
            required.
          </p>
        </div>
        <div class="grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
          <UiInput
            :model-value="settings.personnelFreeParkingStart"
            @update:model-value="
              emit('update:personnel-hours', {
                personnelFreeParkingStart: String($event ?? ''),
                personnelFreeParkingEnd: settings.personnelFreeParkingEnd,
              })
            "
            type="time"
            label="Staff window starts"
            required
          />
          <UiInput
            :model-value="settings.personnelFreeParkingEnd"
            @update:model-value="
              emit('update:personnel-hours', {
                personnelFreeParkingStart: settings.personnelFreeParkingStart,
                personnelFreeParkingEnd: String($event ?? ''),
              })
            "
            type="time"
            label="Staff window ends"
            required
          />
        </div>
        <p class="text-sm leading-relaxed text-muted">
          Parking is free for everyone. Staff timing windows remain available for operational tracking.
        </p>
      </section>
    </div>
    <div v-if="$slots.actions" class="flex justify-end border-t border-border pt-4">
      <slot name="actions" />
    </div>
  </UiCard>
</template>
