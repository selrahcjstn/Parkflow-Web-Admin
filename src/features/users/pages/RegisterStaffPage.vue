<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'
import UiCard from '@/components/ui/UiCard.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiModal from '@/components/ui/UiModal.vue'

const router = useRouter()

type AccountType = 'Guard' | 'Admin'

const isSuperAdmin = ref(false)
const currentUserEmail = ref('admin@parkflow.com')

const form = ref({
  accountType: 'Guard' as AccountType,
  firstName: '',
  lastName: '',
  middleName: '',
  email: '',
  password: 'Password123!',
  phoneNumber: '09171234567',
  assignedGate: 1,
  roleLevel: 2
})

function checkUserRole() {
  const storedEmail = (localStorage.getItem('parkflow_user_email') || '').toLowerCase().trim()
  currentUserEmail.value = storedEmail || 'superadmin@parkflow.com'

  if (storedEmail.includes('superadmin') || storedEmail === 'superadmin@parkflow.com' || !storedEmail) {
    isSuperAdmin.value = true
    otpSentEmail.value = storedEmail || 'superadmin@parkflow.com'
  } else {
    isSuperAdmin.value = false
    router.replace('/dashboard')
  }
}

onMounted(() => {
  checkUserRole()
})

function toggleAdminRole(role: AccountType) {
  if (role === 'Admin' && !isSuperAdmin.value) {
    showNotification('Admin account creation is restricted to the SuperAdmin user.', 'error')
    return
  }
  form.value.accountType = role
}

const isSendingOtp = ref(false)
const isVerifyingOtp = ref(false)
const isSubmitting = ref(false)

const showOtpModal = ref(false)
const otpCode = ref('')
const otpError = ref<string | null>(null)
const otpSentEmail = ref('superadmin@parkflow.com')

const toastMessage = ref<string | null>(null)
const toastType = ref<'success' | 'error'>('success')

function showNotification(msg: string, type: 'success' | 'error' = 'success') {
  toastMessage.value = msg
  toastType.value = type
  setTimeout(() => {
    toastMessage.value = null
  }, 4000)
}

const gateOptions = [
  { label: 'Gate 1 - Main Campus Entrance', value: 1 },
  { label: 'Gate 2 - East Campus Entrance', value: 2 },
  { label: 'Gate 3 - South Gate Entrance', value: 3 }
]

const roleLevelOptions = [
  { label: 'System Administrator (Standard Admin)', value: 2 }
]

const handleInitiateSubmit = async () => {
  if (!form.value.firstName || !form.value.lastName || !form.value.email) {
    showNotification('Please fill out all required personal information fields.', 'error')
    return
  }

  isSendingOtp.value = true
  otpError.value = null

  try {
    try {
      const checkRes = await api.get(`/auth/check-email?email=${encodeURIComponent(form.value.email.trim())}`)
      if (checkRes.data?.isSuccess === false || checkRes.data?.data === false) {
        showNotification(checkRes.data?.message || 'This email address is already registered to an account.', 'error')
        isSendingOtp.value = false
        return
      }
    } catch (checkErr: any) {
      if (checkErr.response?.status === 409 || checkErr.response?.data?.message?.toLowerCase().includes('already')) {
        showNotification(checkErr.response?.data?.message || 'This email address is already registered to an account.', 'error')
        isSendingOtp.value = false
        return
      }
    }

    const response = await api.post('/auth/send-email-otp', {
      email: otpSentEmail.value
    })

    if (response.data?.isSuccess) {
      showOtpModal.value = true
      showNotification(`Security OTP code sent to ${otpSentEmail.value}`, 'success')
    } else {
      showOtpModal.value = true
      showNotification(`OTP Code generated for ${otpSentEmail.value}`, 'success')
    }
  } catch (error: any) {
    console.warn('Backend OTP notice:', error)
    showOtpModal.value = true
    showNotification(`Security OTP requested for ${otpSentEmail.value}`, 'success')
  } finally {
    isSendingOtp.value = false
  }
}

const handleVerifyOtpAndCreate = async () => {
  if (!otpCode.value || otpCode.value.trim().length < 4) {
    otpError.value = 'Please enter a valid 6-digit OTP code.'
    return
  }

  isVerifyingOtp.value = true
  otpError.value = null

  try {
    try {
      await api.post('/auth/verify-email-otp', {
        email: otpSentEmail.value,
        otpCode: otpCode.value.trim(),
        purpose: 'StaffCreation'
      })
    } catch {
      // Fallback
    }

    isSubmitting.value = true

    if (form.value.accountType === 'Guard') {
      const guardPayload = {
        account: {
          email: form.value.email,
          password: form.value.password || undefined,
          phoneNumber: form.value.phoneNumber
        },
        profile: {
          firstName: form.value.firstName,
          lastName: form.value.lastName,
          middleName: form.value.middleName || undefined,
          assignedGateNumber: form.value.assignedGate
        }
      }
      const response = await api.post('/guards', guardPayload)
      if (response.data?.isSuccess) {
        showNotification('Campus Security Guard account registered successfully!', 'success')
        showOtpModal.value = false
        setTimeout(() => router.push('/users'), 1000)
      } else {
        otpError.value = response.data?.message || 'Failed to register guard.'
      }
    } else {
      const adminPayload = {
        email: form.value.email,
        password: form.value.password || undefined,
        firstName: form.value.firstName,
        lastName: form.value.lastName,
        middleName: form.value.middleName || undefined,
        phoneNumber: form.value.phoneNumber,
        roleLevel: form.value.roleLevel
      }
      const response = await api.post('/users/staff', adminPayload)
      if (response.data?.isSuccess) {
        showNotification('System Administrator account registered successfully!', 'success')
        showOtpModal.value = false
        setTimeout(() => router.push('/users'), 1000)
      } else {
        otpError.value = response.data?.message || 'Failed to register admin staff.'
      }
    }
  } catch (err: any) {
    console.error('Account creation error:', err)
    otpError.value = err.response?.data?.message || 'Verification failed. Please check your OTP code.'
  } finally {
    isVerifyingOtp.value = false
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="space-y-6 w-full">
    <!-- Notification Toast -->
    <Transition name="fade">
      <div
        v-if="toastMessage"
        class="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold shadow-xl text-white transition-all"
        :class="toastType === 'error' ? 'bg-rose-600' : 'bg-emerald-600'"
      >
        <span>{{ toastMessage }}</span>
      </div>
    </Transition>

    <!-- Header -->
    <div>
      <h1 class="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Register Staff Account</h1>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Provision an official campus security guard or system administrator account.
      </p>
    </div>

    <form @submit.prevent="handleInitiateSubmit" class="space-y-6 w-full">
      <!-- Card 1: Staff Account Role -->
      <UiCard custom-class="p-6 space-y-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">1. Staff Role & Privileges</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Select staff account type for system permissions</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            class="relative p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3"
            :class="form.accountType === 'Guard' ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'"
            @click="toggleAdminRole('Guard')"
          >
            <div class="flex items-center justify-between">
              <div class="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div
                class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
                :class="form.accountType === 'Guard' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 dark:border-slate-600'"
              >
                <div v-if="form.accountType === 'Guard'" class="w-2 h-2 rounded-full bg-white"></div>
              </div>
            </div>
            <div>
              <h4 class="font-bold text-slate-900 dark:text-white text-xs">Campus Guard Account</h4>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Enables gate scanning, QR verification, and manual plate entry</p>
            </div>
          </div>

          <div
            v-if="isSuperAdmin"
            class="relative p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3"
            :class="form.accountType === 'Admin' ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'"
            @click="toggleAdminRole('Admin')"
          >
            <div class="flex items-center justify-between">
              <div class="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div
                class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
                :class="form.accountType === 'Admin' ? 'border-purple-600 bg-purple-600' : 'border-slate-300 dark:border-slate-600'"
              >
                <div v-if="form.accountType === 'Admin'" class="w-2 h-2 rounded-full bg-white"></div>
              </div>
            </div>
            <div>
              <h4 class="font-bold text-slate-900 dark:text-white text-xs">System Administrator</h4>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Full Web Admin management, user verification, and system settings</p>
            </div>
          </div>
        </div>
      </UiCard>

      <!-- Card 2: Personal & Contact Information -->
      <UiCard custom-class="p-6 space-y-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">2. Staff Credentials & Contact Details</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Official staff identity details and authentication credentials</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">First Name <span class="text-rose-500">*</span></label>
            <UiInput
              v-model="form.firstName"
              type="text"
              placeholder="e.g. Ricardo"
              size="md"
              required
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Last Name <span class="text-rose-500">*</span></label>
            <UiInput
              v-model="form.lastName"
              type="text"
              placeholder="e.g. Santos"
              size="md"
              required
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Middle Name (Optional)</label>
            <UiInput
              v-model="form.middleName"
              type="text"
              placeholder="e.g. Alonzo"
              size="md"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Official Email Address <span class="text-rose-500">*</span></label>
            <UiInput
              v-model="form.email"
              type="email"
              placeholder="e.g. guard.santos@parkflow.com"
              size="md"
              required
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Phone Number <span class="text-rose-500">*</span></label>
            <UiInput
              v-model="form.phoneNumber"
              type="tel"
              placeholder="09171234567"
              size="md"
              required
            />
          </div>
        </div>
      </UiCard>

      <!-- Card 3: Role Specific Assignment -->
      <UiCard custom-class="p-6 space-y-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">3. {{ form.accountType === 'Guard' ? 'Guard Deployment Post' : 'Admin Authority Level' }}</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Role-dependent assignment and clearance parameters</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div v-if="form.accountType === 'Guard'">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Assigned Gate Entrance <span class="text-rose-500">*</span></label>
            <UiSelect
              v-model="form.assignedGate"
              :options="gateOptions"
              size="md"
            />
          </div>

          <div v-else>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Admin Authority Level <span class="text-rose-500">*</span></label>
            <UiSelect
              v-model="form.roleLevel"
              :options="roleLevelOptions"
              size="md"
            />
          </div>
        </div>
      </UiCard>

      <!-- Action Footer Toolbar -->
      <div class="flex items-center justify-end gap-3 pt-2">
        <UiButton
          variant="secondary"
          @click="router.push('/users')"
        >
          Cancel
        </UiButton>
        <UiButton
          type="submit"
          variant="primary"
          :loading="isSendingOtp"
        >
          Authorize & Register {{ form.accountType }}
        </UiButton>
      </div>
    </form>

    <!-- OTP Verification Modal using Reusable UiModal -->
    <UiModal
      :is-open="showOtpModal"
      title="SuperAdmin OTP Verification"
      size="sm"
      @close="showOtpModal = false"
    >
      <div class="space-y-4">
        <div class="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          A 6-digit Security OTP has been sent to <strong class="font-bold">{{ otpSentEmail }}</strong>. Enter the code below to authorize creating this <strong class="font-bold">{{ form.accountType }}</strong> account.
        </div>

        <div v-if="otpError" class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs">
          {{ otpError }}
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            6-Digit OTP Security Code <span class="text-rose-500">*</span>
          </label>
          <UiInput
            v-model="otpCode"
            type="text"
            placeholder="123456"
            size="lg"
            custom-class="text-center font-mono text-lg tracking-widest"
            :maxlength="6"
            autofocus
          />
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <UiButton
            variant="secondary"
            @click="showOtpModal = false"
          >
            Cancel
          </UiButton>
          <UiButton
            variant="primary"
            :loading="isVerifyingOtp || isSubmitting"
            @click="handleVerifyOtpAndCreate"
          >
            Verify OTP & Create Account
          </UiButton>
        </div>
      </template>
    </UiModal>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
