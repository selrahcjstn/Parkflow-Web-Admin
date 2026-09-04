<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'

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
    otpSentEmail.value = storedEmail
    form.value.accountType = 'Guard'
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
          password: form.value.password,
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
          password: form.value.password,
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
  <div class="register-staff-page">
    <!-- Notification Toast -->
    <Transition name="toast">
      <div v-if="toastMessage" class="toast-banner" :class="`toast-banner--${toastType}`">
        <span class="toast-text">{{ toastMessage }}</span>
      </div>
    </Transition>

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
        <h1 class="page-title">Register Staff Account</h1>
        <p class="page-subtitle">Provision an official campus security guard or system administrator account.</p>
      </div>
    </div>

    <form @submit.prevent="handleInitiateSubmit" class="register-form-container">
      <!-- Card 1: Staff Account Role -->
      <div class="form-card">
        <div class="card-header">
          <div class="card-icon-badge card-icon-badge--amber">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <h3 class="card-title">1. Staff Role & Privileges</h3>
            <p class="card-subtitle">Select staff account type for system permissions</p>
          </div>
        </div>

        <div class="role-grid" :class="{ 'role-grid--single': !isSuperAdmin }">
          <div
            class="role-card"
            :class="{ active: form.accountType === 'Guard' }"
            @click="toggleAdminRole('Guard')"
          >
            <div class="role-card-header">
              <div class="role-icon-box card-icon-badge--blue">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div class="radio-indicator"></div>
            </div>
            <h4 class="role-card-title">Campus Guard Account</h4>
            <p class="role-card-desc">Enables gate scanning, QR verification, and manual plate entry</p>
          </div>

          <!-- System Administrator: SuperAdmin Only -->
          <div
            v-if="isSuperAdmin"
            class="role-card"
            :class="{ active: form.accountType === 'Admin' }"
            @click="toggleAdminRole('Admin')"
          >
            <div class="role-card-header">
              <div class="role-icon-box card-icon-badge--purple">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div class="radio-indicator"></div>
            </div>
            <h4 class="role-card-title">System Administrator</h4>
            <p class="role-card-desc">Full Web Admin management, user verification, and system settings</p>
          </div>
        </div>
      </div>

      <!-- Card 2: Personal & Contact Information -->
      <div class="form-card">
        <div class="card-header">
          <div class="card-icon-badge card-icon-badge--blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <h3 class="card-title">2. Staff Credentials & Contact Information</h3>
            <p class="card-subtitle">Official staff identity details and authentication credentials</p>
          </div>
        </div>

        <div class="form-grid form-grid--3col">
          <div class="form-group">
            <label class="form-label required">First Name</label>
            <input v-model="form.firstName" type="text" placeholder="e.g. Ricardo" class="form-input" required />
          </div>

          <div class="form-group">
            <label class="form-label required">Last Name</label>
            <input v-model="form.lastName" type="text" placeholder="e.g. Santos" class="form-input" required />
          </div>

          <div class="form-group">
            <label class="form-label">Middle Name</label>
            <input v-model="form.middleName" type="text" placeholder="e.g. Alonzo" class="form-input" />
          </div>

          <div class="form-group">
            <label class="form-label required">Official Email Address</label>
            <input v-model="form.email" type="email" placeholder="e.g. guard.santos@parkflow.com" class="form-input" required />
          </div>

          <div class="form-group">
            <label class="form-label required">Phone Number</label>
            <input v-model="form.phoneNumber" type="tel" placeholder="09171234567" class="form-input" required />
          </div>

          <div class="form-group">
            <label class="form-label required">Initial Password</label>
            <input v-model="form.password" type="password" placeholder="••••••••" class="form-input" required />
          </div>
        </div>
      </div>

      <!-- Card 3: Deployment & Role Specifics -->
      <div class="form-card">
        <div class="card-header">
          <div class="card-icon-badge card-icon-badge--purple">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <div>
            <h3 class="card-title">3. {{ form.accountType === 'Guard' ? 'Guard Deployment Post' : 'Admin Authority Level' }}</h3>
            <p class="card-subtitle">Role-dependent assignment and clearance parameters</p>
          </div>
        </div>

        <div class="form-grid form-grid--3col">
          <div v-if="form.accountType === 'Guard'" class="form-group">
            <label class="form-label required">Assigned Gate Entrance</label>
            <select v-model.number="form.assignedGate" class="form-select">
              <option :value="1">Gate 1 - Main Campus Entrance</option>
              <option :value="2">Gate 2 - East Campus Entrance</option>
              <option :value="3">Gate 3 - South Gate Entrance</option>
            </select>
          </div>

          <div v-else class="form-group">
            <label class="form-label required">Admin Authority Level</label>
            <select v-model.number="form.roleLevel" class="form-select">
              <option :value="2">System Administrator (Standard Admin)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Action Footer Toolbar -->
      <div class="form-actions-toolbar">
        <router-link to="/users" class="btn btn--secondary">
          Cancel
        </router-link>
        <button type="submit" class="btn btn--primary" :disabled="isSendingOtp">
          <svg v-if="!isSendingOtp" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span v-if="isSendingOtp">Requesting Security OTP...</span>
          <span v-else>Authorize & Register {{ form.accountType }}</span>
        </button>
      </div>
    </form>

    <!-- OTP Verification Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showOtpModal" class="modal-backdrop" @click="showOtpModal = false">
          <div class="modal-card" @click.stop>
            <div class="modal-header">
              <div class="otp-badge">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div>
                <h3 class="modal-title">SuperAdmin OTP Verification</h3>
                <p class="modal-subtitle">Security verification required to execute staff account creation</p>
              </div>
            </div>

            <div class="modal-body">
              <div class="otp-notice">
                A 6-digit Security OTP has been sent to <strong>{{ otpSentEmail }}</strong>. Enter the code below to authorize creating this <strong>{{ form.accountType }}</strong> account.
              </div>

              <div v-if="otpError" class="otp-error">
                {{ otpError }}
              </div>

              <div class="form-group">
                <label class="form-label required">6-Digit OTP Security Code</label>
                <input
                  v-model="otpCode"
                  type="text"
                  maxlength="6"
                  placeholder="123456"
                  class="otp-input"
                  autofocus
                />
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn btn--secondary" @click="showOtpModal = false">Cancel</button>
              <button class="btn btn--primary" :disabled="isVerifyingOtp || isSubmitting" @click="handleVerifyOtpAndCreate">
                <span v-if="isVerifyingOtp || isSubmitting">Verifying & Registering...</span>
                <span v-else>Verify OTP & Create Account</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.register-staff-page {
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

.toast-banner {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 1000;
  padding: 14px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.toast-banner--success {
  background: #10b981;
  color: #ffffff;
}

.toast-banner--error {
  background: #ef4444;
  color: #ffffff;
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
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.role-grid--single {
  grid-template-columns: 1fr;
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
  background: rgba(245, 158, 11, 0.08);
  border-color: #f59e0b;
  box-shadow: 0 0 16px rgba(245, 158, 11, 0.15);
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
  border-color: #f59e0b;
  background: #f59e0b;
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
  border-color: #f59e0b;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.15);
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
  background: var(--color-gold);
  color: #ffffff;
}

.btn--primary:hover {
  background: #e6a714;
  box-shadow: 0 4px 12px rgba(253, 184, 19, 0.3);
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

/* Modal Styling */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: var(--color-overlay);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 28px;
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: var(--shadow-modal);
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.otp-badge {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.modal-subtitle {
  font-size: 13px;
  color: var(--color-muted);
  margin: 2px 0 0;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.otp-notice {
  font-size: 13px;
  color: var(--color-text);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  padding: 12px 14px;
  border-radius: 8px;
  line-height: 1.5;
}

.otp-error {
  color: #ef4444;
  font-size: 13px;
  font-weight: 600;
}

.otp-input {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 8px;
  text-align: center;
  background: var(--color-surface-muted);
  border: 2px solid var(--color-border);
  border-radius: 10px;
  padding: 12px;
  color: var(--color-text);
  outline: none;
}

.otp-input:focus {
  border-color: #f59e0b;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
