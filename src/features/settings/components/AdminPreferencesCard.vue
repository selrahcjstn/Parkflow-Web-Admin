<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import type { AccountPreferences } from '../accountSettings.service'

const props = defineProps<{
  preferences: AccountPreferences
}>()

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'Filipino', value: 'fil' }
]

const timezoneOptions = [
  { label: 'Asia/Manila (PHT)', value: 'Asia/Manila' },
  { label: 'UTC', value: 'UTC' },
  { label: 'Asia/Singapore (SGT)', value: 'Asia/Singapore' },
  { label: 'Asia/Tokyo (JST)', value: 'Asia/Tokyo' }
]
</script>

<template>
  <UiCard custom-class="p-6 space-y-5">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </div>
      <div>
        <h3 class="text-sm font-bold text-slate-900 dark:text-white">Workspace Preferences</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Localization options and notification dispatch preferences
        </p>
      </div>
    </div>

    <div class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Language
          </label>
          <UiSelect
            v-model="preferences.language"
            :options="languageOptions"
            size="md"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Timezone
          </label>
          <UiSelect
            v-model="preferences.timezone"
            :options="timezoneOptions"
            size="md"
          />
        </div>
      </div>

      <div class="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <span class="text-xs font-bold text-slate-700 dark:text-slate-300 block">Notification Alerts</span>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              v-model="preferences.emailNotifications"
              type="checkbox"
              class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            Email Notifications
          </label>
          <label class="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              v-model="preferences.securityAlerts"
              type="checkbox"
              class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            Security Incident Alerts
          </label>
        </div>
      </div>
    </div>
  </UiCard>
</template>
