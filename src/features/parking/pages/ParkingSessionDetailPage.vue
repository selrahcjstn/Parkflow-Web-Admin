<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api/axios'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiStatusText from '@/components/ui/UiStatusText.vue'
import { cachedActiveSessions, cachedHistorySessions } from '@/stores/appCache'
import type { ActiveSession, ParkingHistoryItem, ParkingStatus, EntryMethod, VehicleType } from '../types'

const route = useRoute()
const router = useRouter()

const sessionId = computed(() => decodeURIComponent(String(route.params.id || '')))

const session = ref<ActiveSession | ParkingHistoryItem | null>(null)
const isLoading = ref(true)

// Toast State
interface Toast {
  id: number
  message: string
  type: 'success' | 'info' | 'warning'
}
const toasts = ref<Toast[]>([])
let nextToastId = 1

const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
  const id = nextToastId++
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 4000)
}

// Manual Checkout Confirmation Modal State
const isConfirmCheckoutOpen = ref(false)
const isCheckingOut = ref(false)

const isActive = computed(() => {
  if (!session.value) return false
  return !('checkOutTime' in session.value) || !session.value.checkOutTime
})

// Real-time clock for elapsed duration
const now = ref(new Date())
let timerInterval: any = null

onMounted(() => {
  timerInterval = setInterval(() => {
    now.value = new Date()
  }, 30000)
})

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
  }
})

// Helpers & Formatters
function getLoggedInUserId(): string {
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
    return (
      payload.user_id ||
      payload.sub ||
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
      payload.nameid ||
      payload.id ||
      ''
    )
  } catch {
    return ''
  }
}

function getVehicleTypeLabel(type?: string | number): string {
  if (type === 0 || type === 'Motorcycle') return 'Motorcycle'
  if (type === 1 || type === 'ElectricBike') return 'E-Bike'
  if (type === 2 || type === 'Car') return 'Car'
  return String(type || 'Unknown')
}

function getRoleLabel(role?: string): string {
  if (!role) return 'Guest User'
  if (role === 'UniversityStaff') return 'Faculty Member'
  if (role === 'NonAcademicPersonnel') return 'University Staff'
  return role
}

function cleanOwnerName(name?: string): string {
  if (!name || !name.trim()) return 'Guest User'
  const parts = name.split(/\s+/).filter(Boolean)
  const unique = parts.filter((item, index) => parts.indexOf(item) === index)
  return unique.join(' ')
}

const entryMethodLabel = computed(() => {
  if (!session.value) return 'QR Code'
  const raw = ('method' in session.value ? session.value.method : (session.value as any)?.entryMethod) || ''
  const str = String(raw).toLowerCase()
  if (
    str.includes('manual') ||
    raw === 'Manual' ||
    raw === 1 ||
    raw === '1' ||
    (session.value as any)?.isManual === true ||
    (session.value as any)?.isManualEntry === true
  ) {
    return 'Manual Gate Entry'
  }
  return 'QR Code Scan'
})

const isManualEntry = computed(() => entryMethodLabel.value === 'Manual Gate Entry')

const statusVariant = computed(() => {
  if (!session.value) return 'neutral'
  if (session.value.status === 'Parked') return 'success'
  if (session.value.status === 'Overstay') return 'danger'
  if (session.value.status === 'Exited') return 'info'
  return 'neutral'
})

const liveDuration = computed(() => {
  if (!session.value) return '0m'
  if (!isActive.value) {
    return session.value.duration || '0m'
  }
  const checkIn = new Date(session.value.checkInTime).getTime()
  if (isNaN(checkIn)) return session.value.duration || '0m'
  const diffMs = Math.max(0, now.value.getTime() - checkIn)
  const totalMins = Math.floor(diffMs / (60 * 1000))
  const hrs = Math.floor(totalMins / 60)
  const mins = totalMins % 60
  if (hrs > 0) {
    return `${hrs}h ${mins}m`
  }
  return `${mins}m`
})

const checkSessionOverstay = (item: any): boolean => {
  if (item.status === 'Overstay' || (item.overstayHours && item.overstayHours > 0)) {
    return true
  }
  if (item.maximumExitTime && !item.maximumExitTime.startsWith('0001')) {
    const maxExit = new Date(item.maximumExitTime).getTime()
    if (!isNaN(maxExit) && now.value.getTime() > maxExit) {
      return true
    }
  }
  const checkIn = new Date(item.entryTime || item.checkInTime).getTime()
  if (isNaN(checkIn)) return false
  const elapsedHours = (now.value.getTime() - checkIn) / (3600 * 1000)
  const maxAllowed = item.maxAllowedHours || (item.role === 'Student' ? 4 : item.role === 'UniversityStaff' || item.role === 'Faculty' ? 8 : 4)
  return elapsedHours > maxAllowed
}

// Data mapping
function mapActive(item: any): ActiveSession {
  const isOverstay = checkSessionOverstay(item)
  const rawMethod = (item.entryMethod || item.method || item.entryType || '').toString().toLowerCase()
  let entryMethodVal: EntryMethod = 'QrCode'
  if (
    rawMethod.includes('manual') ||
    item.entryMethod === 'Manual' ||
    item.entryMethod === 1 ||
    item.entryMethod === '1' ||
    item.isManual === true ||
    item.isManualEntry === true
  ) {
    entryMethodVal = 'Manual'
  }

  return {
    id: item.plateNumber,
    vehiclePlate: item.plateNumber,
    brand: item.brand || 'Unknown Brand',
    vehicleType: item.vehicleType as VehicleType,
    ownerName: cleanOwnerName(`${item.firstName || ''} ${item.lastName || ''}`.trim() || item.ownerName),
    role: item.role || 'Guest',
    email: item.email || item.ownerEmail || (item.userAccount?.primaryEmail) || (item.userAccount?.email) || undefined,
    checkInTime: item.entryTime || item.checkInTime,
    duration: item.totalParkingHours || '0m',
    gate: item.gate || 1,
    status: isOverstay ? 'Overstay' : (item.status as ParkingStatus || 'Parked'),
    method: entryMethodVal,
    scheduledEndTime: item.scheduledEndTime,
    maximumExitTime: item.maximumExitTime,
    maxAllowedHours: item.maxAllowedHours,
    overstayHours: item.overstayHours,
    amount: item.amount,
    fee: item.amount != null ? (item.amount > 0 ? `₱${Number(item.amount).toFixed(2)}` : '₱0.00') : undefined
  }
}

function mapHistory(item: any): ParkingHistoryItem {
  let durationStr = '0m'
  if (item.parkingDuration != null) {
    const totalMins = Math.floor(item.parkingDuration * 60)
    const hrs = Math.floor(totalMins / 60)
    const mins = totalMins % 60
    durationStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`
  }

  const chargeStr = item.hasViolation && item.violationFee > 0
    ? `₱${Number(item.violationFee).toFixed(2)}`
    : 'Free'

  const rawMethod = (item.entryMethod || item.method || item.entryType || '').toString().toLowerCase()
  let entryMethodVal: EntryMethod = 'Manual'
  if (rawMethod.includes('qr') || rawMethod.includes('code') || rawMethod.includes('rfid') || rawMethod.includes('scan') || item.entryMethod === 'QrCode') {
    entryMethodVal = 'QrCode'
  } else if (item.isManual === false || item.isManualEntry === false) {
    entryMethodVal = 'QrCode'
  } else if (item.userId || (item.roleName && item.roleName !== 'Guest' && item.roleName !== 'Visitor')) {
    entryMethodVal = 'QrCode'
  }

  return {
    id: `${item.plateNumber}-${item.entryTime}`,
    vehiclePlate: item.plateNumber,
    brand: item.brand || 'Unknown Brand',
    vehicleType: item.type as VehicleType,
    ownerName: cleanOwnerName(`${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Guest'),
    role: item.roleName || 'Guest',
    email: item.email || item.ownerEmail || (item.userAccount?.primaryEmail) || (item.userAccount?.email) || undefined,
    checkInTime: item.entryTime,
    checkOutTime: item.exitTime || '',
    duration: durationStr,
    charge: chargeStr,
    status: 'Exited' as ParkingStatus,
    method: entryMethodVal
  }
}

const fetchSessionData = async () => {
  const targetId = sessionId.value.trim().toLowerCase()
  if (!targetId) {
    isLoading.value = false
    return
  }

  // 1. Check cachedActiveSessions
  if (cachedActiveSessions.value && Array.isArray(cachedActiveSessions.value)) {
    const foundActive = cachedActiveSessions.value.find(
      (s: any) =>
        String(s.id).toLowerCase() === targetId ||
        String(s.vehiclePlate).toLowerCase() === targetId ||
        String(s.plateNumber).toLowerCase() === targetId
    )
    if (foundActive) {
      session.value = foundActive
      isLoading.value = false
      return
    }
  }

  // 2. Check cachedHistorySessions
  if (cachedHistorySessions.value && Array.isArray(cachedHistorySessions.value)) {
    const foundHistory = cachedHistorySessions.value.find(
      (s: any) =>
        String(s.id).toLowerCase() === targetId ||
        String(s.vehiclePlate).toLowerCase() === targetId ||
        String(s.plateNumber).toLowerCase() === targetId
    )
    if (foundHistory) {
      session.value = foundHistory
      isLoading.value = false
      return
    }
  }

  // 3. Fallback: Fetch fresh from API
  isLoading.value = true
  try {
    const [activeRes, historyRes] = await Promise.allSettled([
      api.get('/parking-logs/active-sessions?parkingCapacity=200'),
      api.get('/parking-history/all/page/1/100')
    ])

    if (activeRes.status === 'fulfilled' && activeRes.value.data?.isSuccess) {
      const items = activeRes.value.data.data || []
      const mapped = items.map(mapActive)
      cachedActiveSessions.value = mapped
      const match = mapped.find(
        (s: any) =>
          String(s.id).toLowerCase() === targetId ||
          String(s.vehiclePlate).toLowerCase() === targetId
      )
      if (match) {
        session.value = match
        isLoading.value = false
        return
      }
    }

    if (historyRes.status === 'fulfilled' && historyRes.value.data?.isSuccess) {
      const items = historyRes.value.data.data?.items || []
      const mapped = items.map(mapHistory)
      cachedHistorySessions.value = mapped
      const match = mapped.find(
        (s: any) =>
          String(s.id).toLowerCase() === targetId ||
          String(s.vehiclePlate).toLowerCase() === targetId ||
          `${s.vehiclePlate}-${s.checkInTime}`.toLowerCase() === targetId
      )
      if (match) {
        session.value = match
        isLoading.value = false
        return
      }
    }
  } catch (err) {
    console.error('Error fetching parking session detail:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchSessionData()
})

function goBack() {
  router.push('/parking')
}

// Manual Checkout Action
const handleCheckoutClick = () => {
  isConfirmCheckoutOpen.value = true
}

const executeManualCheckout = async () => {
  if (!session.value) return
  const plate = session.value.vehiclePlate
  if (!plate) {
    showToast('Failed to checkout: plate number is missing.', 'warning')
    return
  }

  isCheckingOut.value = true
  const loggedInUserId = getLoggedInUserId()

  try {
    const response = await api.patch('/parking-logs/manual-exit', {
      plateNumber: plate,
      userId: loggedInUserId || undefined
    })

    if (response.data && response.data.isSuccess) {
      const fee = response.data.data?.penaltyFee != null && response.data.data.penaltyFee > 0
        ? `₱${response.data.data.penaltyFee.toFixed(2)}`
        : 'Free'
      showToast(`Vehicle ${plate} checked out successfully. Final Fee: ${fee}`, 'success')
      isConfirmCheckoutOpen.value = false

      // Update current session view
      const exitTimeStr = new Date().toISOString()
      session.value = {
        ...session.value,
        status: 'Exited',
        checkOutTime: exitTimeStr,
        charge: fee
      } as ParkingHistoryItem

      // Invalidate cache
      if (cachedActiveSessions.value) {
        cachedActiveSessions.value = cachedActiveSessions.value.filter(
          (s: any) => s.vehiclePlate !== plate
        )
      }
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
</script>

<template>
  <div class="parking-detail-page">
    <!-- Header -->
    <div class="page-header">
      <button class="back-btn" @click="goBack">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to Live Parking Monitor
      </button>
      <div class="header-content">
        <div class="header-titles">
          <h1 class="page-title">Parking Session Record</h1>
          <p class="page-subtitle">Inspect real-time parking activity, entry verification, overstay metrics, and checkout status.</p>
        </div>
        <div class="header-actions">
          <UiButton
            variant="secondary"
            size="md"
            :loading="isLoading"
            @click="fetchSessionData"
            title="Refresh Session"
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
          <button
            v-if="isActive && session"
            class="checkout-action-btn"
            @click="handleCheckoutClick"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Manual Checkout
          </button>
        </div>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="isLoading" class="loading-container">
      <div class="skeleton-card">
        <div class="skeleton skeleton-hero" />
        <div class="skeleton skeleton-line" style="width: 40%; margin-top: 16px;" />
        <div class="skeleton skeleton-line" style="width: 60%; margin-top: 10px;" />
      </div>
      <div class="skeleton-card" style="margin-top: 20px;">
        <div class="skeleton skeleton-line" style="width: 80%;" />
        <div class="skeleton skeleton-line" style="width: 60%; margin-top: 10px;" />
      </div>
    </div>

    <!-- Not Found -->
    <div v-else-if="!session" class="not-found-card">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p>Parking session record not found.</p>
      <button class="back-btn" @click="goBack">Go back to Parking Monitor</button>
    </div>

    <!-- Content -->
    <div v-else class="detail-container">

      <!-- HERO BANNER CARD -->
      <div class="hero-session-card" :class="'hero-session--' + session.status.toLowerCase()">
        <div class="hero-left">
          <div class="hero-plate-badge">
            <span class="hero-plate-label">License Plate</span>
            <span class="hero-plate-number font-mono">{{ session.vehiclePlate }}</span>
          </div>
          <div class="hero-vehicle-meta">
            <span class="hero-brand">{{ session.brand || 'Vehicle' }}</span>
            <span class="hero-dot">•</span>
            <span class="hero-type">{{ getVehicleTypeLabel(session.vehicleType) }}</span>
            <span class="hero-dot">•</span>
            <span class="hero-owner">Driver: {{ session.ownerName }}</span>
          </div>
        </div>

        <div class="hero-right">
          <div class="hero-status-box">
            <span class="hero-status-label">Current State</span>
            <div class="hero-status-tag">
              <UiStatusText :variant="statusVariant" size="sm">
                {{ session.status }}
              </UiStatusText>
            </div>
          </div>
          <div class="hero-duration-box">
            <span class="hero-duration-label">{{ isActive ? 'Elapsed Time' : 'Total Duration' }}</span>
            <span class="hero-duration-value">{{ liveDuration }}</span>
          </div>
        </div>
      </div>

      <!-- 2-COLUMN MAIN DETAILS GRID -->
      <div class="details-cards-layout">

        <!-- CARD 1: Vehicle & Clearance Properties -->
        <div class="form-card">
          <div class="card-header">
            <div class="card-icon-badge card-icon-badge--blue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="6" rx="2" />
                <path d="M5 17h14" />
                <circle cx="7" cy="17" r="2" />
                <circle cx="17" cy="17" r="2" />
                <path d="M6 11l1.5-4.5h9L18 11" />
              </svg>
            </div>
            <div>
              <h3 class="card-title">Vehicle &amp; Entry Clearance</h3>
              <p class="card-subtitle">Identification, vehicle category, and gate entry authorization</p>
            </div>
          </div>

          <div class="details-grid">
            <div class="detail-item">
              <span class="detail-label">Plate Number</span>
              <span class="detail-value font-mono font-bold">{{ session.vehiclePlate }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Brand &amp; Model</span>
              <span class="detail-value">{{ session.brand || 'Unknown' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Vehicle Type</span>
              <span class="detail-value flex items-center gap-1.5">
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
                {{ getVehicleTypeLabel(session.vehicleType) }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Entry Verification Method</span>
              <span class="detail-value flex items-center gap-1.5" :class="isManualEntry ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-indigo-600 dark:text-indigo-400 font-semibold'">
                <svg v-if="isManualEntry" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                </svg>
                {{ entryMethodLabel }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Entry Location / Gate</span>
              <span class="detail-value">Gate {{ ('gate' in session ? session.gate : 1) || 1 }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Session ID</span>
              <span class="detail-value font-mono text-xs text-slate-500">{{ session.id }}</span>
            </div>
          </div>
        </div>

        <!-- CARD 2: Session Timing & Metrics -->
        <div class="form-card">
          <div class="card-header">
            <div class="card-icon-badge card-icon-badge--purple">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <h3 class="card-title">Session Timing &amp; Metrics</h3>
              <p class="card-subtitle">Check-in timestamp, exit time, schedule limits, and duration</p>
            </div>
          </div>

          <div class="details-grid">
            <div class="detail-item">
              <span class="detail-label">Check-In Time</span>
              <span class="detail-value font-semibold">
                {{ new Date(session.checkInTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }},
                {{ new Date(session.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }}
              </span>
            </div>

            <div class="detail-item">
              <span class="detail-label">{{ isActive ? 'Exit Time' : 'Completed Exit Time' }}</span>
              <span v-if="!isActive && (session as ParkingHistoryItem).checkOutTime" class="detail-value font-semibold">
                {{ new Date((session as ParkingHistoryItem).checkOutTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }},
                {{ new Date((session as ParkingHistoryItem).checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }}
              </span>
              <span v-else class="detail-value text-emerald-600 font-semibold">
                Currently Parked (Active)
              </span>
            </div>

            <div class="detail-item">
              <span class="detail-label">{{ isActive ? 'Current Elapsed Duration' : 'Total Duration' }}</span>
              <span class="detail-value font-bold text-slate-900 dark:text-white">{{ liveDuration }}</span>
            </div>

            <div class="detail-item" v-if="isActive && (session as ActiveSession).maximumExitTime && !(session as ActiveSession).maximumExitTime?.startsWith('0001')">
              <span class="detail-label">Must Exit By</span>
              <span class="detail-value font-semibold text-rose-600 dark:text-rose-400">
                {{ new Date((session as ActiveSession).maximumExitTime!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }},
                {{ new Date((session as ActiveSession).maximumExitTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
              </span>
            </div>

            <div class="detail-item" v-if="isActive && (session as ActiveSession).scheduledEndTime">
              <span class="detail-label">Scheduled End Time</span>
              <span class="detail-value">{{ (session as ActiveSession).scheduledEndTime }}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Permitted Schedule Shift</span>
              <span class="detail-value">{{ (session.role === 'Student') ? '4 Hours Class Limit' : '8 Hours Faculty Shift' }}</span>
            </div>
          </div>
        </div>

        <!-- CARD 3: Owner & Driver Profile -->
        <div class="form-card">
          <div class="card-header">
            <div class="card-icon-badge card-icon-badge--orange">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <h3 class="card-title">Owner &amp; Driver Profile</h3>
              <p class="card-subtitle">Campus user affiliation, role clearance, and registration data</p>
            </div>
          </div>

          <div class="details-grid">
            <div class="detail-item">
              <span class="detail-label">Full Name</span>
              <span class="detail-value font-bold">{{ session.ownerName }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Email Address</span>
              <span class="detail-value font-medium text-slate-700 dark:text-slate-300">
                {{ session.email || (session as any).ownerEmail || '—' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Campus Classification</span>
              <span class="detail-value">{{ getRoleLabel(session.role) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Clearance Tier</span>
              <span class="detail-value font-medium">{{ session.role === 'Guest' ? 'Visitor Gate Pass' : 'Authorized University Member' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Account Verification</span>
              <span class="detail-value font-semibold text-emerald-600">{{ session.role === 'Guest' ? 'Guest Pass' : 'Verified Profile' }}</span>
            </div>
          </div>
        </div>

        <!-- CARD 4: Financials & Penalty Costs -->
        <div class="form-card">
          <div class="card-header">
            <div class="card-icon-badge card-icon-badge--green">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div>
              <h3 class="card-title">Financials &amp; Penalty Costs</h3>
              <p class="card-subtitle">Applicable parking fees, penalty computation, and settlement status</p>
            </div>
          </div>

          <div class="details-grid">
            <div class="detail-item">
              <span class="detail-label">{{ isActive ? 'Estimated Fee' : 'Charged Fee' }}</span>
              <span
                class="detail-value font-mono text-lg font-bold"
                :class="(isActive && (session as ActiveSession).amount && (session as ActiveSession).amount! > 0) ? 'text-rose-600' : 'text-emerald-600'"
              >
                <template v-if="isActive">
                  {{ ((session as ActiveSession).amount && (session as ActiveSession).amount! > 0) ? `₱${Number((session as ActiveSession).amount).toFixed(2)}` : '₱0.00 (Free Pass)' }}
                </template>
                <template v-else>
                  {{ (session as ParkingHistoryItem).charge || 'Free' }}
                </template>
              </span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Overstay Fine Rate</span>
              <span class="detail-value">₱20.00 / hour post-schedule</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Billing Status</span>
              <span class="detail-value font-semibold" :class="session.status === 'Overstay' ? 'text-rose-600' : 'text-emerald-600'">
                {{ session.status === 'Overstay' ? 'Overstay Penalty Incurred' : 'Compliant' }}
              </span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Payment Method</span>
              <span class="detail-value">Campus Gate Clearance (Cashless / Desk)</span>
            </div>
          </div>
        </div>

      </div>

    </div>

    <!-- Manual Checkout Confirmation Modal -->
    <ConfirmModal
      :is-open="isConfirmCheckoutOpen"
      title="Confirm Manual Checkout"
      :message="`Are you sure you want to manually checkout vehicle <strong>${session?.vehiclePlate || ''}</strong> (${session?.brand || ''})?<br/><span class='text-xs text-slate-500'>This will record the vehicle's exit at the campus gate and finalize the active parking session.</span>`"
      confirm-text="Checkout Vehicle"
      cancel-text="Cancel"
      variant="warning"
      :is-submitting="isCheckingOut"
      @confirm="executeManualCheckout"
      @close="isConfirmCheckoutOpen = false"
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
.parking-detail-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ── Header ── */
.page-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--color-muted, #64748b);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  transition: color 150ms ease;
  width: fit-content;
}

.back-btn:hover {
  color: var(--color-primary, #7B1113);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text, #1e293b);
  margin: 0;
  letter-spacing: -0.3px;
}

.page-subtitle {
  font-size: 13px;
  color: var(--color-muted, #64748b);
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.checkout-action-btn {
  background: var(--btn-primary-bg, #7B1113);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-button, 8px);
  padding: 9px 16px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(123, 17, 19, 0.2);
  transition: all 150ms ease;
}

.checkout-action-btn:hover {
  background: var(--btn-primary-hover, #6C0F11);
  transform: translateY(-1px);
}

/* ── Hero Session Card ── */
.hero-session-card {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-card, 16px);
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

@media (max-width: 768px) {
  .hero-session-card {
    flex-direction: column;
    align-items: flex-start;
  }
}

.hero-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hero-plate-badge {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.hero-plate-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-muted, #64748b);
}

.hero-plate-number {
  font-size: 28px;
  font-weight: 900;
  color: var(--color-text, #1e293b);
  letter-spacing: 1px;
}

.hero-vehicle-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--color-muted, #64748b);
  font-weight: 500;
  flex-wrap: wrap;
}

.hero-dot {
  opacity: 0.5;
}

.hero-right {
  display: flex;
  align-items: center;
  gap: 24px;
}

.hero-status-box,
.hero-duration-box {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

@media (max-width: 768px) {
  .hero-right {
    width: 100%;
    justify-content: space-between;
  }
  .hero-status-box,
  .hero-duration-box {
    align-items: flex-start;
  }
}

.hero-status-label,
.hero-duration-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-muted, #64748b);
}

.hero-duration-value {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text, #1e293b);
}

/* ── Details Grid Layout ── */
.details-cards-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 960px) {
  .details-cards-layout {
    grid-template-columns: 1fr;
  }
}

.form-card {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-card, 16px);
  padding: 24px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border, #f1f5f9);
  margin-bottom: 20px;
}

.card-icon-badge {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-icon-badge--blue   { background: rgba(123, 17, 19, 0.08);  color: var(--color-primary, #7B1113); }
.card-icon-badge--purple { background: rgba(147, 51, 234, 0.1); color: #9333ea; }
.card-icon-badge--orange { background: rgba(245, 158, 11, 0.1); color: #d97706; }
.card-icon-badge--green  { background: rgba(5, 150, 105, 0.1);  color: #059669; }

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text, #1e293b);
  margin: 0;
}

.card-subtitle {
  font-size: 12px;
  color: var(--color-muted, #64748b);
  margin: 2px 0 0 0;
}

.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px 24px;
}

@media (max-width: 540px) {
  .details-grid {
    grid-template-columns: 1fr;
  }
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-muted, #64748b);
  font-weight: 600;
}

.detail-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text, #1e293b);
}

/* ── Loading Skeleton ── */
.loading-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.skeleton-card {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-card, 16px);
  padding: 24px;
}

.skeleton {
  background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 6px;
}

.skeleton-hero { height: 120px; width: 100%; border-radius: 10px; }
.skeleton-line { height: 16px; }

@keyframes shimmer {
  from { background-position: 200% 0; }
  to   { background-position: -200% 0; }
}

/* ── Not found ── */
.not-found-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 48px 24px;
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-card, 16px);
  color: var(--color-muted, #64748b);
  text-align: center;
}
.not-found-card p { font-size: 15px; font-weight: 600; margin: 0; }

/* ── Toast Notifications ── */
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
  border-radius: var(--radius-button, 8px);
  font-size: 13px;
  font-weight: 600;
  color: white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.toast--success { background: #059669; }
.toast--warning { background: #d97706; }
.toast--info    { background: #2563eb; }

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
