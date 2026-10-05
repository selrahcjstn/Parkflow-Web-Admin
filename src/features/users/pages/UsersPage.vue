<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { UserWithDetails, UserRole, AccountStatus } from '../types'
import UserFormModal from '../components/UserFormModal.vue'
import UserCard from '../components/UserCard.vue'
import UserFilters from '../components/UserFilters.vue'
import UserStatusModal from '../components/UserStatusModal.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import TablePagination from '@/components/ui/TablePagination.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import UiTable, { type TableColumn } from '@/components/ui/UiTable.vue'
import UiStatusText from '@/components/ui/UiStatusText.vue'
import UiButton from '@/components/ui/UiButton.vue'
import api from '@/api/axios'
import { cachedUsers } from '@/stores/appCache'

import { isSuperAdminUser } from '@/utils/auth'

const route = useRoute()
const router = useRouter()
const users = ref<UserWithDetails[]>(cachedUsers.value || [])
const isLoading = ref(!cachedUsers.value)

const isSuperAdmin = computed(() => isSuperAdminUser())

const fetchUsers = async () => {
  if (!cachedUsers.value) {
    isLoading.value = true
  }
  try {
    const response = await api.get('/users')
    if (response.data && response.data.isSuccess && Array.isArray(response.data.data)) {
      const fetched: UserWithDetails[] = response.data.data
      if (cachedUsers.value && cachedUsers.value.length > 0) {
        users.value = fetched.map((f: UserWithDetails) => {
          const cached = cachedUsers.value?.find((c: any) => String(c.id) === String(f.id))
          return cached ? { ...cached, ...f } : f
        })
        cachedUsers.value.forEach((c: any) => {
          if (!users.value.some((u) => String(u.id) === String(c.id))) {
            users.value.push(c)
          }
        })
        cachedUsers.value = [...users.value]
      } else {
        users.value = fetched
        cachedUsers.value = fetched
      }
    } else if (cachedUsers.value) {
      users.value = cachedUsers.value
    }
  } catch (error) {
    console.error('Error fetching users:', error)
    if (cachedUsers.value) {
      users.value = cachedUsers.value
    }
  } finally {
    isLoading.value = false
  }
}

const notificationToast = ref<string | null>(null)

onMounted(async () => {
  if (route.query.registered === 'true') {
    notificationToast.value = 'New client account registered successfully!'
    setTimeout(() => {
      notificationToast.value = null
    }, 4000)
  } else if (route.query.passwordChanged === 'true') {
    notificationToast.value = 'User account password updated successfully!'
    setTimeout(() => {
      notificationToast.value = null
    }, 4000)
  }
  await fetchUsers()
})

// Filtering & View state
const searchQuery = ref('')
const selectedRole = ref<string>('all')
const selectedStatus = ref<string>('all')
const selectedVehicleFilter = ref<string>('all')
const viewMode = ref<'grid' | 'table'>('grid')

const studentCount = computed(() => users.value.filter((u) => u.role === 'Student').length)
const facultyCount = computed(() => users.value.filter((u) => u.role === 'UniversityStaff').length)
const staffCount = computed(() => users.value.filter((u) => u.role === 'NonAcademicPersonnel').length)
const guardCount = computed(() => users.value.filter((u) => u.role === 'Guard').length)
const adminCount = computed(() => users.value.filter((u) => u.role === 'Admin' || (u.role as string) === 'SuperAdmin').length)

// Dynamic Header Properties
const headerTitle = computed(() => {
  if (selectedRole.value === 'Student') return 'Student Client Directory'
  if (selectedRole.value === 'UniversityStaff') return 'Faculty Member Directory'
  if (selectedRole.value === 'NonAcademicPersonnel') return 'University Staff Directory'
  if (selectedRole.value === 'Guard') return 'Security Guards Directory'
  if (selectedRole.value === 'Admin') return 'System Administrators Directory'
  return 'Client & User Account Directory'
})

const headerSubtitle = computed(() => {
  if (selectedRole.value === 'Student') return 'Manage registered student accounts, active COR submission verifications, and class schedule parking passes.'
  if (selectedRole.value === 'UniversityStaff') return 'Manage faculty member accounts, department assignments, and vehicle clearance.'
  if (selectedRole.value === 'NonAcademicPersonnel') return 'Manage university staff accounts, administrative departments, and vehicle clearance.'
  if (selectedRole.value === 'Guard') return 'Manage active gate security guards, assigned gates, and RFID scanner permissions.'
  if (selectedRole.value === 'Admin') return 'Manage system administrators and elevated system privileges.'
  return 'Manage registered client accounts, pending COR registrations, and system privileges.'
})

const isAdminStaffView = computed(() => selectedRole.value === 'AdminStaff' || selectedRole.value === 'Guard' || selectedRole.value === 'Admin')

const stats = computed(() => {
  const total = users.value.length
  const students = studentCount.value
  const faculty = facultyCount.value
  const staff = staffCount.value
  const guards = guardCount.value

  const list = [
    { title: 'Total Registered', value: total, icon: 'people' },
    { title: 'Students', value: students, icon: 'student' },
    { title: 'Faculty', value: faculty, icon: 'briefcase' },
    { title: 'Staff (Non-Academic)', value: staff, icon: 'briefcase' }
  ]

  if (isSuperAdmin.value) {
    list.push({ title: 'Security Guards', value: guards, icon: 'shield' })
  }

  return list
})

const displayStatus = (user: UserWithDetails): string => {
  if (user.status === 'Suspended') return 'Suspended'
  if (user.role === 'Student') {
    if (user.corVerificationStatus === 'Verified') return 'Approved'
    if (user.corVerificationStatus === 'Pending') return 'Pending'
    if (user.corVerificationStatus === 'Rejected') return 'Rejected'
    if (user.corVerificationStatus === 'NotSubmitted') return 'NotSubmitted'
  }
  if (user.status === 'Active') return 'Approved'
  if (user.status === 'PendingVerification') return 'Pending'
  return user.status || 'Approved'
}

function getStatusBadgeVariant(status?: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (!status) return 'neutral'
  if (status === 'Verified' || status === 'Approved' || status === 'Active') return 'success'
  if (status === 'Pending' || status === 'PendingVerification') return 'warning'
  if (status === 'Suspended' || status === 'Rejected') return 'danger'
  return 'neutral'
}

function formatStatusText(status?: string): string {
  if (!status) return 'Not Submitted'
  if (status === 'Verified' || status === 'Approved' || status === 'Active') return 'Approved'
  if (status === 'Pending' || status === 'PendingVerification') return 'Pending'
  if (status === 'Rejected') return 'Rejected'
  if (status === 'NotSubmitted' || status === 'Unverified') return 'Not Submitted'
  if (status === 'Suspended') return 'Suspended'
  return status
}

const getIdentifier = (user: UserWithDetails) => {
  if (user.student?.studentNumber) return user.student.studentNumber
  if (user.personnel?.idCardNumber) return user.personnel.idCardNumber
  if (user.guard?.assignedGate) return `Gate ${user.guard.assignedGate}`
  return user.id || 'N/A'
}

const getRoleLabel = (role: UserRole) => {
  switch (role) {
    case 'Student':
      return 'Student'
    case 'UniversityStaff':
      return 'Faculty Member'
    case 'NonAcademicPersonnel':
      return 'University Staff'
    case 'Guard':
      return 'Security Guard'
    case 'Admin':
      return 'Admin'
    default:
      return role
  }
}

const userColumns = computed<TableColumn[]>(() => {
  const cols: TableColumn[] = [
    { key: 'client', label: isAdminStaffView.value ? 'Staff Member' : 'Client' },
    { key: 'identifier', label: 'Client ID' },
    { key: 'role', label: 'Classification' }
  ]
  if (!isAdminStaffView.value) {
    cols.push(
      { key: 'vehicles', label: 'Vehicles' },
      { key: 'status', label: 'Registration Status' }
    )
  }
  cols.push({ key: 'actions', label: 'Actions', align: 'right' })
  return cols
})

const filteredUsers = computed(() => {
  return users.value.filter((user) => {
    if (!isSuperAdmin.value && (user.role === 'Guard' || user.role === 'Admin' || (user.role as string) === 'SuperAdmin')) {
      return false
    }

    const searchLower = (searchQuery.value || '').toLowerCase()
    const matchesSearch =
      (user.fullName || '').toLowerCase().includes(searchLower) ||
      (user.email || '').toLowerCase().includes(searchLower) ||
      (user.student?.studentNumber || '').toLowerCase().includes(searchLower) ||
      (user.personnel?.idCardNumber || '').toLowerCase().includes(searchLower)

    const matchesRole =
      selectedRole.value === 'all' ||
      user.role === selectedRole.value

    const userStatus = displayStatus(user)
    const matchesStatus =
      selectedStatus.value === 'all' ||
      userStatus === selectedStatus.value ||
      (selectedStatus.value === 'Approved' && (userStatus === 'Approved' || user.corVerificationStatus === 'Verified' || user.status === 'Active')) ||
      (selectedStatus.value === 'Verified' && (userStatus === 'Approved' || user.corVerificationStatus === 'Verified' || user.status === 'Active')) ||
      (selectedStatus.value === 'Pending' && (userStatus === 'Pending' || user.corVerificationStatus === 'Pending' || user.status === 'PendingVerification')) ||
      (selectedStatus.value === 'Rejected' && (userStatus === 'Rejected' || user.corVerificationStatus === 'Rejected')) ||
      (selectedStatus.value === 'NotSubmitted' && (userStatus === 'NotSubmitted' || user.corVerificationStatus === 'NotSubmitted')) ||
      (selectedStatus.value === 'Suspended' && (userStatus === 'Suspended' || user.status === 'Suspended'))

    const hasVehicles = user.vehicles && user.vehicles.length > 0
    const matchesVehicle =
      selectedVehicleFilter.value === 'all' ||
      (selectedVehicleFilter.value === 'with-vehicle' && hasVehicles) ||
      (selectedVehicleFilter.value === 'no-vehicle' && !hasVehicles)

    return matchesSearch && matchesRole && matchesStatus && matchesVehicle
  })
})

// Pagination
const currentPage = ref(1)
const itemsPerPage = ref(10)

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredUsers.value.slice(start, end)
})

watch([searchQuery, selectedRole, selectedStatus, selectedVehicleFilter, itemsPerPage], () => {
  currentPage.value = 1
})

// Modal states
const userToEdit = ref<UserWithDetails | null>(null)
const isFormOpen = ref(false)
const isDeleteConfirmOpen = ref(false)
const userToDelete = ref<UserWithDetails | null>(null)
const isStatusConfirmOpen = ref(false)
const userToChangeStatus = ref<UserWithDetails | null>(null)
const targetStatusToApply = ref<AccountStatus>('Active')
const isUpdatingStatus = ref(false)

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}
const toasts = ref<Toast[]>([])
const nextToastId = ref(1)
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  const id = nextToastId.value++
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, 4000)
}

function openDetails(user: UserWithDetails) {
  router.push({
    path: `/users/${user.id}`,
    state: { user: JSON.parse(JSON.stringify(user)) }
  })
}

function openEditUser(user: UserWithDetails) {
  router.push(`/users/${user.id}/edit`)
}

function openDeleteConfirm(user: UserWithDetails) {
  userToDelete.value = user
  isDeleteConfirmOpen.value = true
}

function openStatusConfirm(user: UserWithDetails, newStatus: AccountStatus) {
  userToChangeStatus.value = user
  targetStatusToApply.value = newStatus
  isStatusConfirmOpen.value = true
}

function handleChangePassword(user: UserWithDetails) {
  router.push({
    path: '/users/change-password',
    query: {
      id: user.id,
      name: user.fullName,
      email: user.email,
      role: getRoleLabel(user.role)
    }
  })
}

const confirmUpdateUserStatus = async () => {
  if (!userToChangeStatus.value) return
  isUpdatingStatus.value = true
  const user = userToChangeStatus.value
  const newStatus = targetStatusToApply.value
  await handleUpdateStatus(user.id, newStatus)
  isUpdatingStatus.value = false
  isStatusConfirmOpen.value = false
  userToChangeStatus.value = null
}

const handleDeleteUser = async () => {
  if (!userToDelete.value) return
  const user = userToDelete.value
  isDeleteConfirmOpen.value = false
  try {
    await api.delete(`/users/${user.id}`)
  } catch (error) {
    console.warn('Delete API error, removing locally:', error)
  }
  users.value = users.value.filter(u => u.id !== user.id)
  cachedUsers.value = [...users.value]
  showToast(`Client "${user.fullName}" has been deleted.`, 'success')
  userToDelete.value = null
}

const isApproveConfirmOpen = ref(false)
const userToApprove = ref<UserWithDetails | null>(null)
const isApprovingUser = ref(false)

const openApproveModal = (user: UserWithDetails) => {
  userToApprove.value = user
  isApproveConfirmOpen.value = true
}

const confirmApproveUser = async () => {
  if (!userToApprove.value) return
  const user = userToApprove.value
  isApprovingUser.value = true
  try {
    user.corVerificationStatus = 'Verified'
    user.status = 'Active'
    const res = await api.patch(`/cor-submissions/${user.id}/validate`, { verificationStatus: 2 })
    if (res.data?.isSuccess) {
      showToast(`${user.fullName} approved successfully.`, 'success')
    } else {
      showToast(res.data?.message || `Failed to approve ${user.fullName}.`, 'error')
    }
  } catch (error: any) {
    console.error('Error approving client:', error)
    showToast(error.response?.data?.message || `Error approving ${user.fullName}.`, 'error')
  } finally {
    isApprovingUser.value = false
    isApproveConfirmOpen.value = false
    userToApprove.value = null
  }
}

const handleApproveUser = (user: UserWithDetails) => {
  openApproveModal(user)
}

const handleRejectUser = async (user: UserWithDetails) => {
  const reason = window.prompt(`Enter rejection reason for ${user.fullName} (optional):`, 'Registration documents or information were rejected by admin.')
  if (reason === null) return

  try {
    user.corVerificationStatus = 'Rejected'
    user.status = 'PendingVerification'
    const res = await api.patch(`/cor-submissions/${user.id}/validate`, { verificationStatus: 3, rejectionReason: reason })
    if (res.data?.isSuccess) {
      showToast(`${user.fullName} rejected successfully.`, 'error')
    } else {
      showToast(res.data?.message || `Failed to reject ${user.fullName}.`, 'error')
    }
  } catch (error: any) {
    console.error('Error rejecting client:', error)
    showToast(error.response?.data?.message || `Error rejecting ${user.fullName}.`, 'error')
  }
}

const handleUpdateStatus = async (userId: string, newStatus: AccountStatus) => {
  const targetIndex = users.value.findIndex(u => String(u.id) === String(userId))
  if (targetIndex !== -1 && users.value[targetIndex]) {
    const updatedUser = {
      ...users.value[targetIndex],
      status: newStatus
    }
    users.value[targetIndex] = updatedUser
    cachedUsers.value = [...users.value]
  }

  try {
    const response = await api.put(`/users/${userId}/status`, { status: newStatus })
    if (response.data && response.data.isSuccess) {
      showToast(`Account clearance for user set to ${newStatus}.`, newStatus === 'Active' ? 'success' : 'error')
    }
  } catch (error) {
    console.warn('Status update API error, updated locally:', error)
    showToast(`Account clearance set to ${newStatus}.`, newStatus === 'Active' ? 'success' : 'error')
  }
}

const handleFormSubmit = async (formData: any) => {
  isFormOpen.value = false
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Toast Notifications -->
    <div class="fixed bottom-7 right-7 z-50 flex flex-col gap-2.5 pointer-events-none">
      <Transition v-for="toast in toasts" :key="toast.id" name="toast">
        <div
          :class="[
            'px-4.5 py-3 rounded-xl text-sm font-semibold backdrop-blur-md shadow-lg pointer-events-auto max-w-xs transition-all',
            toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
          ]"
        >
          {{ toast.message }}
        </div>
      </Transition>
    </div>

    <!-- Header & Register Button -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div class="flex flex-col gap-1">
        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight m-0">
          {{ headerTitle }}
        </h1>
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400 m-0 max-w-2xl">
          {{ headerSubtitle }}
        </p>
      </div>

      <div class="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
        <UiButton
          :variant="isSuperAdmin ? 'secondary' : 'primary'"
          size="md"
          @click="router.push('/users/create')"
        >
          <template #icon>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" stroke-linecap="round" stroke-linejoin="round" />
              <line x1="5" y1="12" x2="19" y2="12" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </template>
          <span>Register Client</span>
        </UiButton>

        <UiButton
          v-if="isSuperAdmin"
          variant="primary"
          size="md"
          @click="router.push('/users/create-staff')"
        >
          <template #icon>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </template>
          <span>Register Staff / Admin</span>
        </UiButton>
      </div>
    </div>

    <!-- Overview Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <template v-if="isLoading">
        <SkeletonLoader v-for="i in 4" :key="'stat-skel-'+i" variant="rect" height="110px" style="border-radius: 16px;" />
      </template>
      <template v-else>
        <UiCard v-for="stat in stats" :key="stat.title" hover custom-class="flex items-center justify-between p-5">
          <div class="flex flex-col gap-1">
            <span class="text-2xl font-extrabold text-slate-900 dark:text-white leading-none">
              {{ stat.value }}
            </span>
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {{ stat.title }}
            </span>
          </div>
          <div class="w-12 h-12 rounded-xl flex items-center justify-center text-[#7B1113] dark:text-[#E25C65] bg-red-50 dark:bg-red-950/40">
            <svg v-if="stat.icon === 'people'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke-linecap="round" stroke-linejoin="round" />
              <circle cx="9" cy="7" r="4" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <svg v-if="stat.icon === 'student'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <svg v-if="stat.icon === 'briefcase'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <svg v-if="stat.icon === 'shield'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
        </UiCard>
      </template>
    </div>

    <!-- Filters Bar (Search & Filter Dropdowns & Role Tabs & View Mode & Refresh) -->
    <UserFilters
      v-model:search-query="searchQuery"
      v-model:selected-role="selectedRole"
      v-model:selected-status="selectedStatus"
      v-model:selected-vehicle-filter="selectedVehicleFilter"
      v-model:view-mode="viewMode"
      :total-count="users.length"
      :student-count="studentCount"
      :faculty-count="facultyCount"
      :staff-count="staffCount"
      :guard-count="guardCount"
      :admin-count="adminCount"
      :is-super-admin="isSuperAdmin"
      :is-loading="isLoading"
      @refresh="fetchUsers"
    />

    <!-- Grid View Mode -->
    <template v-if="viewMode === 'grid'">
      <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <SkeletonLoader v-for="i in 6" :key="'grid-skel-'+i" variant="card" style="height: 200px; border-radius: 16px;" />
      </div>
      <div v-else-if="filteredUsers.length === 0" class="py-12 text-center text-slate-500 dark:text-slate-400 font-medium bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
        No records match your criteria.
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <UserCard
          v-for="user in paginatedUsers"
          :key="'card-'+user.id"
          :user="user"
          @view-profile="openDetails"
          @edit="openEditUser"
          @approve="handleApproveUser"
          @reject="handleRejectUser"
          @toggle-status="openStatusConfirm"
          @change-password="handleChangePassword"
          @delete="openDeleteConfirm"
        />
      </div>

      <!-- Pagination Footer for Grid Mode -->
      <TablePagination
        v-if="!isLoading"
        :total-items="filteredUsers.length"
        v-model:current-page="currentPage"
        v-model:items-per-page="itemsPerPage"
      />
    </template>

    <!-- Table List View Mode -->
    <UiCard v-else custom-class="p-0 overflow-hidden">
      <UiTable
        :columns="userColumns"
        :data="paginatedUsers"
        :is-loading="isLoading"
        empty-text="No records match your criteria."
        @row-click="openDetails"
      >
        <template #cell-client="{ item }">
          <div class="flex items-center gap-3">
            <UiAvatar :name="item.fullName" :src="item.profilePictureUrl" size="md" />
            <div class="flex flex-col min-w-0">
              <span class="font-semibold text-slate-900 dark:text-white text-xs leading-snug">
                {{ item.fullName }}
              </span>
              <span class="text-[11.5px] text-slate-500 dark:text-slate-400">
                {{ item.email }}
              </span>
            </div>
          </div>
        </template>

        <template #cell-identifier="{ item }">
          <span class="font-mono font-semibold text-slate-900 dark:text-white">
            {{ getIdentifier(item) }}
          </span>
        </template>

        <template #cell-role="{ item }">
          <span>{{ getRoleLabel(item.role) }}</span>
        </template>

        <template #cell-vehicles="{ item }">
          <span v-if="(item.vehicles || []).length === 0" class="text-slate-400 dark:text-slate-500">None</span>
          <span v-else :title="(item.vehicles || []).map((v: any) => v.plateNumber).join(', ')">
            {{ item.vehicles.length }} {{ item.vehicles.length === 1 ? 'Vehicle' : 'Vehicles' }}
          </span>
        </template>

        <template #cell-status="{ item }">
          <UiStatusText :variant="getStatusBadgeVariant(displayStatus(item))" size="xs">
            {{ formatStatusText(displayStatus(item)) }}
          </UiStatusText>
        </template>

        <template #cell-actions="{ item }">
          <div class="inline-flex items-center gap-1.5" @click.stop>
            <!-- Quick Approve / Reject for Student Pending -->
            <div v-if="item.role === 'Student' && displayStatus(item) === 'Pending'" class="flex items-center gap-1 mr-1">
              <button
                type="button"
                title="Approve Registration"
                @click="handleApproveUser(item)"
                class="px-2.5 py-1 rounded-md bg-emerald-600 text-white font-semibold text-[11px] hover:bg-emerald-700 transition-colors cursor-pointer border-none"
              >
                Approve
              </button>
              <button
                type="button"
                title="Reject Registration"
                @click="handleRejectUser(item)"
                class="px-2.5 py-1 rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 font-semibold text-[11px] hover:bg-rose-100 transition-colors cursor-pointer border border-rose-200/80"
              >
                Reject
              </button>
            </div>

            <!-- Edit Icon -->
            <button
              type="button"
              title="Edit Account"
              @click="openEditUser(item)"
              class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-white transition-colors cursor-pointer border-none bg-transparent"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>

            <!-- Suspend / Unsuspend Icon -->
            <button
              v-if="item.status !== 'Suspended'"
              type="button"
              title="Suspend Account"
              @click="openStatusConfirm(item, 'Suspended')"
              class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer border-none bg-transparent"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" stroke-linecap="round" stroke-linejoin="round" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <button
              v-else
              type="button"
              title="Verify / Unsuspend Account"
              @click="openStatusConfirm(item, 'Active')"
              class="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors cursor-pointer border-none bg-transparent"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>

            <!-- Change Password Icon -->
            <button
              type="button"
              title="Change Password"
              @click="handleChangePassword(item)"
              class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer border-none bg-transparent"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </button>

            <!-- Delete Icon -->
            <button
              type="button"
              title="Delete Account"
              @click="openDeleteConfirm(item)"
              class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer border-none bg-transparent"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M10 11v6M14 11v6" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
        </template>
      </UiTable>

      <!-- Table Pagination Footer -->
      <TablePagination
        v-if="!isLoading"
        :total-items="filteredUsers.length"
        v-model:current-page="currentPage"
        v-model:items-per-page="itemsPerPage"
      />
    </UiCard>

    <!-- User Form Modal -->
    <UserFormModal
      :is-open="isFormOpen"
      :user-to-edit="userToEdit"
      @close="isFormOpen = false"
      @submit="handleFormSubmit"
    />

    <!-- Delete Confirmation Modal -->
    <ConfirmModal
      :is-open="isDeleteConfirmOpen"
      title="Delete Client Account"
      :message="`Are you sure you want to permanently delete account for <strong>${userToDelete?.fullName || 'this user'}</strong>? This action cannot be undone.`"
      confirm-text="Delete Account"
      cancel-text="Cancel"
      variant="danger"
      @confirm="handleDeleteUser"
      @close="isDeleteConfirmOpen = false"
    />

    <!-- Status Change (Suspend / Unsuspend) Modal -->
    <UserStatusModal
      :is-open="isStatusConfirmOpen"
      :user="userToChangeStatus"
      :target-status="targetStatusToApply"
      :is-updating="isUpdatingStatus"
      @confirm="confirmUpdateUserStatus"
      @close="isStatusConfirmOpen = false"
    />

    <!-- Approve User Confirmation Modal -->
    <ConfirmModal
      :is-open="isApproveConfirmOpen"
      title="Approve User Registration"
      :message="`Are you sure you want to approve and verify registration for <strong>${userToApprove?.fullName || 'this user'}</strong>? This will activate their account and grant campus parking access.`"
      confirm-text="Approve User"
      cancel-text="Cancel"
      variant="success"
      :is-submitting="isApprovingUser"
      @confirm="confirmApproveUser"
      @close="isApproveConfirmOpen = false"
    />
  </div>
</template>
