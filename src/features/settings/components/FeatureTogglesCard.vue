<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import UiButton from '@/components/ui/UiButton.vue'

const props = defineProps<{
  settings: {
    maintenanceMode: boolean
    rfidInstantScanEnabled: boolean
    autoApproveVerification: boolean
  }
  isSaving: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle', key: 'maintenanceMode' | 'rfidInstantScanEnabled' | 'autoApproveVerification'): void
  (e: 'export-backup'): void
}>()
</script>

<template>
  <UiCard custom-class="p-6 space-y-5">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      </div>
      <div>
        <h3 class="text-sm font-bold text-slate-900 dark:text-white">Feature Flags & Diagnostics</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Toggle automation workflows, gate scan behavior, and backup server states
        </p>
      </div>
    </div>

    <div class="space-y-3">
      <!-- RFID Scan -->
      <div class="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
        <div>
          <span class="text-xs font-bold text-slate-900 dark:text-white block">RFID Instant Scanning Mode</span>
          <span class="text-[11px] text-slate-500 dark:text-slate-400">Processes gate barrier signals automatically without manual operator verification.</span>
        </div>
        <input
          :checked="settings.rfidInstantScanEnabled"
          type="checkbox"
          class="w-4 h-4 rounded text-[#D22730] focus:ring-[#D22730] cursor-pointer"
          @change="emit('toggle', 'rfidInstantScanEnabled')"
        />
      </div>

      <!-- Auto-Approve -->
      <div class="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
        <div>
          <span class="text-xs font-bold text-slate-900 dark:text-white block">Automated Student COR Approvals</span>
          <span class="text-[11px] text-slate-500 dark:text-slate-400">Bypasses manual staff inspector review for matching enrolled student registration files.</span>
        </div>
        <input
          :checked="settings.autoApproveVerification"
          type="checkbox"
          class="w-4 h-4 rounded text-[#D22730] focus:ring-[#D22730] cursor-pointer"
          @change="emit('toggle', 'autoApproveVerification')"
        />
      </div>

      <!-- Maintenance Mode -->
      <div class="flex items-center justify-between p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40">
        <div>
          <span class="text-xs font-bold text-rose-700 dark:text-rose-400 block">Emergency Maintenance Mode</span>
          <span class="text-[11px] text-rose-600/80 dark:text-rose-400/70">Locks mobile app reservations and client registrations during server upgrades.</span>
        </div>
        <input
          :checked="settings.maintenanceMode"
          type="checkbox"
          class="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
          @change="emit('toggle', 'maintenanceMode')"
        />
      </div>

      <!-- Backup JSON Export -->
      <div class="pt-2">
        <UiButton
          variant="secondary"
          size="sm"
          full-width
          @click="emit('export-backup')"
        >
          <template #prefix>
            <svg class="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </template>
          Export System Settings Backup (JSON)
        </UiButton>
      </div>
    </div>
  </UiCard>
</template>
