<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { UserRole } from '../types'
import api from '@/api/axios'
import RoleSelectorCard from '../components/RoleSelectorCard.vue'
import ClientPersonalInfoCard from '../components/ClientPersonalInfoCard.vue'
import StudentDetailsCard from '../components/StudentDetailsCard.vue'
import PersonnelDetailsCard from '../components/PersonnelDetailsCard.vue'
import EmailOtpModal from '../components/EmailOtpModal.vue'
import RegisterConfirmModal from '../components/RegisterConfirmModal.vue'
import RegisterSuccessModal from '../components/RegisterSuccessModal.vue'
import UiButton from '@/components/ui/UiButton.vue'

const router = useRouter()

const form = ref({
  firstName: '',
  lastName: '',
  middleName: '',
  email: '',
  password: 'Password123!',
  phoneNumber: '',
  role: 'Student' as UserRole,
  status: 'Active' as 'Active' | 'Suspended' | 'PendingVerification',
  // Role specific
  studentNumber: '',
  course: '',
  section: '',
  yearLevel: 1,
  idCardNumber: '',
  department: '',
  assignedGate: 1
})

const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)
const successModalVisible = ref(false)
const confirmModalVisible = ref(false)
const registeredUserEmail = ref('')

// Field specific validation errors
const emailFieldError = ref<string | null>(null)
const phoneFieldError = ref<string | null>(null)
const clientIdFieldError = ref<string | null>(null)
const courseFieldError = ref<string | null>(null)
const sectionFieldError = ref<string | null>(null)

// Email OTP verification state
const isEmailVerified = ref(false)
const verifiedEmail = ref('')
const isSendingOtp = ref(false)
const isVerifyingOtp = ref(false)
const otpModalVisible = ref(false)
const otpError = ref<string | null>(null)
const resendCountdown = ref(0)
let resendTimer: any = null

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

// Year level classifications
const isJuniorHigh = computed(() => form.value.yearLevel >= 7 && form.value.yearLevel <= 10)

watch(
  () => form.value.yearLevel,
  (newLevel) => {
    if (newLevel >= 7 && newLevel <= 10) {
      form.value.course = ''
      courseFieldError.value = null
    }
  }
)

const onEmailInput = () => {
  emailFieldError.value = null
  if (form.value.email.trim().toLowerCase() !== verifiedEmail.value.toLowerCase()) {
    isEmailVerified.value = false
  }
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
      emailFieldError.value = otpRes.data?.message || 'Failed to dispatch verification code.'
      isSendingOtp.value = false
      return
    }

    otpModalVisible.value = true
    startResendTimer()
  } catch (err: any) {
    console.error('Error sending email OTP:', err)
    const msg = err.response?.data?.message || 'Failed to dispatch verification code to this email address.'
    emailFieldError.value = msg
    if (isResend) {
      otpError.value = msg
    }
  } finally {
    isSendingOtp.value = false
  }
}

const handleVerifyOtp = async (code: string) => {
  otpError.value = null
  const email = form.value.email.trim()

  if (code.length < 6) {
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
      otpModalVisible.value = false
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
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    password: 'Password123!',
    phoneNumber: '',
    role: 'Student',
    status: 'Active',
    studentNumber: '',
    course: '',
    section: '',
    yearLevel: 1,
    idCardNumber: '',
    department: '',
    assignedGate: 1
  }
  isEmailVerified.value = false
  verifiedEmail.value = ''
  otpError.value = null
  confirmModalVisible.value = false
  successModalVisible.value = false
  errorMessage.value = null
  emailFieldError.value = null
  phoneFieldError.value = null
  clientIdFieldError.value = null
  courseFieldError.value = null
  sectionFieldError.value = null
}

const goToAccountsList = () => {
  successModalVisible.value = false
  router.push({ path: '/users', query: { registered: 'true' } })
}

const handleInitialSubmit = () => {
  errorMessage.value = null
  emailFieldError.value = null
  phoneFieldError.value = null
  clientIdFieldError.value = null
  courseFieldError.value = null
  sectionFieldError.value = null

  // 1. Personal Information Validation
  if (!form.value.firstName.trim()) {
    errorMessage.value = 'Please provide the client First Name.'
    return
  }
  if (!form.value.lastName.trim()) {
    errorMessage.value = 'Please provide the client Last Name.'
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

  // 4. Role-specific validation
  if (form.value.role === 'Student') {
    const studentNum = form.value.studentNumber.trim()
    if (!studentNum) {
      clientIdFieldError.value = 'Client ID is required.'
      errorMessage.value = 'Client ID is required.'
      return
    }
    if (!/^\d{7,10}$/.test(studentNum)) {
      clientIdFieldError.value = 'Client ID must contain only digits and be between 7 and 10 digits long (e.g. 202600123).'
      errorMessage.value = 'Client ID must contain only digits and be between 7 and 10 digits long (e.g. 202600123).'
      return
    }

    if (!isJuniorHigh.value && !form.value.course?.trim()) {
      courseFieldError.value = 'Course / Program is required.'
      errorMessage.value = 'Please select the client Course / Program.'
      return
    }

    if (!form.value.section.trim()) {
      sectionFieldError.value = 'Section is required (e.g. 1A-G1).'
      errorMessage.value = 'Section is required (e.g. 1A-G1).'
      return
    }
  } else if (form.value.role === 'UniversityStaff' || form.value.role === 'NonAcademicPersonnel') {
    if (!form.value.idCardNumber.trim()) {
      errorMessage.value = 'Client ID (Employee ID) is required.'
      return
    }
    if (!form.value.department.trim()) {
      errorMessage.value = 'Department is required.'
      return
    }
  }

  // All validations passed -> Open Confirmation Modal
  confirmModalVisible.value = true
}

const executeRegistration = async () => {
  isSubmitting.value = true
  errorMessage.value = null

  try {
    const payload = {
      firstName: form.value.firstName.trim(),
      lastName: form.value.lastName.trim(),
      middleName: form.value.middleName?.trim() || null,
      email: form.value.email.trim(),
      password: form.value.password || undefined,
      phoneNumber: form.value.phoneNumber.trim(),
      role: form.value.role,
      status: 'Active',
      isAdminCreated: true,
      student: form.value.role === 'Student' ? {
        studentNumber: form.value.studentNumber.trim(),
        course: isJuniorHigh.value ? null : (form.value.course?.trim() || null),
        section: form.value.section.trim(),
        yearLevel: form.value.yearLevel
      } : null,
      personnel: (form.value.role === 'UniversityStaff' || form.value.role === 'NonAcademicPersonnel') ? {
        idCardNumber: form.value.idCardNumber.trim(),
        department: form.value.department.trim()
      } : null,
      guard: form.value.role === 'Guard' ? {
        assignedGate: form.value.assignedGate
      } : null
    }

    const response = await api.post('/auth/register-manual', payload)
    if (response.data?.isSuccess || response.status === 200 || response.status === 201) {
      confirmModalVisible.value = false
      registeredUserEmail.value = form.value.email.trim()
      successModalVisible.value = true
    } else {
      confirmModalVisible.value = false
      errorMessage.value = response.data?.message || 'Failed to register client account.'
    }
  } catch (error: any) {
    console.error('API error during registration:', error)
    confirmModalVisible.value = false
    errorMessage.value = error.response?.data?.message || error.message || 'An error occurred while registering the account.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="space-y-6 w-full max-w-5xl mx-auto">
    <!-- Header Title -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight m-0">Register Client Account</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-0">Provision a new student, faculty, staff, or guard client profile for campus parking access.</p>
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
      <RoleSelectorCard v-model="form.role" />

      <!-- Card 2: Personal Information -->
      <ClientPersonalInfoCard
        v-model:first-name="form.firstName"
        v-model:middle-name="form.middleName"
        v-model:last-name="form.lastName"
        v-model:email="form.email"
        v-model:phone-number="form.phoneNumber"
        :is-email-verified="isEmailVerified"
        :is-sending-otp="isSendingOtp"
        :email-error="emailFieldError"
        :phone-error="phoneFieldError"
        @send-otp="handleSendOtp(false)"
        @email-input="onEmailInput"
      />

      <!-- Card 3: Role Specific Institutional Details -->
      <!-- Student -->
      <StudentDetailsCard
        v-if="form.role === 'Student'"
        v-model:student-number="form.studentNumber"
        v-model:year-level="form.yearLevel"
        v-model:course="form.course"
        v-model:section="form.section"
        :client-id-error="clientIdFieldError"
        :course-error="courseFieldError"
        :section-error="sectionFieldError"
      />

      <!-- Faculty / University Staff -->
      <PersonnelDetailsCard
        v-else-if="form.role === 'UniversityStaff' || form.role === 'NonAcademicPersonnel'"
        v-model:id-card-number="form.idCardNumber"
        v-model:department="form.department"
        :role-label="form.role === 'UniversityStaff' ? 'Faculty Member' : 'University Staff'"
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <polyline points="16 11 18 13 22 9" />
            </svg>
          </template>
          <span>Register Client Account</span>
        </UiButton>
      </div>
    </form>

    <!-- Email OTP Verification Modal -->
    <EmailOtpModal
      :is-open="otpModalVisible"
      :email="form.email"
      :is-verifying="isVerifyingOtp"
      :is-sending-otp="isSendingOtp"
      :resend-countdown="resendCountdown"
      :error="otpError"
      @close="otpModalVisible = false"
      @verify="handleVerifyOtp"
      @resend="handleSendOtp(true)"
    />

    <!-- Registration Confirmation Modal -->
    <RegisterConfirmModal
      :is-open="confirmModalVisible"
      :is-submitting="isSubmitting"
      :form="form"
      @close="confirmModalVisible = false"
      @confirm="executeRegistration"
    />

    <!-- Success Registration Confirmation Modal -->
    <RegisterSuccessModal
      :is-open="successModalVisible"
      :registered-email="registeredUserEmail"
      @provision-another="resetFormAndContinue"
      @go-to-list="goToAccountsList"
    />
  </div>
</template>
