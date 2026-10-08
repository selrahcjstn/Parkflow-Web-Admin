<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api/axios'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiStatusText from '@/components/ui/UiStatusText.vue'
import { cachedActiveSessions, cachedHistorySessions } from '@/stores/appCache'
import type {
  ActiveSession,
  ParkingHistoryItem,
  ParkingStatus,
  EntryMethod,
  VehicleType,
} from '../types'

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
  if (role === 'UniversityStaff') return 'Faculty'
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
  const raw =
    ('method' in session.value ? session.value.method : (session.value as any)?.entryMethod) || ''
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
  const maxAllowed =
    item.maxAllowedHours ||
    (item.role === 'Student'
      ? 4
      : item.role === 'UniversityStaff' || item.role === 'Faculty' || item.role === 'NonAcademicPersonnel' || item.role === 'University Staff'
        ? 8
        : 4)
  return elapsedHours > maxAllowed
}

// Data mapping
function mapActive(item: any): ActiveSession {
  const isOverstay = checkSessionOverstay(item)
  const rawMethod = (item.entryMethod || item.method || item.entryType || '')
    .toString()
    .toLowerCase()
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
    ownerName: cleanOwnerName(
      `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.ownerName,
    ),
    role: item.role || 'Guest',
    email:
      item.email ||
      item.ownerEmail ||
      item.userAccount?.primaryEmail ||
      item.userAccount?.email ||
      undefined,
    checkInTime: item.entryTime || item.checkInTime,
    duration: item.totalParkingHours || '0m',
    gate: item.gate || 1,
    status: isOverstay ? 'Overstay' : (item.status as ParkingStatus) || 'Parked',
    method: entryMethodVal,
    scheduledEndTime: item.scheduledEndTime,
    maximumExitTime: item.maximumExitTime,
    maxAllowedHours: item.maxAllowedHours,
    overstayHours: item.overstayHours,
    amount: item.amount,
    fee:
      item.amount != null
        ? item.amount > 0
          ? `₱${Number(item.amount).toFixed(2)}`
          : '₱0.00'
        : undefined,
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

  const chargeStr =
    item.hasViolation && item.violationFee > 0 ? `₱${Number(item.violationFee).toFixed(2)}` : 'Free'

  const rawMethod = (item.entryMethod || item.method || item.entryType || '')
    .toString()
    .toLowerCase()
  let entryMethodVal: EntryMethod = 'Manual'
  if (
    rawMethod.includes('qr') ||
    rawMethod.includes('code') ||
    rawMethod.includes('rfid') ||
    rawMethod.includes('scan') ||
    item.entryMethod === 'QrCode'
  ) {
    entryMethodVal = 'QrCode'
  } else if (item.isManual === false || item.isManualEntry === false) {
    entryMethodVal = 'QrCode'
  } else if (
    item.userId ||
    (item.roleName && item.roleName !== 'Guest' && item.roleName !== 'Visitor')
  ) {
    entryMethodVal = 'QrCode'
  }

  return {
    id: `${item.plateNumber}-${item.entryTime}`,
    vehiclePlate: item.plateNumber,
    brand: item.brand || 'Unknown Brand',
    vehicleType: item.type as VehicleType,
    ownerName: cleanOwnerName(`${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Guest'),
    role: item.roleName || 'Guest',
    email:
      item.email ||
      item.ownerEmail ||
      item.userAccount?.primaryEmail ||
      item.userAccount?.email ||
      undefined,
    checkInTime: item.entryTime,
    checkOutTime: item.exitTime || '',
    duration: durationStr,
    charge: chargeStr,
    status: 'Exited' as ParkingStatus,
    method: entryMethodVal,
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
        String(s.plateNumber).toLowerCase() === targetId,
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
        String(s.plateNumber).toLowerCase() === targetId,
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
      api.get('/parking-history/all/page/1/100'),
    ])

    if (activeRes.status === 'fulfilled' && activeRes.value.data?.isSuccess) {
      const items = activeRes.value.data.data || []
      const mapped = items.map(mapActive)
      cachedActiveSessions.value = mapped
      const match = mapped.find(
        (s: any) =>
          String(s.id).toLowerCase() === targetId ||
          String(s.vehiclePlate).toLowerCase() === targetId,
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
          `${s.vehiclePlate}-${s.checkInTime}`.toLowerCase() === targetId,
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
      userId: loggedInUserId || undefined,
    })

    if (response.data && response.data.isSuccess) {
      const fee =
        response.data.data?.penaltyFee != null && response.data.data.penaltyFee > 0
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
        charge: fee,
      } as ParkingHistoryItem

      // Invalidate cache
      if (cachedActiveSessions.value) {
        cachedActiveSessions.value = cachedActiveSessions.value.filter(
          (s: any) => s.vehiclePlate !== plate,
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
  <div class="space-y-6">
    <!-- Header -->
    <div class="space-y-3">
      <button
        class="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
        @click="goBack"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to Live Parking Monitor
      </button>
      <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div class="min-w-0 space-y-1">
          <h1 class="text-2xl font-bold tracking-tight text-text">Parking Session Record</h1>
          <p class="text-sm leading-6 text-muted">
            Inspect real-time parking activity, entry verification, overstay metrics, and checkout
            status.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <UiButton
            variant="secondary"
            size="md"
            :loading="isLoading"
            @click="fetchSessionData"
            title="Refresh Session"
          >
            <template #prefix>
              <svg
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </template>
            Refresh
          </UiButton>
          <UiButton v-if="isActive && session" variant="primary" @click="handleCheckoutClick">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Manual Checkout
          </UiButton>
        </div>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="isLoading" class="space-y-5" role="status" aria-label="Loading record">
      <SkeletonLoader variant="rect" height="128px" class="rounded-card" />
      <div class="grid gap-6 xl:grid-cols-2">
        <SkeletonLoader variant="rect" height="220px" class="rounded-card" />
        <SkeletonLoader variant="rect" height="220px" class="rounded-card" />
      </div>
    </div>

    <!-- Not Found -->
    <div
      v-else-if="!session"
      class="flex flex-col items-center gap-4 rounded-card border border-border bg-surface px-6 py-12 text-center text-muted"
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p>Parking session record not found.</p>
      <button
        class="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
        @click="goBack"
      >
        Go back to Parking Monitor
      </button>
    </div>

    <!-- Content -->
    <div v-else class="space-y-6">
      <!-- HERO BANNER CARD -->
      <div
        class="flex flex-col justify-between gap-6 rounded-card border border-border bg-surface p-6 sm:flex-row"
      >
        <div class="min-w-0 space-y-3">
          <div class="space-y-1">
            <span class="block text-sm text-muted">License Plate</span>
            <span class="block break-all text-2xl font-bold text-text font-mono">{{
              session.vehiclePlate
            }}</span>
          </div>
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <span class="font-medium text-text">{{ session.brand || 'Vehicle' }}</span>
            <span class="text-subtle">•</span>
            <span class="text-muted">{{ getVehicleTypeLabel(session.vehicleType) }}</span>
            <span class="text-subtle">•</span>
            <span class="text-muted">Driver: {{ session.ownerName }}</span>
          </div>
        </div>

        <div class="flex flex-wrap gap-8 sm:shrink-0">
          <div class="space-y-2">
            <span class="block text-sm text-muted">Current State</span>
            <div class="pt-1">
              <UiStatusText :variant="statusVariant" size="sm">
                {{ session.status }}
              </UiStatusText>
            </div>
          </div>
          <div class="space-y-2">
            <span class="block text-sm text-muted">{{
              isActive ? 'Elapsed Time' : 'Total Duration'
            }}</span>
            <span class="block text-xl font-semibold text-text">{{ liveDuration }}</span>
          </div>
        </div>
      </div>

      <!-- 2-COLUMN MAIN DETAILS GRID -->
      <div class="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <!-- CARD 1: Vehicle & Clearance Properties -->
        <UiCard custom-class="p-6">
          <div class="mb-5 flex items-start gap-3 border-b border-border pb-4">
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-button bg-primary-light text-primary"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="3" y="11" width="18" height="6" rx="2" />
                <path d="M5 17h14" />
                <circle cx="7" cy="17" r="2" />
                <circle cx="17" cy="17" r="2" />
                <path d="M6 11l1.5-4.5h9L18 11" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-semibold text-text">Vehicle &amp; Entry Clearance</h3>
              <p class="mt-1 text-sm leading-5 text-muted">
                Identification, vehicle category, and gate entry authorization
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Plate Number</span>
              <span class="block break-words text-sm font-medium text-text font-mono font-bold">{{
                session.vehiclePlate
              }}</span>
            </div>
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Brand &amp; Model</span>
              <span class="block break-words text-sm font-medium text-text">{{
                session.brand || 'Unknown'
              }}</span>
            </div>
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Vehicle Type</span>
              <span
                class="block break-words text-sm font-medium text-text flex items-center gap-1.5"
              >
                <svg
                  v-if="session.vehicleType === 'Car'"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <rect x="3" y="11" width="18" height="6" rx="2" />
                  <path d="M5 17h14" />
                  <circle cx="7" cy="17" r="2" />
                  <circle cx="17" cy="17" r="2" />
                  <path d="M6 11l1.5-4.5h9L18 11" />
                </svg>
                <svg
                  v-else
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="5" cy="18" r="3" />
                  <circle cx="19" cy="18" r="3" />
                  <path d="M12 18V8h4" />
                  <path d="M5 18h14" opacity="0.3" />
                </svg>
                {{ getVehicleTypeLabel(session.vehicleType) }}
              </span>
            </div>
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Entry Verification Method</span>
              <span
                class="block break-words text-sm font-medium text-text flex items-center gap-1.5"
                :class="
                  isManualEntry ? 'text-warning  font-semibold' : 'text-primary  font-semibold'
                "
              >
                <svg
                  v-if="isManualEntry"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
                <svg
                  v-else
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                </svg>
                {{ entryMethodLabel }}
              </span>
            </div>
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Entry Location / Gate</span>
              <span class="block break-words text-sm font-medium text-text"
                >Gate {{ ('gate' in session ? session.gate : 1) || 1 }}</span
              >
            </div>
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Session ID</span>
              <span class="block break-words text-sm font-medium font-mono text-xs text-muted">{{
                session.id
              }}</span>
            </div>
          </div>
        </UiCard>

        <!-- CARD 2: Session Timing & Metrics -->
        <UiCard custom-class="p-6">
          <div class="mb-5 flex items-start gap-3 border-b border-border pb-4">
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-button bg-primary-light text-primary"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-semibold text-text">Session Timing &amp; Metrics</h3>
              <p class="mt-1 text-sm leading-5 text-muted">
                Check-in timestamp, exit time, schedule limits, and duration
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Check-In Time</span>
              <span class="block break-words text-sm text-text font-semibold">
                {{
                  new Date(session.checkInTime).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                }},
                {{
                  new Date(session.checkInTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                }}
              </span>
            </div>

            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">{{
                isActive ? 'Exit Time' : 'Completed Exit Time'
              }}</span>
              <span
                v-if="!isActive && (session as ParkingHistoryItem).checkOutTime"
                class="block break-words text-sm text-text font-semibold"
              >
                {{
                  new Date((session as ParkingHistoryItem).checkOutTime).toLocaleDateString(
                    'en-US',
                    { month: 'short', day: 'numeric', year: 'numeric' },
                  )
                }},
                {{
                  new Date((session as ParkingHistoryItem).checkOutTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                }}
              </span>
              <span v-else class="block break-words text-sm text-success font-semibold">
                Currently Parked (Active)
              </span>
            </div>

            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">{{
                isActive ? 'Current Elapsed Duration' : 'Total Duration'
              }}</span>
              <span class="block break-words text-sm font-medium text-text font-bold">{{
                liveDuration
              }}</span>
            </div>

            <div
              class="min-w-0 space-y-1"
              v-if="
                isActive &&
                (session as ActiveSession).maximumExitTime &&
                !(session as ActiveSession).maximumExitTime?.startsWith('0001')
              "
            >
              <span class="block text-sm text-muted">Must Exit By</span>
              <span class="block break-words text-sm font-semibold text-danger">
                {{
                  new Date((session as ActiveSession).maximumExitTime!).toLocaleDateString(
                    'en-US',
                    { month: 'short', day: 'numeric', year: 'numeric' },
                  )
                }},
                {{
                  new Date((session as ActiveSession).maximumExitTime!).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                }}
              </span>
            </div>

            <div
              class="min-w-0 space-y-1"
              v-if="isActive && (session as ActiveSession).scheduledEndTime"
            >
              <span class="block text-sm text-muted">Scheduled End Time</span>
              <span class="block break-words text-sm font-medium text-text">{{
                (session as ActiveSession).scheduledEndTime
              }}</span>
            </div>

            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Permitted Schedule Shift</span>
              <span class="block break-words text-sm font-medium text-text">{{
                session.role === 'Student' ? '4 Hours Class Limit' : '8 Hours Faculty Shift'
              }}</span>
            </div>
          </div>
        </UiCard>

        <!-- CARD 3: Owner & Driver Profile -->
        <UiCard custom-class="p-6">
          <div class="mb-5 flex items-start gap-3 border-b border-border pb-4">
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-button bg-primary-light text-primary"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-semibold text-text">Owner &amp; Driver Profile</h3>
              <p class="mt-1 text-sm leading-5 text-muted">
                Campus user affiliation, role clearance, and registration data
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Full Name</span>
              <span class="block break-words text-sm font-medium text-text font-bold">{{
                session.ownerName
              }}</span>
            </div>
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Email Address</span>
              <span class="block break-words text-sm font-medium text-text-secondary">
                {{ session.email || (session as any).ownerEmail || '—' }}
              </span>
            </div>
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Campus Classification</span>
              <span class="block break-words text-sm font-medium text-text">{{
                getRoleLabel(session.role)
              }}</span>
            </div>
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Clearance Tier</span>
              <span class="block break-words text-sm font-medium text-text">{{
                session.role === 'Guest' ? 'Visitor Gate Pass' : 'Authorized University Member'
              }}</span>
            </div>
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Account Verification</span>
              <span class="block break-words text-sm font-semibold text-success">{{
                session.role === 'Guest' ? 'Guest Pass' : 'Verified Profile'
              }}</span>
            </div>
          </div>
        </UiCard>

        <!-- CARD 4: Financials & Penalty Costs -->
        <UiCard custom-class="p-6">
          <div class="mb-5 flex items-start gap-3 border-b border-border pb-4">
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-button bg-primary-light text-primary"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-semibold text-text">Financials &amp; Penalty Costs</h3>
              <p class="mt-1 text-sm leading-5 text-muted">
                Applicable parking fees, penalty computation, and settlement status
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">{{
                isActive ? 'Estimated Fee' : 'Charged Fee'
              }}</span>
              <span
                class="block break-words text-sm font-medium text-text font-mono text-lg font-bold"
                :class="
                  isActive &&
                  (session as ActiveSession).amount &&
                  (session as ActiveSession).amount! > 0
                    ? 'text-danger'
                    : 'text-success'
                "
              >
                <template v-if="isActive">
                  {{
                    (session as ActiveSession).amount && (session as ActiveSession).amount! > 0
                      ? `₱${Number((session as ActiveSession).amount).toFixed(2)}`
                      : '₱0.00 (Free Pass)'
                  }}
                </template>
                <template v-else>
                  {{ (session as ParkingHistoryItem).charge || 'Free' }}
                </template>
              </span>
            </div>

            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Overstay Fine Rate</span>
              <span class="block break-words text-sm font-medium text-text"
                >₱20.00 / hour post-schedule</span
              >
            </div>

            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Billing Status</span>
              <span
                class="block break-words text-sm text-text font-semibold"
                :class="session.status === 'Overstay' ? 'text-danger' : 'text-success'"
              >
                {{ session.status === 'Overstay' ? 'Overstay Penalty Incurred' : 'Compliant' }}
              </span>
            </div>

            <div class="min-w-0 space-y-1">
              <span class="block text-sm text-muted">Payment Method</span>
              <span class="block break-words text-sm font-medium text-text"
                >Campus Gate Clearance (Cashless / Desk)</span
              >
            </div>
          </div>
        </UiCard>
      </div>
    </div>

    <!-- Manual Checkout Confirmation Modal -->
    <ConfirmModal
      :is-open="isConfirmCheckoutOpen"
      title="Confirm Manual Checkout"
      :message="`Are you sure you want to manually checkout vehicle <strong>${session?.vehiclePlate || ''}</strong> (${session?.brand || ''})?<br/><span class='text-xs text-muted'>This will record the vehicle's exit at the campus gate and finalize the active parking session.</span>`"
      confirm-text="Checkout Vehicle"
      cancel-text="Cancel"
      variant="warning"
      :is-submitting="isCheckingOut"
      @confirm="executeManualCheckout"
      @close="isConfirmCheckoutOpen = false"
    />

    <!-- Toast Notifications -->
    <div class="fixed bottom-5 right-5 z-50 flex max-w-sm flex-col gap-3">
      <TransitionGroup name="toast-fade">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="rounded-button border border-border bg-surface p-4 text-sm text-text shadow-soft"
          :class="
            toast.type === 'success'
              ? 'border-success/20 text-success'
              : 'border-warning/20 text-warning'
          "
        >
          {{ toast.message }}
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>
