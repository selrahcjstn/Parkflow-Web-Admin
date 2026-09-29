<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { UserRole } from '../types'
import api from '@/api/axios'
import UiCard from '@/components/ui/UiCard.vue'

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
const otpCode = ref('')
const otpError = ref<string | null>(null)
const resendCountdown = ref(0)
let resendTimer: any = null

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

// Available courses and programs organized by college/discipline
const courseGroups = [
  {
    college: 'College of Computer Studies & Information Technology',
    courses: [
      'BS Computer Science (BSCS)',
      'BS Information Technology (BSIT)',
      'BS Information Systems (BSIS)',
      'BS Data Science and Analytics (BSDSA)',
      'Associate in Computer Technology (ACT)'
    ]
  },
  {
    college: 'College of Engineering',
    courses: [
      'BS Civil Engineering (BSCE)',
      'BS Computer Engineering (BSCpE)',
      'BS Electrical Engineering (BSEE)',
      'BS Electronics Engineering (BSECE)',
      'BS Mechanical Engineering (BSME)',
      'BS Industrial Engineering (BSIE)',
      'BS Chemical Engineering (BSChE)',
      'BS Environmental and Sanitary Engineering (BSESE)',
      'BS Geodetic Engineering (BSGE)'
    ]
  },
  {
    college: 'College of Business, Accountancy & Management',
    courses: [
      'BS Accountancy (BSA)',
      'BS Management Accounting (BSMA)',
      'BS Accounting Information Systems (BSAIS)',
      'BSBA - Major in Marketing Management (BSBA-MM)',
      'BSBA - Major in Financial Management (BSBA-FM)',
      'BSBA - Major in Human Resource Management (BSBA-HRM)',
      'BSBA - Major in Operations Management (BSBA-OM)',
      'BS Entrepreneurship (BSEntrep)',
      'BS Hospitality Management (BSHM)',
      'BS Tourism Management (BSTM)',
      'BS Customs Administration (BSCA)',
      'BS Real Estate Management (BSREM)'
    ]
  },
  {
    college: 'College of Arts, Sciences & Humanities',
    courses: [
      'BS Psychology (BSPsych)',
      'BA Psychology (ABPsych)',
      'BA Communication (BAComm)',
      'BA Journalism (BAJourn)',
      'BA Political Science (BAPolSci)',
      'BA English Language Studies (BAELS)',
      'BS Biology (BSBio)',
      'BS Applied Mathematics (BSAM)',
      'BS Chemistry (BSChem)',
      'BS Social Work (BSSW)'
    ]
  },
  {
    college: 'College of Education',
    courses: [
      'Bachelor of Elementary Education (BEEd)',
      'Bachelor of Secondary Education - Major in English (BSEd-Eng)',
      'Bachelor of Secondary Education - Major in Mathematics (BSEd-Math)',
      'Bachelor of Secondary Education - Major in Science (BSEd-Sci)',
      'Bachelor of Secondary Education - Major in Social Studies (BSEd-SS)',
      'Bachelor of Secondary Education - Major in Filipino (BSEd-Fil)',
      'Bachelor of Physical Education (BPEd)',
      'Bachelor of Special Needs Education (BSNEd)',
      'Bachelor of Early Childhood Education (BECEd)'
    ]
  },
  {
    college: 'College of Nursing & Health Sciences',
    courses: [
      'BS Nursing (BSN)',
      'BS Medical Laboratory Science / Medical Technology (BSMLS)',
      'BS Pharmacy (BSPharm)',
      'BS Physical Therapy (BSPT)',
      'BS Radiologic Technology (BSRT)',
      'BS Nutrition and Dietetics (BSND)',
      'BS Respiratory Therapy (BSRTh)'
    ]
  },
  {
    college: 'College of Architecture & Fine Arts',
    courses: [
      'BS Architecture (BSArch)',
      'Bachelor of Fine Arts (BFA)',
      'BS Interior Design (BSID)'
    ]
  },
  {
    college: 'College of Criminology & Security',
    courses: [
      'BS Criminology (BSCrim)',
      'BS Industrial Security Management (BSISM)'
    ]
  },
  {
    college: 'Senior High School (SHS)',
    courses: [
      'Science, Technology, Engineering, and Mathematics (STEM)',
      'Accountancy, Business, and Management (ABM)',
      'Humanities and Social Sciences (HUMSS)',
      'General Academic Strand (GAS)',
      'TVL - Information and Communications Technology (ICT)',
      'TVL - Home Economics (HE)',
      'TVL - Industrial Arts (IA)'
    ]
  }
]

const selectedCourseDropdown = ref('')

const onCourseDropdownChange = () => {
  if (selectedCourseDropdown.value) {
    form.value.course = selectedCourseDropdown.value
    courseFieldError.value = null
  }
}

watch(
  () => form.value.course,
  (newVal) => {
    selectedCourseDropdown.value = newVal
  }
)

const onPhoneInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  form.value.phoneNumber = target.value.replace(/\D/g, '').slice(0, 11)
  phoneFieldError.value = null
}

const onClientIdInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  form.value.studentNumber = target.value.replace(/\D/g, '').slice(0, 10)
  clientIdFieldError.value = null
}

const onSectionInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  form.value.section = target.value.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase().slice(0, 10)
  sectionFieldError.value = null
}

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
    const availRes = await api.get(`/auth/check-email-availability?email=${encodeURIComponent(email)}`)
    if (availRes.data?.isSuccess === false) {
      emailFieldError.value = availRes.data?.message || 'This email address is already in use.'
      isSendingOtp.value = false
      return
    }

    const otpRes = await api.post('/auth/send-email-otp', { email })
    if (otpRes.data?.isSuccess === false) {
      emailFieldError.value = otpRes.data?.message || 'Failed to dispatch verification code.'
      isSendingOtp.value = false
      return
    }

    otpCode.value = ''
    if (otpRes.data?.message && otpRes.data.message.includes('Verification code generated:')) {
      const match = otpRes.data.message.match(/\d{6}/)
      if (match) {
        otpCode.value = match[0]
      }
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

const handleVerifyOtp = async () => {
  otpError.value = null
  const email = form.value.email.trim()
  const code = otpCode.value.trim()

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
  selectedCourseDropdown.value = ''
  isEmailVerified.value = false
  verifiedEmail.value = ''
  otpCode.value = ''
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

    if (!form.value.course.trim()) {
      courseFieldError.value = 'Course / Program is required.'
      errorMessage.value = 'Please select or enter the client Course / Program.'
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
        course: form.value.course.trim(),
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
  <div class="space-y-6 w-full">
    <!-- Header Title -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Register Client Account</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Provision a new student, faculty, staff, or guard client profile for campus parking access.</p>
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

      <!-- Card 1: Account Classification & Role -->
      <UiCard class="p-6 space-y-6">
        <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div class="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-semibold text-slate-900 dark:text-white">1. Account Classification & Role</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">Select client classification to apply automatic permissions</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            class="relative p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3"
            :class="form.role === 'Student' ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'"
            @click="form.role = 'Student'"
          >
            <div class="flex items-center justify-between">
              <div class="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                  <path d="M6 12.5v5c3 3 9 3 12 0v-5"/>
                </svg>
              </div>
              <div
                class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
                :class="form.role === 'Student' ? 'border-emerald-600 bg-emerald-600 dark:border-emerald-500 dark:bg-emerald-500' : 'border-slate-300 dark:border-slate-600'"
              >
                <div v-if="form.role === 'Student'" class="w-2 h-2 rounded-full bg-white"></div>
              </div>
            </div>
            <div>
              <h4 class="font-semibold text-slate-900 dark:text-white text-sm">Student</h4>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Enrolled student account with schedule parking privileges</p>
            </div>
          </div>

          <div
            class="relative p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3"
            :class="form.role === 'UniversityStaff' ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'"
            @click="form.role = 'UniversityStaff'"
          >
            <div class="flex items-center justify-between">
              <div class="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
                </svg>
              </div>
              <div
                class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
                :class="form.role === 'UniversityStaff' ? 'border-emerald-600 bg-emerald-600 dark:border-emerald-500 dark:bg-emerald-500' : 'border-slate-300 dark:border-slate-600'"
              >
                <div v-if="form.role === 'UniversityStaff'" class="w-2 h-2 rounded-full bg-white"></div>
              </div>
            </div>
            <div>
              <h4 class="font-semibold text-slate-900 dark:text-white text-sm">Faculty Member</h4>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Academic teaching faculty with reserved area access</p>
            </div>
          </div>

          <div
            class="relative p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3"
            :class="form.role === 'NonAcademicPersonnel' ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'"
            @click="form.role = 'NonAcademicPersonnel'"
          >
            <div class="flex items-center justify-between">
              <div class="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
              </div>
              <div
                class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
                :class="form.role === 'NonAcademicPersonnel' ? 'border-emerald-600 bg-emerald-600 dark:border-emerald-500 dark:bg-emerald-500' : 'border-slate-300 dark:border-slate-600'"
              >
                <div v-if="form.role === 'NonAcademicPersonnel'" class="w-2 h-2 rounded-full bg-white"></div>
              </div>
            </div>
            <div>
              <h4 class="font-semibold text-slate-900 dark:text-white text-sm">University Staff</h4>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Administrative & non-academic staff personnel</p>
            </div>
          </div>
        </div>
      </UiCard>

      <!-- Card 2: Personal Information -->
      <UiCard class="p-6 space-y-6">
        <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-semibold text-slate-900 dark:text-white">2. Personal & Contact Information</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">Primary account identity details and credentials</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">First Name <span class="text-red-500">*</span></label>
            <input
              v-model="form.firstName"
              type="text"
              placeholder="e.g. Juan"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              required
            />
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Last Name <span class="text-red-500">*</span></label>
            <input
              v-model="form.lastName"
              type="text"
              placeholder="e.g. Dela Cruz"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              required
            />
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Middle Name (Optional)</label>
            <input
              v-model="form.middleName"
              type="text"
              placeholder="e.g. Santos"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>

          <!-- Email with Verification Flow -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email Address <span class="text-red-500">*</span>
              </label>
              <span v-if="isEmailVerified" class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Verified
              </span>
              <span v-else class="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                Verification Required
              </span>
            </div>
            <div class="flex gap-2">
              <input
                v-model="form.email"
                type="email"
                placeholder="e.g. juan@university.edu.ph"
                class="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                @input="onEmailInput"
                required
              />
              <button
                v-if="!isEmailVerified"
                type="button"
                class="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                :disabled="isSendingOtp || !form.email"
                @click="handleSendOtp(false)"
              >
                <span v-if="isSendingOtp" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>{{ isSendingOtp ? 'Sending...' : 'Verify Email' }}</span>
              </button>
            </div>
            <p v-if="emailFieldError" class="text-xs text-red-500 mt-1">{{ emailFieldError }}</p>
          </div>

          <!-- Phone Number with Numerical and Length Validation -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Phone Number <span class="text-red-500">*</span>
              </label>
              <span class="text-[10px] text-slate-400">11 digits (09XXXXXXXXX)</span>
            </div>
            <input
              v-model="form.phoneNumber"
              type="tel"
              inputmode="numeric"
              maxlength="11"
              placeholder="09171234567"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              @input="onPhoneInput"
              required
            />
            <p v-if="phoneFieldError" class="text-xs text-red-500 mt-1">{{ phoneFieldError }}</p>
          </div>
        </div>
      </UiCard>

      <!-- Card 3: User Information (Formerly PROFILE SPECIFICS) -->
      <UiCard class="p-6 space-y-6">
        <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-semibold text-slate-900 dark:text-white">3. User Information</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">Role-dependent metadata details</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <!-- Student Specifics -->
          <template v-if="form.role === 'Student'">
            <!-- Client ID (Digits only, 7-10 digits) -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Client ID <span class="text-red-500">*</span>
                </label>
                <span class="text-[10px] text-slate-400">Digits only (7-10 digits)</span>
              </div>
              <input
                v-model="form.studentNumber"
                type="text"
                inputmode="numeric"
                maxlength="10"
                placeholder="202600123"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                @input="onClientIdInput"
                required
              />
              <p v-if="clientIdFieldError" class="text-xs text-red-500 mt-1">{{ clientIdFieldError }}</p>
            </div>

            <!-- Course / Program (Dropdown containing ALL available courses and programs) -->
            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Course / Program <span class="text-red-500">*</span>
              </label>
              <select
                v-model="form.course"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition cursor-pointer"
                required
              >
                <option value="">-- Select Course / Program --</option>
                <optgroup v-for="group in courseGroups" :key="group.college" :label="group.college">
                  <option v-for="course in group.courses" :key="course" :value="course">
                    {{ course }}
                  </option>
                </optgroup>
              </select>
              <p v-if="courseFieldError" class="text-xs text-red-500 mt-1">{{ courseFieldError }}</p>
            </div>

            <!-- Section (Format: 1A-G1) -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Section <span class="text-red-500">*</span>
                </label>
                <span class="text-[10px] text-slate-400">Format: 1A-G1</span>
              </div>
              <input
                v-model="form.section"
                type="text"
                placeholder="1A-G1"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                @input="onSectionInput"
                required
              />
              <p v-if="sectionFieldError" class="text-xs text-red-500 mt-1">{{ sectionFieldError }}</p>
            </div>

            <!-- Year Level -->
            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Year Level</label>
              <select
                v-model.number="form.yearLevel"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition cursor-pointer"
              >
                <option :value="7">Grade 7</option>
                <option :value="8">Grade 8</option>
                <option :value="9">Grade 9</option>
                <option :value="10">Grade 10</option>
                <option :value="11">Grade 11</option>
                <option :value="12">Grade 12</option>
                <option :value="1">1st Year</option>
                <option :value="2">2nd Year</option>
                <option :value="3">3rd Year</option>
                <option :value="4">4th Year</option>
                <option :value="5">5th Year+</option>
              </select>
            </div>
          </template>

          <!-- Personnel Specifics -->
          <template v-else-if="form.role === 'UniversityStaff' || form.role === 'NonAcademicPersonnel'">
            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Client ID</label>
              <input
                v-model="form.idCardNumber"
                type="text"
                placeholder="EMP-9082"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Department / College</label>
              <input
                v-model="form.department"
                type="text"
                placeholder="College of Engineering"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </div>
          </template>
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
          :disabled="isSubmitting"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
          <span>Register Client Account</span>
        </button>
      </div>
    </form>

    <!-- Email OTP Verification Modal -->
    <Teleport to="body">
      <div v-if="otpModalVisible" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4 shadow-2xl">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
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
            <button
              type="button"
              class="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              @click="otpModalVisible = false"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <p class="text-xs text-slate-600 dark:text-slate-300">
            A 6-digit verification code has been dispatched to <strong class="text-slate-900 dark:text-white">{{ form.email }}</strong>. Please obtain the code from the client to confirm email ownership and deliverability.
          </p>

          <div v-if="otpError" class="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{{ otpError }}</span>
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">6-Digit Verification Code</label>
            <input
              v-model="otpCode"
              type="text"
              inputmode="numeric"
              maxlength="6"
              placeholder="123456"
              class="w-full text-center text-2xl tracking-widest font-mono py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              @input="otpCode = otpCode.replace(/\D/g, '').slice(0, 6)"
              @keydown.enter.prevent="handleVerifyOtp"
            />
          </div>

          <div class="flex items-center justify-between text-xs pt-1">
            <span class="text-slate-500 dark:text-slate-400">Didn't receive the code?</span>
            <button
              type="button"
              class="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
              :disabled="resendCountdown > 0 || isSendingOtp"
              @click="handleSendOtp(true)"
            >
              <span v-if="resendCountdown > 0">Resend code in {{ resendCountdown }}s</span>
              <span v-else-if="isSendingOtp">Sending...</span>
              <span v-else>Resend Code</span>
            </button>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
              @click="otpModalVisible = false"
            >
              Cancel
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
              :disabled="otpCode.length < 6 || isVerifyingOtp"
              @click="handleVerifyOtp"
            >
              <span v-if="isVerifyingOtp" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>{{ isVerifyingOtp ? 'Verifying...' : 'Verify Code' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Registration Confirmation Modal -->
    <Teleport to="body">
      <div v-if="confirmModalVisible" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-5 shadow-2xl">
          <div class="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <polyline points="16 11 18 13 22 9" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-bold text-slate-900 dark:text-white">Confirm Client Registration</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Please review the details below before creating this client account.</p>
            </div>
          </div>

          <!-- Summary details -->
          <div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-2.5 text-xs border border-slate-200/60 dark:border-slate-700/60">
            <div class="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-700/40">
              <span class="text-slate-500 dark:text-slate-400 font-medium">Full Name</span>
              <span class="font-bold text-slate-900 dark:text-white">{{ form.firstName }} {{ form.middleName ? form.middleName + ' ' : '' }}{{ form.lastName }}</span>
            </div>
            <div class="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-700/40">
              <span class="text-slate-500 dark:text-slate-400 font-medium">Role</span>
              <span class="font-semibold text-emerald-600 dark:text-emerald-400">{{ form.role }}</span>
            </div>
            <div class="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-700/40">
              <span class="text-slate-500 dark:text-slate-400 font-medium">Email Address</span>
              <span class="font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
                {{ form.email }}
                <span class="inline-flex items-center text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-500/20">Verified</span>
              </span>
            </div>
            <div class="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-700/40">
              <span class="text-slate-500 dark:text-slate-400 font-medium">Phone Number</span>
              <span class="font-medium text-slate-900 dark:text-white">{{ form.phoneNumber }}</span>
            </div>

            <!-- Role specifics -->
            <template v-if="form.role === 'Student'">
              <div class="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-700/40">
                <span class="text-slate-500 dark:text-slate-400 font-medium">Client ID</span>
                <span class="font-bold text-slate-900 dark:text-white">{{ form.studentNumber }}</span>
              </div>
              <div class="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-700/40">
                <span class="text-slate-500 dark:text-slate-400 font-medium">Course / Program</span>
                <span class="font-semibold text-slate-900 dark:text-white text-right max-w-[260px] truncate">{{ form.course }}</span>
              </div>
              <div class="flex justify-between items-center py-1">
                <span class="text-slate-500 dark:text-slate-400 font-medium">Year & Section</span>
                <span class="font-semibold text-slate-900 dark:text-white">Year {{ form.yearLevel }} - {{ form.section }}</span>
              </div>
            </template>
            <template v-else-if="form.role === 'UniversityStaff' || form.role === 'NonAcademicPersonnel'">
              <div class="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-700/40">
                <span class="text-slate-500 dark:text-slate-400 font-medium">Employee ID</span>
                <span class="font-bold text-slate-900 dark:text-white">{{ form.idCardNumber }}</span>
              </div>
              <div class="flex justify-between items-center py-1">
                <span class="text-slate-500 dark:text-slate-400 font-medium">Department</span>
                <span class="font-semibold text-slate-900 dark:text-white">{{ form.department }}</span>
              </div>
            </template>
          </div>

          <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            By confirming, this client account will be provisioned in the system. An email containing their initial credentials will be sent to their verified address.
          </p>

          <div class="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold transition cursor-pointer"
              :disabled="isSubmitting"
              @click="confirmModalVisible = false"
            >
              Cancel
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
              :disabled="isSubmitting"
              @click="executeRegistration"
            >
              <span v-if="isSubmitting" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>{{ isSubmitting ? 'Registering...' : 'Confirm & Register' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Success Registration Confirmation Modal -->
    <Teleport to="body">
      <div v-if="successModalVisible" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 text-center space-y-4 shadow-xl">
          <div class="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h3 class="text-xl font-bold text-slate-900 dark:text-white">Client Account Provisioned!</h3>
          <p class="text-sm text-slate-600 dark:text-slate-400">
            The client account for <strong class="text-slate-900 dark:text-white font-semibold">{{ registeredUserEmail }}</strong> was successfully created. An email containing their initial password credentials has been dispatched to their inbox.
          </p>
          <div class="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold transition cursor-pointer"
              @click="resetFormAndContinue"
            >
              Provision Another Account
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition cursor-pointer"
              @click="goToAccountsList"
            >
              Go to Accounts List
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
