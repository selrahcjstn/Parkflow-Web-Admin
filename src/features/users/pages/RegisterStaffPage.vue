<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'
import StaffRoleSelectorCard from '../components/StaffRoleSelectorCard.vue'
import StaffPersonalInfoCard from '../components/StaffPersonalInfoCard.vue'
import StaffAssignmentCard from '../components/StaffAssignmentCard.vue'
import StaffConfirmModal from '../components/StaffConfirmModal.vue'
import StaffSuccessModal from '../components/StaffSuccessModal.vue'
import UiButton from '@/components/ui/UiButton.vue'

import { isSuperAdminUser, getStoredUserEmail } from '@/utils/auth'

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
  phoneNumber: '',
  assignedGate: 1,
  roleLevel: 1
})

function checkUserRole() {
  const isSuper = isSuperAdminUser()
  currentUserEmail.value = getStoredUserEmail() || 'admin@parkflow.com'
  isSuperAdmin.value = isSuper

  if (!isSuper) {
    router.replace('/dashboard')
  }
}

onMounted(() => {
  checkUserRole()
})

const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)
const successModalVisible = ref(false)
const confirmModalVisible = ref(false)
const registeredUserEmail = ref('')

// Field specific validation errors
const emailFieldError = ref<string | null>(null)
const phoneFieldError = ref<string | null>(null)

// Email OTP verification state
const isEmailVerified = ref(false)
const verifiedEmail = ref('')
const isSendingOtp = ref(false)
const isVerifyingOtp = ref(false)
const isOtpSent = ref(false)
const otpCode = ref('')
const otpError = ref<string | null>(null)
const resendCountdown = ref(0)
let resendTimer: any = null

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

const onEmailInput = () => {
  emailFieldError.value = null
  if (form.value.email.trim().toLowerCase() !== verifiedEmail.value.toLowerCase()) {
    isEmailVerified.value = false
    isOtpSent.value = false
    otpCode.value = ''
    otpError.value = null
  }
}

const onRoleRestricted = () => {
  errorMessage.value = 'System Administrator account creation is restricted to SuperAdmin users.'
}

const startResendTimer = () => {
  resendCountdown.value = 30
  if (resendTimer) clearInterval(resendTimer)
  resendTimer = setInterval(() => {
    if (resendCountdown.value > 0) {
      resendCountdown.value--
    } else {
      clearInterval(resendTimer)
      resendTimer = null
    }
  }, 1000)
}

const handleSendOtp = async (isResend = false) => {
  emailFieldError.value = null
  otpError.value = null
  const email = form.value.email.trim()

  if (!email) {
    emailFieldError.value = 'Email address is required.'
    return
  }

  if (!EMAIL_REGEX.test(email)) {
    emailFieldError.value = 'Please enter a valid email address (e.g. name@domain.com).'
    return
  }

  isSendingOtp.value = true
  try {
    // 1. Check if email is already in use
    try {
      const checkRes = await api.get(`/auth/check-email?email=${encodeURIComponent(email)}`)
      if (checkRes.data?.isSuccess === false || checkRes.data?.data === false) {
        emailFieldError.value = checkRes.data?.message || 'This email address is already registered to an existing account. Please use a different email.'
        isSendingOtp.value = false
        return
      }
    } catch (checkErr: any) {
      if (checkErr.response?.status === 409 || checkErr.response?.data?.message?.toLowerCase().includes('already')) {
        emailFieldError.value = checkErr.response?.data?.message || 'This email address is already registered to an existing account. Please use a different email.'
        isSendingOtp.value = false
        return
      }
    }

    const otpRes = await api.post('/auth/send-email-otp', { email })
    if (otpRes.data?.isSuccess === false) {
      const msg = otpRes.data?.message || 'Failed to dispatch verification code.'
      emailFieldError.value = msg
      otpError.value = msg
      isSendingOtp.value = false
      return
    }

    isOtpSent.value = true
    otpError.value = null
    startResendTimer()
  } catch (err: any) {
    console.error('Error sending email OTP:', err)
    const msg = err.response?.data?.message || 'Failed to dispatch verification code to this email address.'
    emailFieldError.value = msg
    otpError.value = msg
  } finally {
    isSendingOtp.value = false
  }
}

const handleVerifyOtp = async (code: string) => {
  otpError.value = null
  const email = form.value.email.trim()

  if (!code || code.length < 6) {
    otpError.value = 'Please enter the complete 6-digit verification code.'
    return
  }

  isVerifyingOtp.value = true
  try {
    const res = await api.post('/auth/verify-email-otp', {
      email,
      otpCode: code,
      purpose: 'Verification'
    })

    if (res.data?.isSuccess || res.status === 200) {
      isEmailVerified.value = true
      verifiedEmail.value = email
      isOtpSent.value = false
      otpCode.value = ''
      otpError.value = null
      emailFieldError.value = null
    } else {
      otpError.value = res.data?.message || 'Invalid or expired verification code. Please check your inbox or request a new code.'
    }
  } catch (err: any) {
    console.error('Error verifying email OTP:', err)
    otpError.value = err.response?.data?.message || 'Verification failed. Please check the code and try again.'
  } finally {
    isVerifyingOtp.value = false
  }
}

const resetFormAndContinue = () => {
  form.value = {
    accountType: 'Guard',
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    password: 'Password123!',
    phoneNumber: '',
    assignedGate: 1,
    roleLevel: 1
  }
  isEmailVerified.value = false
  verifiedEmail.value = ''
  isOtpSent.value = false
  otpCode.value = ''
  otpError.value = null
  confirmModalVisible.value = false
  successModalVisible.value = false
  errorMessage.value = null
  emailFieldError.value = null
  phoneFieldError.value = null
}

const goToAccountsList = () => {
  successModalVisible.value = false
  router.push({ path: '/users', query: { registered: 'true' } })
}

const handleInitialSubmit = () => {
  errorMessage.value = null
  emailFieldError.value = null
  phoneFieldError.value = null

  // 1. Personal Information Validation
  if (!form.value.firstName.trim()) {
    errorMessage.value = 'Please provide the staff First Name.'
    return
  }
  if (!form.value.lastName.trim()) {
    errorMessage.value = 'Please provide the staff Last Name.'
    return
  }

  // 2. Email Validation & Verification
  const email = form.value.email.trim()
  if (!email) {
    emailFieldError.value = 'Email address is required.'
    errorMessage.value = 'Email address is required.'
    return
  }
  if (!EMAIL_REGEX.test(email)) {
    emailFieldError.value = 'Please enter a valid email address.'
    errorMessage.value = 'Please enter a valid email address.'
    return
  }
  if (!isEmailVerified.value || email.toLowerCase() !== verifiedEmail.value.toLowerCase()) {
    emailFieldError.value = 'Email verification is required before registration.'
    errorMessage.value = 'Email verification is required. Please verify that the email belongs to the user using the verification code.'
    return
  }

  // 3. Phone Number Validation (digits only, exactly 11 digits starting with 09)
  const phone = form.value.phoneNumber.trim()
  if (!phone) {
    phoneFieldError.value = 'Phone number is required.'
    errorMessage.value = 'Phone number is required.'
    return
  }
  if (!/^09\d{9}$/.test(phone)) {
    phoneFieldError.value = 'Please enter a valid 11-digit phone number starting with 09 (e.g. 09171234567).'
    errorMessage.value = 'Please enter a valid 11-digit phone number starting with 09 (e.g. 09171234567).'
    return
  }

  // 4. Role Authorization Check
  if (form.value.accountType === 'Admin' && !isSuperAdmin.value) {
    errorMessage.value = 'Admin account creation is restricted to the SuperAdmin user.'
    return
  }

  // All validations passed -> Open Confirmation Modal
  confirmModalVisible.value = true
}

const executeRegistration = async () => {
  isSubmitting.value = true
  errorMessage.value = null

  try {
    if (form.value.accountType === 'Guard') {
      const guardPayload = {
        account: {
          email: form.value.email.trim(),
          password: form.value.password || undefined,
          phoneNumber: form.value.phoneNumber.trim()
        },
        profile: {
          firstName: form.value.firstName.trim(),
          lastName: form.value.lastName.trim(),
          middleName: form.value.middleName?.trim() || undefined
        },
        assignedGate: Number(form.value.assignedGate) || 1
      }

      const response = await api.post('/guards/create', guardPayload)
      if (response.data?.isSuccess || response.status === 200 || response.status === 201) {
        confirmModalVisible.value = false
        registeredUserEmail.value = form.value.email.trim()
        successModalVisible.value = true
      } else {
        confirmModalVisible.value = false
        errorMessage.value = response.data?.message || 'Failed to register campus guard account.'
      }
    } else {
      const adminPayload = {
        account: {
          email: form.value.email.trim(),
          password: form.value.password || undefined,
          phoneNumber: form.value.phoneNumber.trim()
        },
        profile: {
          firstName: form.value.firstName.trim(),
          lastName: form.value.lastName.trim(),
          middleName: form.value.middleName?.trim() || undefined
        },
        roleLevel: form.value.roleLevel === 2 ? 1 : (form.value.roleLevel ?? 1)
      }

      const response = await api.post('/admin/register', adminPayload)
      if (response.data?.isSuccess || response.status === 200 || response.status === 201) {
        confirmModalVisible.value = false
        registeredUserEmail.value = form.value.email.trim()
        successModalVisible.value = true
      } else {
        confirmModalVisible.value = false
        errorMessage.value = response.data?.message || 'Failed to register system administrator account.'
      }
    }
  } catch (error: any) {
    console.error('API error during staff registration:', error)
    confirmModalVisible.value = false
    errorMessage.value = error.response?.data?.message || error.message || 'An error occurred while registering the staff account.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="space-y-6 w-full">
    <!-- Header Title -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight m-0">Register Staff / Admin Account</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-0">Provision an official campus security guard or system administrator profile for campus access and operations.</p>
      </div>
    </div>

    <form @submit.prevent="handleInitialSubmit" class="space-y-6 w-full">
      <div v-if="errorMessage" class="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
        <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Card 1: Role Selection -->
      <StaffRoleSelectorCard
        v-model="form.accountType"
        :is-super-admin="isSuperAdmin"
        @restricted="onRoleRestricted"
      />

      <!-- Card 2: Personal Information with Inline OTP -->
      <StaffPersonalInfoCard
        v-model:first-name="form.firstName"
        v-model:middle-name="form.middleName"
        v-model:last-name="form.lastName"
        v-model:email="form.email"
        v-model:phone-number="form.phoneNumber"
        v-model:otp-code="otpCode"
        :is-email-verified="isEmailVerified"
        :is-sending-otp="isSendingOtp"
        :is-otp-sent="isOtpSent"
        :is-verifying-otp="isVerifyingOtp"
        :resend-countdown="resendCountdown"
        :email-error="emailFieldError"
        :phone-error="phoneFieldError"
        :otp-error="otpError"
        @send-otp="handleSendOtp(false)"
        @resend-otp="handleSendOtp(true)"
        @verify-otp="handleVerifyOtp"
        @email-input="onEmailInput"
      />

      <!-- Card 3: Role Specific Deployment / Authority -->
      <StaffAssignmentCard
        :account-type="form.accountType"
        v-model:assigned-gate="form.assignedGate"
        v-model:role-level="form.roleLevel"
      />

      <!-- Action Toolbar -->
      <div class="flex items-center justify-end gap-3 pt-2">
        <UiButton
          type="button"
          variant="secondary"
          size="md"
          @click="router.push('/users')"
        >
          Cancel
        </UiButton>
        <UiButton
          type="submit"
          variant="primary"
          size="md"
          :loading="isSubmitting"
        >
          <template #icon>
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </template>
          <span>Register Staff Account</span>
        </UiButton>
      </div>
    </form>

    <!-- Registration Confirmation Modal -->
    <StaffConfirmModal
      :is-open="confirmModalVisible"
      :is-submitting="isSubmitting"
      :form="form"
      @close="confirmModalVisible = false"
      @confirm="executeRegistration"
    />

    <!-- Success Registration Modal -->
    <StaffSuccessModal
      :is-open="successModalVisible"
      :registered-email="registeredUserEmail"
      :account-type="form.accountType"
      @provision-another="resetFormAndContinue"
      @go-to-list="goToAccountsList"
    />
  </div>
</template>
