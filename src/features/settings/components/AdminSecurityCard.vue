<script setup lang="ts">
import { ref } from 'vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiInput from '@/components/ui/UiInput.vue'

const props = defineProps<{
  currentPassword: string
  newPassword: string
  confirmPassword: string
  formErrors: Record<string, string | undefined>
  passwordStrengthHint: string
}>()

const emit = defineEmits<{
  (e: 'update:currentPassword', val: string): void
  (e: 'update:newPassword', val: string): void
  (e: 'update:confirmPassword', val: string): void
}>()

const showCurrent = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)
</script>

<template>
  <UiCard custom-class="p-6 space-y-5">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <div>
        <h3 class="text-sm font-bold text-slate-900 dark:text-white">Security & Password Credentials</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Leave blank if you do not wish to modify your account login password
        </p>
      </div>
    </div>

    <div class="space-y-4">
      <div>
        <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
          Current Password
        </label>
        <UiInput
          :model-value="currentPassword"
          :type="showCurrent ? 'text' : 'password'"
          placeholder="Enter current password"
          size="md"
          :error="formErrors.currentPassword"
          @update:model-value="emit('update:currentPassword', String($event))"
        >
          <template #suffix>
            <button
              type="button"
              class="text-slate-400 hover:text-slate-600 p-1"
              @click="showCurrent = !showCurrent"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </template>
        </UiInput>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            New Password
          </label>
          <UiInput
            :model-value="newPassword"
            :type="showNew ? 'text' : 'password'"
            placeholder="At least 8 characters"
            size="md"
            :error="formErrors.newPassword"
            @update:model-value="emit('update:newPassword', String($event))"
          >
            <template #suffix>
              <button
                type="button"
                class="text-slate-400 hover:text-slate-600 p-1"
                @click="showNew = !showNew"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </template>
          </UiInput>
          <span class="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
            {{ passwordStrengthHint }}
          </span>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Confirm New Password
          </label>
          <UiInput
            :model-value="confirmPassword"
            :type="showConfirm ? 'text' : 'password'"
            placeholder="Re-type new password"
            size="md"
            :error="formErrors.confirmPassword"
            @update:model-value="emit('update:confirmPassword', String($event))"
          >
            <template #suffix>
              <button
                type="button"
                class="text-slate-400 hover:text-slate-600 p-1"
                @click="showConfirm = !showConfirm"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </template>
          </UiInput>
        </div>
      </div>
    </div>
  </UiCard>
</template>
