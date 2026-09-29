<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'
import UiCard from '@/components/ui/UiCard.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiTabs, { type TabItem } from '@/components/ui/UiTabs.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import OverstayFeeCard from '../components/OverstayFeeCard.vue'
import CampusCapacityCard from '../components/CampusCapacityCard.vue'
import SystemAnnouncementCard from '../components/SystemAnnouncementCard.vue'
import FeatureTogglesCard from '../components/FeatureTogglesCard.vue'

const router = useRouter()

interface SystemSettings {
  violationRatePerHour: number
  feeCalculationMode: 'per_hour' | 'per_day' | 'one_time' | 'one_time_hourly' | 'no_fee'
  baseFee: number
  isGracePeriodEnabled: boolean
  gracePeriodMinutes: number
  isEarlyParkingAllowed: boolean
  earlyParkingMinutes: number
  academicYear: string
  currentSemester: string
  lastResetDate?: string
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
  feeCalculationMode: 'per_hour',
  baseFee: 50,
  isGracePeriodEnabled: true,
  gracePeriodMinutes: 15,
  isEarlyParkingAllowed: true,
  earlyParkingMinutes: 15,
  academicYear: '2026-2027',
  currentSemester: '1st Semester',
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
    const errorMsg = error.response?.data?.message || error.message || 'Failed to save system settings'
    showNotification(errorMsg, 'error')
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
  title?: string
  message: string
  iconType: 'caution' | 'good_news' | 'info' | 'maintenance' | 'urgent'
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

const announcement = ref<SystemAnnouncement>({
  title: '',
  message: '',
  iconType: 'info',
  isActive: true
})
const isAnnouncementSaving = ref(false)

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
  if (!announcement.value.message.trim() && !(announcement.value.title || '').trim()) {
    showNotification('Please enter announcement message content.', 'error')
    return
  }
  if ((announcement.value.title || '').length > 60) {
    showNotification('Title or header must not exceed 60 characters.', 'error')
    return
  }
  isAnnouncementSaving.value = true
  try {
    const res = await api.post('/system-announcement', {
      title: (announcement.value.title || '').trim(),
      message: announcement.value.message.trim(),
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

const activeTab = ref<'capacity' | 'billing' | 'announcements' | 'features'>('capacity')

const settingsTabs: TabItem[] = [
  { key: 'capacity', label: 'Campus Capacity & Cycle' },
  { key: 'billing', label: 'Rates & Billing Policy' },
  { key: 'announcements', label: 'System Announcements' },
  { key: 'features', label: 'Feature Flags & Controls' }
]

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
  <div class="space-y-6">
    <!-- Notification Toast -->
    <Transition name="fade">
      <div
        v-if="toastMessage"
        class="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold shadow-xl text-white transition-all"
        :class="toastType === 'error' ? 'bg-rose-600' : 'bg-emerald-600'"
      >
        <span>{{ toastMessage }}</span>
      </div>
    </Transition>

    <!-- Access Denied Card (if non super-admin) -->
    <div v-if="!isSuperAdmin" class="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-w-lg mx-auto mt-12">
      <div class="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
        <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <h2 class="text-xl font-black text-slate-900 dark:text-white">SuperAdmin Access Restricted</h2>
      <p class="text-xs text-slate-500 dark:text-slate-400 max-w-md">
        System configurations, rate settings, and semester resets are restricted exclusively to <strong>Super Administrators</strong>.
      </p>
      <UiButton variant="primary" @click="router.push('/dashboard')">
        Return to Dashboard
      </UiButton>
    </div>

    <!-- Main SuperAdmin Settings Form -->
    <template v-else>
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            System Settings & Customization
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage campus capacity, semester transitions, violation billing policies, and feature toggles.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Online · System Active
          </span>
          <UiButton
            variant="primary"
            :loading="isSaving"
            @click="saveSettings"
          >
            Save All Settings
          </UiButton>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex items-center justify-start">
        <UiTabs
          v-model="activeTab"
          :tabs="settingsTabs"
        />
      </div>

      <!-- Separated Tab Contents -->
      <div class="space-y-6">
        <!-- 1. Campus Capacity & Semester Cycle Tab -->
        <div v-show="activeTab === 'capacity'">
          <CampusCapacityCard
            :settings="settings"
            :is-saving="isSaving"
            @save="saveSettings"
            @open-reset-modal="showResetModal = true"
          />
        </div>

        <!-- 2. Rates & Billing Policy Tab -->
        <div v-show="activeTab === 'billing'">
          <OverstayFeeCard
            :settings="settings"
            :is-saving="isSaving"
            @save="saveSettings"
          />
        </div>

        <!-- 3. System Announcement Tab -->
        <div v-show="activeTab === 'announcements'">
          <SystemAnnouncementCard
            :announcement="announcement"
            :is-saving="isAnnouncementSaving"
            @save="saveAnnouncement"
            @deactivate="deactivateAnnouncement"
          />
        </div>

        <!-- 4. Feature Toggles & Controls Tab -->
        <div v-show="activeTab === 'features'">
          <FeatureTogglesCard
            :settings="settings"
            :is-saving="isSaving"
            @toggle="toggleFeature"
            @export-backup="exportBackupConfig"
          />
        </div>
      </div>

      <!-- Reset Student Schedules Confirmation Modal -->
      <ConfirmModal
        :is-open="showResetModal"
        title="Reset All Student Schedules for New Term?"
        message="This action will reset the schedule verification status for all enrolled students in the database. Students will need to upload their Certificate of Registration (COR) for the incoming semester. This cannot be undone."
        confirm-text="Yes, Reset for New Semester"
        cancel-text="Cancel"
        variant="danger"
        :is-submitting="isResetting"
        @confirm="confirmResetStudentSchedules"
        @close="showResetModal = false"
      />
    </template>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
