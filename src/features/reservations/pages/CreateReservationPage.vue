<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'
import UiButton from '@/components/ui/UiButton.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import UiTextarea from '@/components/ui/UiTextarea.vue'

const router = useRouter()

const today = computed(() => new Date().toISOString().split('T')[0])

const form = ref({
  reservationDate: new Date().toISOString().split('T')[0],
  startTime: '07:00',
  endTime: '23:59',
  reason: '',
  type: 1, // Default to Special Schedule (1) on Admin side
  sendEmail: false,
  notifyEmail: ''
})

const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const reservationTypeOptions = [
  { label: 'Special Schedule / Event Pass (Full Day Authorization)', value: 1 },
  { label: 'Standard Schedule Reservation', value: 0 }
]

function goBack() {
  router.push('/reservations')
}

async function handleSubmit() {
  errorMessage.value = null
  successMessage.value = null

  if (!form.value.reservationDate) {
    errorMessage.value = 'Please select a reservation date.'
    return
  }

  if (!form.value.startTime || !form.value.endTime) {
    errorMessage.value = 'Please specify both start and end times.'
    return
  }

  if (!form.value.reason.trim()) {
    errorMessage.value = 'Please provide a stated purpose or reason for this reservation.'
    return
  }

  if (form.value.sendEmail && !form.value.notifyEmail.trim()) {
    errorMessage.value = 'Please enter a valid notification recipient email address.'
    return
  }

  isSubmitting.value = true

  try {
    const formatTimeWithSec = (t: string) => {
      const parts = t.trim().split(':')
      if (parts.length === 2) return `${t.trim()}:00`
      return t.trim()
    }

    const payload: Record<string, any> = {
      reservationDate: form.value.reservationDate,
      startTime: formatTimeWithSec(form.value.startTime),
      endTime: formatTimeWithSec(form.value.endTime),
      reason: form.value.reason.trim(),
      type: Number(form.value.type)
    }

    if (form.value.sendEmail && form.value.notifyEmail.trim()) {
      payload.notifyEmail = form.value.notifyEmail.trim()
    }

    const res = await api.post('/parking-reservations', payload)
    
    if (res.data && (res.data.isSuccess || res.status === 200 || res.status === 201)) {
      successMessage.value = 'Schedule reservation created successfully.'
      setTimeout(() => {
        router.push('/reservations')
      }, 1000)
    } else {
      errorMessage.value = res.data?.message || 'Failed to create reservation.'
    }
  } catch (err: any) {
    errorMessage.value = err.response?.data?.message || err.message || 'An error occurred while creating the reservation.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="create-reservation-page">
    <!-- Header -->
    <div class="page-header">
      <UiButton variant="ghost" size="sm" @click="goBack" class="back-btn">
        <template #icon>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </template>
        Back to Reservations
      </UiButton>

      <div class="header-titles">
        <h1 class="page-title">Reserve Schedule</h1>
        <p class="page-subtitle">Schedule an administrative parking pass and reserve entry slots for campus operations.</p>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="errorMessage" class="alert-banner alert-banner--error">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>{{ errorMessage }}</span>
    </div>

    <!-- Success Alert -->
    <div v-if="successMessage" class="alert-banner alert-banner--success">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span>{{ successMessage }}</span>
    </div>

    <!-- Form -->
    <form @submit.prevent="handleSubmit" class="form-container">
      <!-- Card 1: Schedule Parameters -->
      <div class="form-card">
        <div class="card-header">
          <div class="card-icon-badge card-icon-badge--blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <h3 class="card-title">Schedule & Timing</h3>
            <p class="card-subtitle">Set the reservation date and entry/exit time window</p>
          </div>
        </div>

        <div class="form-grid">
          <div class="full-width">
            <UiSelect
              v-model="form.type"
              label="Reservation Classification"
              :options="reservationTypeOptions"
              required
            />
          </div>

          <div class="full-width">
            <UiInput
              v-model="form.reservationDate"
              type="date"
              label="Reservation Date"
              :min="today"
              required
            />
          </div>

          <div>
            <UiInput
              v-model="form.startTime"
              type="time"
              label="Start Time"
              required
            />
          </div>

          <div>
            <UiInput
              v-model="form.endTime"
              type="time"
              label="End Time"
              required
            />
          </div>

          <div class="full-width">
            <UiTextarea
              v-model="form.reason"
              label="Purpose / Stated Reason"
              placeholder="State the justification, event name, or campus department reason for this reservation..."
              :rows="3"
              required
            />
          </div>
        </div>
      </div>

      <!-- Card 2: Notification & Dispatch -->
      <div class="form-card">
        <div class="card-header">
          <div class="card-icon-badge card-icon-badge--purple">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div>
            <h3 class="card-title">Notification & Delivery</h3>
            <p class="card-subtitle">Optionally dispatch an automated schedule pass notification to a recipient</p>
          </div>
        </div>

        <div class="notification-box">
          <label class="checkbox-container">
            <input
              v-model="form.sendEmail"
              type="checkbox"
              class="custom-checkbox"
            />
            <div class="checkbox-content">
              <span class="checkbox-title">Send Email Notification</span>
              <span class="checkbox-desc">Dispatch a reservation notice and reference link to the designated recipient</span>
            </div>
          </label>

          <Transition name="fade">
            <div v-if="form.sendEmail" class="full-width mt-4">
              <UiInput
                v-model="form.notifyEmail"
                type="email"
                label="Recipient Email Address"
                placeholder="e.g. guest@university.edu.ph"
                required
              />
            </div>
          </Transition>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="form-actions">
        <UiButton type="button" variant="secondary" @click="goBack" :disabled="isSubmitting">
          Cancel
        </UiButton>
        <UiButton type="submit" variant="primary" :loading="isSubmitting">
          Confirm & Reserve Schedule
        </UiButton>
      </div>
    </form>
  </div>
</template>

<style scoped>
.create-reservation-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 820px;
  margin: 0 auto;
  width: 100%;
}

.page-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.back-btn {
  align-self: flex-start;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
  letter-spacing: -0.5px;
  margin: 0;
}

.page-subtitle {
  font-size: 13.5px;
  color: var(--color-muted, #64748b);
  margin: 0;
}

/* ── Alerts ── */
.alert-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  border-radius: 12px;
  font-size: 13.5px;
  font-weight: 500;
}

.alert-banner--error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
}

.alert-banner--success {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #059669;
}

/* ── Form Layout ── */
.form-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-card {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-card, 16px);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.card-icon-badge {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-icon-badge--blue {
  background: #eff6ff;
  color: #2563eb;
}

.card-icon-badge--purple {
  background: #f5f3ff;
  color: #7c3aed;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text, #0f172a);
  margin: 0;
}

.card-subtitle {
  font-size: 12px;
  color: var(--color-muted, #64748b);
  margin: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.full-width {
  grid-column: 1 / -1;
}

/* ── Notification Box ── */
.notification-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checkbox-container {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: var(--color-surface-lighter, #f8fafc);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 12px;
  cursor: pointer;
}

.custom-checkbox {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  margin-top: 2px;
  cursor: pointer;
  accent-color: #4f46e5;
}

.checkbox-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.checkbox-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--color-text, #0f172a);
}

.checkbox-desc {
  font-size: 12px;
  color: var(--color-muted, #64748b);
}

/* ── Actions ── */
.form-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 12px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
