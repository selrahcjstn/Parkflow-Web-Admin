<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'

defineProps<{
  email: string
  isSendingTempPw: boolean
  tempPwSuccessMessage?: string | null
  showPasswordFields: boolean
  newPassword: string
  confirmPassword: string
  showNewPassword: boolean
  showConfirmPassword: boolean
}>()

const emit = defineEmits<{
  (e: 'sendTempPassword'): void
  (e: 'update:showPasswordFields', val: boolean): void
  (e: 'update:newPassword', val: string): void
  (e: 'update:confirmPassword', val: string): void
  (e: 'toggleShowNewPassword'): void
  (e: 'toggleShowConfirmPassword'): void
}>()
</script>

<template>
  <UiCard class="p-6 space-y-6">
    <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
      <div class="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <div>
        <h3 class="text-base font-semibold text-slate-900 dark:text-white">4. Security & Password Override</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400">Generate a temporary login password or manually update user credentials</p>
      </div>
    </div>

    <!-- Temporary Password Quick Action -->
    <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div class="space-y-1">
        <h4 class="text-xs font-bold text-slate-900 dark:text-white">Dispatch Temporary Password</h4>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Generates a secure temporary password and emails it directly to <strong class="text-slate-800 dark:text-slate-200">{{ email || 'user email' }}</strong>.
        </p>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm cursor-pointer disabled:opacity-60 flex-shrink-0"
        :disabled="isSendingTempPw"
        @click="emit('sendTempPassword')"
      >
        <svg v-if="isSendingTempPw" class="w-4 h-4 animate-spin text-white dark:text-slate-900" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
        <span>{{ isSendingTempPw ? 'Generating & Emailing...' : 'Send Temporary Password via Email' }}</span>
      </button>
    </div>

    <!-- Success Temp Password Banner -->
    <div
      v-if="tempPwSuccessMessage"
      class="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-3"
    >
      <div class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <div>
        <h5 class="text-xs font-bold text-emerald-900 dark:text-emerald-200">Temporary Password Dispatched!</h5>
        <p class="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
          {{ tempPwSuccessMessage }}
        </p>
      </div>
    </div>

    <!-- Manual Password Override Toggle -->
    <div class="pt-2">
      <label class="inline-flex items-center gap-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer select-none">
        <input
          type="checkbox"
          :checked="showPasswordFields"
          class="w-4 h-4 rounded text-red-600 focus:ring-red-500/20 dark:bg-slate-900 dark:border-slate-700 cursor-pointer accent-red-600"
          @change="emit('update:showPasswordFields', ($event.target as HTMLInputElement).checked)"
        />
        <span>Manually Override / Enter Custom Password</span>
      </label>
    </div>

    <!-- Password Inputs -->
    <div v-if="showPasswordFields" class="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
      <div class="space-y-1.5">
        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          New Password <span class="text-slate-400 font-normal">(min. 6 characters)</span>
        </label>
        <div class="relative">
          <input
            :value="newPassword"
            :type="showNewPassword ? 'text' : 'password'"
            placeholder="Enter new password"
            class="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
            @input="emit('update:newPassword', ($event.target as HTMLInputElement).value)"
          />
          <button
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
            @click="emit('toggleShowNewPassword')"
          >
            <svg v-if="showNewPassword" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
            <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </div>

      <div class="space-y-1.5">
        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          Confirm New Password
        </label>
        <div class="relative">
          <input
            :value="confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            placeholder="Re-enter new password"
            class="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
            @input="emit('update:confirmPassword', ($event.target as HTMLInputElement).value)"
          />
          <button
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
            @click="emit('toggleShowConfirmPassword')"
          >
            <svg v-if="showConfirmPassword" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
            <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </UiCard>
</template>
