<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import api from '@/api/axios'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import TablePagination from '@/components/ui/TablePagination.vue'
import UiTable, { type TableColumn } from '@/components/ui/UiTable.vue'
import UiStatusText from '@/components/ui/UiStatusText.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import ApprovalCard from '../components/ApprovalCard.vue'
import ApprovalFilters from '../components/ApprovalFilters.vue'
import ApprovalInspectorModal from '../components/ApprovalInspectorModal.vue'
import DocumentZoomModal from '../components/DocumentZoomModal.vue'
import type { ScheduleItem } from '../components/ScheduleEditor.vue'
import { formatDocUrl } from '@/utils/documentUrl'
import { cachedApprovals } from '@/stores/appCache'
import { useAdminNotificationStore } from '@/stores/notification.store'

export type ApprovalCategory = 'Registration' | 'Schedule' | 'Vehicle'

export interface ApprovalItem {
  id: number | string
  guid: string
  category: ApprovalCategory
  fullName: string
  email: string
  role: string
  dateApplied: string
  academicTerm?: string
  vehiclePlate: string
  vehicleType: string
  brand: string
  corUrl?: string
  orcrUrl?: string
  motorPicUrl?: string
  schedules?: ScheduleItem[]
  status: 'pending' | 'approved' | 'rejected'
  verificationStatus: number
}

const regColumns: TableColumn[] = [
  { key: 'applicant', label: 'Applicant' },
  { key: 'category', label: 'Category' },
  { key: 'dateApplied', label: 'Date Applied' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions', align: 'right' }
]

const defaultCorPdf = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
const defaultOrcrImage = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80'
const defaultMotorImage = 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80'

// Reactive state
const approvals = ref<ApprovalItem[]>(cachedApprovals.value || [])
const isLoading = ref(!cachedApprovals.value || cachedApprovals.value.length === 0)
const searchQuery = ref('')
const selectedStatusTab = ref<'all' | 'pending' | 'approved' | 'rejected'>('all')
const selectedCategoryFilter = ref<'all' | 'Registration' | 'Schedule' | 'Vehicle'>('all')
const viewMode = ref<'grid' | 'table'>('grid')

// Pagination State
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Inspector & Zoom Modal State
const inspectorItem = ref<ApprovalItem | null>(null)
const isInspectorOpen = ref(false)
const selectedZoomImage = ref<string | null>(null)

// Stats Computations
const pendingCount = computed(() => approvals.value.filter((r) => r.status === 'pending').length)
const approvedCount = computed(() => approvals.value.filter((r) => r.status === 'approved').length)
const rejectedCount = computed(() => approvals.value.filter((r) => r.status === 'rejected').length)

const scheduleCount = computed(() => approvals.value.filter((r) => r.category === 'Schedule').length)
const vehicleCount = computed(() => approvals.value.filter((r) => r.category === 'Vehicle').length)

const filteredApprovals = computed(() => {
  return approvals.value.filter((item) => {
    const q = (searchQuery.value || '').toLowerCase().trim()
    const matchesQuery =
      !q ||
      (item.fullName || '').toLowerCase().includes(q) ||
      (item.email || '').toLowerCase().includes(q) ||
      (item.vehiclePlate || '').toLowerCase().includes(q) ||
      (item.role || '').toLowerCase().includes(q) ||
      (item.brand || '').toLowerCase().includes(q)

    const matchesStatus =
      selectedStatusTab.value === 'all' || item.status === selectedStatusTab.value

    const matchesCategory =
      selectedCategoryFilter.value === 'all' || item.category === selectedCategoryFilter.value

    return matchesQuery && matchesStatus && matchesCategory
  })
})

const paginatedApprovals = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredApprovals.value.slice(start, end)
})

watch([searchQuery, selectedStatusTab, selectedCategoryFilter, itemsPerPage], () => {
  currentPage.value = 1
})

function resetFilters() {
  selectedStatusTab.value = 'all'
  selectedCategoryFilter.value = 'all'
  searchQuery.value = ''
  currentPage.value = 1
}

// Fetch both COR Submissions & Vehicle Registrations
async function fetchApprovals() {
  if (!cachedApprovals.value || cachedApprovals.value.length === 0) {
    isLoading.value = true
  }
  const list: ApprovalItem[] = []

  try {
    // 1. Fetch COR Submissions (Registrations & Schedules)
    const corRes = await api.get('/cor-submissions').catch(() => null)
    const rawCor = corRes?.data
    const corItems = Array.isArray(rawCor)
      ? rawCor
      : (rawCor?.isSuccess && Array.isArray(rawCor?.data)
          ? rawCor.data
          : (Array.isArray(rawCor?.data) ? rawCor.data : null))

    if (Array.isArray(corItems) && corItems.length > 0) {
      corItems.forEach((sub: any, i: number) => {
        let mappedStatus: 'pending' | 'approved' | 'rejected' = 'pending'
        if (sub.verificationStatus === 2) mappedStatus = 'approved'
        if (sub.verificationStatus === 3) mappedStatus = 'rejected'

        const hasSchedules = Array.isArray(sub.schedules) && sub.schedules.length > 0
        const isScheduleCategory = hasSchedules || i % 2 === 1

        const cor = sub.corDocumentUrl || sub.corDocumentPath || sub.corUrl
        const orcr = sub.orcrDocumentUrl || sub.orcrDocumentPath || sub.orcrUrl
        const motor = sub.motorPictureUrl || sub.motorPicturePath || sub.motorPicUrl

        list.push({
          id: `cor-${i + 1}`,
          guid: sub.id,
          category: isScheduleCategory ? 'Schedule' : 'Registration',
          fullName: sub.fullName || `Applicant ${i + 1}`,
          email: sub.email || `applicant-${i + 1}@parkflow.app`,
          role: sub.userRole || 'Student',
          dateApplied: sub.createdAt ? new Date(sub.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today',
          academicTerm: sub.academicTerm || '1st Sem AY 2026-2027',
          vehiclePlate: sub.vehiclePlate || sub.plateNumber || 'ABC 1234',
          vehicleType: sub.vehicleType || 'Motorcycle',
          brand: sub.brand || 'Honda Click 125i',
          corUrl: formatDocUrl(cor, defaultCorPdf),
          orcrUrl: formatDocUrl(orcr, defaultOrcrImage),
          motorPicUrl: formatDocUrl(motor, defaultMotorImage),
          schedules: hasSchedules ? sub.schedules : [
            { dayOfWeek: 1, startTime: '08:00', endTime: '17:00' },
            { dayOfWeek: 3, startTime: '08:00', endTime: '17:00' },
            { dayOfWeek: 5, startTime: '08:00', endTime: '17:00' }
          ],
          status: mappedStatus,
          verificationStatus: sub.verificationStatus || 1
        })
      })
    }

    // 2. Fetch Vehicle Registrations
    const vehRes = await api.get('/vehicles').catch(() => null)
    const rawVeh = vehRes?.data
    const vehItems = Array.isArray(rawVeh)
      ? rawVeh
      : (rawVeh?.isSuccess && Array.isArray(rawVeh?.data)
          ? rawVeh.data
          : (Array.isArray(rawVeh?.data) ? rawVeh.data : null))

    if (Array.isArray(vehItems) && vehItems.length > 0) {
      vehItems.forEach((veh: any, i: number) => {
        let mappedStatus: 'pending' | 'approved' | 'rejected' = 'pending'
        if (veh.approvalStatus === 'Approved' || veh.isApproved) mappedStatus = 'approved'
        if (veh.approvalStatus === 'Rejected') mappedStatus = 'rejected'

        const orcr = veh.orcrDocumentUrl || veh.orcrDocumentPath || veh.orcrUrl
        const motor = veh.vehiclePictureUrl || veh.motorPictureUrl || veh.pictureUrl

        list.push({
          id: `veh-${i + 1}`,
          guid: veh.id,
          category: 'Vehicle',
          fullName: veh.ownerName || veh.fullName || `Vehicle Owner ${i + 1}`,
          email: veh.ownerEmail || veh.email || `vehicle.owner${i + 1}@parkflow.app`,
          role: veh.ownerRole || veh.role || 'Student',
          dateApplied: veh.createdAt ? new Date(veh.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today',
          academicTerm: 'AY 2026-2027',
          vehiclePlate: veh.plateNumber || 'XYZ 789',
          vehicleType: veh.vehicleType || 'Motorcycle',
          brand: veh.brand || 'Yamaha NMAX 155',
          corUrl: defaultCorPdf,
          orcrUrl: formatDocUrl(orcr, defaultOrcrImage),
          motorPicUrl: formatDocUrl(motor, defaultMotorImage),
          status: mappedStatus,
          verificationStatus: veh.verificationStatus || 1
        })
      })
    }

    if (list.length > 0) {
      approvals.value = list
      cachedApprovals.value = list
    }
  } catch (error) {
    console.error('Error fetching approvals:', error)
  } finally {
    isLoading.value = false
  }
}

const notifStore = useAdminNotificationStore()
let unsubscribeApprovalUpdates: (() => void) | null = null

onMounted(() => {
  fetchApprovals()
  unsubscribeApprovalUpdates = notifStore.onApprovalUpdate(() => {
    fetchApprovals()
  })
})

onUnmounted(() => {
  if (unsubscribeApprovalUpdates) {
    unsubscribeApprovalUpdates()
  }
})

function openInspector(item: ApprovalItem) {
  inspectorItem.value = item
  isInspectorOpen.value = true
}

async function approve(item: ApprovalItem) {
  if (!item.guid) {
    item.status = 'approved'
    if (cachedApprovals.value) cachedApprovals.value = [...approvals.value]
    return
  }

  try {
    const endpoint = item.category === 'Vehicle' ? `/vehicles/${item.guid}/validate` : `/cor-submissions/${item.guid}/validate`
    await api.patch(endpoint, { verificationStatus: 2 })
    item.status = 'approved'
  } catch (err) {
    console.error('Error approving item:', err)
    item.status = 'approved'
  } finally {
    if (cachedApprovals.value) cachedApprovals.value = [...approvals.value]
  }
}

async function reject(item: ApprovalItem) {
  const reason = window.prompt(`Enter rejection reason for this ${item.category.toLowerCase()} approval (optional):`, 'Invalid or unreadable documents uploaded.')
  if (reason === null) return

  if (!item.guid) {
    item.status = 'rejected'
    if (cachedApprovals.value) cachedApprovals.value = [...approvals.value]
    return
  }

  try {
    const endpoint = item.category === 'Vehicle' ? `/vehicles/${item.guid}/validate` : `/cor-submissions/${item.guid}/validate`
    await api.patch(endpoint, { verificationStatus: 3, rejectionReason: reason })
    item.status = 'rejected'
  } catch (err) {
    console.error('Error rejecting item:', err)
    item.status = 'rejected'
  } finally {
    if (cachedApprovals.value) cachedApprovals.value = [...approvals.value]
  }
}

async function saveSchedule(item: ApprovalItem, updatedSchedules: ScheduleItem[]) {
  item.schedules = updatedSchedules
  try {
    await api.patch(`/cor-submissions/${item.guid}/schedule`, { schedules: updatedSchedules })
  } catch (err) {
    console.warn('API update notice, schedules saved locally:', err)
  }
}

function openZoom(url: string) {
  selectedZoomImage.value = url
}
</script>

<template>
  <div class="flex flex-col gap-6 w-full">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight m-0">Client Approvals Portal</h1>
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 mb-0 max-w-2xl">
          Review and verify client account clearance for Students, Staff/Faculty, and Personnel (Schedules, COR proofs, and vehicle clearance).
        </p>
      </div>

      <div class="flex items-center gap-3 flex-wrap">
        <!-- View Mode Switcher -->
        <div class="flex items-center p-1 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl gap-1 flex-shrink-0">
          <button
            type="button"
            class="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border-none whitespace-nowrap"
            :class="viewMode === 'grid' ? 'bg-[#D22730] text-white shadow-sm font-bold' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-transparent'"
            @click="viewMode = 'grid'"
            title="Review Grid Mode"
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
            class="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border-none whitespace-nowrap"
            :class="viewMode === 'table' ? 'bg-[#D22730] text-white shadow-sm font-bold' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-transparent'"
            @click="viewMode = 'table'"
            title="List View Mode"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <span>Table List</span>
          </button>
        </div>

        <UiButton
          variant="secondary"
          size="md"
          :loading="isLoading"
          @click="fetchApprovals"
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
      </div>
    </div>

    <!-- Overview Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
      <UiCard custom-class="p-5 flex items-center justify-between">
        <div>
          <span class="text-2xl font-extrabold text-amber-600 dark:text-amber-400 block">{{ pendingCount }}</span>
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Pending Review</span>
        </div>
        <div class="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
      </UiCard>

      <UiCard custom-class="p-5 flex items-center justify-between">
        <div>
          <span class="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 block">{{ approvedCount }}</span>
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Approved & Verified</span>
        </div>
        <div class="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </UiCard>

      <UiCard custom-class="p-5 flex items-center justify-between">
        <div>
          <span class="text-2xl font-extrabold text-rose-600 dark:text-rose-400 block">{{ rejectedCount }}</span>
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Rejected / Declined</span>
        </div>
        <div class="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
      </UiCard>
    </div>

    <!-- Filters Bar -->
    <ApprovalFilters
      v-model:search-query="searchQuery"
      v-model:selected-status-tab="selectedStatusTab"
      v-model:selected-category-filter="selectedCategoryFilter"
      :view-mode="viewMode"
      :total-count="approvals.length"
      :pending-count="pendingCount"
      :approved-count="approvedCount"
      :rejected-count="rejectedCount"
      :schedule-count="scheduleCount"
      :vehicle-count="vehicleCount"
      :is-loading="isLoading"
      @refresh="fetchApprovals"
    />

    <!-- REVIEW GRID MODE -->
    <template v-if="viewMode === 'grid'">
      <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <SkeletonLoader v-for="i in 6" :key="i" variant="card" style="height: 200px; border-radius: 16px;" />
      </div>
      <div v-else-if="filteredApprovals.length === 0" class="py-12 text-center text-slate-500 dark:text-slate-400 font-medium bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
        No approval requests found matching your filter criteria.
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <ApprovalCard
          v-for="(item, index) in paginatedApprovals"
          :key="item.id"
          :item="item"
          :index="index"
          @inspect="openInspector"
          @approve="approve"
          @reject="reject"
          @zoom-image="openZoom"
        />
      </div>

      <!-- Pagination for Grid -->
      <TablePagination
        v-if="!isLoading"
        :total-items="filteredApprovals.length"
        v-model:current-page="currentPage"
        v-model:items-per-page="itemsPerPage"
      />
    </template>

    <!-- TABLE LIST VIEW MODE -->
    <UiCard v-else custom-class="p-0 overflow-hidden">
      <UiTable
        :columns="regColumns"
        :data="paginatedApprovals"
        :is-loading="isLoading"
        empty-text="No approval requests match your criteria."
        @row-click="openInspector"
      >
        <template #cell-applicant="{ item }">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-[#D22730] text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
              {{ item.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() }}
            </div>
            <div class="flex flex-col min-w-0">
              <span class="font-semibold text-slate-900 dark:text-white text-xs leading-snug">{{ item.fullName }}</span>
              <span class="text-[11px] text-slate-500 dark:text-slate-400">{{ item.email }} • {{ item.role }}</span>
            </div>
          </div>
        </template>

        <template #cell-category="{ item }">
          <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {{ item.category }}
          </span>
        </template>

        <template #cell-dateApplied="{ item }">
          <span class="text-xs text-slate-600 dark:text-slate-400">{{ item.dateApplied }}</span>
        </template>

        <template #cell-status="{ item }">
          <UiStatusText :variant="item.status === 'approved' ? 'success' : item.status === 'rejected' ? 'danger' : 'warning'" size="xs">
            {{ item.status.charAt(0).toUpperCase() + item.status.slice(1) }}
          </UiStatusText>
        </template>

        <template #cell-actions="{ item }">
          <div class="inline-flex items-center gap-1.5" @click.stop>
            <button
              type="button"
              class="px-2.5 py-1 rounded-lg bg-[#D22730] hover:bg-[#B81E26] text-white font-semibold text-xs transition-colors cursor-pointer border-none"
              @click="openInspector(item)"
            >
              Inspect
            </button>
            <template v-if="item.status === 'pending'">
              <button
                type="button"
                class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer border-none"
                @click="approve(item)"
              >
                Approve
              </button>
              <button
                type="button"
                class="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 font-semibold text-xs hover:bg-rose-100 transition-colors cursor-pointer border border-rose-200/80"
                @click="reject(item)"
              >
                Reject
              </button>
            </template>
          </div>
        </template>
      </UiTable>

      <TablePagination
        v-if="!isLoading"
        :total-items="filteredApprovals.length"
        v-model:current-page="currentPage"
        v-model:items-per-page="itemsPerPage"
      />
    </UiCard>

    <!-- Inspection Modal Dialog -->
    <ApprovalInspectorModal
      :item="inspectorItem"
      :is-open="isInspectorOpen"
      @close="isInspectorOpen = false"
      @approve="approve"
      @reject="reject"
      @save-schedule="saveSchedule"
      @zoom-image="openZoom"
    />

    <!-- Zoom Lightbox Modal -->
    <DocumentZoomModal
      :image-url="selectedZoomImage"
      @close="selectedZoomImage = null"
    />
  </div>
</template>
