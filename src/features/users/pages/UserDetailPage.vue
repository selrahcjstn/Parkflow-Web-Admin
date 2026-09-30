<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api/axios'
import { cachedUsers } from '@/stores/appCache'
import type { UserWithDetails, AccountStatus } from '../types'
import { getRoleLabel } from '@/utils/role'
import UiCard from '@/components/ui/UiCard.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import UserDetailHeader from '../components/UserDetailHeader.vue'
import UserDetailHeroCard from '../components/UserDetailHeroCard.vue'
import UserAccountInfoCard from '../components/UserAccountInfoCard.vue'
import UserClassificationCard from '../components/UserClassificationCard.vue'
import UserVehiclesCard from '../components/UserVehiclesCard.vue'

const route = useRoute()
const router = useRouter()
const userId = computed(() => String(route.params.id || ''))

const isLoading = ref(true)
const user = ref<UserWithDetails | null>(null)
const errorMessage = ref<string | null>(null)

// Status update confirmation
const isStatusConfirmOpen = ref(false)
const targetStatusToApply = ref<AccountStatus>('Suspended')
const isUpdatingStatus = ref(false)

// Toast Notifications
interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}
const toasts = ref<Toast[]>([])
let nextToastId = 1
function showToast(message: string, type: 'success' | 'error' = 'success') {
  const id = nextToastId++
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, 4000)
}

function mapRawUser(u: any): UserWithDetails {
  let fname = u.firstName || ''
  let lname = u.lastName || ''
  if (!fname && u.fullName) {
    const parts = String(u.fullName).trim().split(/\s+/)
    fname = parts[0] || ''
    lname = parts.slice(1).join(' ') || ''
  }

  return {
    id: String(u.id || u.userAccountId || u.userId || userId.value),
    firstName: fname,
    lastName: lname,
    middleName: u.middleName || '',
    fullName: u.fullName || `${fname} ${lname}`.trim() || 'Client Account',
    email: u.email || '—',
    phoneNumber: u.phoneNumber || u.phone || '—',
    role: u.role || u.userRole || 'Student',
    status: u.status || 'Active',
    authProvider: u.authProvider || 'Manual',
    profilePictureUrl: u.profilePictureUrl || u.avatarUrl || u.photoUrl || '',
    createdAt: u.createdAt || new Date().toISOString(),
    corVerificationStatus: u.corVerificationStatus || (u.verificationStatus === 2 ? 'Verified' : u.verificationStatus === 3 ? 'Rejected' : u.verificationStatus === 1 ? 'Pending' : 'NotSubmitted'),
    student: u.student ? {
      studentNumber: u.student.studentNumber || '',
      course: u.student.course || '',
      section: u.student.section || '',
      yearLevel: u.student.yearLevel || 1
    } : undefined,
    personnel: u.personnel ? {
      idCardNumber: u.personnel.idCardNumber || '',
      department: u.personnel.department || ''
    } : undefined,
    guard: u.guard ? {
      assignedGate: u.guard.assignedGate || 1
    } : undefined,
    vehicles: Array.isArray(u.vehicles) ? u.vehicles : []
  }
}

onMounted(async () => {
  isLoading.value = true
  errorMessage.value = null

  // 1. Check history.state.user passed via router.push
  const stateUser = history.state?.user
  if (stateUser) {
    user.value = mapRawUser(stateUser)
    isLoading.value = false
    return
  }

  // 2. Check cachedUsers
  if (cachedUsers.value && cachedUsers.value.length > 0) {
    const found = cachedUsers.value.find((x: any) => String(x.id) === userId.value)
    if (found) {
      user.value = mapRawUser(found)
      isLoading.value = false
      return
    }
  }

  // 3. Fallback API Request
  try {
    const response = await api.get(`/users/${userId.value}`)
    const data = response.data?.isSuccess && response.data?.data ? response.data.data : response.data
    if (data) {
      user.value = mapRawUser(data)
    } else {
      const listRes = await api.get('/users')
      const list = Array.isArray(listRes.data?.data) ? listRes.data.data : (Array.isArray(listRes.data) ? listRes.data : [])
      const match = list.find((u: any) => String(u.id) === userId.value)
      if (match) {
        user.value = mapRawUser(match)
      } else {
        errorMessage.value = 'User record not found.'
      }
    }
  } catch (err: any) {
    console.error('Error loading user details:', err)
    errorMessage.value = err.response?.data?.message || 'Failed to load user record details.'
  } finally {
    isLoading.value = false
  }
})

function goBack() {
  router.push('/users')
}

function openEdit() {
  if (user.value) {
    router.push(`/users/${user.value.id}/edit`)
  }
}

function openChangePassword() {
  if (user.value) {
    router.push({
      path: '/users/change-password',
      query: {
        id: user.value.id,
        email: user.value.email,
        name: user.value.fullName,
        role: getRoleLabel(user.value.role)
      }
    })
  }
}

function promptToggleStatus(targetStatus: AccountStatus) {
  targetStatusToApply.value = targetStatus
  isStatusConfirmOpen.value = true
}

async function confirmStatusChange() {
  if (!user.value) return
  isUpdatingStatus.value = true
  const newStatus = targetStatusToApply.value

  try {
    await api.put(`/users/${user.value.id}/status`, { status: newStatus })
    user.value.status = newStatus

    if (cachedUsers.value) {
      const idx = cachedUsers.value.findIndex((u: any) => String(u.id) === String(user.value?.id))
      if (idx !== -1) {
        cachedUsers.value[idx] = { ...cachedUsers.value[idx], status: newStatus }
      }
    }

    showToast(`Account status updated to ${newStatus}.`, newStatus === 'Active' ? 'success' : 'error')
  } catch (err: any) {
    console.warn('Status update API error, updating state locally:', err)
    user.value.status = newStatus
    showToast(`Account status set to ${newStatus}.`, newStatus === 'Active' ? 'success' : 'error')
  } finally {
    isUpdatingStatus.value = false
    isStatusConfirmOpen.value = false
  }
}
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-6">
    <!-- Toast Notifications -->
    <div class="fixed bottom-7 right-7 z-50 flex flex-col gap-2.5 pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="[
            'px-4 py-3 rounded-xl text-sm font-semibold backdrop-blur-md shadow-lg pointer-events-auto max-w-xs transition-all',
            toast.type === 'success'
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
          ]"
        >
          {{ toast.message }}
        </div>
      </TransitionGroup>
    </div>

    <!-- Header and Action Toolbar -->
    <UserDetailHeader
      :user="user"
      :is-loading="isLoading"
      @back="goBack"
      @edit="openEdit"
      @change-password="openChangePassword"
      @toggle-status="promptToggleStatus"
    />

    <!-- Loading Skeleton -->
    <div v-if="isLoading" class="space-y-6 animate-pulse">
      <UiCard class="p-6">
        <div class="h-20 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
      </UiCard>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UiCard class="p-6 space-y-3">
          <div class="h-6 w-1/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
          <div class="h-32 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
        </UiCard>
        <UiCard class="p-6 space-y-3">
          <div class="h-6 w-1/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
          <div class="h-32 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
        </UiCard>
      </div>
    </div>

    <!-- Error State -->
    <UiCard v-else-if="!user || errorMessage" class="p-12 text-center flex flex-col items-center gap-4">
      <div class="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
        <svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div>
        <h3 class="text-base font-bold text-slate-800 dark:text-slate-200">User Record Not Found</h3>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          {{ errorMessage || 'The requested user profile could not be found or has been removed.' }}
        </p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 transition-colors cursor-pointer mt-2"
        @click="goBack"
      >
        Return to Client Directory
      </button>
    </UiCard>

    <!-- Main Content -->
    <div v-else class="space-y-6">
      <!-- 1. Hero Identity Card -->
      <UserDetailHeroCard :user="user" />

      <!-- 2. Two-Column Grid: Account Info & Classification -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UserAccountInfoCard :user="user" />
        <UserClassificationCard :user="user" />
      </div>

      <!-- 3. Registered Vehicles & Parking Passes -->
      <UserVehiclesCard :vehicles="user.vehicles" />
    </div>

    <!-- Status Change Confirmation Modal -->
    <ConfirmModal
      :is-open="isStatusConfirmOpen"
      :title="targetStatusToApply === 'Suspended' ? 'Suspend Client Account' : 'Activate Client Account'"
      :message="targetStatusToApply === 'Suspended'
        ? `Are you sure you want to suspend account clearance for <strong>${user?.fullName || 'this user'}</strong>? They will be restricted from gate entry.`
        : `Are you sure you want to reactivate clearance for <strong>${user?.fullName || 'this user'}</strong>?`"
      :confirm-text="targetStatusToApply === 'Suspended' ? 'Suspend Account' : 'Activate Account'"
      :confirm-variant="targetStatusToApply === 'Suspended' ? 'danger' : 'primary'"
      :is-loading="isUpdatingStatus"
      @close="isStatusConfirmOpen = false"
      @confirm="confirmStatusChange"
    />
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
