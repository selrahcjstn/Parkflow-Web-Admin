<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { UserRole } from '../types'
import api from '@/api/axios'

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
const showPassword = ref(false)
const successModalVisible = ref(false)
const registeredUserEmail = ref('')

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
  successModalVisible.value = false
  errorMessage.value = null
}

const goToAccountsList = () => {
  successModalVisible.value = false
  router.push({ path: '/users', query: { registered: 'true' } })
}

const handleSubmit = async () => {
  if (!form.value.firstName || !form.value.lastName || !form.value.email) {
    errorMessage.value = 'Please fill out all required personal information fields.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = null

  try {
    const payload = {
      firstName: form.value.firstName,
      lastName: form.value.lastName,
      middleName: form.value.middleName || null,
      email: form.value.email,
      password: form.value.password || undefined,
      phoneNumber: form.value.phoneNumber,
      role: form.value.role,
      status: 'Active', // Default active upon admin creation
      isAdminCreated: true,
      student: form.value.role === 'Student' ? {
        studentNumber: form.value.studentNumber,
        course: form.value.course,
        section: form.value.section,
        yearLevel: form.value.yearLevel
      } : null,
      personnel: (form.value.role === 'UniversityStaff' || form.value.role === 'NonAcademicPersonnel') ? {
        idCardNumber: form.value.idCardNumber,
        department: form.value.department
      } : null,
      guard: form.value.role === 'Guard' ? {
        assignedGate: form.value.assignedGate
      } : null
    }

    const response = await api.post('/auth/register-manual', payload)
    if (response.data?.isSuccess || response.status === 200 || response.status === 201) {
      registeredUserEmail.value = form.value.email
      successModalVisible.value = true
    } else {
      errorMessage.value = response.data?.message || 'Failed to register client account.'
    }
  } catch (error: any) {
    console.error('API error during registration:', error)
    errorMessage.value = error.response?.data?.message || error.message || 'An error occurred while registering the account.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="register-user-page">
    <!-- Header with Back Link & Title -->
    <div class="page-header">
      <div class="header-left">
        <router-link to="/users" class="back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Accounts List
        </router-link>
        <h1 class="page-title">Register Client Account</h1>
        <p class="page-subtitle">Provision a new student, faculty, staff, or guard client profile for campus parking access.</p>
      </div>
    </div>

    <form @submit.prevent="handleSubmit" class="register-form-container">
      <div v-if="errorMessage" class="error-banner">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Card 1: Account Classification & Role -->
      <div class="form-card">
        <div class="card-header">
          <div class="card-icon-badge card-icon-badge--purple">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h3 class="card-title">1. Account Classification & Role</h3>
            <p class="card-subtitle">Select client classification to apply automatic permissions</p>
          </div>
        </div>

        <div class="role-grid">
          <div
            class="role-card"
            :class="{ active: form.role === 'Student' }"
            @click="form.role = 'Student'"
          >
            <div class="role-card-header">
              <div class="role-icon-box card-icon-badge--blue">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                  <path d="M6 12.5v5c3 3 9 3 12 0v-5"/>
                </svg>
              </div>
              <div class="radio-indicator"></div>
            </div>
            <h4 class="role-card-title">Student</h4>
            <p class="role-card-desc">Enrolled student account with schedule parking privileges</p>
          </div>

          <div
            class="role-card"
            :class="{ active: form.role === 'UniversityStaff' }"
            @click="form.role = 'UniversityStaff'"
          >
            <div class="role-card-header">
              <div class="role-icon-box card-icon-badge--purple">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
                </svg>
              </div>
              <div class="radio-indicator"></div>
            </div>
            <h4 class="role-card-title">Faculty Member</h4>
            <p class="role-card-desc">Academic teaching faculty with reserved area access</p>
          </div>

          <div
            class="role-card"
            :class="{ active: form.role === 'NonAcademicPersonnel' }"
            @click="form.role = 'NonAcademicPersonnel'"
          >
            <div class="role-card-header">
              <div class="role-icon-box card-icon-badge--amber">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
              </div>
              <div class="radio-indicator"></div>
            </div>
            <h4 class="role-card-title">University Staff</h4>
            <p class="role-card-desc">Administrative & non-academic staff personnel</p>
          </div>
        </div>
      </div>

      <!-- Card 2: Personal Information -->
      <div class="form-card">
        <div class="card-header">
          <div class="card-icon-badge card-icon-badge--blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <h3 class="card-title">2. Personal & Contact Information</h3>
            <p class="card-subtitle">Primary account identity details and credentials</p>
          </div>
        </div>

        <div class="form-grid form-grid--3col">
          <div class="form-group">
            <label class="form-label required">First Name</label>
            <input v-model="form.firstName" type="text" placeholder="e.g. Juan" class="form-input" required />
          </div>

          <div class="form-group">
            <label class="form-label required">Last Name</label>
            <input v-model="form.lastName" type="text" placeholder="e.g. Dela Cruz" class="form-input" required />
          </div>

          <div class="form-group">
            <label class="form-label">Middle Name</label>
            <input v-model="form.middleName" type="text" placeholder="e.g. Santos" class="form-input" />
          </div>

          <div class="form-group">
            <label class="form-label required">Email Address</label>
            <input v-model="form.email" type="email" placeholder="e.g. juan@university.edu.ph" class="form-input" required />
          </div>

          <div class="form-group">
            <label class="form-label">Phone Number</label>
            <input v-model="form.phoneNumber" type="tel" placeholder="09171234567" class="form-input" />
          </div>

          <div class="form-group">
            <label class="form-label">Initial Password</label>
            <div class="password-input-wrapper">
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                class="form-input password-input"
              />
              <button
                type="button"
                class="toggle-password-btn"
                @click="showPassword = !showPassword"
                :title="showPassword ? 'Hide password' : 'Show password'"
              >
                <svg v-if="!showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Card 3: Profile Specifics -->
      <div class="form-card">
        <div class="card-header">
          <div class="card-icon-badge card-icon-badge--amber">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <h3 class="card-title">3. Profile Specifics</h3>
            <p class="card-subtitle">Role-dependent metadata details</p>
          </div>
        </div>

        <div class="form-grid form-grid--3col">
          <!-- Student Specifics -->
          <template v-if="form.role === 'Student'">
            <div class="form-group">
              <label class="form-label">Student Number</label>
              <input v-model="form.studentNumber" type="text" placeholder="2026-00123" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">Course / Program</label>
              <input v-model="form.course" type="text" placeholder="BS Computer Science" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">Section</label>
              <input v-model="form.section" type="text" placeholder="4A" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">Year Level</label>
              <select v-model.number="form.yearLevel" class="form-select">
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
            <div class="form-group">
              <label class="form-label">Employee ID Number</label>
              <input v-model="form.idCardNumber" type="text" placeholder="EMP-9082" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">Department / College</label>
              <input v-model="form.department" type="text" placeholder="College of Engineering" class="form-input" />
            </div>
          </template>
        </div>
      </div>

      <!-- Action Footer Toolbar -->
      <div class="form-actions-toolbar">
        <router-link to="/users" class="btn btn--secondary">
          Cancel
        </router-link>
        <button type="submit" class="btn btn--primary" :disabled="isSubmitting">
          <svg v-if="!isSubmitting" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
          <span v-if="isSubmitting">Registering Client Account...</span>
          <span v-else>Register Client Account</span>
        </button>
      </div>
    </form>

    <!-- Success Registration Confirmation Modal -->
    <Teleport to="body">
      <div v-if="successModalVisible" class="success-modal-backdrop">
        <div class="success-modal-card">
          <div class="success-icon-badge">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h3 class="success-modal-title">Client Account Provisioned!</h3>
          <p class="success-modal-msg">
            The client account for <strong>{{ registeredUserEmail }}</strong> was successfully created. An email containing their initial password credentials has been dispatched to their inbox.
          </p>
          <div class="success-modal-actions">
            <button type="button" class="btn btn--secondary" @click="resetFormAndContinue">Provision Another Account</button>
            <button type="button" class="btn btn--primary" @click="goToAccountsList">Go to Accounts List</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.register-user-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 100%;
  margin: 0;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  margin-bottom: 8px;
  transition: color 150ms ease;
}

.back-link:hover {
  color: var(--color-text);
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.page-subtitle {
  font-size: 14px;
  color: var(--color-muted);
  margin: 4px 0 0;
}

.register-form-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
}

.error-banner {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Form Section Cards */
.form-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 28px;
  box-shadow: var(--shadow-soft);
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}

.card-icon-badge {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-icon-badge--purple {
  background: rgba(129, 140, 248, 0.2);
  color: #a5b4fc;
}

.card-icon-badge--blue {
  background: rgba(96, 165, 250, 0.2);
  color: #93c5fd;
}

.card-icon-badge--amber {
  background: rgba(251, 191, 36, 0.2);
  color: #fde047;
}

.card-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.card-subtitle {
  font-size: 13px;
  color: var(--color-muted);
  margin: 2px 0 0;
}

/* Role Selector Grid */
.role-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

@media (max-width: 1024px) {
  .role-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .role-grid {
    grid-template-columns: 1fr;
  }
}

.role-card {
  background: var(--color-surface-muted);
  border: 2px solid var(--color-border);
  border-radius: 12px;
  padding: 18px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 150ms ease;
  user-select: none;
}

.role-card:hover {
  border-color: var(--color-muted);
  transform: translateY(-2px);
}

.role-card.active {
  background: rgba(239, 68, 68, 0.08);
  border-color: #ef4444;
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.15);
}

.role-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.role-icon-box {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.radio-indicator {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--color-muted);
  transition: all 150ms ease;
  position: relative;
}

.role-card.active .radio-indicator {
  border-color: #ef4444;
  background: #ef4444;
}

.role-card.active .radio-indicator::after {
  content: '';
  position: absolute;
  top: 4px;
  left: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffffff;
}

.role-card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text, #ffffff);
  margin: 0;
}

.role-card-desc {
  font-size: 12px;
  color: var(--color-muted, #94a3b8);
  margin: 0;
  line-height: 1.4;
}

/* Form Grids */
.form-grid--3col {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

@media (max-width: 900px) {
  .form-grid--3col {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .form-grid--3col {
    grid-template-columns: 1fr;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.form-label.required::after {
  content: ' *';
  color: #ef4444;
}

.form-input,
.form-select {
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 11px 14px;
  font-size: 14px;
  color: var(--color-text);
  transition: border-color 150ms ease;
  outline: none;
}

.form-input:focus,
.form-select:focus {
  border-color: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15);
}

/* Footer Toolbar */
.form-actions-toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 14px;
  padding: 20px 24px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.btn {
  padding: 11px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  transition: all 150ms ease;
  border: none;
}

.btn--primary {
  background: var(--color-primary);
  color: #ffffff;
}

.btn--primary:hover {
  background: var(--color-primary-dark);
  box-shadow: 0 4px 12px rgba(210, 39, 48, 0.3);
}

.btn--primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn--secondary {
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.btn--secondary:hover {
  background: var(--color-border);
}

/* Password Input & Toggle Button */
.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.password-input-wrapper .form-input {
  width: 100%;
  padding-right: 42px;
}

.toggle-password-btn {
  position: absolute;
  right: 10px;
  background: transparent;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 150ms ease;
}

.toggle-password-btn:hover {
  color: var(--color-text);
}

/* Success Modal Styles */
.success-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(6px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.success-modal-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 32px;
  max-width: 480px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  animation: modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalPop {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}

.success-icon-badge {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-modal-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.success-modal-msg {
  font-size: 14px;
  color: var(--color-muted);
  line-height: 1.6;
  margin: 0;
}

.success-modal-actions {
  display: flex;
  gap: 12px;
  width: 100%;
  justify-content: center;
  margin-top: 8px;
}

.success-modal-actions .btn {
  flex: 1;
  justify-content: center;
}
</style>
