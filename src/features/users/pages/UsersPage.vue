<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { UserWithDetails, UserRole, AccountStatus } from '../types'
import UserDetailModal from '../components/UserDetailModal.vue'
import UserFormModal from '../components/UserFormModal.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import TablePagination from '@/components/ui/TablePagination.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiTable, { type TableColumn } from '@/components/ui/UiTable.vue'
import UiStatusText from '@/components/ui/UiStatusText.vue'

import api from '@/api/axios'
import { cachedUsers } from '@/stores/appCache'

const route = useRoute()
const router = useRouter()
const users = ref<UserWithDetails[]>(cachedUsers.value || [])
const isLoading = ref(!cachedUsers.value)

const userEmail = (localStorage.getItem('parkflow_user_email') || '').toLowerCase().trim()
const isSuperAdmin = computed(() => userEmail.includes('superadmin') || userEmail === 'superadmin@parkflow.com' || !userEmail)

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

function setRoleFilter(role: string) {
  selectedRole.value = role
  const query = { ...route.query }
  if (role === 'all') {
    delete query.role
  } else {
    query.role = role
  }
  router.replace({ query })
}

const applyRouteQueries = () => {
  if (route.query.status) {
    selectedStatus.value = String(route.query.status)
  } else {
    selectedStatus.value = 'all'
  }
  if (route.query.vehicle) {
    selectedVehicleFilter.value = String(route.query.vehicle)
  } else {
    selectedVehicleFilter.value = 'all'
  }
  if (route.query.role) {
    const roleVal = String(route.query.role)
    if ((roleVal === 'AdminStaff' || roleVal === 'Guard' || roleVal === 'Admin') && !isSuperAdmin.value) {
      selectedRole.value = 'all'
    } else {
      selectedRole.value = roleVal
    }
  } else {
    selectedRole.value = 'all'
  }
}

watch(
  () => route.query,
  () => {
    applyRouteQueries()
  },
  { immediate: true }
)

// Detail Modal
const selectedUser = ref<UserWithDetails | null>(null)
const isDetailOpen = ref(false)

// Form Modal
const isFormOpen = ref(false)
const userToEdit = ref<UserWithDetails | null>(null)

// Delete Confirmation
const userToDelete = ref<UserWithDetails | null>(null)
const isDeleteConfirmOpen = ref(false)

// Toast
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

// Stats Computations
const stats = computed(() => {
  const total = users.value.length
  const students = studentCount.value
  const faculty = facultyCount.value
  const staff = staffCount.value
  const guards = guardCount.value

  const list = [
    { title: 'Total Registered', value: total, icon: 'people', gradient: 'linear-gradient(135deg, #6366f1, #818cf8)' },
    { title: 'Students', value: students, icon: 'student', gradient: 'linear-gradient(135deg, #10b981, #34d399)' },
    { title: 'Faculty', value: faculty, icon: 'briefcase', gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' },
    { title: 'Staff (Non-Academic)', value: staff, icon: 'briefcase', gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }
  ]

  if (isSuperAdmin.value) {
    list.push({ title: 'Security Guards', value: guards, icon: 'shield', gradient: 'linear-gradient(135deg, #ef4444, #f87171)' })
  }

  return list
})

const displayStatus = (user: UserWithDetails) => {
  if (user.status === 'Suspended') return 'Suspended'
  if (user.role === 'Guard' || user.role === 'Admin' || (user.role as string) === 'SuperAdmin') return 'Active'
  return user.corVerificationStatus || 'NotSubmitted'
}

function getStatusBadgeVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'Verified' || status === 'Active') return 'success'
  if (status === 'Pending' || status === 'PendingVerification') return 'warning'
  if (status === 'Suspended' || status === 'Rejected') return 'danger'
  if (status === 'NotSubmitted' || status === 'Unverified') return 'neutral'
  return 'neutral'
}

// Dynamic Header Properties
const headerTitle = computed(() => {
  if (selectedRole.value === 'Student') return 'Student Client Directory'
  if (selectedRole.value === 'UniversityStaff') return 'Faculty Client Directory'
  if (selectedRole.value === 'NonAcademicPersonnel') return 'Staff Client Directory'
  if (selectedRole.value === 'NAPA' || selectedRole.value === 'staff') return 'Staff & Faculty Directory'
  if (selectedRole.value === 'AdminStaff') return 'Staff & Admin Directory'
  if (selectedRole.value === 'Guard') return 'Security Guards Directory'
  if (selectedRole.value === 'Admin') return 'System Administrators Directory'
  return 'Client & User Account Directory'
})

const headerSubtitle = computed(() => {
  if (selectedRole.value === 'Student') return 'Manage registered student accounts, active COR submission verifications, and class schedule parking passes.'
  if (selectedRole.value === 'UniversityStaff') return 'Manage faculty accounts, department assignments, and vehicle clearance.'
  if (selectedRole.value === 'NonAcademicPersonnel') return 'Manage non-academic personnel accounts, administrative departments, and vehicle clearance.'
  if (selectedRole.value === 'NAPA' || selectedRole.value === 'staff') return 'Manage staff and faculty accounts, department assignments, and vehicle clearance.'
  if (selectedRole.value === 'AdminStaff') return 'Manage registered campus security guards and system administrator accounts.'
  if (selectedRole.value === 'Guard') return 'Manage active gate security guards, assigned gates, and RFID scanner permissions.'
  if (selectedRole.value === 'Admin') return 'Manage system administrators and elevated system privileges.'
  return 'Manage registered client accounts, pending COR registrations, and system privileges.'
})

// Filtered Users list
const isAdminStaffView = computed(() => selectedRole.value === 'AdminStaff' || selectedRole.value === 'Guard' || selectedRole.value === 'Admin')

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
      user.role === selectedRole.value ||
      ((selectedRole.value === 'staff' || selectedRole.value === 'NAPA') && (user.role === 'UniversityStaff' || user.role === 'NonAcademicPersonnel')) ||
      (selectedRole.value === 'AdminStaff' && isSuperAdmin.value && (user.role === 'Guard' || user.role === 'Admin' || (user.role as string) === 'SuperAdmin'))

    const matchesStatus =
      selectedStatus.value === 'all' ||
      displayStatus(user) === selectedStatus.value

    const hasVehicles = user.vehicles && user.vehicles.length > 0
    const matchesVehicle =
      selectedVehicleFilter.value === 'all' ||
      (selectedVehicleFilter.value === 'with-vehicle' && hasVehicles) ||
      (selectedVehicleFilter.value === 'no-vehicle' && !hasVehicles)

    return matchesSearch && matchesRole && matchesStatus && matchesVehicle
  })
})

// Pagination State
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

const getIdentifier = (user: UserWithDetails) => {
  if (user.student?.studentNumber) return user.student.studentNumber
  if (user.personnel?.idCardNumber) return user.personnel.idCardNumber
  if (user.guard?.assignedGate) return `Gate ${user.guard.assignedGate}`
  return 'System Admin'
}

const getRoleLabel = (role: UserRole) => {
  switch (role) {
    case 'Student':
      return 'Student'
    case 'UniversityStaff':
      return 'Faculty'
    case 'NonAcademicPersonnel':
      return 'Staff'
    case 'Guard':
      return 'Security Guard'
    case 'Admin':
      return 'Administrator'
    default:
      return role
  }
}

const formatStatusText = (status: string) => {
  if (status === 'NotSubmitted') return 'Not Submitted'
  if (status === 'Unverified') return 'Not Submitted'
  if (status === 'PendingVerification') return 'Pending'
  return status
}

// Actions
const openDetails = (user: UserWithDetails) => {
  selectedUser.value = user
  isDetailOpen.value = true
}

const openEditUser = (user: UserWithDetails) => {
  router.push({
    path: `/users/${user.id}/edit`,
    state: { user: JSON.parse(JSON.stringify(user)) }
  })
}

const openDeleteConfirm = (user: UserWithDetails) => {
  userToDelete.value = user
  isDeleteConfirmOpen.value = true
}

// Status Change (Suspend / Unsuspend) Confirmation State
const userToChangeStatus = ref<UserWithDetails | null>(null)
const targetStatusToApply = ref<AccountStatus>('Suspended')
const isStatusConfirmOpen = ref(false)
const isUpdatingStatus = ref(false)

const openStatusConfirm = (user: UserWithDetails, targetStatus: AccountStatus) => {
  userToChangeStatus.value = user
  targetStatusToApply.value = targetStatus
  isStatusConfirmOpen.value = true
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

const handleApproveUser = async (user: UserWithDetails) => {
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
  }
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
    if (selectedUser.value && String(selectedUser.value.id) === String(userId)) {
      selectedUser.value.status = newStatus
    }
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
  if (formData.id) {
    try {
      await api.put(`/users/${formData.id}`, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName || null,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        role: formData.role,
        status: formData.status,
        student: formData.role === 'Student' ? {
          studentNumber: formData.studentNumber,
          course: formData.course,
          section: formData.section,
          yearLevel: formData.yearLevel
        } : null,
        personnel: (formData.role === 'UniversityStaff' || formData.role === 'NonAcademicPersonnel') ? {
          idCardNumber: formData.idCardNumber,
          department: formData.department
        } : null,
        guard: formData.role === 'Guard' ? {
          assignedGate: formData.assignedGate
        } : null
      })
    } catch (error) {
      console.warn('Edit API error, applying locally:', error)
    }
    const index = users.value.findIndex((u) => u.id === formData.id)
    if (index !== -1 && users.value[index]) {
      const updatedUser: UserWithDetails = {
        ...users.value[index],
        firstName: formData.firstName,
        lastName: formData.lastName,
        fullName: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        role: formData.role,
        status: formData.status,
        student: formData.role === 'Student' ? {
          studentNumber: formData.studentNumber,
          course: formData.course,
          section: formData.section,
          yearLevel: formData.yearLevel
        } : undefined,
        personnel: (formData.role === 'UniversityStaff' || formData.role === 'NonAcademicPersonnel') ? {
          idCardNumber: formData.idCardNumber,
          department: formData.department
        } : undefined,
        guard: formData.role === 'Guard' ? {
          assignedGate: formData.assignedGate
        } : undefined
      }
      users.value[index] = updatedUser
    }
    isFormOpen.value = false
    showToast('Client account updated successfully.', 'success')
    return
  } else {
    const newUser: UserWithDetails = {
      id: String(users.value.length + 1),
      firstName: formData.firstName,
      lastName: formData.lastName,
      fullName: `${formData.firstName} ${formData.lastName}`,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
      role: formData.role,
      status: formData.status,
      corVerificationStatus: 'Verified',
      authProvider: 'Manual',
      createdAt: new Date().toISOString(),
      student: formData.role === 'Student' ? {
        studentNumber: formData.studentNumber,
        course: formData.course,
        section: formData.section,
        yearLevel: formData.yearLevel
      } : undefined,
      personnel: (formData.role === 'UniversityStaff' || formData.role === 'NonAcademicPersonnel') ? {
        idCardNumber: formData.idCardNumber,
        department: formData.department
      } : undefined,
      guard: formData.role === 'Guard' ? {
        assignedGate: formData.assignedGate
      } : undefined,
      vehicles: []
    }
    users.value.push(newUser)
  }
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
    <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      <div class="flex flex-col gap-1">
        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight m-0">
          {{ headerTitle }}
        </h1>
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400 m-0 max-w-2xl">
          {{ headerSubtitle }}
        </p>
      </div>

      <div class="flex items-center gap-3 flex-wrap">
        <!-- View Mode Switcher (Cards Grid vs Table List) -->
        <div class="flex items-center p-1 bg-[#e2e8f0] dark:bg-slate-800/90 border border-[#cbd5e1] dark:border-slate-700 rounded-[10px] gap-1 flex-shrink-0">
          <button
            type="button"
            class="flex items-center gap-2 px-3.5 py-1.5 rounded-[7px] text-xs font-semibold transition-all cursor-pointer border-none whitespace-nowrap"
            :class="viewMode === 'grid' ? 'bg-[#4f46e5] text-white shadow-md shadow-indigo-500/30 font-bold' : 'text-[#475569] dark:text-slate-300 hover:text-[#1e293b] dark:hover:text-white bg-transparent'"
            @click="viewMode = 'grid'"
            title="Cards Grid Mode"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
            <span>Cards Grid</span>
          </button>
          <button
            type="button"
            class="flex items-center gap-2 px-3.5 py-1.5 rounded-[7px] text-xs font-semibold transition-all cursor-pointer border-none whitespace-nowrap"
            :class="viewMode === 'table' ? 'bg-[#4f46e5] text-white shadow-md shadow-indigo-500/30 font-bold' : 'text-[#475569] dark:text-slate-300 hover:text-[#1e293b] dark:hover:text-white bg-transparent'"
            @click="viewMode = 'table'"
            title="Table List Mode"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <line x1="4" y1="6" x2="20" y2="6" stroke-linecap="round" />
              <line x1="4" y1="12" x2="20" y2="12" stroke-linecap="round" />
              <line x1="4" y1="18" x2="20" y2="18" stroke-linecap="round" />
            </svg>
            <span>Table List</span>
          </button>
        </div>

        <router-link
          v-if="!isAdminStaffView || isSuperAdmin"
          :to="isAdminStaffView ? '/users/create-staff' : '/users/create'"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-xs hover:shadow-md transition-all no-underline flex-shrink-0"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19" stroke-linecap="round" stroke-linejoin="round" />
            <line x1="5" y1="12" x2="19" y2="12" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span>{{ isAdminStaffView ? 'Register Staff / Admin' : 'Register Client Account' }}</span>
        </router-link>
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
            <span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {{ stat.title }}
            </span>
          </div>
          <div
            class="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-xs flex-shrink-0"
            :style="{ background: stat.gradient }"
          >
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

    <!-- Account Type Category Filter Tabs -->
    <div class="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar flex-wrap">
      <button
        type="button"
        @click="setRoleFilter('all')"
        class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border"
        :class="selectedRole === 'all' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'"
      >
        All Accounts ({{ users.length }})
      </button>

      <button
        type="button"
        @click="setRoleFilter('Student')"
        class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border"
        :class="selectedRole === 'Student' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'"
      >
        Students ({{ studentCount }})
      </button>

      <button
        type="button"
        @click="setRoleFilter('UniversityStaff')"
        class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border"
        :class="selectedRole === 'UniversityStaff' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'"
      >
        Faculty ({{ facultyCount }})
      </button>

      <button
        type="button"
        @click="setRoleFilter('NonAcademicPersonnel')"
        class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border"
        :class="selectedRole === 'NonAcademicPersonnel' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'"
      >
        Staff ({{ staffCount }})
      </button>

      <button
        v-if="isSuperAdmin"
        type="button"
        @click="setRoleFilter('Guard')"
        class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border"
        :class="selectedRole === 'Guard' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'"
      >
        Security Guards ({{ guardCount }})
      </button>
    </div>

    <!-- Filters Bar (Search & Filter Dropdowns) -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <!-- Search Input -->
      <div class="relative flex-1 max-w-md">
        <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" stroke-linecap="round" stroke-linejoin="round" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by name, email, ID number..."
          class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
        />
      </div>

      <!-- Filter Dropdowns (Account Type, Status & Vehicle Filter) -->
      <div class="flex items-center gap-3 sm:ml-auto flex-wrap">
        <!-- Account Type Filter -->
        <select
          v-model="selectedRole"
          @change="router.replace({ query: { ...route.query, role: selectedRole === 'all' ? undefined : selectedRole } })"
          class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer transition-all"
        >
          <option value="all">All Account Types ({{ users.length }})</option>
          <option value="Student">Students ({{ studentCount }})</option>
          <option value="UniversityStaff">Faculty ({{ facultyCount }})</option>
          <option value="NonAcademicPersonnel">Staff (Non-Academic) ({{ staffCount }})</option>
          <option v-if="isSuperAdmin" value="Guard">Security Guards ({{ guardCount }})</option>
          <option v-if="isSuperAdmin" value="Admin">Administrators ({{ adminCount }})</option>
        </select>

        <!-- Status Filter -->
        <select
          v-model="selectedStatus"
          @change="router.replace({ query: { ...route.query, status: selectedStatus === 'all' ? undefined : selectedStatus } })"
          class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer transition-all"
        >
          <option value="all">All Statuses</option>
          <option value="Pending">Pending Verification</option>
          <option value="Verified">Approved / Verified</option>
          <option value="NotSubmitted">Not Submitted</option>
          <option value="Rejected">Rejected</option>
          <option value="Suspended">Suspended</option>
        </select>

        <!-- New Vehicle Clearance Filter -->
        <select
          v-model="selectedVehicleFilter"
          @change="router.replace({ query: { ...route.query, vehicle: selectedVehicleFilter === 'all' ? undefined : selectedVehicleFilter } })"
          class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer transition-all"
        >
          <option value="all">All Vehicles</option>
          <option value="with-vehicle">With Registered Vehicle</option>
          <option value="no-vehicle">No Vehicle Registered</option>
        </select>
      </div>
    </div>

    <!-- Grid View Mode -->
    <template v-if="viewMode === 'grid'">
      <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <SkeletonLoader v-for="i in 6" :key="'grid-skel-'+i" variant="card" style="height: 200px; border-radius: 16px;" />
      </div>
      <div v-else-if="filteredUsers.length === 0" class="py-12 text-center text-slate-500 dark:text-slate-400 font-medium bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
        No records match your criteria.
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <UiCard
          v-for="user in paginatedUsers"
          :key="'card-'+user.id"
          hover
          custom-class="p-5 flex flex-col justify-between space-y-4 cursor-pointer hover:border-blue-500/40"
          @click="openDetails(user)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <UiAvatar :name="user.fullName" :src="user.profilePictureUrl" size="lg" />
              <div class="flex flex-col min-w-0">
                <h4 class="font-bold text-slate-900 dark:text-white text-sm truncate leading-snug">
                  {{ user.fullName }}
                </h4>
                <span class="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {{ user.email }}
                </span>
                <span class="text-[11px] font-mono font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                  ID: {{ getIdentifier(user) }}
                </span>
              </div>
            </div>
            <UiBadge :variant="getStatusBadgeVariant(displayStatus(user))" size="xs" class="flex-shrink-0">
              {{ formatStatusText(displayStatus(user)) }}
            </UiBadge>
          </div>

          <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <span class="text-slate-400 dark:text-slate-500 text-[10.5px] uppercase font-bold tracking-wider block">Role</span>
              <span class="font-medium text-slate-700 dark:text-slate-300">{{ getRoleLabel(user.role) }}</span>
            </div>
            <div>
              <span class="text-slate-400 dark:text-slate-500 text-[10.5px] uppercase font-bold tracking-wider block">Vehicles</span>
              <span class="font-medium text-slate-700 dark:text-slate-300">
                {{ (user.vehicles || []).length === 0 ? 'None' : `${user.vehicles.length} Registered` }}
              </span>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800" @click.stop>
            <button
              type="button"
              class="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline border-none bg-transparent cursor-pointer p-0"
              @click="openDetails(user)"
            >
              View Profile
            </button>

            <div class="flex items-center gap-1">
              <!-- Quick Approve / Reject for Student Pending -->
              <template v-if="user.role === 'Student' && displayStatus(user) === 'Pending'">
                <button
                  type="button"
                  title="Approve Registration"
                  @click="handleApproveUser(user)"
                  class="px-2 py-1 rounded-md bg-emerald-600 text-white font-semibold text-[11px] hover:bg-emerald-700 transition-colors cursor-pointer border-none mr-1"
                >
                  Approve
                </button>
                <button
                  type="button"
                  title="Reject Registration"
                  @click="handleRejectUser(user)"
                  class="px-2 py-1 rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 font-semibold text-[11px] hover:bg-rose-100 transition-colors cursor-pointer border border-rose-200/80 mr-1"
                >
                  Reject
                </button>
              </template>

              <button
                type="button"
                title="Edit Account"
                @click="openEditUser(user)"
                class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-white transition-colors cursor-pointer border-none bg-transparent"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>

              <button
                v-if="user.status !== 'Suspended'"
                type="button"
                title="Suspend Account"
                @click="openStatusConfirm(user, 'Suspended')"
                class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer border-none bg-transparent"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" stroke-linecap="round" stroke-linejoin="round" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
              <button
                v-else
                type="button"
                title="Verify / Unsuspend Account"
                @click="openStatusConfirm(user, 'Active')"
                class="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors cursor-pointer border-none bg-transparent"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>

              <button
                type="button"
                title="Delete Account"
                @click="openDeleteConfirm(user)"
                class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer border-none bg-transparent"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M10 11v6M14 11v6" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </UiCard>
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

    <!-- User Detail Modal -->
    <UserDetailModal
      :user="selectedUser"
      :is-open="isDetailOpen"
      @close="isDetailOpen = false"
      @update-status="handleUpdateStatus"
    />

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

    <!-- Status Change (Suspend / Unsuspend) Confirmation Modal -->
    <ConfirmModal
      :is-open="isStatusConfirmOpen"
      :title="targetStatusToApply === 'Suspended' ? 'Suspend Client Account' : 'Unsuspend / Reactivate Account'"
      :message="targetStatusToApply === 'Suspended' ? `Are you sure you want to suspend account clearance for <strong>${userToChangeStatus?.fullName || 'this user'}</strong>? They will be unable to access campus parking until unsuspended.` : `Are you sure you want to reactivate clearance for <strong>${userToChangeStatus?.fullName || 'this user'}</strong>? This will restore campus parking access.`"
      :confirm-text="targetStatusToApply === 'Suspended' ? 'Suspend Account' : 'Unsuspend Account'"
      cancel-text="Cancel"
      :variant="targetStatusToApply === 'Suspended' ? 'warning' : 'success'"
      :is-submitting="isUpdatingStatus"
      @confirm="confirmUpdateUserStatus"
      @close="isStatusConfirmOpen = false"
    />
  </div>
</template>
