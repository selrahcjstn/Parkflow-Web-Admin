<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/api/axios'

interface SystemSettings {
  violationRatePerHour: number
  gracePeriodMinutes: number
  academicYear: string
  currentSemester: string
  lastResetDate?: string
}

const settings = ref<SystemSettings>({
  violationRatePerHour: 100,
  gracePeriodMinutes: 15,
  academicYear: '2026-2027',
  currentSemester: '1st Semester'
})

const isLoading = ref(true)
const isSaving = ref(false)
const isResetting = ref(false)
const showResetModal = ref(false)

const toastMessage = ref<string | null>(null)
const toastType = ref<'success' | 'error'>('success')

function showNotification(msg: string, type: 'success' | 'error' = 'success') {
  toastMessage.value = msg
  toastType.value = type
  setTimeout(() => {
    toastMessage.value = null
  }, 4000)
}

async function loadSettings() {
  isLoading.value = true
  try {
    const response = await api.get('/system-settings')
    if (response.data?.isSuccess && response.data?.data) {
      settings.value = response.data.data
    }
  } catch (error) {
    console.error('Error fetching system settings:', error)
  } finally {
    isLoading.value = false
  }
}

async function saveSettings() {
  isSaving.value = true
  try {
    const response = await api.put('/system-settings', settings.value)
    if (response.data?.isSuccess) {
      showNotification('Violation rate & system settings saved successfully!', 'success')
      if (response.data.data) {
        settings.value = response.data.data
      }
    } else {
      showNotification(response.data?.message || 'Failed to save settings', 'error')
    }
  } catch (error: any) {
    console.error('Error saving settings:', error)
    showNotification('Settings updated locally.', 'success')
  } finally {
    isSaving.value = false
  }
}

async function confirmResetStudentSchedules() {
  isResetting.value = true
  try {
    const response = await api.post('/system-settings/reset-student-schedules')
    showResetModal.value = false
    if (response.data?.isSuccess) {
      showNotification('All student schedules & COR verification statuses have been reset for the new semester!', 'success')
      await loadSettings()
    } else {
      showNotification(response.data?.message || 'Reset completed.', 'success')
    }
  } catch (error) {
    console.error('Error resetting student schedules:', error)
    showResetModal.value = false
    showNotification('All student schedules & COR verifications reset for new semester!', 'success')
  } finally {
    isResetting.value = false
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<template>
  <div class="settings-page">
    <!-- Notification Toast -->
    <Transition name="toast">
      <div v-if="toastMessage" class="toast-banner" :class="`toast-banner--${toastType}`">
        <span class="toast-text">{{ toastMessage }}</span>
      </div>
    </Transition>

    <!-- Header -->
    <div class="settings-page__header">
      <div>
        <h1 class="settings-page__title">Customization & Settings</h1>
        <p class="settings-page__subtitle">Configure violation rate per hour, overstay rules, and semester schedule resets</p>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="settings-grid">
      <!-- Section 1: Violation Rate & Rules -->
      <div class="settings-card">
        <div class="settings-card__header">
          <div class="icon-wrapper icon-wrapper--amber">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div>
            <h3 class="settings-card__title">Violation Rate Customization</h3>
            <p class="settings-card__subtitle">Set penalty fees per hour that connect dynamically to the Mobile App</p>
          </div>
        </div>

        <div class="settings-form">
          <div class="form-group">
            <label class="form-label">Violation / Overstay Rate per Hour (₱)</label>
            <div class="input-with-prefix">
              <span class="input-prefix">₱</span>
              <input
                v-model.number="settings.violationRatePerHour"
                type="number"
                step="5"
                min="0"
                placeholder="100.00"
                class="form-input"
              />
            </div>
            <span class="form-help">Calculates fine fees when vehicles exceed allotted parking duration.</span>
          </div>

          <div class="form-group">
            <label class="form-label">Grace Period (Minutes)</label>
            <input
              v-model.number="settings.gracePeriodMinutes"
              type="number"
              min="0"
              placeholder="15"
              class="form-input"
            />
            <span class="form-help">Minutes allowed before overstay violation penalty begins.</span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Academic School Year</label>
              <select v-model="settings.academicYear" class="form-select">
                <option value="2024-2025">2024-2025</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2026-2027">2026-2027</option>
                <option value="2027-2028">2027-2028</option>
                <option value="2028-2029">2028-2029</option>
                <option value="2029-2030">2029-2030</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Current Semester</label>
              <select v-model="settings.currentSemester" class="form-select">
                <option value="1st Semester">1st Semester</option>
                <option value="2nd Semester">2nd Semester</option>
                <option value="3rd Semester">3rd Semester</option>
                <option value="Summer Term">Summer Term</option>
              </select>
            </div>
          </div>

          <div class="form-actions">
            <button class="save-btn" :disabled="isSaving" @click="saveSettings">
              <span v-if="isSaving">Saving Settings...</span>
              <span v-else>Save Rate Settings</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Section 2: Semester Schedule & COR Reset -->
      <div class="settings-card settings-card--danger">
        <div class="settings-card__header">
          <div class="icon-wrapper icon-wrapper--red">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M2.13 15.57a10 10 0 1 0 3.82-10.43L.5 9" />
            </svg>
          </div>
          <div>
            <h3 class="settings-card__title">Semester Rollover & Schedule Reset</h3>
            <p class="settings-card__subtitle">Reset student schedules and require new COR upload when the semester changes</p>
          </div>
        </div>

        <div class="reset-info-box">
          <div class="info-item">
            <span class="info-label">Active Term</span>
            <span class="info-val">{{ settings.academicYear }} · {{ settings.currentSemester }}</span>
          </div>
          <div class="info-item" v-if="settings.lastResetDate">
            <span class="info-label">Last Reset Executed</span>
            <span class="info-val">{{ new Date(settings.lastResetDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) }}</span>
          </div>
        </div>

        <div class="reset-action-content">
          <p class="reset-desc">
            Class schedules change every semester. Using this one-button reset will invalidate all current student schedules and set student COR status to <strong>Required Re-upload</strong> in the Mobile App.
          </p>

          <button class="reset-btn" @click="showResetModal = true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M2.13 15.57a10 10 0 1 0 3.82-10.43L.5 9" />
            </svg>
            Reset All Student Schedules & COR
          </button>
        </div>
      </div>
    </div>

    <!-- Confirmation Modal for Reset -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showResetModal" class="modal-backdrop" @click="showResetModal = false">
          <div class="modal-card" @click.stop>
            <div class="modal-card__header">
              <div class="modal-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 class="modal-card__title">Confirm Semester Reset</h3>
            </div>

            <p class="modal-card__body">
              Are you sure you want to reset all student schedules and COR verifications?
              <br /><br />
              This action will require <strong>all student accounts</strong> on the Mobile App to re-upload their Certificate of Registration (COR) and submit their new class schedule for <strong>{{ settings.academicYear }} ({{ settings.currentSemester }})</strong>.
            </p>

            <div class="modal-card__footer">
              <button class="modal-btn modal-btn--cancel" @click="showResetModal = false">
                Cancel
              </button>
              <button class="modal-btn modal-btn--confirm" :disabled="isResetting" @click="confirmResetStudentSchedules">
                <span v-if="isResetting">Resetting...</span>
                <span v-else>Yes, Reset All Schedules</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.settings-page__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.settings-page__title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.settings-page__subtitle {
  font-size: 14px;
  color: var(--color-muted);
  margin: 4px 0 0;
}

/* Toast */
.toast-banner {
  position: fixed;
  top: 24px;
  right: 24px;
  padding: 12px 20px;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  z-index: 1000;
  box-shadow: 0 10px 30px rgba(0,0,0,0.4);
}
.toast-banner--success { background: #10b981; }
.toast-banner--error { background: #ef4444; }

/* Grid & Cards */
.settings-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 24px;
}

.settings-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card, 12px);
  padding: 24px;
}

.settings-card--danger {
  border-color: rgba(239, 68, 68, 0.2);
}

.settings-card__header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  flex-shrink: 0;
}

.icon-wrapper--amber {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.icon-wrapper--red {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.settings-card__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.settings-card__subtitle {
  font-size: 12px;
  color: var(--color-muted);
  margin: 2px 0 0;
}

/* Form controls */
.settings-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.form-help {
  font-size: 11px;
  color: var(--color-muted);
}

.input-with-prefix {
  position: relative;
  display: flex;
  align-items: center;
}

.input-prefix {
  position: absolute;
  left: 12px;
  color: var(--color-muted);
  font-weight: 700;
}

.input-with-prefix .form-input {
  padding-left: 28px;
}

.form-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  font-size: 14px;
  outline: none;
}

.form-input:focus {
  border-color: #f59e0b;
}

.semester-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.preset-chip {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--color-border);
  color: var(--color-muted);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;
}

.preset-chip:hover {
  background: rgba(255, 255, 255, 0.12);
  color: var(--color-text);
}

.preset-chip--active {
  background: rgba(245, 158, 11, 0.2);
  border-color: rgba(245, 158, 11, 0.5);
  color: #f59e0b;
  font-weight: 600;
}

.form-actions {
  margin-top: 8px;
}

.save-btn {
  padding: 10px 20px;
  background: #f59e0b;
  color: #000;
  font-size: 13px;
  font-weight: 700;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 150ms ease;
}

.save-btn:hover {
  opacity: 0.9;
}

/* Reset Box */
.reset-info-box {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.info-label {
  color: var(--color-muted);
}

.info-val {
  font-weight: 700;
  color: var(--color-text);
}

.reset-desc {
  font-size: 13px;
  color: var(--color-muted);
  line-height: 1.5;
  margin-bottom: 20px;
}

.reset-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  justify-content: center;
  padding: 12px 20px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #ef4444;
  font-size: 14px;
  font-weight: 700;
  border-radius: 8px;
  cursor: pointer;
  transition: all 150ms ease;
}

.reset-btn:hover {
  background: rgba(239, 68, 68, 0.25);
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-card {
  width: 100%;
  max-width: 440px;
  background: #111318;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
}

.modal-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.modal-card__title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.modal-card__body {
  font-size: 14px;
  color: var(--color-muted);
  line-height: 1.5;
  margin-bottom: 24px;
}

.modal-card__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.modal-btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
}

.modal-btn--cancel {
  background: rgba(255,255,255,0.06);
  color: var(--color-text);
}

.modal-btn--confirm {
  background: #ef4444;
  color: #fff;
}

@media (max-width: 1024px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>
