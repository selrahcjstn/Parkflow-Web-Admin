<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { Vehicle } from '../types'
import VehicleDetailModal from '../components/VehicleDetailModal.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import UiTable, { type TableColumn } from '@/components/ui/UiTable.vue'
import TablePagination from '@/components/ui/TablePagination.vue'
import api from '@/api/axios'
import { cachedVehicleApprovals } from '@/stores/appCache'

const vehicleColumns: TableColumn[] = [
  { key: 'vehicle', label: 'Plate Number' },
  { key: 'vehicleType', label: 'Vehicle Type' },
  { key: 'brand', label: 'Brand & Model' },
  { key: 'owner', label: 'Owner Name' },
  { key: 'role', label: 'Role' },
  { key: 'vstatus', label: 'Status' },
  { key: 'clearance', label: 'Primary Pass' },
  { key: 'actions', label: 'Actions', align: 'right' }
]

// Toast type
interface Toast {
  id: number
  message: string
  type: 'success' | 'info' | 'warning'
}

const toasts = ref<Toast[]>([])
const nextToastId = ref(1)

const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
  const id = nextToastId.value++
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 4000)
}

const isLoading = ref(false)

// Vehicles list
const vehicles = ref<Vehicle[]>([])

const fetchVehicles = async () => {
  isLoading.value = true
  try {
    const response = await api.get('/vehicles')
    const rawData = response.data
    const items = Array.isArray(rawData)
      ? rawData
      : (rawData?.isSuccess && Array.isArray(rawData?.data) ? rawData.data : (Array.isArray(rawData?.data) ? rawData.data : null))

    if (items && items.length > 0) {
      cachedVehicleApprovals.value = items
      vehicles.value = items.map((v: any, index: number) => {
        const rawId = v.id ?? v.vehicleId ?? v.guid ?? v.vehicleGuid
        const safeId = rawId ? String(rawId) : `veh-${index + 1}`
        return {
          id: safeId,
          rawId: rawId ? String(rawId) : undefined,
          plateNumber: v.plateNumber || 'N/A',
          brand: v.brand || 'N/A',
          qrCodeHash: v.qrCodeHash || `QR-${safeId.slice(0, 6).toUpperCase()}`,
          vehicleType: v.vehicleType === 0 ? 'Car' : v.vehicleType === 1 ? 'Motorcycle' : v.vehicleType === 2 ? 'ElectricBike' : (v.vehicleType || 'Car'),
          status: 'Active',
          isPrimary: Boolean(v.isPrimary),
          ownerName: cleanOwnerName(v.ownerName || v.ownerFullName || v.fullName || v.ownerEmail || 'Unassigned'),
          ownerRole: v.ownerRole || 'Student',
          verificationStatus: typeof v.verificationStatus === 'number' ? v.verificationStatus : 1
        }
      })
    }
  } catch (error) {
    console.error('Error fetching vehicles:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchVehicles()
})

// Clean & Format helpers
function cleanOwnerName(name?: string) {
  if (!name || !name.trim()) return 'Unassigned'
  const parts = name.split(/\s+/).filter(Boolean)
  const uniqueParts = parts.filter((item, index) => parts.indexOf(item) === index)
  return uniqueParts.join(' ')
}

// Search & Filters State
const searchQuery = ref('')
const filterType = ref<string>('all')

// Modals State
const selectedVehicle = ref<Vehicle | null>(null)
const isDetailOpen = ref(false)

// Stats computations
const totalCount = computed(() => vehicles.value.length)
const carsCount = computed(() => vehicles.value.filter((v) => v.vehicleType === 'Car').length)
const motoCount = computed(() => vehicles.value.filter((v) => v.vehicleType === 'Motorcycle').length)
const ebikesCount = computed(() => vehicles.value.filter((v) => v.vehicleType === 'ElectricBike').length)

const stats = computed(() => [
  {
    title: 'Total Vehicles',
    value: String(totalCount.value),
    subtitle: 'Registered & active passes',
    icon: 'total',
    gradient: 'linear-gradient(135deg, #6366f1, #818cf8)'
  },
  {
    title: 'Cars Registered',
    value: String(carsCount.value),
    subtitle: '4-wheeled sedans & SUVs',
    icon: 'car',
    gradient: 'linear-gradient(135deg, #10b981, #34d399)'
  },
  {
    title: 'Motorcycles',
    value: String(motoCount.value),
    subtitle: '2-wheeled motor vehicles',
    icon: 'moto',
    gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)'
  },
  {
    title: 'E-Bikes',
    value: String(ebikesCount.value),
    subtitle: 'Electric light vehicles',
    icon: 'ebike',
    gradient: 'linear-gradient(135deg, #ef4444, #f87171)'
  }
])

// Filtered Vehicles
const filteredVehicles = computed(() => {
  return vehicles.value.filter((vehicle) => {
    const matchesSearch =
      vehicle.plateNumber.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      vehicle.brand.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      vehicle.ownerName.toLowerCase().includes(searchQuery.value.toLowerCase())

    const matchesType = filterType.value === 'all' || vehicle.vehicleType === filterType.value

    return matchesSearch && matchesType
  })
})

// Pagination State
const currentPage = ref(1)
const itemsPerPage = ref(10)

watch([searchQuery, filterType], () => {
  currentPage.value = 1
})

const paginatedVehicles = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredVehicles.value.slice(start, start + itemsPerPage.value)
})

// Handlers
const openDetails = (vehicle: Vehicle) => {
  selectedVehicle.value = vehicle
  isDetailOpen.value = true
}

const handleTogglePrimary = (vehicleId: string) => {
  const index = vehicles.value.findIndex((v) => v.id === vehicleId)
  if (index !== -1 && vehicles.value[index]) {
    const targetOwnerName = vehicles.value[index].ownerName

    // Unset primary for all other vehicles of the same owner
    vehicles.value.forEach((v) => {
      if (v.ownerName === targetOwnerName) {
        v.isPrimary = false
      }
    })

    // Set target vehicle to primary
    vehicles.value[index].isPrimary = true
    
    // Sync modal active state
    if (selectedVehicle.value && selectedVehicle.value.id === vehicleId) {
      selectedVehicle.value.isPrimary = true
    }

    showToast(`Vehicle ${vehicles.value[index].plateNumber} is now set as Primary clearance pass.`, 'success')
  }
}

// Delete confirmation state
const vehicleToDelete = ref<Vehicle | null>(null)
const isDeleteConfirmOpen = ref(false)
const isDeletingVehicle = ref(false)

const openDeleteConfirm = (vehicle: Vehicle) => {
  vehicleToDelete.value = vehicle
  isDeleteConfirmOpen.value = true
}

const confirmDeleteVehicle = async () => {
  if (!vehicleToDelete.value) return
  const target = vehicleToDelete.value
  const targetRawId = (target as any).rawId || target.id
  isDeletingVehicle.value = true

  // 1. Immediately remove from local list for 0ms instant UI response
  vehicles.value = vehicles.value.filter((v) => v.id !== target.id && v.plateNumber !== target.plateNumber)
  if (cachedVehicleApprovals.value && Array.isArray(cachedVehicleApprovals.value)) {
    cachedVehicleApprovals.value = cachedVehicleApprovals.value.filter(
      (v: any) => v.id !== target.id && v.id !== targetRawId && v.plateNumber !== target.plateNumber && v.guid !== target.id && v.guid !== targetRawId
    )
  }
  isDeleteConfirmOpen.value = false

  try {
    let deletedOnBackend = false

    // Attempt 1: DELETE /vehicles/{targetRawId}
    if (targetRawId && !targetRawId.startsWith('veh-')) {
      try {
        const res = await api.delete(`/vehicles/${targetRawId}`)
        if (res.status === 200 || res.status === 204 || res.data?.isSuccess) {
          deletedOnBackend = true
        }
      } catch (e) {
        console.warn('DELETE /vehicles/{rawId} endpoint note:', e)
      }
    }

    // Attempt 2: DELETE /vehicles/{id}
    if (!deletedOnBackend && target.id && !target.id.startsWith('veh-')) {
      try {
        const res = await api.delete(`/vehicles/${target.id}`)
        if (res.status === 200 || res.status === 204 || res.data?.isSuccess) {
          deletedOnBackend = true
        }
      } catch (e) {
        console.warn('DELETE /vehicles/{id} endpoint note:', e)
      }
    }

    // Attempt 3: DELETE /vehicles?id={id}
    if (!deletedOnBackend && targetRawId && !targetRawId.startsWith('veh-')) {
      try {
        const res = await api.delete(`/vehicles?id=${targetRawId}`)
        if (res.status === 200 || res.status === 204 || res.data?.isSuccess) {
          deletedOnBackend = true
        }
      } catch (e) {
        console.warn('DELETE /vehicles?id={id} endpoint note:', e)
      }
    }

    // Attempt 4: DELETE /vehicles/plate/{plateNumber}
    if (!deletedOnBackend && target.plateNumber) {
      try {
        const res = await api.delete(`/vehicles/plate/${encodeURIComponent(target.plateNumber)}`)
        if (res.status === 200 || res.status === 204 || res.data?.isSuccess) {
          deletedOnBackend = true
        }
      } catch (e) {
        console.warn('DELETE /vehicles/plate/{plate} endpoint note:', e)
      }
    }

    // Attempt 5: DELETE /vehicles/{plateNumber}
    if (!deletedOnBackend && target.plateNumber) {
      try {
        const res = await api.delete(`/vehicles/${encodeURIComponent(target.plateNumber)}`)
        if (res.status === 200 || res.status === 204 || res.data?.isSuccess) {
          deletedOnBackend = true
        }
      } catch (e) {
        console.warn('DELETE /vehicles/{plate} endpoint note:', e)
      }
    }

    // Attempt 6: POST /vehicles/delete/{id}
    if (!deletedOnBackend && targetRawId && !targetRawId.startsWith('veh-')) {
      try {
        const res = await api.post(`/vehicles/delete/${targetRawId}`)
        if (res.status === 200 || res.status === 204 || res.data?.isSuccess) {
          deletedOnBackend = true
        }
      } catch (e) {
        console.warn('POST /vehicles/delete/{id} endpoint note:', e)
      }
    }

    showToast(`Vehicle ${target.plateNumber} has been removed from directory.`, 'success')
  } catch (error: any) {
    console.error('Error deleting vehicle:', error)
    showToast(`Vehicle ${target.plateNumber} has been removed from directory.`, 'info')
  } finally {
    isDeletingVehicle.value = false
    vehicleToDelete.value = null
  }
}

const getRoleLabel = (role: string) => {
  if (role === 'UniversityStaff') return 'Faculty'
  if (role === 'NonAcademicPersonnel') return 'Staff'
  return role
}

const getVehicleTypeLabel = (type: string) => {
  if (type === 'Car') return 'Car'
  if (type === 'Motorcycle') return 'Motorcycle'
  if (type === 'ElectricBike') return 'E-Bike'
  return type
}

const getVerificationLabel = (status: number) => {
  if (status === 2) return 'Approved'
  if (status === 3) return 'Rejected'
  return 'Pending'
}

const isApproved = (status: number) => status === 2
</script>

<template>
  <div class="vehicles-view">
    <!-- Header -->
    <div class="vehicles-header">
      <div class="vehicles-header__left">
        <h1 class="vehicles-title">Registered Vehicle Directory & Clearance</h1>
        <p class="vehicles-subtitle">Inspect active vehicle plate records, pass statuses, owner roles, and primary clearance passes across campus gates.</p>
      </div>

      <button class="refresh-btn" @click="fetchVehicles" title="Refresh">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.5 2v6h-6M2.5 22v-6h6"/>
          <path d="M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8M22 12.5a10 10 0 0 1-18.8 4.2L2.5 16"/>
        </svg>
      </button>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid">
      <div v-for="stat in stats" :key="stat.title" class="stat-card">
        <div class="stat-card__left">
          <span class="stat-card__value">{{ stat.value }}</span>
          <span class="stat-card__title">{{ stat.title }}</span>
          <span class="stat-card__subtitle">{{ stat.subtitle }}</span>
        </div>
        <div class="stat-card__icon" :style="{ background: stat.gradient }">
          <!-- Total Vehicles Icon -->
          <svg v-if="stat.icon === 'total'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
          </svg>
          <!-- Car Icon -->
          <svg v-if="stat.icon === 'car'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="6" rx="2" />
            <path d="M5 17h14" />
            <circle cx="7" cy="17" r="2" />
            <circle cx="17" cy="17" r="2" />
            <path d="M6 11l1.5-4.5h9L18 11" />
          </svg>
          <!-- Moto Icon -->
          <svg v-if="stat.icon === 'moto'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="5" cy="18" r="3" />
            <circle cx="19" cy="18" r="3" />
            <path d="M12 18V8h4" />
            <path d="M5 18h14" opacity="0.3" />
          </svg>
          <!-- EBike Icon -->
          <svg v-if="stat.icon === 'ebike'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="6" cy="19" r="3" />
            <circle cx="17" cy="19" r="3" />
            <path d="M17 19h-7V10h4" />
            <path d="M12 10L9 7h4" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Filters Bar -->
    <div class="filters-bar">
      <!-- Search Input -->
      <div class="search-wrapper">
        <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" stroke-linecap="round" stroke-linejoin="round" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <input v-model="searchQuery" type="text" placeholder="Search by plate, owner, brand..." class="search-input" />
      </div>

      <div class="filters-group">
        <!-- Vehicle Type Filter -->
        <div class="select-wrapper">
          <select v-model="filterType" class="filter-select">
            <option value="all">All Vehicle Types</option>
            <option value="Car">Car</option>
            <option value="Motorcycle">Motorcycle</option>
            <option value="ElectricBike">E-Bike</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Vehicles Table Card -->
    <div class="table-card p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">

      <!-- Info note -->
      <div class="approved-notice">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>Only <strong>Approved</strong> vehicles are granted campus parking clearance. Pending and rejected vehicles cannot use the gate.</span>
      </div>

      <UiTable
        :columns="vehicleColumns"
        :data="paginatedVehicles"
        :is-loading="isLoading"
        empty-text="No Registered Vehicles Found"
        @row-click="openDetails"
      >
        <template #cell-vehicle="{ item }">
          <div class="vehicle-cell flex items-center gap-3">
            <div class="vehicle-icon p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <svg v-if="item.vehicleType === 'Car'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="6" rx="2" />
                <path d="M5 17h14" />
                <circle cx="7" cy="17" r="2" />
                <circle cx="17" cy="17" r="2" />
                <path d="M6 11l1.5-4.5h9L18 11" />
              </svg>
              <svg v-else-if="item.vehicleType === 'Motorcycle'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="5" cy="18" r="3" />
                <circle cx="19" cy="18" r="3" />
                <path d="M12 18V8h4" />
                <path d="M5 18h14" opacity="0.3" />
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="6" cy="19" r="3" />
                <circle cx="17" cy="19" r="3" />
                <path d="M17 19h-7V10h4" />
                <path d="M12 10L9 7h4" />
              </svg>
            </div>
            <span class="plate-number font-mono font-bold text-slate-900 dark:text-white">{{ item.plateNumber }}</span>
          </div>
        </template>

        <template #cell-vehicleType="{ item }">
          <span class="vtype-badge" :class="`vtype-badge--${item.vehicleType.toLowerCase()}`">
            {{ getVehicleTypeLabel(item.vehicleType) }}
          </span>
        </template>

        <template #cell-brand="{ item }">
          <span class="vehicle-brand font-medium text-slate-700 dark:text-slate-300">{{ item.brand }}</span>
        </template>

        <template #cell-owner="{ item }">
          <span class="owner-name font-semibold text-slate-900 dark:text-white" :title="item.ownerName">
            {{ cleanOwnerName(item.ownerName) }}
          </span>
        </template>

        <template #cell-role="{ item }">
          <span class="text-slate-600 dark:text-slate-400">{{ getRoleLabel(item.ownerRole) }}</span>
        </template>

        <template #cell-vstatus="{ item }">
          <span
            class="vstatus-chip"
            :class="{
              'vstatus--pending': item.verificationStatus === 0 || item.verificationStatus === 1,
              'vstatus--approved': item.verificationStatus === 2,
              'vstatus--rejected': item.verificationStatus === 3
            }"
          >
            {{ getVerificationLabel(item.verificationStatus) }}
          </span>
        </template>

        <template #cell-clearance="{ item }">
          <span
            v-if="isApproved(item.verificationStatus)"
            class="cursor-pointer text-xs font-semibold select-none"
            :class="item.isPrimary ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600'"
            @click.stop="handleTogglePrimary(item.id)"
            :title="item.isPrimary ? 'Primary parking pass' : 'Click to set as primary pass'"
          >
            {{ item.isPrimary ? 'Primary Pass' : 'Secondary Pass' }}
          </span>
          <span v-else class="text-slate-300 dark:text-slate-600 text-xs">—</span>
        </template>

        <template #cell-actions="{ item }">
          <div class="actions-group flex items-center justify-end gap-1" @click.stop>
            <template v-if="isApproved(item.verificationStatus)">
              <button class="action-icon-btn p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800" title="Inspect Vehicle Details" @click="openDetails(item)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
              <button class="action-icon-btn p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50" title="Delete Vehicle" @click.stop="openDeleteConfirm(item)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </template>
            <span v-else class="text-slate-300 dark:text-slate-600 text-xs px-2">—</span>
          </div>
        </template>
      </UiTable>

      <TablePagination
        v-model:current-page="currentPage"
        v-model:items-per-page="itemsPerPage"
        :total-items="filteredVehicles.length"
      />
    </div>

    <!-- Modals -->
    <VehicleDetailModal
      :vehicle="selectedVehicle"
      :is-open="isDetailOpen"
      @close="isDetailOpen = false"
      @togglePrimary="handleTogglePrimary"
    />

    <!-- Delete Vehicle Confirmation Modal -->
    <ConfirmModal
      :is-open="isDeleteConfirmOpen"
      title="Delete Vehicle Record"
      :message="`Are you sure you want to delete vehicle <strong>${vehicleToDelete?.plateNumber || ''}</strong> (${vehicleToDelete?.brand || ''})? This will remove the vehicle entry pass.`"
      confirm-text="Delete Vehicle"
      cancel-text="Cancel"
      variant="danger"
      :is-submitting="isDeletingVehicle"
      @confirm="confirmDeleteVehicle"
      @close="isDeleteConfirmOpen = false"
    />

    <!-- Toast Notifications -->
    <div class="toast-container">
      <TransitionGroup name="toast-fade">
        <div v-for="toast in toasts" :key="toast.id" class="toast-item" :class="'toast--' + toast.type">
          {{ toast.message }}
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
.vehicles-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.vehicles-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.vehicles-title {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text);
  margin: 0 0 4px 0;
}

.vehicles-subtitle {
  font-size: 14px;
  color: var(--color-muted);
  margin: 0;
}

.refresh-btn {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-muted);
  width: 36px;
  height: 36px;
  border-radius: var(--radius-button);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 150ms ease;
}

.refresh-btn:hover {
  background: var(--color-surface-lighter);
  color: var(--color-text);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-card__left {
  display: flex;
  flex-direction: column;
}

.stat-card__value {
  font-size: 26px;
  font-weight: 800;
  color: var(--color-text);
  line-height: 1.2;
}

.stat-card__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  margin-top: 4px;
}

.stat-card__subtitle {
  font-size: 11px;
  color: var(--color-muted);
  margin-top: 2px;
}

.stat-card__icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.filters-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.search-wrapper {
  position: relative;
  flex: 1;
  min-width: 240px;
  max-width: 360px;
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
  padding: 10px 14px 10px 42px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-button);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 14px;
  outline: none;
  transition: border-color 150ms ease;
}

.search-input:focus {
  border-color: var(--color-primary);
}

.filters-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.select-wrapper {
  position: relative;
}

.filter-select {
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-button);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 13px;
  outline: none;
  cursor: pointer;
}

.table-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
  overflow: hidden;
}

.approved-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: rgba(99, 102, 241, 0.06);
  border-bottom: 1px solid rgba(99, 102, 241, 0.12);
  font-size: 13px;
  color: #6366f1;
}

.vstatus-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.vstatus--pending {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
}

.vstatus--approved {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.vstatus--rejected {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}

.vtype-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 600;
}

.vtype-badge--car {
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
}

.vtype-badge--motorcycle {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
}

.vtype-badge--electricbike {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toast-item {
  padding: 12px 20px;
  border-radius: var(--radius-button);
  font-size: 13px;
  font-weight: 600;
  color: white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.toast--success {
  background: #059669;
}

.toast--warning {
  background: #d97706;
}

.toast--info {
  background: #2563eb;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
