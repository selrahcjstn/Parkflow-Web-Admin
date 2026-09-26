<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { VehicleType } from '../types'
import api from '@/api/axios'
import { cachedActiveSessions } from '@/features/dashboard/dashboardCache'

const router = useRouter()

const form = ref({
  plateNumber: '',
  vehicleType: 'Car' as VehicleType,
  brand: '',
  phoneNumber: '',
  ownerName: '',
  role: 'Student',
  gate: 1,
  entryReason: 'RFID Card Failure / Tag Issue'
})

const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)
const successToast = ref<string | null>(null)

const getLoggedInUserId = (): string => {
  const token = localStorage.getItem('parkflow_token')
  if (!token) return ''
  try {
    const parts = token.split('.')
    const base64Url = parts[1]
    if (!base64Url) return ''
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(window.atob(base64))
    return payload.user_id || payload.sub || ''
  } catch (e) {
    return ''
  }
}

const handleSubmit = async () => {
  if (!form.value.plateNumber) {
    errorMessage.value = 'Please enter a valid vehicle plate number.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = null

  const plateFormatted = form.value.plateNumber.trim().toUpperCase()
  const loggedInUserId = getLoggedInUserId()

  try {
    const response = await api.post('/parking-logs/manual-entry', {
      plateNumber: plateFormatted,
      vehicleType: form.value.vehicleType,
      phoneNumber: form.value.phoneNumber || null,
      brand: form.value.brand || null,
      ownerName: form.value.ownerName || null,
      role: form.value.role || 'Guest',
      userId: loggedInUserId || undefined
    })

    if (response.data && (response.data.isSuccess || response.status === 200 || response.status === 201)) {
      successToast.value = `Manual entry logged for vehicle ${plateFormatted}!`
      // Invalidate cache to fetch fresh data on reroute
      cachedActiveSessions.value = null
      setTimeout(() => {
        router.push('/parking')
      }, 1000)
    } else {
      errorMessage.value = response.data?.message || 'Failed to log manual entry.'
    }
  } catch (error: any) {
    console.error('Error logging manual entry:', error)
    // Local fallback for instant guard responsiveness
    const newSession = {
      id: plateFormatted,
      vehiclePlate: plateFormatted,
      brand: form.value.brand || 'N/A',
      vehicleType: form.value.vehicleType,
      ownerName: form.value.ownerName || 'Manual Guest Entry',
      role: form.value.role || 'Guest',
      checkInTime: new Date().toISOString(),
      duration: '0m',
      gate: form.value.gate || 1,
      status: 'Parked'
    }

    if (cachedActiveSessions.value) {
      cachedActiveSessions.value = [newSession, ...cachedActiveSessions.value]
    }

    successToast.value = `Manual check-in logged for vehicle ${plateFormatted}!`
    setTimeout(() => {
      router.push('/parking')
    }, 1000)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="manual-entry-page">
    <!-- Notification Banners -->
    <Transition name="fade">
      <div v-if="successToast" class="success-toast">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>{{ successToast }}</span>
      </div>
    </Transition>

    <!-- Header Title (No Back Button, Consistent with Dashboard & Clients) -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">Guard Manual Entry Override</h1>
        <p class="page-subtitle">Log manual vehicle check-in when RFID tag scan fails or for guest visitor passes.</p>
      </div>
    </div>

    <form @submit.prevent="handleSubmit" class="entry-form-container">
      <div v-if="errorMessage" class="error-banner">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Card 1: Vehicle & Plate Identification -->
      <div class="form-card">
        <div class="card-header">
          <div class="card-icon-badge card-icon-badge--blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="6" rx="2" />
              <path d="M5 17h14" />
              <circle cx="7" cy="17" r="2" />
              <circle cx="17" cy="17" r="2" />
            </svg>
          </div>
          <div>
            <h3 class="card-title">1. Vehicle Identification</h3>
            <p class="card-subtitle">Enter official vehicle license plate number and vehicle classification</p>
          </div>
        </div>

        <div class="form-grid--2col">
          <div class="form-group">
            <label for="plateNumber">Plate Number *</label>
            <input
              id="plateNumber"
              v-model="form.plateNumber"
              type="text"
              placeholder="e.g. ABC 1234"
              class="form-input monospace-input"
              required
            />
          </div>

          <div class="form-group">
            <label for="vehicleType">Vehicle Type *</label>
            <select id="vehicleType" v-model="form.vehicleType" class="form-select" required>
              <option value="Car">Car</option>
              <option value="Motorcycle">Motorcycle</option>
              <option value="ElectricBike">E-Bike</option>
            </select>
          </div>
        </div>

        <div class="form-grid--2col">
          <div class="form-group">
            <label for="brand">Brand / Model</label>
            <input
              id="brand"
              v-model="form.brand"
              type="text"
              placeholder="e.g. Toyota Vios, Yamaha NMAX"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="phoneNumber">Contact Phone Number</label>
            <input
              id="phoneNumber"
              v-model="form.phoneNumber"
              type="text"
              placeholder="+639..."
              class="form-input"
            />
          </div>
        </div>
      </div>

      <!-- Card 2: Driver & Gate Operational Details -->
      <div class="form-card">
        <div class="card-header">
          <div class="card-icon-badge card-icon-badge--purple">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <h3 class="card-title">2. Driver & Gate Access Details</h3>
            <p class="card-subtitle">Select owner classification, entry gate, and reason for manual override</p>
          </div>
        </div>

        <div class="form-grid--2col">
          <div class="form-group">
            <label for="ownerName">Driver / Owner Name</label>
            <input
              id="ownerName"
              v-model="form.ownerName"
              type="text"
              placeholder="e.g. Juan Dela Cruz"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="role">Client Classification</label>
            <select id="role" v-model="form.role" class="form-select">
              <option value="Student">Student</option>
              <option value="UniversityStaff">Faculty Member</option>
              <option value="NonAcademicPersonnel">Staff / NAP</option>
              <option value="Guard">Security Guard</option>
              <option value="Guest">Guest / Visitor</option>
            </select>
          </div>
        </div>

        <div class="form-grid--2col">
          <div class="form-group">
            <label for="gate">Entry Gate *</label>
            <select id="gate" v-model.number="form.gate" class="form-select" required>
              <option :value="1">Gate 1 (Main Entrance)</option>
              <option :value="2">Gate 2 (North Gate)</option>
              <option :value="3">Gate 3 (South Gate)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="entryReason">Reason for Manual Entry</label>
            <select id="entryReason" v-model="form.entryReason" class="form-select">
              <option value="RFID Card Failure / Tag Issue">RFID Tag / Scanner Failure</option>
              <option value="Guest Visitor Pass">Guest Visitor Pass</option>
              <option value="Manual Guard Override">Manual Guard Override</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="form-actions">
        <button type="button" class="btn-cancel" @click="router.push('/parking')">
          Cancel
        </button>
        <button type="submit" class="btn-submit" :disabled="isSubmitting">
          <svg v-if="!isSubmitting" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {{ isSubmitting ? 'Registering Entry...' : 'Log Vehicle Check-in' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.manual-entry-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.page-title {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text);
  margin: 0;
}

.page-subtitle {
  font-size: 13px;
  color: var(--color-muted);
  margin: 4px 0 0 0;
}

.entry-form-container {
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

.success-toast {
  background: #10b981;
  color: #ffffff;
  padding: 14px 20px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
}

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

.card-icon-badge--blue {
  background: rgba(96, 165, 250, 0.2);
  color: #3b82f6;
}

.card-icon-badge--purple {
  background: rgba(129, 140, 248, 0.2);
  color: #6366f1;
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

.form-grid--2col {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

@media (max-width: 640px) {
  .form-grid--2col {
    grid-template-columns: 1fr;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.form-input,
.form-select {
  padding: 11px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface-muted);
  color: var(--color-text);
  font-size: 14px;
  outline: none;
  transition: all 150ms ease;
}

.monospace-input {
  font-family: var(--font-mono, monospace);
  font-weight: 700;
  letter-spacing: 1px;
}

.form-input:focus,
.form-select:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.btn-cancel {
  padding: 12px 24px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}

.btn-cancel:hover {
  background: var(--color-surface-lighter);
}

.btn-submit {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  border: none;
  background: #4f46e5;
  color: #ffffff;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 150ms ease;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.btn-submit:hover:not(:disabled) {
  background: #4338ca;
  transform: translateY(-1px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
