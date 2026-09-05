<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { UserWithDetails, UserRole, AccountStatus } from '../types'
import UserDetailModal from '../components/UserDetailModal.vue'
import UserFormModal from '../components/UserFormModal.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import api from '@/api/axios'

const route = useRoute()
const users = ref<UserWithDetails[]>([])
const isLoading = ref(true)

const userEmail = (localStorage.getItem('parkflow_user_email') || '').toLowerCase().trim()
const isSuperAdmin = computed(() => userEmail.includes('superadmin') || userEmail === 'superadmin@parkflow.com' || !userEmail)

const fetchUsers = async () => {
  isLoading.value = true
  try {
    const response = await api.get('/users')
    if (response.data && response.data.isSuccess) {
      users.value = response.data.data
    } else {
      console.error('Failed to retrieve users:', response.data?.message)
    }
  } catch (error) {
    console.error('Error fetching users:', error)
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

// Filtering state
const searchQuery = ref('')
const selectedRole = ref<string>('all')
const selectedStatus = ref<string>('all')

const applyRouteQueries = () => {
  if (route.query.status) {
    selectedStatus.value = String(route.query.status)
  } else {
    selectedStatus.value = 'all'
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
  const students = users.value.filter((u) => u.role === 'Student').length
  const personnel = users.value.filter((u) => u.role === 'UniversityStaff' || u.role === 'NonAcademicPersonnel').length
  const guards = users.value.filter((u) => u.role === 'Guard').length

  return [
    { title: 'Total Registered', value: total, icon: 'people', gradient: 'linear-gradient(135deg, #6366f1, #818cf8)' },
    { title: 'Students', value: students, icon: 'student', gradient: 'linear-gradient(135deg, #10b981, #34d399)' },
    { title: 'Faculty & Staff', value: personnel, icon: 'briefcase', gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)' },
    { title: 'Security Guards', value: guards, icon: 'shield', gradient: 'linear-gradient(135deg, #ef4444, #f87171)' }
  ]
})

const displayStatus = (user: UserWithDetails) => {
  if (user.status === 'Suspended') return 'Suspended'
  if (user.role !== 'Student') return 'Active'
  return user.corVerificationStatus || 'Verified'
}

// Filtered Users list
const isAdminStaffView = computed(() => selectedRole.value === 'AdminStaff')

const filteredUsers = computed(() => {
  return users.value.filter((user) => {
    // Security restriction: Only SuperAdmin can see Admin/Staff/Guard user accounts
    if (!isSuperAdmin.value && (user.role === 'Guard' || user.role === 'Admin' || (user.role as string) === 'SuperAdmin')) {
      return false
    }

    const matchesSearch =
      user.fullName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      user.student?.studentNumber.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      user.personnel?.idCardNumber.toLowerCase().includes(searchQuery.value.toLowerCase())

    const matchesRole =
      selectedRole.value === 'all' ||
      user.role === selectedRole.value ||
      ((selectedRole.value === 'staff' || selectedRole.value === 'NAPA') && (user.role === 'UniversityStaff' || user.role === 'NonAcademicPersonnel')) ||
      (selectedRole.value === 'AdminStaff' && isSuperAdmin.value && (user.role === 'Guard' || user.role === 'Admin' || (user.role as string) === 'SuperAdmin'))

    const matchesStatus =
      selectedStatus.value === 'all' ||
      displayStatus(user) === selectedStatus.value

    return matchesSearch && matchesRole && matchesStatus
  })
})

const getInitials = (user: UserWithDetails) => {
  return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
}

// Helpers for displaying specific IDs
const getIdentifier = (user: UserWithDetails) => {
  if (user.student) return user.student.studentNumber
  if (user.personnel) return user.personnel.idCardNumber
  if (user.guard) return `Gate ${user.guard.assignedGate}`
  return 'System Admin'
}

const getRoleLabel = (role: UserRole) => {
  switch (role) {
    case 'UniversityStaff':
      return 'Faculty'
    case 'NonAcademicPersonnel':
      return 'NAP'
    case 'Guard':
      return 'Security Guard'
    default:
      return role
  }
}

const formatStatusText = (status: string) => {
  if (status === 'NotSubmitted') return 'Not Submitted'
  return status
}

// Actions
const openDetails = (user: UserWithDetails) => {
  selectedUser.value = user
  isDetailOpen.value = true
}

const openAddUser = () => {
  userToEdit.value = null
  isFormOpen.value = true
}

const openEditUser = (user: UserWithDetails) => {
  userToEdit.value = user
  isFormOpen.value = true
}

const openDeleteConfirm = (user: UserWithDetails) => {
  userToDelete.value = user
  isDeleteConfirmOpen.value = true
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
  try {
    user.corVerificationStatus = 'Rejected'
    user.status = 'PendingVerification'
    const res = await api.patch(`/cor-submissions/${user.id}/validate`, { verificationStatus: 3 })
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
  try {
    const response = await api.put(`/users/${userId}/status`, { status: newStatus })
    if (response.data && response.data.isSuccess) {
      await fetchUsers()
      if (selectedUser.value && selectedUser.value.id === userId) {
        const updated = users.value.find(u => u.id === userId)
        if (updated) {
          selectedUser.value.status = updated.status
        }
      }
    } else {
      console.error('Failed to update status:', response.data?.message)
    }
  } catch (error) {
    console.error('Error updating status:', error)
  }
}

const handleFormSubmit = async (formData: any) => {
  if (formData.id) {
    // Edit Mode — call API
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
    // Apply locally regardless
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
    // Add Mode
    const newUser: UserWithDetails = {
      id: String(users.value.length + 1),
      firstName: formData.firstName,
      lastName: formData.lastName,
      fullName: `${formData.firstName} ${formData.lastName}`,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
      role: formData.role,
      status: formData.status,
      corVerificationStatus: 'NotSubmitted',
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
  <div class="users-view">
    <!-- Toast Notifications -->
    <div class="toast-stack">
      <Transition v-for="toast in toasts" :key="toast.id" name="toast">
        <div class="toast-item" :class="`toast-item--${toast.type}`">
          {{ toast.message }}
        </div>
      </Transition>
    </div>
    <!-- Header -->
    <!-- Header -->
    <div class="users-header">
      <div class="users-header__left">
        <h1 class="users-title">{{ isAdminStaffView ? 'Staff & Admin Directory' : 'Client Directory' }}</h1>
        <p class="users-subtitle">
          {{ isAdminStaffView ? 'Manage registered campus security guards and system administrator accounts.' : 'Manage registered client accounts, pending COR registrations, and system privileges.' }}
        </p>
      </div>
      <router-link v-if="!isAdminStaffView || isSuperAdmin" :to="isAdminStaffView ? '/users/create-staff' : '/users/create'" class="add-user-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19" stroke-linecap="round" stroke-linejoin="round" />
          <line x1="5" y1="12" x2="19" y2="12" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        {{ isAdminStaffView ? 'Register Staff / Admin' : 'Register Client Account' }}
      </router-link>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <template v-if="isLoading">
        <SkeletonLoader v-for="i in 4" :key="'stat-skel-'+i" variant="rect" height="120px" style="border-radius: var(--radius-card);" />
      </template>
      <template v-else>
        <div v-for="stat in stats" :key="stat.title" class="stat-card">
          <div class="stat-card__left">
            <span class="stat-card__value">{{ stat.value }}</span>
            <span class="stat-card__title">{{ stat.title }}</span>
          </div>
          <div class="stat-card__icon" :style="{ background: stat.gradient }">
            <!-- People Icon -->
            <svg v-if="stat.icon === 'people'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke-linecap="round" stroke-linejoin="round" />
              <circle cx="9" cy="7" r="4" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <!-- Student Icon -->
            <svg v-if="stat.icon === 'student'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <!-- Briefcase Icon -->
            <svg v-if="stat.icon === 'briefcase'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <!-- Shield Icon -->
            <svg v-if="stat.icon === 'shield'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
        </div>
      </template>
    </div>

    <!-- Filters Bar -->
    <div class="filters-bar">
      <!-- Search Input -->
      <div class="search-wrapper">
        <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" stroke-linecap="round" stroke-linejoin="round" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <input v-model="searchQuery" type="text" placeholder="Search by name, email, ID number..." class="search-input" />
      </div>

      <!-- Filter Dropdowns -->
      <div class="filters-group">
        <div class="select-wrapper">
          <select v-model="selectedRole" class="filter-select">
            <option value="all">All Roles</option>
            <option value="Student">Student</option>
            <option value="staff">Staff/Faculty</option>
            <option v-if="isSuperAdmin" value="AdminStaff">Admin / Staff</option>
            <option v-if="isSuperAdmin" value="Guard">Security Guard</option>
            <option v-if="isSuperAdmin" value="Admin">Administrator</option>
          </select>
        </div>

        <div class="select-wrapper">
          <select v-model="selectedStatus" class="filter-select">
            <option value="all">All Statuses</option>
            <option value="Pending">Pending Verification</option>
            <option value="Verified">Approved / Verified</option>
            <option value="NotSubmitted">Not Submitted</option>
            <option value="Rejected">Rejected</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Users Table Container -->
    <div class="table-card">
      <div class="table-responsive">
        <table class="users-table">
          <thead>
            <tr>
              <th>{{ isAdminStaffView ? 'Staff Member' : 'Client' }}</th>
              <th>Identification</th>
              <th>Classification</th>
              <th v-if="!isAdminStaffView">Vehicles</th>
              <th v-if="!isAdminStaffView">Registration Status</th>
              <th class="actions-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="isLoading">
              <tr v-for="i in 6" :key="'skel-'+i">
                <td :colspan="isAdminStaffView ? 4 : 6" style="padding: 16px;">
                  <SkeletonLoader variant="table-row" :columns="isAdminStaffView ? 4 : 6" />
                </td>
              </tr>
            </template>
            <template v-else-if="filteredUsers.length === 0">
              <tr>
                <td :colspan="isAdminStaffView ? 4 : 6" class="empty-state">No records match your criteria.</td>
              </tr>
            </template>
            <template v-else>
              <tr v-for="user in filteredUsers" :key="user.id" class="user-row" @click="openDetails(user)">
              <td>
                <div class="user-cell">
                  <div class="user-cell__avatar">
                    <img v-if="user.profilePictureUrl" :src="user.profilePictureUrl" :alt="user.fullName" />
                    <span v-else>{{ getInitials(user) }}</span>
                  </div>
                  <div class="user-cell__info">
                    <span class="user-cell__name">{{ user.fullName }}</span>
                    <span class="user-cell__email">{{ user.email }}</span>
                  </div>
                </div>
              </td>
              <td>
                <span class="id-text">{{ getIdentifier(user) }}</span>
              </td>
              <td>
                <span class="role-badge" :class="'role-badge--' + user.role.toLowerCase()">
                  {{ getRoleLabel(user.role) }}
                </span>
              </td>
              <td v-if="!isAdminStaffView">
                <div class="vehicles-cell">
                  <span v-if="user.vehicles.length === 0" class="vehicles-empty">None</span>
                  <span v-else class="vehicles-count" :title="user.vehicles.map(v => v.plateNumber).join(', ')">
                    {{ user.vehicles.length }} {{ user.vehicles.length === 1 ? 'Vehicle' : 'Vehicles' }}
                  </span>
                </div>
              </td>
              <td v-if="!isAdminStaffView">
                <span class="status-pill" :class="'status-pill--' + displayStatus(user).toLowerCase()">
                  {{ formatStatusText(displayStatus(user)) }}
                </span>
              </td>
              <td class="actions-cell" @click.stop>
                <div class="actions-group">
                  <!-- Pending Quick Approve / Reject (Students Only) -->
                  <div v-if="user.role === 'Student' && displayStatus(user) === 'Pending'" class="table-pending-actions">
                    <button class="table-btn table-btn--approve" title="Approve Registration" @click="handleApproveUser(user)">
                      Approve
                    </button>
                    <button class="table-btn table-btn--reject" title="Reject Registration" @click="handleRejectUser(user)">
                      Reject
                    </button>
                  </div>

                  <button class="action-icon-btn" title="Edit Account" @click="openEditUser(user)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </button>
                  <button
                    v-if="user.status !== 'Suspended'"
                    class="action-icon-btn action-icon-btn--suspend"
                    title="Suspend Account"
                    @click="handleUpdateStatus(user.id, 'Suspended')"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10" stroke-linecap="round" stroke-linejoin="round" />
                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </button>
                  <button
                    v-else
                    class="action-icon-btn action-icon-btn--verify"
                    title="Verify / Unsuspend Account"
                    @click="handleUpdateStatus(user.id, 'Active')"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </button>
                  <button
                    class="action-icon-btn action-icon-btn--delete"
                    title="Delete Account"
                    @click="openDeleteConfirm(user)"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6" stroke-linecap="round" stroke-linejoin="round" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke-linecap="round" stroke-linejoin="round" />
                      <path d="M10 11v6M14 11v6" stroke-linecap="round" stroke-linejoin="round" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- User Detail sheet -->
    <UserDetailModal
      :user="selectedUser"
      :is-open="isDetailOpen"
      @close="isDetailOpen = false"
      @update-status="handleUpdateStatus"
    />

    <!-- User Form modal -->
    <UserFormModal
      :is-open="isFormOpen"
      :user-to-edit="userToEdit"
      @close="isFormOpen = false"
      @submit="handleFormSubmit"
    />

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="isDeleteConfirmOpen && userToDelete" class="modal-backdrop" @click="isDeleteConfirmOpen = false">
          <div class="modal-confirm" @click.stop>
            <div class="modal-confirm__icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
                <polyline points="3 6 5 6 21 6" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            <h3 class="modal-confirm__title">Delete Client Account</h3>
            <p class="modal-confirm__body">
              Are you sure you want to permanently delete
              <strong>{{ userToDelete.fullName }}</strong>?
              This action cannot be undone.
            </p>
            <div class="modal-confirm__footer">
              <button class="modal-btn modal-btn--cancel" @click="isDeleteConfirmOpen = false">Cancel</button>
              <button class="modal-btn modal-btn--delete" @click="handleDeleteUser">Delete Account</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.users-view {
  animation: fadeSlideUp 0.4s ease both;
}

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.users-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.users-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.users-subtitle {
  font-size: 14px;
  color: var(--color-muted);
  margin: 4px 0 0 0;
}

/* Status Quick Tabs */
.status-quick-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.status-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;
}

.status-tab:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
}

.status-tab.active {
  background: var(--color-primary);
  border-color: var(--color-primary-dark);
  color: #fff;
}

.status-tab--pending.active {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.3);
  color: #f59e0b;
}

.status-tab--approved.active {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.3);
  color: #10b981;
}

.status-tab--rejected.active {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.tab-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
  line-height: 1;
}

.tab-badge--pending {
  background: #f59e0b;
  color: #000;
}

/* Table Actions */
.table-pending-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.table-btn {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: opacity 150ms ease;
}

.table-btn--approve {
  background: #10b981;
  color: #fff;
}
.table-btn--approve:hover {
  opacity: 0.9;
}

.table-btn--reject {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}
.table-btn--reject:hover {
  background: rgba(239, 68, 68, 0.25);
}

.add-user-btn {
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-button);
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px var(--color-glow);
  transition: background 150ms ease, transform 150ms ease;
}

.add-user-btn:hover {
  background: #dc2626;
  transform: translateY(-1px);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: var(--shadow-soft);
  transition: transform 200ms ease, box-shadow 200ms ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card);
}

.stat-card__left {
  display: flex;
  flex-direction: column;
}

.stat-card__value {
  font-size: 28px;
  font-weight: 800;
  color: var(--color-text);
}

.stat-card__title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 4px;
}

.stat-card__icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

/* Filters Bar */
.filters-bar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .filters-bar {
    flex-direction: column;
  }
}

.search-wrapper {
  position: relative;
  flex: 1;
  max-width: 420px;
}

@media (max-width: 768px) {
  .search-wrapper {
    max-width: 100%;
  }
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-button);
  padding: 10px 14px 10px 42px;
  font-size: 14px;
  color: var(--color-text);
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-glow);
}

.filters-group {
  display: flex;
  gap: 12px;
}

.select-wrapper {
  position: relative;
}

.filter-select {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-button);
  padding: 10px 36px 10px 14px;
  font-size: 14px;
  color: var(--color-text);
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23b5bac1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
  transition: border-color 150ms ease;
}

.filter-select:hover {
  border-color: var(--color-muted);
}

.filter-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

/* Table Card */
.table-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
  overflow: hidden;
}

.table-responsive {
  overflow-x: auto;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.users-table th {
  padding: 16px 24px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-muted);
  letter-spacing: 1px;
  border-bottom: 1px solid var(--color-border);
}

.user-row {
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background 150ms ease;
}

.user-row:hover {
  background: var(--color-surface-lighter);
}

.user-row:last-child {
  border-bottom: none;
}

.users-table td {
  padding: 16px 24px;
  vertical-align: middle;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 220px;
}

.user-cell__avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), #fb7185);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
  overflow: hidden;
}

.user-cell__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-cell__info {
  display: flex;
  flex-direction: column;
}

.user-cell__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.user-cell__email {
  font-size: 12px;
  color: var(--color-muted);
}

.id-text {
  font-family: monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

/* Badges */
.role-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
}

.role-badge--admin {
  background: rgba(248, 113, 113, 0.1);
  color: var(--color-primary);
}

.role-badge--student {
  background: rgba(35, 165, 90, 0.1);
  color: var(--color-success);
}

.role-badge--guard {
  background: rgba(96, 165, 250, 0.1);
  color: #60a5fa;
}

.role-badge--universitystaff,
.role-badge--nonacademicpersonnel {
  background: rgba(245, 158, 11, 0.1);
  color: var(--color-warning);
}

.vehicles-count {
  font-size: 13px;
  color: var(--color-text);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  padding: 2px 8px;
  border-radius: 6px;
}

.vehicles-empty {
  font-size: 13px;
  color: var(--color-muted);
}

/* Status Pill */
.status-pill {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
}

.status-pill--verified {
  background: rgba(35, 165, 90, 0.12);
  color: var(--color-success);
}

.status-pill--pendingverification,
.status-pill--pending {
  background: rgba(240, 178, 50, 0.12);
  color: var(--color-warning);
}

.status-pill--notsubmitted,
.status-pill--rejected {
  background: rgba(248, 113, 113, 0.12);
  color: var(--color-danger);
}

.status-pill--suspended {
  background: rgba(248, 113, 113, 0.12);
  color: var(--color-danger);
}

.actions-header {
  text-align: right;
}

.actions-cell {
  text-align: right;
}

.actions-group {
  display: inline-flex;
  gap: 8px;
}

.action-icon-btn {
  background: transparent;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms ease;
}

.action-icon-btn:hover {
  background: var(--color-surface-lighter);
  color: var(--color-text);
}

.action-icon-btn--suspend:hover {
  background: rgba(248, 113, 113, 0.1);
  color: var(--color-danger);
}

.action-icon-btn--verify:hover {
  background: rgba(35, 165, 90, 0.1);
  color: var(--color-success);
}

.action-icon-btn--delete:hover {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

/* Toast Notifications */
.toast-stack {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.toast-item {
  padding: 12px 18px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 18px rgba(0,0,0,0.25);
  pointer-events: all;
  max-width: 340px;
}

.toast-item--success {
  background: rgba(22, 163, 74, 0.18);
  color: #4ade80;
  border: 1px solid rgba(74, 222, 128, 0.3);
}

.toast-item--error {
  background: rgba(239, 68, 68, 0.18);
  color: #f87171;
  border: 1px solid rgba(248, 113, 113, 0.3);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 300ms ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(24px);
}

/* Delete Confirm Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-confirm {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 32px 28px;
  max-width: 420px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.modal-confirm__icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 18px;
}

.modal-confirm__title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 12px;
}

.modal-confirm__body {
  font-size: 14px;
  color: var(--color-muted);
  line-height: 1.6;
  margin: 0 0 24px;
}

.modal-confirm__body strong {
  color: var(--color-text);
}

.modal-confirm__footer {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.modal-btn {
  padding: 10px 22px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 150ms ease;
}

.modal-btn--cancel {
  background: var(--color-surface-lighter);
  color: var(--color-muted);
  border: 1px solid var(--color-border);
}

.modal-btn--cancel:hover {
  background: var(--color-border);
  color: var(--color-text);
}

.modal-btn--delete {
  background: #ef4444;
  color: #fff;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
}

.modal-btn--delete:hover {
  background: #dc2626;
  transform: translateY(-1px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 200ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: var(--color-muted);
  font-size: 14px;
}
</style>
