<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { UserWithDetails } from '../types'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import UiBadge from '@/components/ui/UiBadge.vue'

const router = useRouter()

const props = defineProps<{
  user: UserWithDetails | null
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'updateStatus', userId: string, newStatus: 'Suspended' | 'Active'): void
}>()

const targetStatusToApply = ref<'Suspended' | 'Active'>('Suspended')
const isStatusConfirmOpen = ref(false)

const openStatusConfirm = (status: 'Suspended' | 'Active') => {
  targetStatusToApply.value = status
  isStatusConfirmOpen.value = true
}

const handleConfirmStatusChange = () => {
  if (!props.user) return
  emit('updateStatus', props.user.id, targetStatusToApply.value)
  isStatusConfirmOpen.value = false
}

const handleChangePassword = () => {
  if (!props.user) return
  emit('close')
  router.push({
    path: '/users/change-password',
    query: {
      email: props.user.email,
      name: `${props.user.firstName} ${props.user.lastName}`,
      role: props.user.role
    }
  })
}

const handleEditUser = () => {
  if (props.user) {
    emit('close')
    router.push({
      path: `/users/${props.user.id}/edit`,
      state: { user: JSON.parse(JSON.stringify(props.user)) }
    })
  }
}

const formatYearLevel = (level?: number): string => {
  if (!level) return 'N/A'
  if (level >= 7 && level <= 12) return `Grade ${level}`
  if (level === 1) return '1st Year'
  if (level === 2) return '2nd Year'
  if (level === 3) return '3rd Year'
  if (level === 4) return '4th Year'
  if (level >= 5) return '5th Year+'
  return `${level}`
}

function getStatusBadgeVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'Active' || status === 'Verified') return 'success'
  if (status === 'PendingVerification' || status === 'Pending') return 'warning'
  if (status === 'Suspended' || status === 'Rejected') return 'danger'
  return 'neutral'
}

const formatStatus = (status: string) => {
  if (status === 'PendingVerification') return 'Pending Verification'
  return status
}

const formatCorStatus = (status: string) => {
  if (status === 'NotSubmitted') return 'Not Submitted'
  return status
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen && user" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" @click="emit('close')">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" @click.stop>
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 class="text-lg font-bold text-slate-900 dark:text-white m-0">User Details</h3>
            <button
              type="button"
              @click="emit('close')"
              class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-white transition-colors cursor-pointer border-none bg-transparent"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>

          <!-- Scrollable Body -->
          <div class="p-6 overflow-y-auto flex-1 flex flex-col gap-6 text-xs">
            <!-- User Profile Card -->
            <div class="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
              <UiAvatar :name="user.fullName" :src="user.profilePictureUrl" size="lg" />
              <div class="flex flex-col gap-1 min-w-0">
                <h4 class="text-base font-bold text-slate-900 dark:text-white m-0 truncate">{{ user.fullName }}</h4>
                <UiBadge variant="primary" size="xs">
                  {{ user.role }}
                </UiBadge>
              </div>
            </div>

            <!-- Account Details -->
            <div class="flex flex-col gap-3">
              <h5 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800 m-0">
                Account Information
              </h5>
              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1">
                  <span class="text-slate-500 dark:text-slate-400 font-medium">Email Address</span>
                  <span class="font-semibold text-slate-900 dark:text-white text-xs truncate">{{ user.email }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-slate-500 dark:text-slate-400 font-medium">Phone Number</span>
                  <span class="font-semibold text-slate-900 dark:text-white text-xs">{{ user.phoneNumber }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-slate-500 dark:text-slate-400 font-medium">Auth Provider</span>
                  <span class="font-semibold text-slate-900 dark:text-white text-xs">{{ user.authProvider }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-slate-500 dark:text-slate-400 font-medium">Account Status</span>
                  <div>
                    <UiBadge :variant="getStatusBadgeVariant(user.status)" size="xs">
                      {{ formatStatus(user.status) }}
                    </UiBadge>
                  </div>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-slate-500 dark:text-slate-400 font-medium">COR Verification</span>
                  <div>
                    <UiBadge :variant="getStatusBadgeVariant(user.corVerificationStatus)" size="xs">
                      {{ formatCorStatus(user.corVerificationStatus) }}
                    </UiBadge>
                  </div>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-slate-500 dark:text-slate-400 font-medium">Date Registered</span>
                  <span class="font-semibold text-slate-900 dark:text-white text-xs">
                    {{ new Date(user.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Role Details -->
            <div v-if="user.student || user.personnel || user.guard" class="flex flex-col gap-3">
              <h5 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800 m-0">
                Classification Details
              </h5>

              <!-- Student Details -->
              <div v-if="user.student" class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1">
                  <span class="text-slate-500 dark:text-slate-400 font-medium">Client ID</span>
                  <span class="font-mono font-semibold text-slate-900 dark:text-white text-xs">{{ user.student.studentNumber }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-slate-500 dark:text-slate-400 font-medium">Course</span>
                  <span class="font-semibold text-slate-900 dark:text-white text-xs">{{ user.student.course }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-slate-500 dark:text-slate-400 font-medium">Section</span>
                  <span class="font-semibold text-slate-900 dark:text-white text-xs">{{ user.student.section }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-slate-500 dark:text-slate-400 font-medium">Year Level</span>
                  <span class="font-semibold text-slate-900 dark:text-white text-xs">{{ formatYearLevel(user.student.yearLevel) }}</span>
                </div>
              </div>

              <!-- Personnel Details -->
              <div v-if="user.personnel" class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1">
                  <span class="text-slate-500 dark:text-slate-400 font-medium">Client ID</span>
                  <span class="font-mono font-semibold text-slate-900 dark:text-white text-xs">{{ user.personnel.idCardNumber }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-slate-500 dark:text-slate-400 font-medium">Department</span>
                  <span class="font-semibold text-slate-900 dark:text-white text-xs">{{ user.personnel.department }}</span>
                </div>
              </div>

              <!-- Guard Details -->
              <div v-if="user.guard" class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1">
                  <span class="text-slate-500 dark:text-slate-400 font-medium">Assigned Gate</span>
                  <span class="font-semibold text-slate-900 dark:text-white text-xs">Gate {{ user.guard.assignedGate }}</span>
                </div>
              </div>
            </div>

            <!-- Vehicle Details -->
            <div class="flex flex-col gap-3">
              <h5 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800 m-0">
                Registered Vehicles
              </h5>
              <div v-if="user.vehicles.length === 0" class="p-4 text-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                No vehicles registered to this account.
              </div>
              <div v-else class="flex flex-col gap-2.5">
                <div
                  v-for="vehicle in user.vehicles"
                  :key="vehicle.plateNumber"
                  class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center flex-shrink-0">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2a3 3 0 0 0 6 0h2a3 3 0 0 0 6 0" />
                        <circle cx="7.5" cy="16.5" r="2.5" />
                        <circle cx="16.5" cy="16.5" r="2.5" />
                      </svg>
                    </div>
                    <div class="flex flex-col">
                      <span class="font-mono font-bold text-slate-900 dark:text-white text-xs">{{ vehicle.plateNumber }}</span>
                      <span class="text-[11.5px] text-slate-500 dark:text-slate-400">{{ vehicle.brand }}</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <UiBadge variant="neutral" size="xs">
                      {{ vehicle.vehicleType }}
                    </UiBadge>
                    <UiBadge v-if="vehicle.isPrimary" variant="success" size="xs">
                      Primary
                    </UiBadge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Footer -->
          <div class="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <button
              type="button"
              @click="handleEditUser"
              class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>Edit Account</span>
            </button>
            <button
              type="button"
              @click="handleChangePassword"
              class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:text-indigo-600 hover:border-indigo-300 transition-all cursor-pointer shadow-2xs"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Change Password</span>
            </button>
            <button
              v-if="user.status !== 'Suspended'"
              type="button"
              @click="openStatusConfirm('Suspended')"
              class="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700 transition-all cursor-pointer border-none shadow-2xs"
            >
              Suspend Account
            </button>
            <button
              v-if="user.status === 'Suspended'"
              type="button"
              @click="openStatusConfirm('Active')"
              class="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition-all cursor-pointer border-none shadow-2xs"
            >
              Unsuspend Account
            </button>
            <button
              type="button"
              @click="emit('close')"
              class="px-4 py-2 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-300/80 transition-all cursor-pointer border-none"
            >
              Close View
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Status Change Confirmation Modal -->
  <ConfirmModal
    :is-open="isStatusConfirmOpen"
    :title="targetStatusToApply === 'Suspended' ? 'Suspend Client Account' : 'Unsuspend / Reactivate Account'"
    :message="targetStatusToApply === 'Suspended' ? `Are you sure you want to suspend clearance for <strong>${user?.fullName || 'this user'}</strong>? They will be unable to access campus parking until unsuspended.` : `Are you sure you want to reactivate clearance for <strong>${user?.fullName || 'this user'}</strong>? This will restore campus parking access.`"
    :confirm-text="targetStatusToApply === 'Suspended' ? 'Suspend Account' : 'Unsuspend Account'"
    cancel-text="Cancel"
    :variant="targetStatusToApply === 'Suspended' ? 'warning' : 'success'"
    @confirm="handleConfirmStatusChange"
    @close="isStatusConfirmOpen = false"
  />
</template>
