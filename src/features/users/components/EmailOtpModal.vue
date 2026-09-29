<script setup lang="ts">
import { ref, watch } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiModal from '@/components/ui/UiModal.vue'

const props = defineProps<{
  isOpen: boolean
  email: string
  isVerifying: boolean
  isSendingOtp: boolean
  resendCountdown: number
  error?: string | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'verify', code: string): void
  (e: 'resend'): void
}>()

const otpCode = ref('')

watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      otpCode.value = ''
    }
  }
)

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement
  otpCode.value = target.value.replace(/\D/g, '').slice(0, 6)
}

function handleVerify() {
  if (otpCode.value.length < 6 || props.isVerifying) return
  emit('verify', otpCode.value.trim())
}
</script>

<template>
  <UiModal
    :is-open="isOpen"
    size="sm"
    @close="emit('close')"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <div>
          <h3 class="text-base font-bold text-slate-900 dark:text-white">Verify Client Email</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400">One-Time Password (OTP) Verification</p>
        </div>
      </div>
    </template>

    <div class="space-y-4">
      <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed m-0">
        A 6-digit verification code has been dispatched to <strong class="text-slate-900 dark:text-white">{{ email }}</strong>. Please obtain the code from the client to confirm email ownership and deliverability.
      </p>

      <div v-if="error" class="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
        <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{{ error }}</span>
      </div>

      <div class="space-y-1.5">
        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">6-Digit Verification Code</label>
        <input
          :value="otpCode"
          type="text"
          inputmode="numeric"
          maxlength="6"
          placeholder="123456"
          class="w-full text-center text-2xl tracking-widest font-mono py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition box-border"
          @input="handleInput"
          @keydown.enter.prevent="handleVerify"
        />
      </div>

      <div class="flex items-center justify-between text-xs pt-1">
        <span class="text-slate-500 dark:text-slate-400">Didn't receive the code?</span>
        <button
          type="button"
          class="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer border-none bg-transparent p-0"
          :disabled="resendCountdown > 0 || isSendingOtp"
          @click="emit('resend')"
        >
          <span v-if="resendCountdown > 0">Resend code in {{ resendCountdown }}s</span>
          <span v-else-if="isSendingOtp">Sending...</span>
          <span v-else>Resend Code</span>
        </button>
      </div>
    </div>

    <template #footer>
      <UiButton
        type="button"
        variant="secondary"
        size="sm"
        @click="emit('close')"
      >
        Cancel
      </UiButton>
      <UiButton
        type="button"
        variant="success"
        size="sm"
        :loading="isVerifying"
        :disabled="otpCode.length < 6"
        @click="handleVerify"
      >
        Verify Code
      </UiButton>
    </template>
  </UiModal>
</template>
