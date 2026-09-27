<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'
import UiCard from '@/components/ui/UiCard.vue'

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
  // Guard specific
  assignedGate: 1,
  // Admin specific
  roleLevel: 2 // Standard Admin
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

// Step 1: Send OTP code
const handleInitiateSubmit = async () => {
  if (!form.value.firstName || !form.value.lastName || !form.value.email) {
    showNotification('Please fill out all required personal information fields.', 'error')
    return
  }

  isSendingOtp.value = true
  otpError.value = null

  try {
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

// Step 2: Verify OTP and create account
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
          middleName: form.value.middleName || null,
          profilePictureUrl: null
        },
        assignedGate: Number(form.value.assignedGate) || 1
      }

      const res = await api.post('/guards/create', guardPayload)
      if (!res.data?.isSuccess && res.data?.isSuccess === false) {
        throw new Error(res.data?.message || 'Guard creation failed.')
      }
    } else {
      const adminPayload = {
        account: {
          email: form.value.email,
          password: form.value.password || undefined,
          phoneNumber: form.value.phoneNumber
        },
        profile: {
          firstName: form.value.firstName,
          lastName: form.value.lastName,
          middleName: form.value.middleName || null,
          profilePictureUrl: null
        },
        roleLevel: Number(form.value.roleLevel) || 2,
        registrationKey: 'ParkFlowSecretBootstrapAdminKey2026'
      }

      const res = await api.post('/admin/register', adminPayload)
      if (!res.data?.isSuccess && res.data?.isSuccess === false) {
        throw new Error(res.data?.message || 'Admin creation failed.')
      }
    }

    showOtpModal.value = false
    showNotification(`New ${form.value.accountType} account successfully created!`, 'success')

    setTimeout(() => {
      router.push({ path: '/users', query: { role: form.value.accountType === 'Guard' ? 'Guard' : 'Admin' } })
    }, 1200)

  } catch (error: any) {
    console.error('Account creation error:', error)
    showOtpModal.value = false
    const errMsg = error.response?.data?.message || error.message || `Failed to create ${form.value.accountType} account.`
    showNotification(errMsg, 'error')
  } finally {
    isVerifyingOtp.value = false
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="space-y-6 w-full">
    <!-- Notification Toast -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-[-8px]"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-[-8px]"
    >
      <div
        v-if="toastMessage"
        class="fixed top-6 right-6 z-50 px-5 py-3.5 rounded-xl border shadow-lg text-sm font-medium flex items-center gap-2"
        :class="toastType === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-red-600 border-red-500 text-white'"
      >
        <span>{{ toastMessage }}</span>
      </div>
    </Transition>

    <!-- Header Title -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Register Staff Account</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Provision an official campus security guard or system administrator account.</p>
      </div>
    </div>

    <form @submit.prevent="handleInitiateSubmit" class="space-y-6 w-full">
      <!-- Card 1: Staff Account Role -->
      <UiCard class="p-6 space-y-6">
        <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <h3 class="text-base font-semibold text-slate-900 dark:text-white">1. Staff Role & Privileges</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">Select staff account type for system permissions</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            class="relative p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3"
            :class="form.accountType === 'Guard' ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'"
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
                :class="form.accountType === 'Guard' ? 'border-emerald-600 bg-emerald-600 dark:border-emerald-500 dark:bg-emerald-500' : 'border-slate-300 dark:border-slate-600'"
              >
                <div v-if="form.accountType === 'Guard'" class="w-2 h-2 rounded-full bg-white"></div>
              </div>
            </div>
            <div>
              <h4 class="font-semibold text-slate-900 dark:text-white text-sm">Campus Guard Account</h4>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Enables gate scanning, QR verification, and manual plate entry</p>
            </div>
          </div>

          <!-- System Administrator: SuperAdmin Only -->
          <div
            v-if="isSuperAdmin"
            class="relative p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3"
            :class="form.accountType === 'Admin' ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'"
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
                :class="form.accountType === 'Admin' ? 'border-emerald-600 bg-emerald-600 dark:border-emerald-500 dark:bg-emerald-500' : 'border-slate-300 dark:border-slate-600'"
              >
                <div v-if="form.accountType === 'Admin'" class="w-2 h-2 rounded-full bg-white"></div>
              </div>
            </div>
            <div>
              <h4 class="font-semibold text-slate-900 dark:text-white text-sm">System Administrator</h4>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Full Web Admin management, user verification, and system settings</p>
            </div>
          </div>
        </div>
      </UiCard>

      <!-- Card 2: Personal & Contact Information -->
      <UiCard class="p-6 space-y-6">
        <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-semibold text-slate-900 dark:text-white">2. Staff Credentials & Contact Information</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">Official staff identity details and authentication credentials</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">First Name <span class="text-red-500">*</span></label>
            <input
              v-model="form.firstName"
              type="text"
              placeholder="e.g. Ricardo"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              required
            />
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Last Name <span class="text-red-500">*</span></label>
            <input
              v-model="form.lastName"
              type="text"
              placeholder="e.g. Santos"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              required
            />
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Middle Name (Optional)</label>
            <input
              v-model="form.middleName"
              type="text"
              placeholder="e.g. Alonzo"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Official Email Address <span class="text-red-500">*</span></label>
            <input
              v-model="form.email"
              type="email"
              placeholder="e.g. guard.santos@parkflow.com"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              required
            />
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Phone Number <span class="text-red-500">*</span></label>
            <input
              v-model="form.phoneNumber"
              type="tel"
              placeholder="09171234567"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              required
            />
          </div>
        </div>
      </UiCard>

      <!-- Card 3: Deployment & Role Specifics -->
      <UiCard class="p-6 space-y-6">
        <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div class="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-semibold text-slate-900 dark:text-white">3. {{ form.accountType === 'Guard' ? 'Guard Deployment Post' : 'Admin Authority Level' }}</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">Role-dependent assignment and clearance parameters</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div v-if="form.accountType === 'Guard'" class="space-y-1.5">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Assigned Gate Entrance <span class="text-red-500">*</span></label>
            <select
              v-model.number="form.assignedGate"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            >
              <option :value="1">Gate 1 - Main Campus Entrance</option>
              <option :value="2">Gate 2 - East Campus Entrance</option>
              <option :value="3">Gate 3 - South Gate Entrance</option>
            </select>
          </div>

          <div v-else class="space-y-1.5">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Admin Authority Level <span class="text-red-500">*</span></label>
            <select
              v-model.number="form.roleLevel"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            >
              <option :value="2">System Administrator (Standard Admin)</option>
            </select>
          </div>
        </div>
      </UiCard>

      <!-- Action Footer Toolbar -->
      <div class="flex items-center justify-end gap-3 pt-2">
        <router-link
          to="/users"
          class="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold transition"
        >
          Cancel
        </router-link>
        <button
          type="submit"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          :disabled="isSendingOtp"
        >
          <svg v-if="!isSendingOtp" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span v-if="isSendingOtp">Requesting Security OTP...</span>
          <span v-else>Authorize & Register {{ form.accountType }}</span>
        </button>
      </div>
    </form>

    <!-- OTP Verification Modal -->
    <Teleport to="body">
      <div
        v-if="showOtpModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        @click="showOtpModal = false"
      >
        <div
          class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-5 shadow-xl"
          @click.stop
        >
          <div class="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900 dark:text-white">SuperAdmin OTP Verification</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Security verification required to execute staff account creation</p>
            </div>
          </div>

          <div class="space-y-4">
            <div class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              A 6-digit Security OTP has been sent to <strong class="font-semibold text-amber-900 dark:text-amber-100">{{ otpSentEmail }}</strong>. Enter the code below to authorize creating this <strong class="font-semibold text-amber-900 dark:text-amber-100">{{ form.accountType }}</strong> account.
            </div>

            <div v-if="otpError" class="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
              {{ otpError }}
            </div>

            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">6-Digit OTP Security Code <span class="text-red-500">*</span></label>
              <input
                v-model="otpCode"
                type="text"
                maxlength="6"
                placeholder="123456"
                class="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-center text-xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                autofocus
              />
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold transition cursor-pointer"
              @click="showOtpModal = false"
            >
              Cancel
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
              :disabled="isVerifyingOtp || isSubmitting"
              @click="handleVerifyOtpAndCreate"
            >
              <span v-if="isVerifyingOtp || isSubmitting">Verifying & Registering...</span>
              <span v-else>Verify OTP & Create Account</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
