<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import UiInput from '@/components/ui/UiInput.vue'
import type { ProfileInformation, AccessSummary } from '../accountSettings.service'

const props = defineProps<{
  profile: ProfileInformation
  access: AccessSummary
  avatarInitials: string
  formErrors: Record<string, string | undefined>
}>()
</script>

<template>
  <UiCard custom-class="p-6 space-y-5">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <div>
        <h3 class="text-sm font-bold text-slate-900 dark:text-white">Admin Profile & Identity</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Update your public administrator name and contact details
        </p>
      </div>
    </div>

    <!-- Identity Summary Box -->
    <div class="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
      <div class="w-12 h-12 rounded-full bg-[#D22730] text-white font-black text-sm flex items-center justify-center tracking-wider flex-shrink-0">
        {{ avatarInitials }}
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-slate-900 dark:text-white truncate">{{ profile.fullName || 'Admin User' }}</span>
          <span class="text-[10px] font-extrabold text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400 px-2 py-0.5 rounded">
            {{ access.role }}
          </span>
        </div>
        <span class="text-[11px] text-slate-400 dark:text-slate-500 block truncate mt-0.5">
          {{ profile.email }}
        </span>
      </div>
    </div>

    <div class="space-y-4">
      <div>
        <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
          Full Name
        </label>
        <UiInput
          v-model="profile.fullName"
          type="text"
          placeholder="e.g. Juan Dela Cruz"
          size="md"
          :error="formErrors.fullName"
        />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Email Address
          </label>
          <UiInput
            v-model="profile.email"
            type="email"
            size="md"
            :error="formErrors.email"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Contact Number
          </label>
          <UiInput
            v-model="profile.phone"
            type="tel"
            placeholder="09123456789"
            size="md"
            :error="formErrors.phone"
          />
        </div>
      </div>
    </div>
  </UiCard>
</template>
