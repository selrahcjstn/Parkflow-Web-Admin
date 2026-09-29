<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { ActiveSession, ParkingHistoryItem, VehicleType } from '../types'
import UiCard from '@/components/ui/UiCard.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiTable, { type TableColumn } from '@/components/ui/UiTable.vue'
import UiStatusText from '@/components/ui/UiStatusText.vue'
import TablePagination from '@/components/ui/TablePagination.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import ParkingStats from '../components/ParkingStats.vue'
import ParkingFilters from '../components/ParkingFilters.vue'
import api from '@/api/axios'
import { cachedActiveSessions, cachedHistorySessions } from '@/stores/appCache'

const activeColumns: TableColumn[] = [
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'owner', label: 'Owner' },
  { key: 'role', label: 'Role' },
  { key: 'entryTime', label: 'Entry Time' },
  { key: 'mustExitBy', label: 'Must Exit By' },
  { key: 'duration', label: 'Duration' },
  { key: 'fee', label: 'Estimated Fee' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions', align: 'right' }
]

const historyColumns: TableColumn[] = [
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'owner', label: 'Owner' },
  { key: 'role', label: 'Role' },
  { key: 'timeSlot', label: 'Entry → Exit Time' },
  { key: 'duration', label: 'Duration' },
  { key: 'fee', label: 'Fee' },
  { key: 'method', label: 'Method' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions', align: 'right' }
]

const router = useRouter()

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

const totalCapacity = ref(500)
const todaysEntriesCount = ref(0)
const activeSessions = ref<ActiveSession[]>(cachedActiveSessions.value || [])
const historySessions = ref<ParkingHistoryItem[]>(cachedHistorySessions.value || [])
const isLoading = ref(!cachedActiveSessions.value)

const getLoggedInUserId = (): string => {
  const directId = localStorage.getItem('parkflow_user_id')
  if (directId) return directId

  const token = localStorage.getItem('parkflow_token')
  if (!token) return ''
  try {
    const parts = token.split('.')
    const base64Url = parts[1]
    if (!base64Url) return ''
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(window.atob(base64))
    const userId = (
      payload.user_id ||
      payload.sub ||
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
      payload.nameid ||
      payload.id ||
      ''
    )
    if (userId) {
      localStorage.setItem('parkflow_user_id', userId)
    }
    return userId
  } catch (e) {
    console.error('Error decoding token:', e)
    return ''
  }
}

const isToday = (dateStr?: string) => {
  if (!dateStr) return false
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return false
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

const fetchParkingData = async () => {
  if (!cachedActiveSessions.value) {
    isLoading.value = true
  }
  try {
    const [activeRes, historyRes, settingsRes] = await Promise.allSettled([
      api.get(`/parking-logs/active-sessions?parkingCapacity=${totalCapacity.value}`),
      api.get('/parking-logs/history/page/1/1000'),
      api.get('/system-settings')
    ])

    if (settingsRes.status === 'fulfilled' && settingsRes.value.data?.isSuccess && settingsRes.value.data?.data?.totalCapacity) {
      totalCapacity.value = settingsRes.value.data.data.totalCapacity
    }

    if (activeRes.status === 'fulfilled' && activeRes.value.data?.isSuccess) {
      const rawActive = activeRes.value.data.data || []
      const mappedActive: ActiveSession[] = rawActive.map((s: any) => ({
        id: s.sessionId || s.id,
        vehiclePlate: s.plateNumber || s.vehiclePlate || 'N/A',
        vehicleType: s.vehicleType || 'Car',
        brand: s.brand || '',
        ownerName: s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : (s.ownerName || 'Unknown Driver'),
        role: s.role || 'Student',
        checkInTime: s.entryTime || s.checkInTime || new Date().toISOString(),
        duration: s.totalParkingHours ? `${s.totalParkingHours}h` : '0h 0m',
        amount: s.amount ?? 0,
        status: s.status || (s.overstayHours > 0 ? 'Overstay' : 'Parked'),
        maxAllowedHours: s.maxAllowedHours || 8
      }))
      activeSessions.value = mappedActive
      cachedActiveSessions.value = mappedActive
    }

    if (historyRes.status === 'fulfilled' && historyRes.value.data?.isSuccess) {
      const rawHistory = historyRes.value.data.data?.items || historyRes.value.data.data || []
      const mappedHistory: ParkingHistoryItem[] = rawHistory.map((s: any) => ({
        id: s.sessionId || s.id,
        vehiclePlate: s.plateNumber || s.vehiclePlate || 'N/A',
        vehicleType: s.vehicleType || 'Car',
        brand: s.brand || '',
        ownerName: s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : (s.ownerName || 'Unknown Driver'),
        role: s.role || 'Student',
        checkInTime: s.entryTime || s.checkInTime || new Date().toISOString(),
        checkOutTime: s.exitTime || s.checkOutTime || new Date().toISOString(),
        duration: s.totalParkingHours ? `${s.totalParkingHours}h` : '0h',
        amount: s.penaltyFee ?? s.amount ?? 0,
        method: s.entryMethod || 'QrCode',
        status: s.overstayHours > 0 ? 'Overdue' : 'Completed'
      }))
      historySessions.value = mappedHistory
      cachedHistorySessions.value = mappedHistory
    }

    updateTodaysEntriesCount()
  } catch (error) {
    console.error('Error fetching parking data:', error)
  } finally {
    isLoading.value = false
  }
}

let syncInterval: any = null

onMounted(() => {
  fetchParkingData()
  syncInterval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      fetchParkingData()
    }
  }, 30000)
})

onUnmounted(() => {
  if (syncInterval) clearInterval(syncInterval)
})

function getDuration(item: ActiveSession | ParkingHistoryItem): string {
  if (item.duration && item.duration !== '0h 0m' && item.duration !== '0h') {
    return item.duration
  }
  const checkIn = new Date(item.checkInTime)
  const exit = (item as ParkingHistoryItem).checkOutTime ? new Date((item as ParkingHistoryItem).checkOutTime) : new Date()
  const diffMs = exit.getTime() - checkIn.getTime()
  if (diffMs <= 0) return '0m'
  const hours = Math.floor(diffMs / 3600000)
  const mins = Math.floor((diffMs % 3600000) / 60000)
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
}

function getMustExitByParts(item: ActiveSession): { time: string; date: string } {
  const checkIn = new Date(item.checkInTime)
  const maxAllowed = item.maxAllowedHours || (item.role === 'Student' ? 4 : item.role === 'UniversityStaff' || item.role === 'Faculty' || item.role === 'NonAcademicPersonnel' ? 8 : 4)
  const mustExitDate = new Date(checkIn.getTime() + maxAllowed * 3600 * 1000)
  return {
    time: mustExitDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: mustExitDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }
}

function getStatusVariant(status: string): 'success' | 'danger' | 'warning' | 'neutral' {
  const s = (status || '').toLowerCase()
  if (s === 'parked' || s === 'active') return 'success'
  if (s === 'overstay' || s === 'overdue') return 'danger'
  if (s === 'exited' || s === 'completed') return 'neutral'
  return 'warning'
}

// View state
const currentTab = ref<'active' | 'history'>('active')
const searchQuery = ref('')
const filterVehicleType = ref<string>('all')
const filterStatus = ref<string>('all')
const filterMethod = ref<string>('all')

// Stats computations
const occupancyCount = computed(() => activeSessions.value.length)
const occupancyRate = computed(() => totalCapacity.value > 0 ? Math.round((occupancyCount.value / totalCapacity.value) * 100) : 0)
const overstayCount = computed(() => activeSessions.value.filter((s) => s.status === 'Overstay').length)

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

// Pagination State
const activeCurrentPage = ref(1)
const activeItemsPerPage = ref(10)
const historyCurrentPage = ref(1)
const historyItemsPerPage = ref(10)

const paginatedActiveSessions = computed(() => {
  const start = (activeCurrentPage.value - 1) * activeItemsPerPage.value
  return filteredActiveSessions.value.slice(start, start + activeItemsPerPage.value)
})

const paginatedHistorySessions = computed(() => {
  const start = (historyCurrentPage.value - 1) * historyItemsPerPage.value
  return filteredHistorySessions.value.slice(start, start + historyItemsPerPage.value)
})

watch([searchQuery, filterVehicleType, filterStatus, filterMethod], () => {
  activeCurrentPage.value = 1
  historyCurrentPage.value = 1
})

const openDetails = (session: ActiveSession | ParkingHistoryItem) => {
  const targetId = session.id || session.vehiclePlate
  router.push(`/parking/${encodeURIComponent(targetId)}`)
}

// Manual Checkout Confirmation Modal State
const isConfirmCheckoutOpen = ref(false)
const checkoutTargetSession = ref<ActiveSession | ParkingHistoryItem | null>(null)
const isCheckingOut = ref(false)

const checkoutConfirmMessage = computed(() => {
  if (!checkoutTargetSession.value) return 'Are you sure you want to checkout this vehicle?'
  const plate = checkoutTargetSession.value.vehiclePlate || (checkoutTargetSession.value as any).plateNumber || 'Unknown'
  const owner = checkoutTargetSession.value.ownerName ? ` (${checkoutTargetSession.value.ownerName})` : ''
  const amount = (checkoutTargetSession.value as any).amount
  const feeText = amount != null && Number(amount) > 0
    ? `<br/><span style="display:inline-block; margin-top:8px; font-size:13px;" class="text-amber-600 dark:text-amber-400 font-semibold">Estimated Overstay / Parking Fee: ₱${Number(amount).toFixed(2)}</span>`
    : ''
  return `Are you sure you want to manually checkout vehicle <strong class="font-mono text-slate-900 dark:text-white font-bold">${plate}</strong>${owner}?<br/><span class="text-xs text-slate-500">This will record the vehicle's exit at the campus gate and finalize the active parking session.</span>${feeText}`
})

const handleManualCheckout = (session: ActiveSession | ParkingHistoryItem) => {
  checkoutTargetSession.value = session
  isConfirmCheckoutOpen.value = true
}

const executeManualCheckout = async () => {
  if (!checkoutTargetSession.value) return
  const session = checkoutTargetSession.value
  const plate = session.vehiclePlate || (session as any).plateNumber
  if (!plate) {
    showToast('Failed to checkout: plate number is missing.', 'warning')
    return
  }

  const loggedInUserId = getLoggedInUserId()

  isCheckingOut.value = true
  try {
    const response = await api.patch('/parking-logs/manual-exit', {
      plateNumber: plate,
      userId: loggedInUserId || undefined
    })

    if (response.data && response.data.isSuccess) {
      const fee = response.data.data?.penaltyFee != null && response.data.data.penaltyFee > 0
        ? `₱${response.data.data.penaltyFee.toFixed(2)}`
        : 'Free'
      showToast(`Vehicle ${plate} checked out successfully. Fee: ${fee}`, 'success')
      isConfirmCheckoutOpen.value = false
      checkoutTargetSession.value = null
      await fetchParkingData()
    } else {
      showToast(response.data?.message || 'Failed to checkout vehicle.', 'warning')
    }
  } catch (error: any) {
    console.error('Error checking out vehicle:', error)
    const errMessage = error.response?.data?.message || 'Failed to checkout vehicle.'
    showToast(errMessage, 'warning')
  } finally {
    isCheckingOut.value = false
  }
}

const getVehicleTypeLabel = (type: VehicleType) => {
  if (type === 'ElectricBike') return 'E-Bike'
  return type
}

const getRoleLabel = (role: string) => {
  if (role === 'UniversityStaff') return 'Faculty Member'
  if (role === 'NonAcademicPersonnel') return 'University Staff'
  return role
}
</script>

<template>
  <div class="space-y-6">
    <!-- Toast Notifications -->
    <TransitionGroup name="fade">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold shadow-xl text-white transition-all"
        :class="toast.type === 'warning' ? 'bg-amber-600' : toast.type === 'info' ? 'bg-blue-600' : 'bg-emerald-600'"
      >
        <span>{{ toast.message }}</span>
      </div>
    </TransitionGroup>

    <!-- Page Header with Consistent Structure & Refresh Button -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Parking Operations
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Monitor real-time gate occupancy, active check-ins, and logs.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <UiButton
          variant="secondary"
          :loading="isLoading"
          @click="fetchParkingData"
        >
          <template #prefix>
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </template>
          Refresh
        </UiButton>
      </div>
    </div>

    <!-- Stats Grid Component -->
    <ParkingStats
      :is-loading="isLoading"
      :occupancy-count="occupancyCount"
      :total-capacity="totalCapacity"
      :occupancy-rate="occupancyRate"
      :todays-entries-count="todaysEntriesCount"
      :overstay-count="overstayCount"
      @click-today="currentTab = 'active'"
      @click-overstay="currentTab = 'active'; filterStatus = 'Overstay'"
    />

    <!-- Filters Bar (Frameless / Borderless) -->
    <ParkingFilters
      v-model:search-query="searchQuery"
      v-model:current-tab="currentTab"
      v-model:filter-vehicle-type="filterVehicleType"
      v-model:filter-status="filterStatus"
      v-model:filter-method="filterMethod"
    />

    <!-- Tables Container Card -->
    <UiCard custom-class="p-0 overflow-hidden">
      <!-- Active Sessions Table -->
      <UiTable
        v-if="currentTab === 'active'"
        :columns="activeColumns"
        :data="paginatedActiveSessions"
        :is-loading="isLoading"
        empty-text="No active parking sessions found."
        @row-click="openDetails"
      >
        <template #cell-vehicle="{ item }">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex-shrink-0">
              <svg v-if="item.vehicleType === 'Car'" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="6" rx="2" />
                <path d="M5 17h14" />
                <circle cx="7" cy="17" r="2" />
                <circle cx="17" cy="17" r="2" />
                <path d="M6 11l1.5-4.5h9L18 11" />
              </svg>
              <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="5" cy="18" r="3" />
                <circle cx="19" cy="18" r="3" />
                <path d="M12 18V8h4" />
                <path d="M5 18h14" opacity="0.3" />
              </svg>
            </div>
            <div class="flex flex-col">
              <span class="font-mono font-bold text-slate-900 dark:text-white text-xs">{{ item.vehiclePlate }}</span>
              <span class="text-[11px] text-slate-400 dark:text-slate-500">{{ item.brand || 'Unknown' }}</span>
            </div>
          </div>
        </template>

        <template #cell-owner="{ item }">
          <span class="font-semibold text-slate-900 dark:text-white text-xs truncate max-w-[140px] inline-block">{{ item.ownerName }}</span>
        </template>

        <template #cell-role="{ item }">
          <span class="text-xs text-slate-600 dark:text-slate-400">{{ getRoleLabel(item.role) }}</span>
        </template>

        <template #cell-entryTime="{ item }">
          <div class="flex flex-col">
            <span class="font-semibold text-slate-900 dark:text-white text-xs">{{ new Date(item.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</span>
            <span class="text-[11px] text-slate-400">{{ new Date(item.checkInTime).toLocaleDateString([], { month: 'short', day: 'numeric' }) }}</span>
          </div>
        </template>

        <template #cell-mustExitBy="{ item }">
          <div class="flex flex-col">
            <span
              class="text-xs font-semibold"
              :class="item.status === 'Overstay' ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-900 dark:text-white'"
            >
              {{ getMustExitByParts(item).time }}
            </span>
            <span
              class="text-[11px]"
              :class="item.status === 'Overstay' ? 'text-rose-400 dark:text-rose-500 font-medium' : 'text-slate-400'"
            >
              {{ getMustExitByParts(item).date }}
            </span>
          </div>
        </template>

        <template #cell-duration="{ item }">
          <span class="text-xs font-medium text-slate-700 dark:text-slate-300">{{ getDuration(item) }}</span>
        </template>

        <template #cell-fee="{ item }">
          <span class="font-bold text-slate-900 dark:text-white text-xs">
            {{ item.amount > 0 ? `₱${item.amount.toFixed(2)}` : 'Free' }}
          </span>
        </template>

        <template #cell-status="{ item }">
          <UiStatusText :variant="getStatusVariant(item.status)" size="xs">
            {{ item.status }}
          </UiStatusText>
        </template>

        <template #cell-actions="{ item }">
          <div class="flex items-center justify-end gap-1.5" @click.stop>
            <button
              class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer border-none"
              @click="handleManualCheckout(item)"
              title="Manual Gate Checkout"
            >
              Checkout
            </button>
            <button
              class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold transition-colors cursor-pointer border-none"
              @click="openDetails(item)"
              title="Inspect Session"
            >
              Inspect
            </button>
          </div>
        </template>
      </UiTable>

      <!-- History Table -->
      <UiTable
        v-else
        :columns="historyColumns"
        :data="paginatedHistorySessions"
        :is-loading="isLoading"
        empty-text="No past parking sessions found."
        @row-click="openDetails"
      >
        <template #cell-vehicle="{ item }">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex-shrink-0">
              <svg v-if="item.vehicleType === 'Car'" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="6" rx="2" />
                <path d="M5 17h14" />
                <circle cx="7" cy="17" r="2" />
                <circle cx="17" cy="17" r="2" />
                <path d="M6 11l1.5-4.5h9L18 11" />
              </svg>
              <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="5" cy="18" r="3" />
                <circle cx="19" cy="18" r="3" />
                <path d="M12 18V8h4" />
                <path d="M5 18h14" opacity="0.3" />
              </svg>
            </div>
            <div class="flex flex-col">
              <span class="font-mono font-bold text-slate-900 dark:text-white text-xs">{{ item.vehiclePlate }}</span>
              <span class="text-[11px] text-slate-400">{{ item.brand || 'Unknown' }}</span>
            </div>
          </div>
        </template>

        <template #cell-owner="{ item }">
          <span class="font-semibold text-slate-900 dark:text-white text-xs truncate max-w-[140px] inline-block">{{ item.ownerName }}</span>
        </template>

        <template #cell-role="{ item }">
          <span class="text-xs text-slate-600 dark:text-slate-400">{{ getRoleLabel(item.role) }}</span>
        </template>

        <template #cell-timeSlot="{ item }">
          <div class="flex flex-col">
            <span class="font-semibold text-slate-900 dark:text-white text-xs">
              {{ new Date(item.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }} → {{ new Date(item.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
            </span>
            <span class="text-[11px] text-slate-400">{{ new Date(item.checkInTime).toLocaleDateString([], { month: 'short', day: 'numeric' }) }}</span>
          </div>
        </template>

        <template #cell-duration="{ item }">
          <span class="text-xs font-medium text-slate-700 dark:text-slate-300">{{ getDuration(item) }}</span>
        </template>

        <template #cell-fee="{ item }">
          <span class="font-bold text-slate-900 dark:text-white text-xs">
            {{ item.amount > 0 ? `₱${item.amount.toFixed(2)}` : 'Free' }}
          </span>
        </template>

        <template #cell-method="{ item }">
          <span class="text-xs text-slate-600 dark:text-slate-400">{{ item.method === 'QrCode' ? 'QR Gate Pass' : 'Manual Entry' }}</span>
        </template>

        <template #cell-status="{ item }">
          <UiStatusText :variant="getStatusVariant(item.status)" size="xs">
            {{ item.status }}
          </UiStatusText>
        </template>

        <template #cell-actions="{ item }">
          <div class="flex items-center justify-end" @click.stop>
            <button
              class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold transition-colors cursor-pointer border-none"
              @click="openDetails(item)"
              title="Inspect Session"
            >
              Inspect
            </button>
          </div>
        </template>
      </UiTable>

      <!-- Pagination -->
      <TablePagination
        v-if="currentTab === 'active'"
        v-model:current-page="activeCurrentPage"
        v-model:items-per-page="activeItemsPerPage"
        :total-items="filteredActiveSessions.length"
      />
      <TablePagination
        v-else
        v-model:current-page="historyCurrentPage"
        v-model:items-per-page="historyItemsPerPage"
        :total-items="filteredHistorySessions.length"
      />
    </UiCard>

    <!-- Manual Checkout Confirmation Modal -->
    <ConfirmModal
      :is-open="isConfirmCheckoutOpen"
      title="Manual Gate Checkout"
      :message="checkoutConfirmMessage"
      confirm-text="Confirm Checkout"
      cancel-text="Cancel"
      variant="success"
      :is-submitting="isCheckingOut"
      @confirm="executeManualCheckout"
      @close="isConfirmCheckoutOpen = false"
    />
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
