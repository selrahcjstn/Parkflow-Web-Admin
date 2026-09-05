<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { ActiveSession, ParkingHistoryItem, VehicleType, ParkingStatus, EntryMethod } from '../types'
import ManualEntryModal from '../components/ManualEntryModal.vue'
import SessionDetailModal from '../components/SessionDetailModal.vue'
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

// Total parking slots capacity
const TOTAL_CAPACITY = 200

// Today's total check-ins
const todaysEntriesCount = ref(0)

// Active Sessions
const activeSessions = ref<ActiveSession[]>([])

// Parking History
const historySessions = ref<ParkingHistoryItem[]>([])

const isLoading = ref(false)

const getLoggedInUserId = (): string => {
  const token = localStorage.getItem('parkflow_token')
  if (!token) return ''
  try {
    const parts = token.split('.')
    const base64Url = parts[1]
    if (!base64Url) return ''
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(window.atob(base64))
    return payload.user_id || payload.sub || ''
  } catch (e) {
    console.error('Error decoding token:', e)
    return ''
  }
}

const isToday = (dateStr: string) => {
  const date = new Date(dateStr)
  const today = new Date()
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear()
}

const updateTodaysEntriesCount = () => {
  const activeToday = activeSessions.value.filter(s => isToday(s.checkInTime)).length
  const historyToday = historySessions.value.filter(s => isToday(s.checkInTime)).length
  todaysEntriesCount.value = activeToday + historyToday
}

// Real-time Clock & Overstay Tracking
const now = ref(new Date())
let durationInterval: any = null
const notifiedOverstayPlates = new Set<string>()

const fetchParkingData = async () => {
  isLoading.value = true
  try {
    const activeRes = await api.get('/parking-logs/active-sessions?parkingCapacity=200')
    if (activeRes.data && activeRes.data.isSuccess) {
      activeSessions.value = activeRes.data.data.map((item: any) => {
        const checkIn = new Date(item.entryTime).getTime()
        const diffHrs = (now.value.getTime() - checkIn) / (3600 * 1000)
        const isOverstay = diffHrs >= 8
        if (isOverstay) {
          notifiedOverstayPlates.add(item.plateNumber)
        }

        return {
          id: item.plateNumber,
          vehiclePlate: item.plateNumber,
          brand: item.brand,
          vehicleType: item.vehicleType as VehicleType,
          ownerName: `${item.firstName} ${item.lastName}`,
          role: item.role || 'Guest',
          checkInTime: item.entryTime,
          duration: item.totalParkingHours,
          gate: 1,
          status: isOverstay ? 'Overstay' : (item.status as ParkingStatus || 'Parked')
        }
      })
    }

    const historyRes = await api.get('/parking-history/all/page/1/100')
    if (historyRes.data && historyRes.data.isSuccess) {
      historySessions.value = historyRes.data.data.items.map((item: any) => {
        let durationStr = '0m'
        if (item.parkingDuration != null) {
          const totalMins = Math.floor(item.parkingDuration * 60)
          const hrs = Math.floor(totalMins / 60)
          const mins = totalMins % 60
          durationStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`
        }

        const chargeStr = item.parkingDuration != null 
          ? calculateCharge(item.type, item.entryTime, item.exitTime)
          : 'Free'

        return {
          id: `${item.plateNumber}-${item.entryTime}`,
          vehiclePlate: item.plateNumber,
          brand: item.brand,
          vehicleType: item.type as VehicleType,
          ownerName: `${item.firstName} ${item.lastName}`,
          role: item.roleName || 'Guest',
          checkInTime: item.entryTime,
          checkOutTime: item.exitTime || '',
          duration: durationStr,
          charge: chargeStr,
          status: 'Exited' as ParkingStatus,
          method: 'Manual' as EntryMethod
        }
      })
    }

    updateTodaysEntriesCount()
  } catch (error) {
    console.error('Error fetching parking data:', error)
    showToast('Failed to fetch parking sessions data.', 'warning')
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await fetchParkingData()
  durationInterval = setInterval(() => {
    now.value = new Date()
    // Auto-update status to overstay if parked more than 8 hours
    activeSessions.value.forEach((session) => {
      const diffHrs = (now.value.getTime() - new Date(session.checkInTime).getTime()) / (3600 * 1000)
      if (diffHrs >= 8) {
        session.status = 'Overstay'
        if (!notifiedOverstayPlates.has(session.vehiclePlate)) {
          notifiedOverstayPlates.add(session.vehiclePlate)
          showToast(`Warning: Vehicle ${session.vehiclePlate} has exceeded 8 hours.`, 'warning')
        }
      }
    })
  }, 10000) // update every 10s
})

onUnmounted(() => {
  if (durationInterval) clearInterval(durationInterval)
})

// Dynamic duration formatter
const getDuration = (session: ActiveSession | ParkingHistoryItem) => {
  if ('checkOutTime' in session && session.checkOutTime) {
    return session.duration
  }
  const start = new Date(session.checkInTime).getTime()
  const diffMs = now.value.getTime() - start
  if (diffMs < 0) return '0m'
  const diffMins = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMins / 60)
  const mins = diffMins % 60
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

// Calculate fee on exit
const calculateCharge = (vehicleType: VehicleType, checkInTime: string, checkOutTime: string) => {
  const start = new Date(checkInTime).getTime()
  const end = new Date(checkOutTime).getTime()
  const diffMs = end - start
  const diffHours = Math.ceil(diffMs / (3600 * 1000))
  if (diffHours <= 0) return 'Free'

  if (vehicleType === 'ElectricBike') return '₱10.00'
  if (vehicleType === 'Motorcycle') return '₱20.00'
  
  // Car: ₱30 for 3 hours, then ₱10/hr after
  if (diffHours <= 3) return '₱30.00'
  return `₱${30 + (diffHours - 3) * 10}.00`
}

// View state
const currentTab = ref<'active' | 'history'>('active')
const searchQuery = ref('')
const filterVehicleType = ref<string>('all')
const filterStatus = ref<string>('all') // Active status filter
const filterMethod = ref<string>('all') // History entry method filter

// Modals state
const isManualEntryOpen = ref(false)
const isSessionDetailOpen = ref(false)
const selectedSession = ref<ActiveSession | ParkingHistoryItem | null>(null)

// Stats computations
const occupancyCount = computed(() => activeSessions.value.length)
const occupancyRate = computed(() => Math.round((occupancyCount.value / TOTAL_CAPACITY) * 100))
const overstayCount = computed(() => activeSessions.value.filter((s) => s.status === 'Overstay').length)

const stats = computed(() => [
  {
    title: 'Occupancy Rate',
    value: `${occupancyCount.value} / ${TOTAL_CAPACITY}`,
    subtitle: `${occupancyRate.value}% slots filled`,
    icon: 'occupancy',
    gradient: 'linear-gradient(135deg, #10b981, #34d399)'
  },
  {
    title: "Today's Entries",
    value: String(todaysEntriesCount.value),
    subtitle: 'RFID & manual check-ins',
    icon: 'entries',
    gradient: 'linear-gradient(135deg, #6366f1, #818cf8)'
  },
  {
    title: 'Active Overstays',
    value: String(overstayCount.value),
    subtitle: 'Exceeded 8-hour limit',
    icon: 'overstay',
    gradient: 'linear-gradient(135deg, #d22730, #f87171)'
  }
])

// Filtered sessions computation
const filteredActiveSessions = computed(() => {
  return activeSessions.value.filter((session) => {
    const matchesSearch =
      session.vehiclePlate.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      session.ownerName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (session.brand && session.brand.toLowerCase().includes(searchQuery.value.toLowerCase()))

    const matchesVehicle = filterVehicleType.value === 'all' || session.vehicleType === filterVehicleType.value
    const matchesStatus = filterStatus.value === 'all' || session.status === filterStatus.value

    return matchesSearch && matchesVehicle && matchesStatus
  })
})

const filteredHistorySessions = computed(() => {
  return historySessions.value.filter((session) => {
    const matchesSearch =
      session.vehiclePlate.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      session.ownerName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (session.brand && session.brand.toLowerCase().includes(searchQuery.value.toLowerCase()))

    const matchesVehicle = filterVehicleType.value === 'all' || session.vehicleType === filterVehicleType.value
    const matchesMethod = filterMethod.value === 'all' || session.method === filterMethod.value

    return matchesSearch && matchesVehicle && matchesMethod
  })
})

// Handlers
const openDetails = (session: ActiveSession | ParkingHistoryItem) => {
  selectedSession.value = session
  isSessionDetailOpen.value = true
}

const handleManualEntrySubmit = async (payload: {
  plateNumber: string
  vehicleType: VehicleType
  brand: string
  phoneNumber: string
}) => {
  const alreadyParked = activeSessions.value.some(
    (s) => s.vehiclePlate.replace(/\s+/g, '').toUpperCase() === payload.plateNumber.replace(/\s+/g, '').toUpperCase()
  )

  if (alreadyParked) {
    showToast(`Vehicle ${payload.plateNumber} is already parked!`, 'warning')
    return
  }

  const loggedInUserId = getLoggedInUserId()
  if (!loggedInUserId) {
    showToast('Failed to log entry: admin or guard user ID is not available.', 'warning')
    return
  }

  try {
    const response = await api.post('/parking-logs/manual-entry', {
      plateNumber: payload.plateNumber,
      vehicleType: payload.vehicleType,
      phoneNumber: payload.phoneNumber || null,
      brand: payload.brand || null,
      userId: loggedInUserId
    })

    if (response.data && response.data.isSuccess) {
      showToast(`Manual entry logged successfully for ${payload.plateNumber}!`, 'success')
      isManualEntryOpen.value = false
      await fetchParkingData()
    } else {
      showToast(response.data?.message || 'Failed to log manual entry.', 'warning')
    }
  } catch (error: any) {
    console.error('Error logging manual entry:', error)
    const errMessage = error.response?.data?.message || 'Failed to log manual entry.'
    showToast(errMessage, 'warning')
  }
}

const handleManualCheckout = async (session: ActiveSession | ParkingHistoryItem) => {
  const loggedInUserId = getLoggedInUserId()
  if (!loggedInUserId) {
    showToast('Failed to checkout: admin or guard user ID is not available.', 'warning')
    return
  }

  try {
    const response = await api.patch('/parking-logs/manual-exit', {
      plateNumber: session.vehiclePlate,
      userId: loggedInUserId
    })

    if (response.data && response.data.isSuccess) {
      const fee = response.data.data?.penaltyFee != null ? `₱${response.data.data.penaltyFee.toFixed(2)}` : 'Free'
      showToast(`Vehicle ${session.vehiclePlate} checked out. Fee: ${fee}`, 'success')
      if (isSessionDetailOpen.value) {
        isSessionDetailOpen.value = false
      }
      await fetchParkingData()
    } else {
      showToast(response.data?.message || 'Failed to checkout vehicle.', 'warning')
    }
  } catch (error: any) {
    console.error('Error checking out vehicle:', error)
    const errMessage = error.response?.data?.message || 'Failed to checkout vehicle.'
    showToast(errMessage, 'warning')
  }
}

// Helper methods for label rendering
const getVehicleTypeLabel = (type: VehicleType) => {
  if (type === 'ElectricBike') return 'E-Bike'
  return type
}

const getRoleLabel = (role: string) => {
  if (role === 'UniversityStaff') return 'Faculty'
  if (role === 'NonAcademicPersonnel') return 'Staff'
  return role
}
</script>

<template>
  <div class="parking-view">
    <!-- Header -->
    <div class="parking-header">
      <div class="parking-header__left">
        <h1 class="parking-title">Parking Operations</h1>
        <p class="parking-subtitle">Monitor real-time gate occupancy, active check-ins, and logs.</p>
      </div>
      <div class="header-actions">
        <button class="refresh-btn" @click="fetchParkingData" :disabled="isLoading" title="Refresh Data">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ 'spin-animation': isLoading }">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <button class="add-entry-btn" @click="isManualEntryOpen = true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19" stroke-linecap="round" stroke-linejoin="round" />
            <line x1="5" y1="12" x2="19" y2="12" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Log Manual Entry
        </button>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid">
      <div v-for="stat in stats" :key="stat.title" class="stat-card">
        <div v-if="isLoading">
          <SkeletonLoader variant="rect" height="100px" style="width: 100%; border-radius: var(--radius-card);" />
        </div>
        <template v-else>
          <div class="stat-card__left">
            <span class="stat-card__value">{{ stat.value }}</span>
            <span class="stat-card__title">{{ stat.title }}</span>
            <span class="stat-card__subtitle">{{ stat.subtitle }}</span>
          </div>
          <div class="stat-card__icon" :style="{ background: stat.gradient }">
            <!-- Occupancy Icon -->
            <svg v-if="stat.icon === 'occupancy'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
            </svg>
            <!-- Entries Icon -->
            <svg v-if="stat.icon === 'entries'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v20M17 5l-5-5-5 5M17 19l-5 5-5-5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <!-- Overstay Icon -->
            <svg v-if="stat.icon === 'overstay'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
        </template>
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

      <!-- Tabs and Filter Groups -->
      <div class="toolbar-right">
        <!-- Tab Toggle -->
        <div class="tabs-switcher">
          <button
            class="tab-btn"
            :class="{ active: currentTab === 'active' }"
            @click="currentTab = 'active'"
          >
            Active
          </button>
          <button
            class="tab-btn"
            :class="{ active: currentTab === 'history' }"
            @click="currentTab = 'history'"
          >
            History
          </button>
        </div>

        <div class="filters-group">
          <!-- Vehicle Type Filter -->
          <div class="select-wrapper">
            <select v-model="filterVehicleType" class="filter-select">
              <option value="all">All Vehicle Types</option>
              <option value="Car">Car</option>
              <option value="Motorcycle">Motorcycle</option>
              <option value="ElectricBike">E-Bike</option>
            </select>
          </div>

          <!-- Dynamic Status/Method Filter -->
          <div v-if="currentTab === 'active'" class="select-wrapper">
            <select v-model="filterStatus" class="filter-select">
              <option value="all">All Statuses</option>
              <option value="Parked">Parked</option>
              <option value="Overstay">Overstay</option>
            </select>
          </div>

          <div v-else class="select-wrapper">
            <select v-model="filterMethod" class="filter-select">
              <option value="all">All Entry Methods</option>
              <option value="QrCode">QR Code</option>
              <option value="Manual">Manual Entry</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Tables -->
    <div class="table-card">
      <div class="table-responsive">
        <!-- Active Sessions Table -->
        <table v-if="currentTab === 'active'" class="parking-table">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Owner / Role</th>
              <th>Check-in Time</th>
              <th>Duration</th>
              <th>Gate</th>
              <th>Status</th>
              <th class="actions-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading">
              <td colspan="7">
                <SkeletonLoader variant="table-row" :columns="7" />
                <SkeletonLoader variant="table-row" :columns="7" />
                <SkeletonLoader variant="table-row" :columns="7" />
                <SkeletonLoader variant="table-row" :columns="7" />
                <SkeletonLoader variant="table-row" :columns="7" />
              </td>
            </tr>
            <tr v-else-if="filteredActiveSessions.length === 0">
              <td colspan="7" class="empty-state">No active parking sessions found.</td>
            </tr>
            <tr
              v-else
              v-for="session in filteredActiveSessions"
              :key="session.id"
              class="parking-row"
              @click="openDetails(session)"
            >
              <td>
                <div class="vehicle-cell">
                  <div class="vehicle-icon">
                    <svg v-if="session.vehicleType === 'Car'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="11" width="18" height="6" rx="2" />
                      <path d="M5 17h14" />
                      <circle cx="7" cy="17" r="2" />
                      <circle cx="17" cy="17" r="2" />
                      <path d="M6 11l1.5-4.5h9L18 11" />
                    </svg>
                    <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <!-- Motorcycle/E-Bike shape icon -->
                      <circle cx="5" cy="18" r="3" />
                      <circle cx="19" cy="18" r="3" />
                      <path d="M12 18V8h4" />
                      <path d="M5 18h14" opacity="0.3" />
                    </svg>
                  </div>
                  <div class="vehicle-info">
                    <span class="plate-number">{{ session.vehiclePlate }}</span>
                    <span class="vehicle-brand">{{ session.brand || 'Unknown' }}</span>
                  </div>
                </div>
              </td>
              <td>
                <div class="owner-cell">
                  <span class="owner-name">{{ session.ownerName }}</span>
                  <span class="role-badge" :class="'role-badge--' + session.role.toLowerCase()">
                    {{ getRoleLabel(session.role) }}
                  </span>
                </div>
              </td>
              <td>
                <span class="time-text">{{ new Date(session.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</span>
                <span class="date-sub">{{ new Date(session.checkInTime).toLocaleDateString([], { month: 'short', day: 'numeric' }) }}</span>
              </td>
              <td>
                <span class="duration-badge">{{ getDuration(session) }}</span>
              </td>
              <td>
                <span class="gate-tag">Gate {{ session.gate }}</span>
              </td>
              <td>
                <span class="status-pill" :class="'status-pill--' + session.status.toLowerCase()">
                  {{ session.status }}
                </span>
              </td>
              <td class="actions-cell" @click.stop>
                <div class="actions-group">
                  <button class="action-icon-btn" title="View Details" @click="openDetails(session)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                  </button>
                  <button
                    class="action-icon-btn action-icon-btn--checkout"
                    title="Manual Checkout"
                    @click="handleManualCheckout(session)"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Parking History Table -->
        <table v-else class="parking-table">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Owner / Role</th>
              <th>Check-in / Out</th>
              <th>Duration</th>
              <th>Fee Charged</th>
              <th>Entry Method</th>
              <th>Status</th>
              <th class="actions-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading">
              <td colspan="8">
                <SkeletonLoader variant="table-row" :columns="8" />
                <SkeletonLoader variant="table-row" :columns="8" />
                <SkeletonLoader variant="table-row" :columns="8" />
                <SkeletonLoader variant="table-row" :columns="8" />
                <SkeletonLoader variant="table-row" :columns="8" />
              </td>
            </tr>
            <tr v-else-if="filteredHistorySessions.length === 0">
              <td colspan="8" class="empty-state">No parking history logs found.</td>
            </tr>
            <tr
              v-else
              v-for="session in filteredHistorySessions"
              :key="session.id"
              class="parking-row"
              @click="openDetails(session)"
            >
              <td>
                <div class="vehicle-cell">
                  <div class="vehicle-icon">
                    <svg v-if="session.vehicleType === 'Car'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
                    <span class="plate-number">{{ session.vehiclePlate }}</span>
                    <span class="vehicle-brand">{{ session.brand || 'Unknown' }}</span>
                  </div>
                </div>
              </td>
              <td>
                <div class="owner-cell">
                  <span class="owner-name">{{ session.ownerName }}</span>
                  <span class="role-badge" :class="'role-badge--' + session.role.toLowerCase()">
                    {{ getRoleLabel(session.role) }}
                  </span>
                </div>
              </td>
              <td>
                <div class="history-time">
                  <span class="time-label">IN:</span>
                  <span class="time-value">{{ new Date(session.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</span>
                </div>
                <div class="history-time">
                  <span class="time-label">OUT:</span>
                  <span class="time-value">{{ new Date(session.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</span>
                </div>
              </td>
              <td>
                <span class="duration-badge duration-badge--history">{{ session.duration }}</span>
              </td>
              <td>
                <span class="charge-text">{{ session.charge }}</span>
              </td>
              <td>
                <span class="method-tag" :class="'method-tag--' + session.method.toLowerCase()">
                  {{ session.method === 'QrCode' ? 'QR Code' : 'Manual' }}
                </span>
              </td>
              <td>
                <span class="status-pill status-pill--exited">
                  {{ session.status }}
                </span>
              </td>
              <td class="actions-cell" @click.stop>
                <div class="actions-group">
                  <button class="action-icon-btn" title="View Details" @click="openDetails(session)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
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
    <ManualEntryModal
      :is-open="isManualEntryOpen"
      @close="isManualEntryOpen = false"
      @submit="handleManualEntrySubmit"
    />

    <SessionDetailModal
      :session="selectedSession"
      :is-open="isSessionDetailOpen"
      @close="isSessionDetailOpen = false"
      @exit="handleManualCheckout"
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
.parking-view {
  animation: fadeSlideUp 0.4s ease both;
}

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.parking-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

@media (max-width: 640px) {
  .parking-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
}

.parking-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.parking-subtitle {
  font-size: 14px;
  color: var(--color-muted);
  margin: 4px 0 0 0;
}

.add-entry-btn {
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
  box-shadow: 0 4px 12px var(--color-primary-light);
  transition: background 150ms ease, transform 150ms ease;
}

.add-entry-btn:hover {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.refresh-btn {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-muted);
  width: 40px;
  height: 40px;
  border-radius: var(--radius-button);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 150ms ease;
  box-sizing: border-box;
}

.refresh-btn:hover:not(:disabled) {
  background: var(--color-surface-lighter);
  color: var(--color-text);
  border-color: var(--color-muted);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spin-animation {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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
  min-height: 84px;
  box-sizing: border-box;
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
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

@media (max-width: 1024px) {
  .filters-bar {
    flex-direction: column;
    align-items: stretch;
  }
}

.search-wrapper {
  position: relative;
  flex: 1;
  max-width: 420px;
}

@media (max-width: 1024px) {
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
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

@media (max-width: 640px) {
  .toolbar-right {
    flex-direction: column;
    align-items: stretch;
  }
}

/* Tabs Switcher */
.tabs-switcher {
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-button);
  padding: 3px;
  display: flex;
  gap: 2px;
  height: 38px;
  box-sizing: border-box;
}

.tab-btn {
  background: transparent;
  border: none;
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 150ms ease;
}

.tab-btn:hover {
  color: var(--color-text);
}

.tab-btn.active {
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-soft);
}

.filters-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
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
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
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

.parking-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.parking-table th {
  padding: 16px 24px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-muted);
  letter-spacing: 1px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-lighter);
}

.parking-row {
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background 150ms ease;
  background: var(--color-surface);
}

.parking-row:hover {
  background: var(--color-surface-lighter);
}

.parking-row:last-child {
  border-bottom: none;
}

.parking-table td {
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
  background: var(--color-surface-muted);
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

/* Owner Cell */
.owner-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 140px;
}

.owner-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

/* Time format */
.time-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  display: block;
}

.date-sub {
  font-size: 11px;
  color: var(--color-muted);
  display: block;
  margin-top: 2px;
}

.history-time {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.time-label {
  font-weight: 700;
  color: var(--color-muted);
  font-size: 10px;
}

.time-value {
  color: var(--color-text);
  font-weight: 500;
}

/* Badges */
.role-badge {
  align-self: flex-start;
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.role-badge--admin {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.role-badge--student {
  background: rgba(16, 185, 129, 0.1);
  color: var(--color-success);
}

.role-badge--guard {
  background: rgba(59, 130, 246, 0.1);
  color: var(--color-info);
}

.role-badge--faculty,
.role-badge--staff,
.role-badge--universitystaff,
.role-badge--nonacademicpersonnel {
  background: rgba(253, 184, 19, 0.1);
  color: var(--color-warning);
}

.role-badge--guest,
.role-badge--visitor {
  background: var(--color-surface-muted);
  color: var(--color-muted);
}

.duration-badge {
  display: inline-block;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text);
  background: var(--color-surface);
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
}

.duration-badge--history {
  border-color: transparent;
  background: var(--color-surface-muted);
  color: var(--color-muted);
}

.gate-tag {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-muted);
}

.charge-text {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-success);
}

.method-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
}

.method-tag--qrcode {
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
}

.method-tag--manual {
  background: rgba(245, 158, 11, 0.1);
  color: var(--color-warning);
}

/* Status Pills */
.status-pill {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 20px;
}

.status-pill--parked {
  background: rgba(16, 185, 129, 0.1);
  color: var(--color-success);
}

.status-pill--overstay {
  background: rgba(210, 39, 48, 0.1);
  color: var(--color-danger);
}

.status-pill--exited {
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
  background: var(--color-surface);
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

.action-icon-btn--checkout {
  border-color: rgba(210, 39, 48, 0.2);
  color: var(--color-danger);
}

.action-icon-btn--checkout:hover {
  background: rgba(210, 39, 48, 0.1);
  color: var(--color-primary-dark);
}

.empty-state {
  text-align: center;
  padding: 48px !important;
  color: var(--color-muted);
  font-size: 14px;
}

/* Toast System styling */
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
  border-left: 4px solid var(--color-info);
}

.toast--info .toast-icon {
  color: var(--color-info);
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

/* Toast Transitions */
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
