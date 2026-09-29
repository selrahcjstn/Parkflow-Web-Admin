<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'
import UiCard from '@/components/ui/UiCard.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiTable, { type TableColumn } from '@/components/ui/UiTable.vue'
import UiStatusText from '@/components/ui/UiStatusText.vue'
import TablePagination from '@/components/ui/TablePagination.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import ReservationStats from '../components/ReservationStats.vue'
import ReservationFilters from '../components/ReservationFilters.vue'
import { useAdminNotificationStore } from '@/stores/notification.store'
import type { ParkingReservationItem, ReservationStatusType } from '../types'

const router = useRouter()

const resColumns: TableColumn[] = [
  { key: 'reference', label: 'Reference #' },
  { key: 'creator', label: 'Creator of the reservation' },
  { key: 'schedule', label: 'Date & Time Slot' },
  { key: 'purpose', label: 'Purpose / Reason' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions', align: 'right' }
]

const reservations = ref<ParkingReservationItem[]>([])
const isLoading = ref(true)
const fetchError = ref<string | null>(null)
const searchQuery = ref('')
const selectedStatusTab = ref<'all' | 'pending' | 'approved' | 'done' | 'rejected'>('all')
const selectedDateFilter = ref<string>('')
const notificationToast = ref<{ message: string; type: 'success' | 'error' } | null>(null)
let pollTimer: number | null = null

function parseReservationEndDateTime(dateStr?: string, endTimeStr?: string): Date | null {
  if (!dateStr) return null
  const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
  let year: number, month: number, day: number
  if (dateMatch) {
    year = parseInt(dateMatch[1]!, 10)
    month = parseInt(dateMatch[2]!, 10) - 1
    day = parseInt(dateMatch[3]!, 10)
  } else {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    year = d.getFullYear()
    month = d.getMonth()
    day = d.getDate()
  }

  let hours = 23
  let minutes = 59
  let seconds = 59

  if (endTimeStr) {
    const trimmed = endTimeStr.trim()
    const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i)
    if (ampmMatch) {
      let h = parseInt(ampmMatch[1]!, 10)
      const m = parseInt(ampmMatch[2]!, 10)
      const s = ampmMatch[3] ? parseInt(ampmMatch[3]!, 10) : 0
      const isPm = ampmMatch[4]!.toUpperCase() === 'PM'
      if (isPm && h < 12) h += 12
      if (!isPm && h === 12) h = 0
      hours = h
      minutes = m
      seconds = s
    } else {
      const parts = trimmed.split(':')
      if (parts.length >= 2) {
        hours = parseInt(parts[0]!, 10) || 0
        minutes = parseInt(parts[1]!, 10) || 0
        seconds = parts[2] ? parseInt(parts[2]!, 10) || 0 : 0
      }
    }
  }

  return new Date(year, month, day, hours, minutes, seconds)
}

function isReservationDone(item: ParkingReservationItem): boolean {
  if (!item) return false
  const rawStatus = String(item.status ?? '').toLowerCase()
  if (rawStatus === 'done' || rawStatus === 'completed' || item.status === 4) return true
  if (rawStatus === 'rejected' || rawStatus === 'cancelled' || item.status === 2 || item.status === 3) return false

  const endDateTime = parseReservationEndDateTime(item.reservationDate, item.endTime)
  if (!endDateTime) return false
  return new Date() > endDateTime
}

function getItemEffectiveStatus(item: ParkingReservationItem): 'Done' | 'Approved' | 'Pending' | 'Rejected' | 'Cancelled' | 'Expired' {
  const raw = formatStatus(item.status)
  if (raw === 'Rejected' || raw === 'Cancelled') return raw as any
  if (isReservationDone(item)) {
    return raw === 'Pending' ? 'Expired' : 'Done'
  }
  return raw as any
}

function formatStatus(status: ReservationStatusType): string {
  if (status === 0 || String(status).toLowerCase() === 'pending') return 'Pending'
  if (status === 1 || String(status).toLowerCase() === 'approved') return 'Approved'
  if (status === 2 || String(status).toLowerCase() === 'rejected') return 'Rejected'
  if (status === 3 || String(status).toLowerCase() === 'cancelled') return 'Cancelled'
  if (status === 4 || String(status).toLowerCase() === 'done' || String(status).toLowerCase() === 'completed') return 'Done'
  if (String(status).toLowerCase() === 'expired') return 'Expired'
  return String(status || 'Pending')
}

function formatItemStatus(item: ParkingReservationItem): string {
  return getItemEffectiveStatus(item)
}

function getStatusKey(target: ReservationStatusType | ParkingReservationItem): string {
  if (target && typeof target === 'object' && 'reservationDate' in target) {
    return getItemEffectiveStatus(target as ParkingReservationItem).toLowerCase()
  }
  return formatStatus(target as ReservationStatusType).toLowerCase()
}

function navigateToPass(item: ParkingReservationItem | null) {
  if (!item) return
  if (getStatusKey(item) === 'done' || isReservationDone(item)) {
    showToast('Cannot open pass: this reservation schedule is already completed.', 'error')
    return
  }
  router.push(`/reservations/${item.id}/pass`)
}

async function fetchReservations(silent = false) {
  if (!silent) {
    isLoading.value = true
    fetchError.value = null
  }
  try {
    const response = await api.get('/parking-reservations/admin/all')
    if (response.data && response.data.isSuccess && Array.isArray(response.data.data)) {
      reservations.value = response.data.data
      fetchError.value = null
    } else if (Array.isArray(response.data)) {
      reservations.value = response.data
      fetchError.value = null
    } else {
      reservations.value = []
    }
  } catch (error: any) {
    const status = error.response?.status
    const msg = error.response?.data?.message || error.message || 'Unknown error'
    const errText = status ? `API Error ${status}: ${msg}` : `Network Error: ${msg}`
    console.error('Reservations fetch error:', errText, error)
    fetchError.value = errText
    if (!silent) {
      reservations.value = []
    }
  } finally {
    if (!silent) {
      isLoading.value = false
    }
  }
}

let unsubscribeReservationUpdates: (() => void) | null = null
let unsubscribeApprovalUpdates: (() => void) | null = null

onMounted(() => {
  const notifStore = useAdminNotificationStore()
  notifStore.initSignalRConnection()

  const handleLiveUpdate = (data: any) => {
    console.log('[ReservationsPage] Live reservation update received via SignalR -> refreshing...', data)
    fetchReservations(true)
  }

  unsubscribeReservationUpdates = notifStore.onReservationUpdate(handleLiveUpdate)
  unsubscribeApprovalUpdates = notifStore.onApprovalUpdate(handleLiveUpdate)

  fetchReservations()

  pollTimer = window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      fetchReservations(true)
    }
  }, 60000)
})

onUnmounted(() => {
  if (pollTimer !== null) {
    clearInterval(pollTimer)
  }
  if (unsubscribeReservationUpdates) {
    unsubscribeReservationUpdates()
  }
  if (unsubscribeApprovalUpdates) {
    unsubscribeApprovalUpdates()
  }
})

function showToast(message: string, type: 'success' | 'error' = 'success') {
  notificationToast.value = { message, type }
  setTimeout(() => {
    notificationToast.value = null
  }, 4000)
}

// Stats computations
const totalCount = computed(() => reservations.value.length)
const pendingCount = computed(() => reservations.value.filter(r => getStatusKey(r) === 'pending').length)
const approvedCount = computed(() => reservations.value.filter(r => getStatusKey(r) === 'approved').length)
const doneCount = computed(() => reservations.value.filter(r => getStatusKey(r) === 'done' || getStatusKey(r) === 'expired').length)
const rejectedCount = computed(() => reservations.value.filter(r => getStatusKey(r) === 'rejected' || getStatusKey(r) === 'cancelled').length)

const counts = computed(() => ({
  total: totalCount.value,
  pending: pendingCount.value,
  approved: approvedCount.value,
  done: doneCount.value,
  rejected: rejectedCount.value,
}))

// Filtered list
const filteredReservations = computed(() => {
  return reservations.value.filter(item => {
    const statusKey = getStatusKey(item)
    
    // Tab filter
    if (selectedStatusTab.value === 'pending' && statusKey !== 'pending') return false
    if (selectedStatusTab.value === 'approved' && statusKey !== 'approved') return false
    if (selectedStatusTab.value === 'done' && statusKey !== 'done' && statusKey !== 'expired') return false
    if (selectedStatusTab.value === 'rejected' && statusKey !== 'rejected' && statusKey !== 'cancelled') return false

    // Date filter
    if (selectedDateFilter.value) {
      const itemDate = item.reservationDate ? item.reservationDate.split('T')[0] : ''
      if (itemDate !== selectedDateFilter.value) return false
    }

    // Search query filter
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      const matchRef = (item.referenceNumber || '').toLowerCase().includes(q)
      const matchName = (item.userFullName || '').toLowerCase().includes(q)
      const matchEmail = (item.userEmail || '').toLowerCase().includes(q)
      const matchReason = (item.reason || '').toLowerCase().includes(q)
      if (!matchRef && !matchName && !matchEmail && !matchReason) return false
    }

    return true
  })
})

// Pagination State
const currentPage = ref(1)
const itemsPerPage = ref(10)

watch([searchQuery, selectedStatusTab, selectedDateFilter], () => {
  currentPage.value = 1
})

const paginatedReservations = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredReservations.value.slice(start, start + itemsPerPage.value)
})

function formatReservationDate(dateStr: string): string {
  if (!dateStr) return 'N/A'
  try {
    let d: Date
    if (typeof dateStr === 'string') {
      const clean = dateStr.trim()
      if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
        d = new Date(`${clean}T00:00:00Z`)
      } else {
        d = new Date(clean)
      }
    } else {
      d = dateStr
    }
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', {
      timeZone: 'UTC',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  } catch {
    return dateStr
  }
}

function formatTimeSlot(start: string, end: string): string {
  if (!start || !end) return 'All Day Pass'
  const formatTime = (t: string) => {
    if (!t) return ''
    if (/^\d{1,2}:\d{2}\s*(AM|PM|am|pm)$/i.test(t.trim())) return t.trim()
    const parts = t.trim().split(':')
    let h = parseInt(parts[0] || '0', 10)
    const m = parts[1] || '00'
    const ampm = h >= 12 ? 'PM' : 'AM'
    h = h % 12 || 12
    return `${h}:${m} ${ampm}`
  }
  return `${formatTime(start)} - ${formatTime(end)}`
}

function getInitials(name: string): string {
  if (!name) return 'PF'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const avatarGradients = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #3b82f6, #1d4ed8)'
]

function getAvatarGradient(index: number): string {
  return avatarGradients[index % avatarGradients.length]!
}

function getNotifyEmailFromNotes(notes?: string | null): string | null {
  if (!notes) return null
  const match = notes.match(/\[NotifyEmail:(.*?)\]/)
  return (match && match[1]) ? match[1].trim() : null
}

// Approve Modal State
const isApproveModalOpen = ref(false)
const reservationToApprove = ref<ParkingReservationItem | null>(null)
const isApproving = ref(false)

function openApproveModal(item: ParkingReservationItem) {
  reservationToApprove.value = item
  isApproveModalOpen.value = true
}

async function confirmApprove() {
  if (!reservationToApprove.value) return
  isApproving.value = true
  try {
    const item = reservationToApprove.value
    await api.post(`/parking-reservations/${item.id}/approve`, { notes: '' })
    item.status = 'Approved'
    showToast(`Reservation ${item.referenceNumber} approved successfully.`)
    isApproveModalOpen.value = false
    reservationToApprove.value = null
  } catch (error: any) {
    showToast(`Failed to approve reservation: ${error.response?.data?.message || error.message}`, 'error')
  } finally {
    isApproving.value = false
  }
}

async function handleReject(item: ParkingReservationItem) {
  try {
    await api.post(`/parking-reservations/${item.id}/reject`, { notes: '' })
    item.status = 'Rejected'
    showToast(`Reservation ${item.referenceNumber} rejected.`, 'error')
  } catch (error: any) {
    showToast(`Failed to reject reservation: ${error.response?.data?.message || error.message}`, 'error')
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- API Error Banner -->
    <div v-if="fetchError" class="flex items-center gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-sm">
      <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <div class="flex-1">
        <strong class="font-semibold">Failed to load reservations:</strong>
        <span class="ml-1 opacity-90">{{ fetchError }}</span>
      </div>
      <UiButton size="xs" variant="secondary" @click="fetchReservations()">Retry</UiButton>
    </div>

    <!-- Notification Toast -->
    <Transition name="fade">
      <div
        v-if="notificationToast"
        class="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold shadow-xl text-white transition-all"
        :class="notificationToast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'"
      >
        <svg v-if="notificationToast.type === 'success'" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span>{{ notificationToast.message }}</span>
      </div>
    </Transition>

    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Parking Reservations & Schedule Management
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Review user parking schedule requests, approve date passes, and reserve parking slots for campus events.
        </p>
      </div>
      <div class="flex items-center gap-3">
        <UiButton
          variant="secondary"
          size="md"
          :loading="isLoading"
          @click="fetchReservations(false)"
          title="Refresh Data"
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

        <UiButton
          variant="primary"
          @click="router.push('/reservations/create')"
        >
          <template #prefix>
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" stroke-linecap="round" />
              <line x1="5" y1="12" x2="19" y2="12" stroke-linecap="round" />
            </svg>
          </template>
          Reserve Schedule
        </UiButton>
      </div>
    </div>

    <!-- Stats Cards Grid -->
    <ReservationStats
      :is-loading="isLoading"
      :total-count="totalCount"
      :pending-count="pendingCount"
      :approved-count="approvedCount"
      :done-count="doneCount"
      :rejected-count="rejectedCount"
    />

    <!-- Controls Bar (Frameless / Borderless) -->
    <ReservationFilters
      v-model:search-query="searchQuery"
      v-model:selected-status-tab="selectedStatusTab"
      v-model:selected-date-filter="selectedDateFilter"
      :counts="counts"
    />

    <!-- Table Container -->
    <UiCard custom-class="p-0 overflow-hidden">
      <UiTable
        :columns="resColumns"
        :data="paginatedReservations"
        :is-loading="isLoading"
        :loading-rows="6"
        empty-text="No schedule reservations found matching your criteria."
      >
        <template #cell-reference="{ item }">
          <span class="font-mono font-bold text-slate-900 dark:text-white text-xs">
            {{ item.referenceNumber }}
          </span>
        </template>

        <template #cell-creator="{ item, index }">
          <div class="flex items-center gap-3">
            <div
              class="w-8 h-8 rounded-full text-white font-bold flex items-center justify-center text-xs flex-shrink-0"
              :style="{ background: getAvatarGradient(index) }"
            >
              {{ getInitials(item.userFullName) }}
            </div>
            <div class="flex flex-col min-w-0">
              <span class="font-semibold text-slate-900 dark:text-white text-xs truncate">
                {{ item.userFullName || 'Campus User' }}
              </span>
              <span class="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {{ item.userEmail || 'N/A' }}
              </span>
              <span
                v-if="getNotifyEmailFromNotes(item.adminNotes)"
                class="text-[10px] text-blue-600 dark:text-blue-400 font-medium truncate"
              >
                Recipient: {{ getNotifyEmailFromNotes(item.adminNotes) }}
              </span>
            </div>
          </div>
        </template>

        <template #cell-schedule="{ item }">
          <div class="flex flex-col">
            <span class="font-semibold text-slate-900 dark:text-white text-xs">
              {{ formatReservationDate(item.reservationDate) }}
            </span>
            <span class="text-[11px] text-slate-500 dark:text-slate-400">
              {{ formatTimeSlot(item.startTime, item.endTime) }}
            </span>
          </div>
        </template>

        <template #cell-purpose="{ item }">
          <span class="text-xs text-slate-700 dark:text-slate-300 line-clamp-2" :title="item.reason">
            {{ item.reason }}
          </span>
        </template>

        <template #cell-status="{ item }">
          <UiStatusText
            :variant="
              getStatusKey(item) === 'approved'
                ? 'success'
                : getStatusKey(item) === 'done' || getStatusKey(item) === 'expired'
                ? 'neutral'
                : getStatusKey(item) === 'rejected' || getStatusKey(item) === 'cancelled'
                ? 'danger'
                : 'warning'
            "
            size="xs"
          >
            {{ formatItemStatus(item) }}
          </UiStatusText>
        </template>

        <template #cell-actions="{ item }">
          <div class="flex items-center justify-end gap-1.5" @click.stop>
            <button
              v-if="getStatusKey(item) === 'pending'"
              class="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition-colors cursor-pointer border-none"
              @click="openApproveModal(item)"
              title="Approve Reservation"
            >
              Approve
            </button>
            <button
              v-if="getStatusKey(item) === 'pending'"
              class="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 font-semibold text-xs hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer border border-rose-200 dark:border-rose-900"
              @click="handleReject(item)"
              title="Decline Reservation"
            >
              Decline
            </button>
            <button
              v-if="getStatusKey(item) === 'approved'"
              class="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-800"
              @click="navigateToPass(item)"
              title="View Official QR Pass"
            >
              QR Pass
            </button>
            <span
              v-if="getStatusKey(item) === 'done'"
              class="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Concluded
            </span>
            <span
              v-else-if="getStatusKey(item) === 'expired'"
              class="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800"
            >
              Expired
            </span>
            <button
              class="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer border-none"
              @click="router.push('/reservations/' + item.id)"
              title="Inspect Details"
            >
              Inspect
            </button>
          </div>
        </template>
      </UiTable>

      <TablePagination
        v-model:current-page="currentPage"
        v-model:items-per-page="itemsPerPage"
        :total-items="filteredReservations.length"
      />
    </UiCard>

    <!-- Approve Confirmation Modal -->
    <ConfirmModal
      :is-open="isApproveModalOpen"
      title="Approve Parking Reservation"
      :message="`Are you sure you want to approve the parking reservation for <strong>${reservationToApprove?.userFullName || 'this applicant'}</strong> (${reservationToApprove?.referenceNumber || ''}) on <strong>${formatReservationDate(reservationToApprove?.reservationDate || '')}</strong>? This will generate their official entry permit pass.`"
      confirm-text="Approve Reservation"
      cancel-text="Cancel"
      variant="success"
      :is-submitting="isApproving"
      @confirm="confirmApprove"
      @close="isApproveModalOpen = false"
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
