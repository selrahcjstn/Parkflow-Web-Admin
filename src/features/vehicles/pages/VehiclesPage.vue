<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Vehicle } from '../types'
import VehicleDetailModal from '../components/VehicleDetailModal.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import api from '@/api/axios'

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
const vehicles = ref<Vehicle[]>([
  {
    id: 'veh-1',
    plateNumber: 'ABC 1234',
    brand: 'Toyota Vios',
    qrCodeHash: 'QR-A7D9B2',
    vehicleType: 'Car',
    status: 'Active',
    isPrimary: true,
    ownerName: 'Juan Dela Cruz',
    ownerRole: 'Student'
  },
  {
    id: 'veh-2',
    plateNumber: 'XYZ 5678',
    brand: 'Honda Click 125i',
    qrCodeHash: 'QR-F4E1D0',
    vehicleType: 'Motorcycle',
    status: 'Active',
    isPrimary: true,
    ownerName: 'Maria Santos',
    ownerRole: 'Student'
  }
])

const fetchVehicles = async () => {
  isLoading.value = true
  try {
    const response = await api.get('/vehicles')
    const rawData = response.data
    const items = Array.isArray(rawData)
      ? rawData
      : (rawData?.isSuccess && Array.isArray(rawData?.data) ? rawData.data : (Array.isArray(rawData?.data) ? rawData.data : null))

    if (items && items.length > 0) {
      vehicles.value = items.map((v: any) => ({
        id: v.id,
        plateNumber: v.plateNumber,
        brand: v.brand,
        qrCodeHash: v.qrCodeHash || `QR-${v.id?.slice(0, 6)?.toUpperCase() || 'UNKNOWN'}`,
        vehicleType: v.vehicleType === 0 ? 'Car' : v.vehicleType === 1 ? 'Motorcycle' : v.vehicleType === 2 ? 'ElectricBike' : (v.vehicleType || 'Car'),
        status: v.status || (v.verificationStatus === 3 ? 'Suspended' : 'Active'),
        isPrimary: v.isPrimary,
        ownerName: cleanOwnerName(v.ownerName || v.ownerEmail || 'Unassigned'),
        ownerRole: v.ownerRole || 'Student'
      }))
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
const filterStatus = ref<string>('all')

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
    subtitle: 'RFID & Plate registered',
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
    const matchesStatus = filterStatus.value === 'all' || vehicle.status === filterStatus.value

    return matchesSearch && matchesType && matchesStatus
  })
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

const handleToggleStatus = (vehicleId: string) => {
  const index = vehicles.value.findIndex((v) => v.id === vehicleId)
  if (index !== -1 && vehicles.value[index]) {
    const newStatus = vehicles.value[index].status === 'Active' ? 'Suspended' : 'Active'
    vehicles.value[index].status = newStatus

    if (selectedVehicle.value && selectedVehicle.value.id === vehicleId) {
      selectedVehicle.value.status = newStatus
    }

    showToast(
      `Vehicle ${vehicles.value[index].plateNumber} status changed to ${newStatus}.`,
      newStatus === 'Active' ? 'success' : 'warning'
    )
  }
}

const handleDeleteVehicle = (vehicleId: string) => {
  const target = vehicles.value.find((v) => v.id === vehicleId)
  if (target) {
    if (confirm(`Are you sure you want to delete vehicle record ${target.plateNumber}?`)) {
      vehicles.value = vehicles.value.filter((v) => v.id !== vehicleId)
      showToast(`Vehicle ${target.plateNumber} has been removed from directory.`, 'info')
    }
  }
}

const getRoleLabel = (role: string) => {
  if (role === 'UniversityStaff') return 'Faculty'
  if (role === 'NonAcademicPersonnel') return 'Staff'
  return role
}
</script>

<template>
  <div class="vehicles-view">
    <!-- Header -->
    <div class="vehicles-header">
      <div class="vehicles-header__left">
        <div class="header-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/>
            <path d="M9 17h6"/>
            <circle cx="17" cy="17" r="2"/>
          </svg>
          Campus Fleet & RFID Registry
        </div>
        <h1 class="vehicles-title">Registered Vehicle Directory & Clearance</h1>
        <p class="vehicles-subtitle">Inspect active vehicle plate records, RFID pass statuses, owner roles, and primary clearance passes across campus gates.</p>
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

        <!-- Status Filter -->
        <div class="select-wrapper">
          <select v-model="filterStatus" class="filter-select">
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Vehicles Table Card -->
    <div class="table-card">
      <div class="table-responsive">
        <table class="vehicles-table">
          <thead>
            <tr>
              <th>Vehicle / Brand</th>
              <th>Owner Name</th>
              <th>Role</th>
              <th>Primary Clearance Pass</th>
              <th>Status</th>
              <th class="actions-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading">
              <td colspan="6">
                <SkeletonLoader variant="table-row" :columns="6" v-for="i in 5" :key="i" />
              </td>
            </tr>
            <tr v-else-if="filteredVehicles.length === 0">
              <td colspan="6" class="empty-state">
                <div class="empty-state-content">
                  <div class="empty-icon-wrapper">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
                      <circle cx="7" cy="17" r="2"/>
                      <path d="M9 17h6"/>
                      <circle cx="17" cy="17" r="2"/>
                    </svg>
                  </div>
                  <h3>No Registered Vehicles Found</h3>
                  <p>There are no vehicles matching your search or filter criteria.</p>
                </div>
              </td>
            </tr>
            <tr
              v-else
              v-for="vehicle in filteredVehicles"
              :key="vehicle.id"
              class="vehicle-row"
              @click="openDetails(vehicle)"
            >
              <td>
                <div class="vehicle-cell">
                  <div class="vehicle-icon">
                    <svg v-if="vehicle.vehicleType === 'Car'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="11" width="18" height="6" rx="2" />
                      <path d="M5 17h14" />
                      <circle cx="7" cy="17" r="2" />
                      <circle cx="17" cy="17" r="2" />
                      <path d="M6 11l1.5-4.5h9L18 11" />
                    </svg>
                    <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="5" cy="18" r="3" />
                      <circle cx="19" cy="18" r="3" />
                      <path d="M12 18V8h4" />
                      <path d="M5 18h14" opacity="0.3" />
                    </svg>
                  </div>
                  <div class="vehicle-info">
                    <span class="plate-number monospace">{{ vehicle.plateNumber }}</span>
                    <span class="vehicle-brand">{{ vehicle.brand }}</span>
                  </div>
                </div>
              </td>
              <td>
                <span class="owner-name" :title="vehicle.ownerName">{{ cleanOwnerName(vehicle.ownerName) }}</span>
              </td>
              <td>
                <span class="role-badge" :class="'role-badge--' + vehicle.ownerRole.toLowerCase()">
                  {{ getRoleLabel(vehicle.ownerRole) }}
                </span>
              </td>
              <td>
                <span
                  class="status-pill"
                  :class="vehicle.isPrimary ? 'status-pill--primary' : 'status-pill--secondary'"
                  @click.stop="handleTogglePrimary(vehicle.id)"
                  :title="vehicle.isPrimary ? 'Primary parking RFID pass' : 'Click to set as primary pass'"
                >
                  {{ vehicle.isPrimary ? 'Primary' : 'Secondary' }}
                </span>
              </td>
              <td>
                <span
                  class="status-pill"
                  :class="vehicle.status === 'Active' ? 'status-pill--active' : 'status-pill--suspended'"
                >
                  {{ vehicle.status }}
                </span>
              </td>
              <td class="actions-cell" @click.stop>
                <div class="actions-group">
                  <button class="action-icon-btn" title="Inspect Vehicle Details" @click="openDetails(vehicle)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                  <button
                    class="action-icon-btn"
                    :class="vehicle.status === 'Active' ? 'action-icon-btn--suspend' : 'action-icon-btn--verify'"
                    :title="vehicle.status === 'Active' ? 'Suspend Vehicle' : 'Activate Vehicle'"
                    @click="handleToggleStatus(vehicle.id)"
                  >
                    <svg v-if="vehicle.status === 'Active'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10" stroke-linecap="round" stroke-linejoin="round" />
                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </button>
                  <button class="action-icon-btn action-icon-btn--delete" title="Delete Vehicle" @click="handleDeleteVehicle(vehicle.id)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6" stroke-linecap="round" stroke-linejoin="round" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modals -->
    <VehicleDetailModal
      :vehicle="selectedVehicle"
      :is-open="isDetailOpen"
      @close="isDetailOpen = false"
      @togglePrimary="handleTogglePrimary"
      @toggleStatus="handleToggleStatus"
    />

    <!-- Toast Notifications -->
    <div class="toast-container">
      <TransitionGroup name="toast-fade">
        <div v-for="toast in toasts" :key="toast.id" class="toast-item" :class="'toast--' + toast.type">
          <div class="toast-icon">
            <svg v-if="toast.type === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <svg v-else-if="toast.type === 'warning'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
          <span class="toast-msg">{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
.vehicles-view {
  animation: fadeSlideUp 0.4s ease both;
}

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.vehicles-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.vehicles-header__left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(99, 102, 241, 0.12);
  color: #6366f1;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  margin-bottom: 6px;
  align-self: flex-start;
  width: fit-content;
}

.vehicles-title {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text);
  margin: 0;
}

.vehicles-subtitle {
  font-size: 13px;
  color: var(--color-muted);
  margin: 4px 0 0 0;
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border-radius: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  cursor: pointer;
  transition: all 150ms ease;
  flex-shrink: 0;
}

.refresh-btn:hover {
  background: var(--color-surface-muted);
  color: var(--color-primary, #d22730);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

@media (max-width: 1200px) {
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
  line-height: 1.2;
}

.stat-card__title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 4px;
}

.stat-card__subtitle {
  font-size: 11px;
  color: var(--color-muted);
  opacity: 0.8;
  margin-top: 2px;
}

.stat-card__icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
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
  box-sizing: border-box;
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
  height: 38px;
  box-sizing: border-box;
}

.filter-select:hover {
  border-color: var(--color-muted);
}

.filter-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.filter-select option {
  background-color: var(--color-surface);
  color: var(--color-text);
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

.vehicles-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.vehicles-table th {
  padding: 16px 24px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-muted);
  letter-spacing: 1px;
  border-bottom: 1px solid var(--color-border);
}

.vehicle-row {
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background 150ms ease;
}

.vehicle-row:hover {
  background: var(--color-surface-lighter);
}

.vehicle-row:last-child {
  border-bottom: none;
}

.vehicles-table td {
  padding: 16px 24px;
  vertical-align: middle;
}

/* Vehicle Cell */
.vehicle-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 180px;
}

.vehicle-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--color-surface-lighter);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-muted);
  flex-shrink: 0;
}

.vehicle-info {
  display: flex;
  flex-direction: column;
}

.plate-number {
  font-family: monospace;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: 0.5px;
}

.vehicle-brand {
  font-size: 12px;
  color: var(--color-muted);
}

.owner-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
}

/* Badges */
.role-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.role-badge--admin {
  background: rgba(210, 39, 48, 0.1);
  color: var(--color-primary);
}

.role-badge--student {
  background: rgba(16, 185, 129, 0.1);
  color: var(--color-success);
}

.role-badge--guard {
  background: rgba(96, 165, 250, 0.1);
  color: #60a5fa;
}

.role-badge--faculty,
.role-badge--staff,
.role-badge--universitystaff,
.role-badge--nonacademicpersonnel {
  background: rgba(245, 158, 11, 0.1);
  color: var(--color-warning);
}

/* Status pills */
.status-pill {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-pill--active {
  background: rgba(16, 185, 129, 0.1);
  color: var(--color-success);
}

.status-pill--suspended {
  background: rgba(210, 39, 48, 0.1);
  color: var(--color-danger);
}

.status-pill--primary {
  background: rgba(59, 130, 246, 0.1);
  color: var(--color-info);
  cursor: pointer;
}

.status-pill--secondary {
  background: var(--color-surface-muted);
  color: var(--color-muted);
  cursor: pointer;
  transition: background 150ms ease;
}

.status-pill--secondary:hover {
  background: rgba(59, 130, 246, 0.1);
  color: var(--color-info);
}

/* Actions */
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
  background: var(--color-surface-lighter);
  border: 1px solid var(--color-border);
  color: var(--color-muted);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 150ms ease;
}

.action-icon-btn:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
}

.action-icon-btn--suspend {
  border-color: rgba(248, 113, 113, 0.2);
  color: var(--color-danger);
}

.action-icon-btn--suspend:hover {
  background: rgba(248, 113, 113, 0.1);
  color: #ef4444;
}

.action-icon-btn--verify {
  border-color: rgba(35, 165, 90, 0.2);
  color: var(--color-success);
}

.action-icon-btn--verify:hover {
  background: rgba(35, 165, 90, 0.1);
  color: #1a8a4b;
}

.action-icon-btn--delete {
  border-color: rgba(248, 113, 113, 0.2);
  color: var(--color-danger);
}

.action-icon-btn--delete:hover {
  background: #f87171;
  color: #fff;
}

.empty-state {
  text-align: center;
  padding: 56px 24px !important;
  color: var(--color-muted);
}

.empty-state-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 380px;
  margin: 0 auto;
  text-align: center;
}

.empty-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  color: var(--color-muted);
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
}

.empty-state p {
  margin: 0;
  font-size: 13px;
  color: var(--color-muted);
}

/* Toast styling */
.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 150;
  max-width: 360px;
}

.toast-item {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: var(--shadow-elevated);
  box-sizing: border-box;
}

.toast--success {
  border-left: 4px solid var(--color-success);
}

.toast--success .toast-icon {
  color: var(--color-success);
}

.toast--warning {
  border-left: 4px solid var(--color-warning);
}

.toast--warning .toast-icon {
  color: var(--color-warning);
}

.toast--info {
  border-left: 4px solid #3b82f6;
}

.toast--info .toast-icon {
  color: #3b82f6;
}

.toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.toast-msg {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
}

/* Transitions */
.toast-fade-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-fade-leave-active {
  transition: all 0.2s ease;
}
.toast-fade-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
.toast-fade-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
