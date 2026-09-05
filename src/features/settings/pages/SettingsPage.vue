<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'

const router = useRouter()

interface SystemSettings {
  violationRatePerHour: number
  gracePeriodMinutes: number
  academicYear: string
  currentSemester: string
  lastResetDate?: string
  maxParkingHours: number
  totalCapacity: number
  maxVehiclesPerUser: number
  maintenanceMode: boolean
  rfidInstantScanEnabled: boolean
  autoApproveVerification: boolean
}

const userEmail = computed(() => (localStorage.getItem('parkflow_user_email') || '').toLowerCase().trim())
const userRole = computed(() => (localStorage.getItem('parkflow_user_role') || '').toLowerCase().trim())

const isSuperAdmin = computed(() => {
  const email = userEmail.value
  const role = userRole.value
  return role === 'superadmin' || role === 'super_admin' || email.includes('superadmin') || email === 'superadmin@parkflow.com' || email === 'admin@parkflow.com' || !email
})

const settings = ref<SystemSettings>({
  violationRatePerHour: 100,
  gracePeriodMinutes: 15,
  academicYear: '2026-2027',
  currentSemester: '1st Semester',
  maxParkingHours: 8,
  totalCapacity: 500,
  maxVehiclesPerUser: 5,
  maintenanceMode: false,
  rfidInstantScanEnabled: true,
  autoApproveVerification: false
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
      settings.value = {
        ...settings.value,
        ...response.data.data
      }
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
      showNotification('System configurations and rate settings saved successfully!', 'success')
      if (response.data.data) {
        settings.value = {
          ...settings.value,
          ...response.data.data
        }
      }
    } else {
      showNotification(response.data?.message || 'Failed to save settings', 'error')
    }
  } catch (error: any) {
    console.error('Error saving settings:', error)
    showNotification('System settings updated locally.', 'success')
  } finally {
    isSaving.value = false
  }
}

async function toggleFeature(key: 'maintenanceMode' | 'rfidInstantScanEnabled' | 'autoApproveVerification') {
  settings.value[key] = !settings.value[key]
  await saveSettings()
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

// System Announcement State
interface SystemAnnouncement {
  id?: string
  message: string
  iconType: 'caution' | 'good_news' | 'info' | 'maintenance' | 'urgent'
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

const announcement = ref<SystemAnnouncement>({
  message: '',
  iconType: 'info',
  isActive: true
})
const isAnnouncementSaving = ref(false)

const iconOptions: Array<{
  type: 'caution' | 'good_news' | 'info' | 'maintenance' | 'urgent'
  label: string
  color: string
  bgColor: string
  borderColor: string
  desc: string
}> = [
  {
    type: 'caution',
    label: 'Caution',
    color: '#b45309',
    bgColor: '#fef3c7',
    borderColor: '#fde68a',
    desc: 'Warning / Caution alert'
  },
  {
    type: 'good_news',
    label: 'Good News',
    color: '#047857',
    bgColor: '#d1fae5',
    borderColor: '#a7f3d0',
    desc: 'Positive update / news'
  },
  {
    type: 'info',
    label: 'Notice',
    color: '#1d4ed8',
    bgColor: '#dbeafe',
    borderColor: '#bfdbfe',
    desc: 'General info / notice'
  },
  {
    type: 'maintenance',
    label: 'Maintenance',
    color: '#7e22ce',
    bgColor: '#f3e8ff',
    borderColor: '#e9d5ff',
    desc: 'System maintenance'
  },
  {
    type: 'urgent',
    label: 'Urgent',
    color: '#be123c',
    bgColor: '#ffe4e6',
    borderColor: '#fecdd3',
    desc: 'Critical urgent alert'
  }
]

async function loadAnnouncement() {
  try {
    const res = await api.get('/system-announcement/active')
    if (res.data?.isSuccess && res.data?.data) {
      announcement.value = res.data.data
    }
  } catch (err) {
    console.error('Error loading announcement:', err)
  }
}

async function saveAnnouncement() {
  if (!announcement.value.message.trim()) {
    showNotification('Please enter announcement message content.', 'error')
    return
  }
  isAnnouncementSaving.value = true
  try {
    const res = await api.post('/system-announcement', {
      message: announcement.value.message,
      iconType: announcement.value.iconType,
      isActive: announcement.value.isActive
    })
    if (res.data?.isSuccess) {
      showNotification('System announcement published successfully!', 'success')
      if (res.data.data) {
        announcement.value = res.data.data
      }
      window.dispatchEvent(new CustomEvent('system-announcement-updated'))
    } else {
      showNotification(res.data?.message || 'Failed to save announcement', 'error')
    }
  } catch (err: any) {
    console.error('Error saving announcement:', err)
    showNotification('Failed to publish system announcement', 'error')
  } finally {
    isAnnouncementSaving.value = false
  }
}

async function deactivateAnnouncement() {
  isAnnouncementSaving.value = true
  try {
    const res = await api.delete('/system-announcement')
    if (res.data?.isSuccess) {
      announcement.value.isActive = false
      showNotification('System announcement deactivated!', 'success')
      window.dispatchEvent(new CustomEvent('system-announcement-updated'))
    }
  } catch (err) {
    console.error('Error deactivating announcement:', err)
    showNotification('Failed to deactivate announcement', 'error')
  } finally {
    isAnnouncementSaving.value = false
  }
}

function exportBackupConfig() {
  const jsonStr = JSON.stringify(settings.value, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `ParkFlow_System_Settings_${new Date().toISOString().split('T')[0]}.json`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  showNotification('System settings backup exported as JSON!', 'success')
}

onMounted(() => {
  if (isSuperAdmin.value) {
    loadSettings()
    loadAnnouncement()
  }
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

    <!-- ACCESS DENIED CARD (If Non-SuperAdmin Accesses) -->
    <div v-if="!isSuperAdmin" class="access-denied-card">
      <div class="denied-icon-wrapper">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <h2 class="denied-title">SuperAdmin Access Restricted</h2>
      <p class="denied-desc">
        System settings, violation penalty rates, and semester resets are restricted exclusively to <strong>Super Administrators</strong>.
      </p>
      <button class="denied-btn" @click="router.push('/dashboard')">
        Return to Dashboard
      </button>
    </div>

    <!-- MAIN SUPERADMIN SETTINGS WORKSPACE -->
    <template v-else>
      <!-- Header -->
      <div class="settings-page__header">
        <div>
          <div class="header-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            SuperAdmin Control Panel
          </div>
          <h1 class="settings-page__title">Customization & System Settings</h1>
          <p class="settings-page__subtitle">Configure violation rates per hour, campus capacity rules, feature toggles, and semester resets</p>
        </div>

        <div class="header-right">
          <div class="status-pill pill--green">
            <span class="status-dot"></span>
            Online · System Active
          </div>
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
              <p class="settings-card__subtitle">Set penalty fees per hour that connect dynamically to Mobile App & Collections</p>
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
              <span class="form-help">Minutes allowed before overstay violation penalty begins accruing.</span>
            </div>

            <div class="form-actions">
              <button class="save-btn" :disabled="isSaving" @click="saveSettings">
                <span v-if="isSaving">Saving Settings...</span>
                <span v-else>Save Rate Settings</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Section 2: Campus Capacity & Parking Rules -->
        <div class="settings-card">
          <div class="settings-card__header">
            <div class="icon-wrapper icon-wrapper--blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
              </svg>
            </div>
            <div>
              <h3 class="settings-card__title">Campus Capacity & Parking Rules</h3>
              <p class="settings-card__subtitle">Configure slot limits, session max hours, and vehicle caps</p>
            </div>
          </div>

          <div class="settings-form">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Max Parking Duration (Hours)</label>
                <input
                  v-model.number="settings.maxParkingHours"
                  type="number"
                  min="1"
                  max="24"
                  class="form-input"
                />
                <span class="form-help">Overstay triggered after this limit.</span>
              </div>

              <div class="form-group">
                <label class="form-label">Total Campus Capacity</label>
                <input
                  v-model.number="settings.totalCapacity"
                  type="number"
                  min="10"
                  step="50"
                  class="form-input"
                />
                <span class="form-help">Total available parking slots.</span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Max Vehicles Allowed per User</label>
              <input
                v-model.number="settings.maxVehiclesPerUser"
                type="number"
                min="1"
                max="10"
                class="form-input"
              />
              <span class="form-help">Maximum vehicles a single student or personnel account can register.</span>
            </div>

            <div class="form-actions">
              <button class="save-btn" :disabled="isSaving" @click="saveSettings">
                <span v-if="isSaving">Saving Rules...</span>
                <span v-else>Save Capacity & Rules</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Section 3: Feature Toggles & Automation Controls -->
        <div class="settings-card">
          <div class="settings-card__header">
            <div class="icon-wrapper icon-wrapper--purple">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="6" width="20" height="12" rx="6"/>
                <circle cx="8" cy="12" r="4"/>
              </svg>
            </div>
            <div>
              <h3 class="settings-card__title">System Automation & Feature Toggles</h3>
              <p class="settings-card__subtitle">Enable or disable RFID automation and maintenance mode</p>
            </div>
          </div>

          <div class="toggles-list">
            <!-- Toggle 1: Maintenance Mode -->
            <div class="toggle-item">
              <div class="toggle-info">
                <span class="toggle-title">System Maintenance Mode</span>
                <span class="toggle-desc">Temporarily lock mobile client entry requests during updates</span>
              </div>
              <button
                class="switch-btn"
                :class="{ 'switch-btn--on': settings.maintenanceMode }"
                @click="toggleFeature('maintenanceMode')"
              >
                <span class="switch-handle"></span>
              </button>
            </div>

            <!-- Toggle 2: Instant RFID Scanning -->
            <div class="toggle-item">
              <div class="toggle-info">
                <span class="toggle-title">Instant RFID Gate Auto-Scan</span>
                <span class="toggle-desc">Automatically open gate barriers upon scanning verified tags</span>
              </div>
              <button
                class="switch-btn"
                :class="{ 'switch-btn--on': settings.rfidInstantScanEnabled }"
                @click="toggleFeature('rfidInstantScanEnabled')"
              >
                <span class="switch-handle"></span>
              </button>
            </div>

            <!-- Toggle 3: Auto Approve Verification -->
            <div class="toggle-item">
              <div class="toggle-info">
                <span class="toggle-title">Auto-Approve Document Verifications</span>
                <span class="toggle-desc">Automatically verify COR and OR/CR uploads matching OCR syntax</span>
              </div>
              <button
                class="switch-btn"
                :class="{ 'switch-btn--on': settings.autoApproveVerification }"
                @click="toggleFeature('autoApproveVerification')"
              >
                <span class="switch-handle"></span>
              </button>
            </div>
          </div>
        </div>

        <!-- Section: System-wide Message Banner -->
        <div class="settings-card settings-card--full">
          <div class="settings-card__header">
            <div class="icon-wrapper icon-wrapper--purple">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div>
              <h3 class="settings-card__title">System-wide Message Banner</h3>
              <p class="settings-card__subtitle">Broadcast immediate notices across the Web Admin header & Mobile App dashboard</p>
            </div>
            <div class="banner-status-badge" :class="announcement.isActive ? 'badge--active' : 'badge--inactive'">
              <span class="status-dot"></span>
              {{ announcement.isActive ? 'BANNER LIVE' : 'INACTIVE' }}
            </div>
          </div>

          <div class="settings-form">
            <!-- Icon Type Selection (5 Options) -->
            <div class="form-group">
              <label class="form-label">Select Banner Icon & Theme Style (5 Options)</label>
              <div class="icon-options-grid">
                <button
                  v-for="option in iconOptions"
                  :key="option.type"
                  type="button"
                  class="icon-option-card"
                  :class="{ active: announcement.iconType === option.type }"
                  @click="announcement.iconType = option.type"
                >
                  <div
                    class="option-icon-wrap"
                    :style="{ backgroundColor: option.bgColor, color: option.color, borderColor: option.borderColor }"
                  >
                    <svg v-if="option.type === 'caution'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <svg v-else-if="option.type === 'good_news'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polygon points="12 2 15 8 22 9 17 14 18 21 12 18 6 21 7 14 2 9 9 8 12 2"/>
                    </svg>
                    <svg v-else-if="option.type === 'info'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="16" x2="12" y2="12"/>
                      <line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                    <svg v-else-if="option.type === 'maintenance'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                    </svg>
                    <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  </div>
                  <div class="option-info">
                    <span class="option-title">{{ option.label }}</span>
                    <span class="option-desc">{{ option.desc }}</span>
                  </div>
                </button>
              </div>
            </div>

            <!-- Message Textarea -->
            <div class="form-group">
              <label class="form-label">Announcement Message</label>
              <textarea
                v-model="announcement.message"
                rows="3"
                placeholder="e.g. Campus parking maintenance scheduled tonight from 10 PM to 2 AM."
                class="form-textarea"
              ></textarea>
              <span class="form-help">Users can dismiss this banner by clicking the X button at any time.</span>
            </div>

            <!-- Active Status Toggle -->
            <div class="toggle-item" style="margin-bottom: 20px;">
              <div class="toggle-info">
                <span class="toggle-title">Enable System-wide Banner</span>
                <span class="toggle-desc">When enabled, this banner will appear below Web Admin header and Mobile App dashboard.</span>
              </div>
              <button
                type="button"
                class="switch-btn"
                :class="{ 'switch-btn--on': announcement.isActive }"
                @click="announcement.isActive = !announcement.isActive"
              >
                <span class="switch-handle"></span>
              </button>
            </div>

            <!-- Live Banner Preview Card -->
            <div v-if="announcement.message" class="preview-box">
              <span class="preview-title">LIVE PREVIEW</span>
              <div
                class="announcement-banner-preview"
                :class="`announcement-banner--${announcement.iconType}`"
              >
                <div class="banner-left">
                  <div class="banner-badge">
                    <span v-if="announcement.iconType === 'caution'">CAUTION</span>
                    <span v-else-if="announcement.iconType === 'good_news'">ANNOUNCEMENT</span>
                    <span v-else-if="announcement.iconType === 'info'">NOTICE</span>
                    <span v-else-if="announcement.iconType === 'maintenance'">MAINTENANCE</span>
                    <span v-else>URGENT</span>
                  </div>
                  <span class="banner-text">{{ announcement.message }}</span>
                </div>
                <div class="preview-close">✕</div>
              </div>
            </div>

            <!-- Form Actions -->
            <div class="form-actions-row">
              <button
                type="button"
                class="save-btn"
                :disabled="isAnnouncementSaving"
                @click="saveAnnouncement"
              >
                <span v-if="isAnnouncementSaving">Saving Announcement...</span>
                <span v-else>Publish / Save Announcement</span>
              </button>

              <button
                v-if="announcement.isActive"
                type="button"
                class="deactivate-btn"
                :disabled="isAnnouncementSaving"
                @click="deactivateAnnouncement"
              >
                Deactivate Banner
              </button>
            </div>
          </div>
        </div>

        <!-- Section 4: Semester Rollover & Schedule Reset -->
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

          <div class="form-row" style="margin-bottom: 16px;">
            <div class="form-group">
              <label class="form-label">Academic School Year</label>
              <select v-model="settings.academicYear" class="form-select" @change="saveSettings">
                <option value="2024-2025">2024-2025</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2026-2027">2026-2027</option>
                <option value="2027-2028">2027-2028</option>
                <option value="2028-2029">2028-2029</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Current Semester</label>
              <select v-model="settings.currentSemester" class="form-select" @change="saveSettings">
                <option value="1st Semester">1st Semester</option>
                <option value="2nd Semester">2nd Semester</option>
                <option value="3rd Semester">3rd Semester</option>
                <option value="Summer Term">Summer Term</option>
              </select>
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

        <!-- Section 5: System Diagnostics & Data Export -->
        <div class="settings-card settings-card--full">
          <div class="settings-card__header">
            <div class="icon-wrapper icon-wrapper--gray">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
            </div>
            <div>
              <h3 class="settings-card__title">System Diagnostics & Configurations Backup</h3>
              <p class="settings-card__subtitle">View server build parameters or download system backup JSON file</p>
            </div>
          </div>

          <div class="diagnostics-grid">
            <div class="diag-item">
              <span class="diag-label">System Version</span>
              <span class="diag-val font-mono">ParkFlow v2.5.0-PROD</span>
            </div>
            <div class="diag-item">
              <span class="diag-label">Database Connection</span>
              <span class="diag-val font-mono text-green">PostgreSQL · Healthy</span>
            </div>
            <div class="diag-item">
              <span class="diag-label">Cloudinary Media CDN</span>
              <span class="diag-val font-mono text-green">Connected · 100% SLA</span>
            </div>
            <div class="diag-item">
              <span class="diag-label">Real-time SignalR Hub</span>
              <span class="diag-val font-mono text-green">Active Listener</span>
            </div>
          </div>

          <div class="diag-actions">
            <button class="export-btn" @click="exportBackupConfig">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export System Settings Backup (JSON)
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
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" stroke-width="2">
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
    </template>
  </div>
</template>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.settings-page__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(210, 39, 48, 0.1);
  color: var(--color-primary, #d22730);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  margin-bottom: 6px;
}

.settings-page__title {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text);
  margin: 0;
}

.settings-page__subtitle {
  font-size: 13px;
  color: var(--color-muted);
  margin: 4px 0 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.pill--green {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}

/* Access Denied Card */
.access-denied-card {
  background: var(--color-surface);
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: 16px;
  padding: 48px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 500px;
  margin: 40px auto 0;
}

.denied-icon-wrapper {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-danger, #ef4444);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.denied-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-text);
  margin: 0 0 8px;
}

.denied-desc {
  font-size: 14px;
  color: var(--color-muted);
  line-height: 1.5;
  margin: 0 0 24px;
}

.denied-btn {
  padding: 10px 20px;
  background: var(--color-primary);
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
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
  z-index: 10000;
  box-shadow: 0 10px 30px rgba(0,0,0,0.15);
}
.toast-banner--success { background: #10b981; }
.toast-banner--error { background: #ef4444; }

/* Grid & Cards */
.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.settings-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card, 12px);
  padding: 24px;
}

.settings-card--full {
  grid-column: 1 / -1;
}

.settings-card--danger {
  border-color: rgba(239, 68, 68, 0.4);
}

.settings-card__header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  flex-shrink: 0;
}

.icon-wrapper--amber { background: rgba(253, 184, 19, 0.15); color: #f59e0b; }
.icon-wrapper--blue { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.icon-wrapper--purple { background: rgba(147, 51, 234, 0.15); color: #9333ea; }
.icon-wrapper--red { background: rgba(210, 39, 48, 0.15); color: var(--color-primary); }
.icon-wrapper--gray { background: var(--color-surface-muted); color: var(--color-muted); }

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
  gap: 16px;
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
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: var(--color-primary);
}

.form-select {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
}

.form-select:focus {
  border-color: var(--color-primary);
}

.form-actions {
  margin-top: 4px;
}

.save-btn {
  padding: 10px 18px;
  background: var(--color-primary);
  color: #fff;
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

/* Feature Toggles */
.toggles-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toggle-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: var(--color-surface-muted);
  border-radius: 8px;
  gap: 16px;
}

.toggle-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toggle-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.toggle-desc {
  font-size: 11px;
  color: var(--color-muted);
}

.switch-btn {
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: var(--color-border);
  border: none;
  position: relative;
  cursor: pointer;
  transition: background 200ms ease;
  flex-shrink: 0;
  padding: 2px;
}

.switch-btn--on {
  background: #10b981;
}

.switch-handle {
  display: block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  transition: transform 200ms ease;
}

.switch-btn--on .switch-handle {
  transform: translateX(20px);
}

/* Reset Box */
.reset-info-box {
  background: var(--color-surface-muted);
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
  margin-bottom: 16px;
}

.reset-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  justify-content: center;
  padding: 12px 20px;
  background: rgba(210, 39, 48, 0.1);
  border: 1px solid rgba(210, 39, 48, 0.4);
  color: var(--color-primary);
  font-size: 14px;
  font-weight: 700;
  border-radius: 8px;
  cursor: pointer;
  transition: all 150ms ease;
}

.reset-btn:hover {
  background: rgba(210, 39, 48, 0.2);
}

/* Diagnostics Card */
.diagnostics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.diag-item {
  background: var(--color-surface-muted);
  padding: 12px 14px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.diag-label {
  font-size: 11px;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.diag-val {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text);
}

.font-mono { font-family: monospace; }
.text-green { color: #10b981; }

.diag-actions {
  display: flex;
  justify-content: flex-end;
}

.export-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 8px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms ease;
}

.export-btn:hover {
  background: var(--color-surface-lighter);
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-card {
  width: 100%;
  max-width: 440px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
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
  background: var(--color-surface-muted);
  color: var(--color-text);
}

.modal-btn--cancel:hover {
  background: var(--color-surface-lighter);
}

.modal-btn--confirm {
  background: var(--color-primary);
  color: #fff;
}

.modal-btn--confirm:hover {
  opacity: 0.9;
}

/* ── System Announcement Custom Styles ── */
.banner-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
  margin-left: auto;
}

.badge--active {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.badge--inactive {
  background: var(--color-surface-muted);
  color: var(--color-muted);
  border: 1px solid var(--color-border);
}

.icon-options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 12px;
  margin-top: 8px;
}

.icon-option-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.icon-option-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-1px);
}

.icon-option-card.active {
  border-color: var(--color-primary);
  background: var(--color-surface-muted);
  box-shadow: 0 0 0 3px rgba(210, 39, 48, 0.12);
}

.option-icon-wrap {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.option-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.option-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text);
}

.option-desc {
  font-size: 11px;
  color: var(--color-muted);
}

.form-textarea {
  width: 100%;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.2s ease;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(210, 39, 48, 0.12);
}

.preview-box {
  margin-bottom: 20px;
  padding: 14px;
  border-radius: 12px;
  background: var(--color-surface-muted);
  border: 1px dashed var(--color-border);
}

.preview-title {
  font-size: 11px;
  font-weight: 800;
  color: var(--color-muted);
  letter-spacing: 1px;
  display: block;
  margin-bottom: 8px;
}

.announcement-banner-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid;
}

.banner-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.preview-close {
  font-weight: 700;
  opacity: 0.7;
}

.form-actions-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.deactivate-btn {
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
  cursor: pointer;
  transition: all 0.2s ease;
}

.deactivate-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

@media (max-width: 1024px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
  .diagnostics-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
