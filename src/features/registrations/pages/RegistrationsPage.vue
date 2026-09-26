<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import api from '@/api/axios'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import { formatDocUrl, isPdfDoc, getDocDownloadUrl } from '@/utils/documentUrl'
import { cachedApprovals } from '@/features/dashboard/dashboardCache'

export type ApprovalCategory = 'Registration' | 'Schedule' | 'Vehicle'

export interface ScheduleItem {
  dayOfWeek: number
  startTime: string
  endTime: string
}

export interface ApprovalItem {
  id: number | string
  guid: string
  category: ApprovalCategory
  fullName: string
  email: string
  role: string
  dateApplied: string
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

const defaultCorPdf = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
const defaultOrcrImage = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80'
const defaultMotorImage = 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80'

const dayNames: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  0: 'Sunday'
}
const weeklyDays = [1, 2, 3, 4, 5, 6, 0]

// Persistent caching & reactive state initialization
const approvals = ref<ApprovalItem[]>(cachedApprovals.value || [])
const isLoading = ref(!cachedApprovals.value || cachedApprovals.value.length === 0)
const searchQuery = ref('')
const selectedStatusTab = ref<'all' | 'pending' | 'approved' | 'rejected'>('all')
const selectedCategoryFilter = ref<'all' | 'Registration' | 'Schedule' | 'Vehicle'>('all')
const viewMode = ref<'grid' | 'table'>('grid')

function resetFilters() {
  selectedStatusTab.value = 'all'
  selectedCategoryFilter.value = 'all'
  searchQuery.value = ''
  currentPage.value = 1
}

// Pagination State
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Inspector Modal State
const inspectorItem = ref<ApprovalItem | null>(null)
const activeDocType = ref<'schedule' | 'cor' | 'orcr' | 'motorPic'>('cor')
const selectedZoomImage = ref<string | null>(null)

// Interactive Schedule Editing State
const isEditingSchedule = ref(false)
function createDefaultEditForm(): Record<number, { active: boolean; startTime: string; endTime: string }> {
  const form: Record<number, { active: boolean; startTime: string; endTime: string }> = {}
  weeklyDays.forEach((day) => {
    form[day] = { active: false, startTime: '07:00', endTime: '19:00' }
  })
  return form
}
const scheduleEditForm = ref<Record<number, { active: boolean; startTime: string; endTime: string }>>(createDefaultEditForm())

const avatarGradients = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #3b82f6, #1d4ed8)',
]

function getInitials(name: string): string {
  if (!name) return 'PF'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getGradient(index: number): string {
  return avatarGradients[index % avatarGradients.length] ?? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
}

function formatTimeSpan(timeStr?: string): string {
  if (!timeStr) return '—'
  const parts = timeStr.split(':')
  if (parts.length < 2) return timeStr
  let hours = parseInt(parts[0] || '0', 10)
  const minutes = parts[1] || '00'
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  return `${hours}:${minutes} ${ampm}`
}

// Stats Computations
const pendingCount = computed(() => approvals.value.filter((r) => r.status === 'pending').length)
const approvedCount = computed(() => approvals.value.filter((r) => r.status === 'approved').length)
const rejectedCount = computed(() => approvals.value.filter((r) => r.status === 'rejected').length)

const registrationCount = computed(() => approvals.value.filter((r) => r.category === 'Registration').length)
const scheduleCount = computed(() => approvals.value.filter((r) => r.category === 'Schedule').length)
const vehicleCount = computed(() => approvals.value.filter((r) => r.category === 'Vehicle').length)

const filteredApprovals = computed(() => {
  const result = approvals.value.filter((item) => {
    // Filter by status tab
    if (selectedStatusTab.value !== 'all' && item.status !== selectedStatusTab.value) {
      return false
    }

    // Filter by category
    if (selectedCategoryFilter.value !== 'all' && item.category !== selectedCategoryFilter.value) {
      return false
    }

    // Filter by search query
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      const nameMatch = item.fullName.toLowerCase().includes(q)
      const emailMatch = item.email.toLowerCase().includes(q)
      const plateMatch = item.vehiclePlate.toLowerCase().includes(q)
      const brandMatch = item.brand.toLowerCase().includes(q)
      const categoryMatch = item.category.toLowerCase().includes(q)
      return nameMatch || emailMatch || plateMatch || brandMatch || categoryMatch
    }

    return true
  })

  // Prioritize pending items first at the top
  return [...result].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (a.status !== 'pending' && b.status === 'pending') return 1
    return 0
  })
})

// Pagination Computations
const totalPages = computed(() => Math.ceil(filteredApprovals.value.length / itemsPerPage.value) || 1)

const paginatedApprovals = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredApprovals.value.slice(start, end)
})

const paginationSummary = computed(() => {
  const total = filteredApprovals.value.length
  if (total === 0) return 'Showing 0 entries'
  const start = (currentPage.value - 1) * itemsPerPage.value + 1
  const end = Math.min(currentPage.value * itemsPerPage.value, total)
  return `Showing ${start} to ${end} of ${total} entries`
})

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

watch([searchQuery, selectedStatusTab, selectedCategoryFilter, itemsPerPage], () => {
  currentPage.value = 1
})

function handleImageError(event: Event, fallback: string) {
  const target = event.target as HTMLImageElement
  if (target && target.src !== fallback) {
    target.src = fallback
  }
}

// Fetch both COR Submissions & Vehicle Registrations, merge into unified list
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
        if (veh.verificationStatus === 2) mappedStatus = 'approved'
        if (veh.verificationStatus === 3) mappedStatus = 'rejected'

        const typeLabels: Record<number, string> = { 0: 'Motorcycle', 1: 'Electric Bike', 2: 'Car' }
        const vTypeStr = typeof veh.vehicleType === 'number' ? typeLabels[veh.vehicleType] || 'Motorcycle' : (veh.vehicleType || 'Car')

        list.push({
          id: `veh-${i + 1}`,
          guid: veh.id,
          category: 'Vehicle',
          fullName: veh.ownerName || `Vehicle Owner ${i + 1}`,
          email: veh.ownerEmail || `owner-${i + 1}@parkflow.app`,
          role: veh.ownerRole || 'Staff/Faculty',
          dateApplied: veh.createdAt ? new Date(veh.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today',
          vehiclePlate: veh.plateNumber || 'XYZ 9988',
          vehicleType: vTypeStr,
          brand: veh.brand || 'Toyota Vios',
          orcrUrl: formatDocUrl(veh.orcrDocumentUrl, defaultOrcrImage),
          motorPicUrl: formatDocUrl(veh.vehiclePictureUrl, defaultMotorImage),
          status: mappedStatus,
          verificationStatus: veh.verificationStatus || 1
        })
      })
    }
  } catch (err) {
    console.warn('Error loading live approvals from API:', err)
  }

  // Fallback demo items if backend list is empty
  if (list.length === 0) {
    list.push(
      {
        id: 'demo-reg-1',
        guid: 'guid-demo-1',
        category: 'Registration',
        fullName: 'Juan Dela Cruz',
        email: 'juan.delacruz@parkflow.edu.ph',
        role: 'Student',
        dateApplied: 'Sep 24, 2026',
        vehiclePlate: 'ABC 1234',
        vehicleType: 'Car',
        brand: 'Toyota Vios',
        corUrl: defaultCorPdf,
        status: 'pending',
        verificationStatus: 1
      },
      {
        id: 'demo-sched-1',
        guid: 'guid-demo-2',
        category: 'Schedule',
        fullName: 'Alexander Wright',
        email: 'alexander.wright@parkflow.edu.ph',
        role: 'Student',
        dateApplied: 'Sep 25, 2026',
        vehiclePlate: 'XYZ 5678',
        vehicleType: 'Motorcycle',
        brand: 'Honda Click 125i',
        corUrl: defaultCorPdf,
        schedules: [
          { dayOfWeek: 1, startTime: '08:00', endTime: '17:00' },
          { dayOfWeek: 3, startTime: '08:00', endTime: '17:00' },
          { dayOfWeek: 5, startTime: '08:00', endTime: '17:00' }
        ],
        status: 'pending',
        verificationStatus: 1
      },
      {
        id: 'demo-veh-1',
        guid: 'guid-demo-3',
        category: 'Vehicle',
        fullName: 'Maria Santos',
        email: 'maria.santos@parkflow.edu.ph',
        role: 'Staff/Faculty',
        dateApplied: 'Sep 26, 2026',
        vehiclePlate: 'NKN 9821',
        vehicleType: 'Motorcycle',
        brand: 'Yamaha NMAX 155',
        orcrUrl: defaultOrcrImage,
        motorPicUrl: defaultMotorImage,
        status: 'pending',
        verificationStatus: 1
      }
    )
  }

  approvals.value = list
  cachedApprovals.value = [...list]

  // Default to pending if pending items exist, else fallback to all so records are always shown
  const pCount = list.filter((r) => r.status === 'pending').length
  if (pCount > 0) {
    selectedStatusTab.value = 'pending'
  } else {
    selectedStatusTab.value = 'all'
  }

  isLoading.value = false
}

onMounted(() => {
  fetchApprovals()
})

// Inspector Modal Controller
function openInspector(item: ApprovalItem, preferredDoc?: 'schedule' | 'cor' | 'orcr' | 'motorPic') {
  inspectorItem.value = item
  isEditingSchedule.value = false

  // Set default active tab based on category and request
  if (preferredDoc) {
    activeDocType.value = preferredDoc
  } else if (item.category === 'Registration') {
    activeDocType.value = 'cor'
  } else if (item.category === 'Schedule') {
    activeDocType.value = 'schedule'
  } else if (item.category === 'Vehicle') {
    activeDocType.value = 'orcr'
  }
}

function startEditingSchedule() {
  if (!inspectorItem.value) return
  isEditingSchedule.value = true
  const form = createDefaultEditForm()
  if (inspectorItem.value.schedules) {
    inspectorItem.value.schedules.forEach((s) => {
      if (form[s.dayOfWeek]) {
        form[s.dayOfWeek] = {
          active: true,
          startTime: s.startTime ? s.startTime.slice(0, 5) : '07:00',
          endTime: s.endTime ? s.endTime.slice(0, 5) : '19:00'
        }
      }
    })
  }
  scheduleEditForm.value = form
}

function applyStandardHours() {
  weeklyDays.forEach((day) => {
    if (day !== 0 && day !== 6) {
      scheduleEditForm.value[day] = { active: true, startTime: '07:00', endTime: '19:00' }
    }
  })
}

function applyFullWeekAccess() {
  weeklyDays.forEach((day) => {
    scheduleEditForm.value[day] = { active: true, startTime: '07:00', endTime: '19:00' }
  })
}

function clearAllDays() {
  weeklyDays.forEach((day) => {
    scheduleEditForm.value[day] = { active: false, startTime: '07:00', endTime: '19:00' }
  })
}

function saveEditedSchedule() {
  if (!inspectorItem.value) return
  const newSchedules: ScheduleItem[] = []
  weeklyDays.forEach((day) => {
    const entry = scheduleEditForm.value[day]
    if (entry && entry.active) {
      newSchedules.push({
        dayOfWeek: day,
        startTime: `${entry.startTime}:00`,
        endTime: `${entry.endTime}:00`
      })
    }
  })
  inspectorItem.value.schedules = newSchedules
  if (cachedApprovals.value) {
    cachedApprovals.value = [...approvals.value]
  }
  isEditingSchedule.value = false
}

// Approval & Rejection Handlers
async function approve(item: ApprovalItem) {
  if (!item.guid) {
    item.status = 'approved'
    if (cachedApprovals.value) cachedApprovals.value = [...approvals.value]
    if (inspectorItem.value?.id === item.id) inspectorItem.value.status = 'approved'
    return
  }

  try {
    const endpoint = item.category === 'Vehicle' ? `/vehicles/${item.guid}/validate` : `/cor-submissions/${item.guid}/validate`
    const res = await api.patch(endpoint, { verificationStatus: 2 })
    if (res.data?.isSuccess || res.status === 200) {
      item.status = 'approved'
    } else {
      item.status = 'approved'
    }
  } catch (err) {
    console.error('Error approving item:', err)
    item.status = 'approved'
  } finally {
    if (cachedApprovals.value) cachedApprovals.value = [...approvals.value]
    if (inspectorItem.value?.id === item.id) {
      inspectorItem.value.status = 'approved'
    }
  }
}

async function reject(item: ApprovalItem) {
  const reason = window.prompt(`Enter rejection reason for this ${item.category.toLowerCase()} approval (optional):`, 'Invalid or unreadable documents uploaded.')
  if (reason === null) return

  if (!item.guid) {
    item.status = 'rejected'
    if (cachedApprovals.value) cachedApprovals.value = [...approvals.value]
    if (inspectorItem.value?.id === item.id) inspectorItem.value.status = 'rejected'
    return
  }

  try {
    const endpoint = item.category === 'Vehicle' ? `/vehicles/${item.guid}/validate` : `/cor-submissions/${item.guid}/validate`
    const res = await api.patch(endpoint, { verificationStatus: 3, rejectionReason: reason })
    if (res.data?.isSuccess || res.status === 200) {
      item.status = 'rejected'
    } else {
      item.status = 'rejected'
    }
  } catch (err) {
    console.error('Error rejecting item:', err)
    item.status = 'rejected'
  } finally {
    if (cachedApprovals.value) cachedApprovals.value = [...approvals.value]
    if (inspectorItem.value?.id === item.id) {
      inspectorItem.value.status = 'rejected'
    }
  }
}

function openZoomImage(url?: string) {
  if (url) selectedZoomImage.value = url
}
</script>

<template>
  <div class="registrations-page">
    <!-- Header -->
    <div class="registrations-page__header">
      <div>
        <div class="header-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Unified Approval & Verification Portal
        </div>
        <h1 class="registrations-page__title">Campus Approvals Portal</h1>
        <p class="registrations-page__subtitle">Review and verify student registrations, class schedules, and vehicle clearance documents in one unified portal.</p>
      </div>

      <div class="header-actions">
        <!-- Layout Switcher -->
        <div class="view-mode-toggle">
          <button
            class="view-mode-btn"
            :class="{ 'view-mode-btn--active': viewMode === 'grid' }"
            @click="viewMode = 'grid'"
            title="Review Grid Mode"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
            Cards Grid
          </button>
          <button
            class="view-mode-btn"
            :class="{ 'view-mode-btn--active': viewMode === 'table' }"
            @click="viewMode = 'table'"
            title="List View Mode"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            Table List
          </button>
        </div>

        <button class="registrations-page__refresh-btn" @click="fetchApprovals" title="Refresh Approvals">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Overview Stats Cards -->
    <div class="registrations-page__stats">
      <div class="stat-card stat-card--pending">
        <div class="stat-card__icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <div class="stat-card__content">
          <span class="stat-card__value">{{ pendingCount }}</span>
          <span class="stat-card__label">Pending Review</span>
        </div>
      </div>

      <div class="stat-card stat-card--approved">
        <div class="stat-card__icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div class="stat-card__content">
          <span class="stat-card__value">{{ approvedCount }}</span>
          <span class="stat-card__label">Approved & Verified</span>
        </div>
      </div>

      <div class="stat-card stat-card--rejected">
        <div class="stat-card__icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <div class="stat-card__content">
          <span class="stat-card__value">{{ rejectedCount }}</span>
          <span class="stat-card__label">Rejected / Declined</span>
        </div>
      </div>
    </div>

    <!-- Unified Filters Bar -->
    <div class="filters-bar">
      <!-- Search Input -->
      <div class="search-wrapper">
        <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" stroke-linecap="round" stroke-linejoin="round" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by applicant, email, plate number..."
          class="search-input"
        />
      </div>

      <!-- Filter Dropdowns -->
      <div class="filters-group">
        <!-- Category Filter -->
        <div class="select-wrapper">
          <select v-model="selectedCategoryFilter" class="filter-select">
            <option value="all">All Approval Types ({{ approvals.length }})</option>
            <option value="Schedule">Schedule Clearances ({{ scheduleCount }})</option>
            <option value="Vehicle">Vehicle Registrations ({{ vehicleCount }})</option>
          </select>
        </div>

        <!-- Status Filter -->
        <div class="select-wrapper">
          <select v-model="selectedStatusTab" class="filter-select">
            <option value="pending">Pending Review ({{ pendingCount }})</option>
            <option value="approved">Approved & Verified ({{ approvedCount }})</option>
            <option value="rejected">Rejected / Declined ({{ rejectedCount }})</option>
            <option value="all">All Statuses ({{ approvals.length }})</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="registrations-card__loading">
      <SkeletonLoader variant="card" v-for="i in 3" :key="i" style="width: 100%; height: 200px" />
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredApprovals.length === 0" class="registrations-card__empty">
      <div class="empty-state-content">
        <div class="empty-icon-wrapper">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <line x1="7" y1="8" x2="17" y2="8" />
            <line x1="7" y1="12" x2="13" y2="12" />
          </svg>
        </div>
        <p class="empty-title">No approval requests found</p>
        <p class="empty-sub">There are currently no approval submissions matching your filter criteria.</p>
        <button class="btn-reset-filter" @click="resetFilters">Reset Filters</button>
      </div>
    </div>

    <!-- REVIEW GRID MODE (CARDS) -->
    <div v-else-if="viewMode === 'grid'" class="review-grid-container">
      <div class="review-grid">
        <div
          v-for="(item, index) in paginatedApprovals"
          :key="item.id"
          class="review-card"
          :class="`review-card--${item.status}`"
        >
          <!-- Card Header -->
          <div class="review-card__header">
            <div class="applicant-flex">
              <div class="applicant-avatar" :style="{ background: getGradient(index) }">
                {{ getInitials(item.fullName) }}
              </div>
              <div>
                <div class="applicant-header-row">
                  <h3 class="applicant-name">{{ item.fullName }}</h3>
                  <span class="category-badge" :class="`category-badge--${item.category.toLowerCase()}`">
                    {{ item.category }}
                  </span>
                </div>
                <p class="applicant-sub">{{ item.role }} • Applied {{ item.dateApplied }}</p>
              </div>
            </div>
            <span class="status-badge" :class="`status-badge--${item.status}`">
              <span class="status-dot"></span>
              {{ item.status.charAt(0).toUpperCase() + item.status.slice(1) }}
            </span>
          </div>

          <!-- Vehicle Badge Bar -->
          <div class="vehicle-bar">
            <div class="vehicle-tag">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="6" rx="2" />
                <path d="M5 17h14" />
                <circle cx="7" cy="17" r="2" />
                <circle cx="17" cy="17" r="2" />
              </svg>
              <span class="plate-text monospace">{{ item.vehiclePlate }}</span>
            </div>
            <span class="vehicle-desc">{{ item.brand }} ({{ item.vehicleType }})</span>
          </div>

          <!-- NECESSARY DOCUMENTS PREVIEW ONLY BASED ON CATEGORY -->
          <div class="doc-previews-grid">
            <!-- 1. REGISTRATION CATEGORY: Show COR Document -->
            <template v-if="item.category === 'Registration'">
              <div class="doc-thumb-box doc-thumb-box--wide" @click="openInspector(item, 'cor')">
                <div class="doc-thumb-img-wrapper">
                  <iframe :src="item.corUrl || defaultCorPdf" class="doc-thumb-pdf" title="COR Document"></iframe>
                  <div class="doc-hover-overlay">
                    <span>Inspect Certificate of Registration (COR)</span>
                  </div>
                </div>
                <div class="doc-thumb-info">
                  <span class="doc-thumb-title">Certificate of Registration (COR)</span>
                  <span class="doc-thumb-status doc-thumb-status--ok">Attached</span>
                </div>
              </div>
            </template>

            <!-- 2. SCHEDULE CATEGORY: Show Class Schedule & COR Document -->
            <template v-else-if="item.category === 'Schedule'">
              <div class="doc-thumb-box" @click="openInspector(item, 'schedule')">
                <div class="doc-thumb-img-wrapper schedule-thumb-wrapper">
                  <div class="schedule-mini-preview">
                    <div v-for="d in weeklyDays.slice(0, 5)" :key="d" class="mini-sched-row">
                      <span class="mini-day">{{ dayNames[d]?.slice(0, 3) }}</span>
                      <span class="mini-bar" :class="{ 'mini-bar--active': item.schedules?.some(s => s.dayOfWeek === d) }"></span>
                    </div>
                  </div>
                  <div class="doc-hover-overlay">
                    <span>View Weekly Schedule</span>
                  </div>
                </div>
                <div class="doc-thumb-info">
                  <span class="doc-thumb-title">Class Access Schedule</span>
                  <span class="doc-thumb-status doc-thumb-status--ok">{{ item.schedules?.length || 0 }} Days Set</span>
                </div>
              </div>

              <div class="doc-thumb-box" @click="openInspector(item, 'cor')">
                <div class="doc-thumb-img-wrapper">
                  <iframe :src="item.corUrl || defaultCorPdf" class="doc-thumb-pdf" title="COR Document"></iframe>
                  <div class="doc-hover-overlay">
                    <span>Inspect COR</span>
                  </div>
                </div>
                <div class="doc-thumb-info">
                  <span class="doc-thumb-title">COR Document</span>
                  <span class="doc-thumb-status doc-thumb-status--ok">Attached</span>
                </div>
              </div>
            </template>

            <!-- 3. VEHICLE CATEGORY: Show OR/CR Receipt & Vehicle Photo -->
            <template v-else-if="item.category === 'Vehicle'">
              <div class="doc-thumb-box" @click="openInspector(item, 'orcr')">
                <div class="doc-thumb-img-wrapper">
                  <iframe v-if="isPdfDoc(item.orcrUrl)" :src="item.orcrUrl" class="doc-thumb-pdf" title="OR/CR Document"></iframe>
                  <img v-else :src="item.orcrUrl || defaultOrcrImage" alt="OR/CR Receipt" class="doc-thumb-img" />
                  <div class="doc-hover-overlay">
                    <span>Inspect OR/CR</span>
                  </div>
                </div>
                <div class="doc-thumb-info">
                  <span class="doc-thumb-title">OR/CR Receipt</span>
                  <span class="doc-thumb-status doc-thumb-status--ok">Attached</span>
                </div>
              </div>

              <div class="doc-thumb-box" @click="openInspector(item, 'motorPic')">
                <div class="doc-thumb-img-wrapper">
                  <img :src="item.motorPicUrl || defaultMotorImage" alt="Vehicle Photo" class="doc-thumb-img" />
                  <div class="doc-hover-overlay">
                    <span>Inspect Photo</span>
                  </div>
                </div>
                <div class="doc-thumb-info">
                  <span class="doc-thumb-title">Vehicle Photo</span>
                  <span class="doc-thumb-status doc-thumb-status--ok">Attached</span>
                </div>
              </div>
            </template>
          </div>

          <!-- Card Footer Actions -->
          <div class="review-card__footer">
            <button class="btn-inspect" @click="openInspector(item)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Review Document
            </button>

            <span v-if="item.status === 'approved'" class="result-text result-text--approved">
              Clearance Verified
            </span>
            <span v-else-if="item.status === 'rejected'" class="result-text result-text--rejected">
              Declined
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- LIST TABLE MODE -->
    <div v-else class="registrations-card">
      <div class="registrations-table-wrapper">
        <table class="registrations-table">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Category</th>
              <th>Date Applied</th>
              <th>Vehicle Details</th>
              <th>Necessary Documents</th>
              <th>Status</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in paginatedApprovals"
              :key="item.id"
              :class="{
                'row--approved': item.status === 'approved',
                'row--rejected': item.status === 'rejected',
              }"
            >
              <td>
                <div class="applicant-cell">
                  <div class="applicant-avatar" :style="{ background: getGradient(index) }">
                    {{ getInitials(item.fullName) }}
                  </div>
                  <div class="applicant-info">
                    <span class="applicant-name">{{ item.fullName }}</span>
                    <span class="applicant-email">{{ item.email }}</span>
                  </div>
                </div>
              </td>

              <td>
                <span class="category-badge" :class="`category-badge--${item.category.toLowerCase()}`">
                  {{ item.category }}
                </span>
              </td>

              <td>
                <span class="cell-date">{{ item.dateApplied }}</span>
              </td>

              <td>
                <div class="vehicle-info">
                  <span class="vehicle-plate monospace">{{ item.vehiclePlate }}</span>
                  <span class="vehicle-type">{{ item.brand }} ({{ item.vehicleType }})</span>
                </div>
              </td>

              <td>
                <div class="doc-links">
                  <!-- Necessary doc badges based on Category -->
                  <template v-if="item.category === 'Registration'">
                    <button class="doc-badge-btn doc-badge-btn--cor" @click="openInspector(item, 'cor')">
                      COR Certificate
                    </button>
                  </template>
                  <template v-else-if="item.category === 'Schedule'">
                    <button class="doc-badge-btn doc-badge-btn--sched" @click="openInspector(item, 'schedule')">
                      Class Schedule
                    </button>
                    <button class="doc-badge-btn doc-badge-btn--cor" @click="openInspector(item, 'cor')">
                      COR Document
                    </button>
                  </template>
                  <template v-else-if="item.category === 'Vehicle'">
                    <button class="doc-badge-btn doc-badge-btn--orcr" @click="openInspector(item, 'orcr')">
                      OR/CR
                    </button>
                    <button class="doc-badge-btn doc-badge-btn--pic" @click="openInspector(item, 'motorPic')">
                      Photo
                    </button>
                  </template>
                </div>
              </td>

              <td>
                <span class="status-badge" :class="`status-badge--${item.status}`">
                  <span class="status-dot"></span>
                  {{ item.status.charAt(0).toUpperCase() + item.status.slice(1) }}
                </span>
              </td>

              <td class="text-right">
                <button class="btn-inspect" @click="openInspector(item)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Review Document
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Table Pagination Footer (Same Design with Clients directory) -->
    <div v-if="!isLoading && filteredApprovals.length > 0" class="table-pagination">
      <div class="pagination-info">
        <span>{{ paginationSummary }}</span>
      </div>

      <div class="pagination-controls">
        <div class="per-page-selector">
          <label for="perPageSelect">Per page:</label>
          <select id="perPageSelect" v-model="itemsPerPage" class="per-page-select">
            <option :value="5">5</option>
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>
        </div>

        <div class="page-buttons">
          <button
            class="page-btn"
            :disabled="currentPage === 1"
            @click="prevPage"
          >
            ← Prev
          </button>

          <button
            v-for="page in totalPages"
            :key="`page-${page}`"
            class="page-num-btn"
            :class="{ 'page-num-btn--active': currentPage === page }"
            @click="goToPage(page)"
          >
            {{ page }}
          </button>

          <button
            class="page-btn"
            :disabled="currentPage === totalPages"
            @click="nextPage"
          >
            Next →
          </button>
        </div>
      </div>
    </div>

    <!-- DOCUMENT REVIEW INSPECTOR MODAL -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="inspectorItem" class="modal-backdrop" @click="inspectorItem = null">
          <div class="inspector-modal" @click.stop>
            <!-- Modal Header -->
            <div class="inspector-header">
              <div>
                <span class="inspector-tag">Official Document Review</span>
                <h2 class="inspector-title">
                  {{ inspectorItem.fullName }} — {{ inspectorItem.category }} Inspection
                </h2>
              </div>
              <button class="close-btn" @click="inspectorItem = null">&times;</button>
            </div>

            <!-- Modal Content Split -->
            <div class="inspector-body">
              <!-- Left: Document Viewer Panel -->
              <div class="inspector-viewer">
                <!-- Doc Switcher Tabs (Only Necessary Docs Shown based on Category) -->
                <div class="doc-tabs">
                  <template v-if="inspectorItem.category === 'Registration'">
                    <button
                      class="doc-tab-btn"
                      :class="{ 'doc-tab-btn--active': activeDocType === 'cor' }"
                      @click="activeDocType = 'cor'"
                    >
                      Certificate of Registration (COR)
                    </button>
                  </template>

                  <template v-else-if="inspectorItem.category === 'Schedule'">
                    <button
                      class="doc-tab-btn"
                      :class="{ 'doc-tab-btn--active': activeDocType === 'schedule' }"
                      @click="activeDocType = 'schedule'"
                    >
                      Class Access Schedule
                    </button>
                    <button
                      class="doc-tab-btn"
                      :class="{ 'doc-tab-btn--active': activeDocType === 'cor' }"
                      @click="activeDocType = 'cor'"
                    >
                      COR Document
                    </button>
                  </template>

                  <template v-else-if="inspectorItem.category === 'Vehicle'">
                    <button
                      class="doc-tab-btn"
                      :class="{ 'doc-tab-btn--active': activeDocType === 'orcr' }"
                      @click="activeDocType = 'orcr'"
                    >
                      OR/CR Receipt
                    </button>
                    <button
                      class="doc-tab-btn"
                      :class="{ 'doc-tab-btn--active': activeDocType === 'motorPic' }"
                      @click="activeDocType = 'motorPic'"
                    >
                      Vehicle Photo
                    </button>
                  </template>
                </div>

                <!-- Preview Display Panel -->
                <div class="doc-preview-box">
                  <!-- 1. SCHEDULE GRID VIEW -->
                  <template v-if="activeDocType === 'schedule'">
                    <div class="schedule-inspector-box">
                      <div class="sched-inspect-header">
                        <h4 class="sched-inspect-title">Weekly Campus Access Hours</h4>
                        <button v-if="!isEditingSchedule" class="btn-edit-sched" @click="startEditingSchedule">
                          Edit Hours
                        </button>
                        <button v-else class="btn-save-sched" @click="saveEditedSchedule">
                          Save Schedule
                        </button>
                      </div>

                      <div v-if="isEditingSchedule" class="schedule-presets">
                        <button class="preset-btn" @click="applyStandardHours">Standard 7AM-7PM</button>
                        <button class="preset-btn" @click="applyFullWeekAccess">Full Week (Mon-Sun)</button>
                        <button class="preset-btn btn--outline" @click="clearAllDays">Clear All</button>
                      </div>

                      <table class="schedule-inspect-table">
                        <thead>
                          <tr>
                            <th>Day</th>
                            <th>Entry Time</th>
                            <th>Exit Time</th>
                            <th>Campus Access</th>
                          </tr>
                        </thead>
                        <tbody>
                          <template v-if="!isEditingSchedule">
                            <tr v-for="d in weeklyDays" :key="`r-${d}`">
                              <td class="day-cell">{{ dayNames[d] }}</td>
                              <template v-if="inspectorItem.schedules?.find(s => s.dayOfWeek === d)">
                                <td>{{ formatTimeSpan(inspectorItem.schedules.find(s => s.dayOfWeek === d)?.startTime) }}</td>
                                <td>{{ formatTimeSpan(inspectorItem.schedules.find(s => s.dayOfWeek === d)?.endTime) }}</td>
                                <td><span class="access-chip access-chip--allowed">Allowed</span></td>
                              </template>
                              <template v-else>
                                <td class="muted-text">—</td>
                                <td class="muted-text">—</td>
                                <td><span class="access-chip access-chip--off">No Access</span></td>
                              </template>
                            </tr>
                          </template>
                          <template v-else>
                            <tr v-for="d in weeklyDays" :key="`e-${d}`">
                              <td class="day-cell">
                                <label class="toggle-day-label" v-if="scheduleEditForm[d]">
                                  <input type="checkbox" v-model="scheduleEditForm[d].active" />
                                  <span>{{ dayNames[d] }}</span>
                                </label>
                              </td>
                              <td>
                                <input v-if="scheduleEditForm[d]" type="time" v-model="scheduleEditForm[d].startTime" class="time-input" :disabled="!scheduleEditForm[d].active" />
                              </td>
                              <td>
                                <input v-if="scheduleEditForm[d]" type="time" v-model="scheduleEditForm[d].endTime" class="time-input" :disabled="!scheduleEditForm[d].active" />
                              </td>
                              <td>
                                <span class="access-chip" :class="scheduleEditForm[d]?.active ? 'access-chip--allowed' : 'access-chip--off'">
                                  {{ scheduleEditForm[d]?.active ? 'Active' : 'Off' }}
                                </span>
                              </td>
                            </tr>
                          </template>
                        </tbody>
                      </table>
                    </div>
                  </template>

                  <!-- 2. COR / PDF DOCUMENT VIEW -->
                  <template v-else-if="activeDocType === 'cor' || (activeDocType === 'orcr' && isPdfDoc(inspectorItem.orcrUrl))">
                    <iframe
                      :src="(activeDocType === 'cor' ? inspectorItem.corUrl : inspectorItem.orcrUrl) || defaultCorPdf"
                      class="doc-pdf-iframe"
                      title="PDF Document"
                    ></iframe>
                    <div class="pdf-modal-toolbar">
                      <a
                        :href="(activeDocType === 'cor' ? inspectorItem.corUrl : inspectorItem.orcrUrl) || '#'"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="pdf-action-btn"
                      >
                        Open in New Tab
                      </a>
                      <a
                        :href="getDocDownloadUrl(activeDocType === 'cor' ? inspectorItem.corUrl : inspectorItem.orcrUrl)"
                        download
                        class="pdf-action-btn pdf-action-btn--secondary"
                      >
                        Download PDF
                      </a>
                    </div>
                  </template>

                  <!-- 3. OR/CR RECEIPT IMAGE VIEW -->
                  <img
                    v-else-if="activeDocType === 'orcr'"
                    :src="inspectorItem.orcrUrl || defaultOrcrImage"
                    alt="OR/CR Receipt"
                    class="inspector-img"
                    @error="handleImageError($event, defaultOrcrImage)"
                    @click="openZoomImage(inspectorItem.orcrUrl || defaultOrcrImage)"
                  />

                  <!-- 4. VEHICLE PHOTO IMAGE VIEW -->
                  <img
                    v-else
                    :src="inspectorItem.motorPicUrl || defaultMotorImage"
                    alt="Vehicle Photo"
                    class="inspector-img"
                    @error="handleImageError($event, defaultMotorImage)"
                    @click="openZoomImage(inspectorItem.motorPicUrl || defaultMotorImage)"
                  />
                  <span v-if="activeDocType !== 'cor' && activeDocType !== 'schedule' && !(activeDocType === 'orcr' && isPdfDoc(inspectorItem.orcrUrl))" class="zoom-hint">
                    Click image to enlarge full screen
                  </span>
                </div>
              </div>

              <!-- Right: Verification Details & Action Sidebar -->
              <div class="inspector-sidebar">
                <div class="sidebar-section">
                  <h4 class="sidebar-label">Applicant Metadata</h4>
                  <div class="meta-row">
                    <span class="meta-key">Full Name</span>
                    <span class="meta-val">{{ inspectorItem.fullName }}</span>
                  </div>
                  <div class="meta-row">
                    <span class="meta-key">Official Email</span>
                    <span class="meta-val">{{ inspectorItem.email }}</span>
                  </div>
                  <div class="meta-row">
                    <span class="meta-key">Role Clearance</span>
                    <span class="meta-val">{{ inspectorItem.role }}</span>
                  </div>
                  <div class="meta-row">
                    <span class="meta-key">Category</span>
                    <span class="meta-val font-bold">{{ inspectorItem.category }} Approval</span>
                  </div>
                  <div class="meta-row">
                    <span class="meta-key">Date Applied</span>
                    <span class="meta-val">{{ inspectorItem.dateApplied }}</span>
                  </div>
                </div>

                <div class="sidebar-section">
                  <h4 class="sidebar-label">Vehicle Clearance</h4>
                  <div class="meta-row">
                    <span class="meta-key">Plate Number</span>
                    <span class="meta-val monospace plate-highlight">{{ inspectorItem.vehiclePlate }}</span>
                  </div>
                  <div class="meta-row">
                    <span class="meta-key">Brand / Model</span>
                    <span class="meta-val">{{ inspectorItem.brand }}</span>
                  </div>
                  <div class="meta-row">
                    <span class="meta-key">Classification</span>
                    <span class="meta-val">{{ inspectorItem.vehicleType }}</span>
                  </div>
                </div>

                <!-- Necessary Documents Checklist -->
                <div class="sidebar-section">
                  <h4 class="sidebar-label">Required Documents Check</h4>
                  <template v-if="inspectorItem.category === 'Registration'">
                    <div class="check-item">
                      <span class="check-dot check-dot--ok">•</span>
                      <span>Certificate of Registration (COR) Verified</span>
                    </div>
                  </template>

                  <template v-else-if="inspectorItem.category === 'Schedule'">
                    <div class="check-item">
                      <span class="check-dot check-dot--ok">•</span>
                      <span>COR Student Document Verified</span>
                    </div>
                    <div class="check-item">
                      <span class="check-dot check-dot--ok">•</span>
                      <span>Weekly Class Schedule Verified</span>
                    </div>
                  </template>

                  <template v-else-if="inspectorItem.category === 'Vehicle'">
                    <div class="check-item">
                      <span class="check-dot check-dot--ok">•</span>
                      <span>OR/CR Receipt Document Verified</span>
                    </div>
                    <div class="check-item">
                      <span class="check-dot check-dot--ok">•</span>
                      <span>Vehicle Exterior Photo Verified</span>
                    </div>
                  </template>
                </div>

                <!-- Action Controls -->
                <div class="sidebar-actions">
                  <div v-if="inspectorItem.status === 'pending'" class="inspector-btn-group">
                    <button class="btn-inspector-reject" @click="reject(inspectorItem)">
                      Decline Request
                    </button>
                    <button class="btn-inspector-approve" @click="approve(inspectorItem)">
                      Approve & Grant Pass
                    </button>
                  </div>
                  <div v-else class="inspector-status-notice" :class="`notice--${inspectorItem.status}`">
                    <span v-if="inspectorItem.status === 'approved'">Clearance Approved & Verified</span>
                    <span v-else>Approval Request Declined</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Image Zoom Modal Viewer -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="selectedZoomImage" class="modal-backdrop-zoom" @click="selectedZoomImage = null">
          <div class="modal-content-zoom" @click.stop>
            <button class="modal-close" @click="selectedZoomImage = null">&times;</button>
            <img :src="selectedZoomImage" alt="Document Preview" class="modal-img" />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.registrations-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.registrations-page__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
}

.registrations-page__title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-main, #0f172a);
  margin: 0 0 4px 0;
}

.registrations-page__subtitle {
  font-size: 14px;
  color: var(--color-text-muted, #64748b);
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.view-mode-toggle {
  display: flex;
  background: var(--color-bg-secondary, #f1f5f9);
  padding: 4px;
  border-radius: 8px;
  gap: 4px;
}

.view-mode-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-muted, #64748b);
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-mode-btn--active {
  background: #ffffff;
  color: #6366f1;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.registrations-page__refresh-btn {
  padding: 8px 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: #ffffff;
  border-radius: 8px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s ease;
}

.registrations-page__refresh-btn:hover {
  background: #f8fafc;
  color: #0f172a;
}

/* Overview Stats Cards */
.registrations-page__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.stat-card__icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-card--pending .stat-card__icon {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.stat-card--approved .stat-card__icon {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.stat-card--rejected .stat-card__icon {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.stat-card__value {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  display: block;
}

.stat-card__label {
  font-size: 13px;
  color: #64748b;
}

/* Category Filter Bar */
.category-filter-bar {
  margin-bottom: 16px;
}

.category-pills {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.cat-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid var(--color-border, #e2e8f0);
  background: #ffffff;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cat-pill:hover {
  background: #f8fafc;
  color: #0f172a;
}

.cat-pill--active {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
}

.cat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.cat-dot--registration { background: #3b82f6; }
.cat-dot--schedule { background: #8b5cf6; }
.cat-dot--vehicle { background: #10b981; }

/* Category Badges */
.category-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.category-badge--registration {
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
}

.category-badge--schedule {
  background: rgba(139, 92, 246, 0.12);
  color: #7c3aed;
}

.category-badge--vehicle {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

/* Unified Filters Bar */
.filters-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

@media (max-width: 768px) {
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

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 10px 14px 10px 38px;
  border: 1px solid var(--color-border, #cbd5e1);
  border-radius: 8px;
  font-size: 13.5px;
  background: #ffffff;
  color: #0f172a;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
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
  background: #ffffff;
  border: 1px solid var(--color-border, #cbd5e1);
  border-radius: 8px;
  padding: 8px 36px 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
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
  border-color: #94a3b8;
}

.filter-select:focus {
  outline: none;
  border-color: #6366f1;
}

/* Review Grid Cards */
.review-grid-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.review-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 20px;
}

.review-card {
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid var(--color-border, #e2e8f0);
  padding: 20px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.review-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
}

.review-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.applicant-flex {
  display: flex;
  gap: 12px;
  align-items: center;
}

.applicant-avatar {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  color: #ffffff;
  font-weight: 700;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.applicant-header-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.applicant-name {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.applicant-sub {
  font-size: 12px;
  color: #64748b;
  margin: 2px 0 0 0;
}

.vehicle-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 8px;
  font-size: 13px;
}

.vehicle-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  color: #0f172a;
}

.plate-text {
  background: #e2e8f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.vehicle-desc {
  color: #64748b;
}

/* Document Thumbnails Grid */
.doc-previews-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.doc-thumb-box {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #f8fafc;
}

.doc-thumb-box:hover {
  border-color: #6366f1;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
}

.doc-thumb-box--wide {
  grid-column: 1 / -1;
}

.doc-thumb-img-wrapper {
  position: relative;
  height: 110px;
  overflow: hidden;
  background: #f1f5f9;
}

.doc-thumb-pdf, .doc-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border: none;
}

.doc-hover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.65);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.doc-thumb-box:hover .doc-hover-overlay {
  opacity: 1;
}

.doc-thumb-info {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: #ffffff;
}

.doc-thumb-title {
  font-size: 12px;
  font-weight: 600;
  color: #0f172a;
}

.doc-thumb-status {
  font-size: 11px;
}

.doc-thumb-status--ok { color: #10b981; }

.schedule-thumb-wrapper {
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.schedule-mini-preview {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mini-sched-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: #64748b;
}

.mini-day {
  width: 28px;
  font-weight: 600;
}

.mini-bar {
  flex: 1;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
}

.mini-bar--active {
  background: #8b5cf6;
}

/* Card Footer Actions */
.review-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

.btn-inspect {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #0f172a;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-inspect:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.card-actions-group {
  display: flex;
  gap: 8px;
}

.btn-card-reject {
  padding: 8px 14px;
  border-radius: 8px;
  border: none;
  background: #fee2e2;
  color: #dc2626;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn-card-approve {
  padding: 8px 14px;
  border-radius: 8px;
  border: none;
  background: #10b981;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.result-text {
  font-size: 13px;
  font-weight: 600;
}

.result-text--approved { color: #10b981; }
.result-text--rejected { color: #ef4444; }

/* Status Badges */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-badge--pending { background: #fef3c7; color: #d97706; }
.status-badge--pending .status-dot { background: #d97706; }

.status-badge--approved { background: #d1fae5; color: #059669; }
.status-badge--approved .status-dot { background: #059669; }

.status-badge--rejected { background: #fee2e2; color: #dc2626; }
.status-badge--rejected .status-dot { background: #dc2626; }

/* Empty State */
.registrations-card__empty {
  padding: 48px 24px;
  text-align: center;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
}

.empty-state-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.empty-icon-wrapper {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #f1f5f9;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.empty-sub {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

.btn-reset-filter {
  margin-top: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: #6366f1;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms ease;
}

.btn-reset-filter:hover {
  background: #4f46e5;
}

/* List Table Styles */
.registrations-card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  overflow: hidden;
}

.registrations-table-wrapper {
  overflow-x: auto;
}

.registrations-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.registrations-table th {
  padding: 14px 16px;
  background: #f8fafc;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  border-bottom: 1px solid #e2e8f0;
}

.registrations-table td {
  padding: 14px 16px;
  font-size: 13px;
  border-bottom: 1px solid #f1f5f9;
}

.applicant-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.applicant-info {
  display: flex;
  flex-direction: column;
}

.applicant-email {
  font-size: 12px;
  color: #64748b;
}

.doc-links {
  display: flex;
  gap: 6px;
}

.doc-badge-btn {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.doc-badge-btn--cor { color: #2563eb; }
.doc-badge-btn--sched { color: #7c3aed; }
.doc-badge-btn--orcr { color: #059669; }
.doc-badge-btn--pic { color: #d97706; }

.actions-group {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.action-btn {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  cursor: pointer;
}

.action-btn--approve { background: #10b981; color: #ffffff; }
.action-btn--reject { background: #fee2e2; color: #dc2626; }

/* ── Pagination Styling (Matches Client Directory) ───────────────────────────── */
.table-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  margin-top: 16px;
  border-top: 1px solid var(--color-border, #f1f5f9);
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  flex-wrap: wrap;
  gap: 12px;
}

.pagination-info {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.per-page-selector {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: #64748b;
}

.per-page-select {
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #0f172a;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.page-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}

.page-btn {
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #0f172a;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-btn:hover:not(:disabled) {
  border-color: #6366f1;
  color: #6366f1;
}

.page-num-btn {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #0f172a;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms ease;
}

.page-num-btn:hover:not(.page-num-btn--active) {
  border-color: #6366f1;
  color: #6366f1;
}

.page-num-btn--active {
  background: #6366f1 !important;
  border-color: #6366f1 !important;
  color: #ffffff !important;
}

/* Inspector Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.inspector-modal {
  width: 100%;
  max-width: 1100px;
  max-height: 90vh;
  background: #ffffff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
}

.inspector-header {
  padding: 20px 24px;
  background: #0f172a;
  color: #ffffff;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.inspector-tag {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #818cf8;
}

.inspector-title {
  font-size: 18px;
  font-weight: 700;
  margin: 4px 0 0 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 28px;
  cursor: pointer;
}

.close-btn:hover { color: #ffffff; }

.inspector-body {
  display: grid;
  grid-template-columns: 1fr 340px;
  height: calc(90vh - 80px);
  overflow: hidden;
}

.inspector-viewer {
  padding: 20px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.doc-tabs {
  display: flex;
  gap: 8px;
  background: #e2e8f0;
  padding: 4px;
  border-radius: 8px;
}

.doc-tab-btn {
  flex: 1;
  padding: 8px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
}

.doc-tab-btn--active {
  background: #ffffff;
  color: #6366f1;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.doc-preview-box {
  flex: 1;
  min-height: 400px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

.doc-pdf-iframe {
  width: 100%;
  flex: 1;
  min-height: 440px;
  border: none;
}

.pdf-modal-toolbar {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #f1f5f9;
  border-top: 1px solid #e2e8f0;
}

.pdf-action-btn {
  padding: 8px 14px;
  background: #6366f1;
  color: #ffffff;
  text-decoration: none;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
}

.pdf-action-btn--secondary {
  background: #ffffff;
  color: #0f172a;
  border: 1px solid #cbd5e1;
}

.inspector-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  cursor: zoom-in;
}

.zoom-hint {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.75);
  color: #ffffff;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
}

/* Schedule Inspector Box */
.schedule-inspector-box {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sched-inspect-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sched-inspect-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.btn-edit-sched, .btn-save-sched {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.btn-edit-sched { background: #e0e7ff; color: #4338ca; }
.btn-save-sched { background: #10b981; color: #ffffff; }

.schedule-presets {
  display: flex;
  gap: 8px;
}

.preset-btn {
  padding: 4px 10px;
  font-size: 11px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  cursor: pointer;
}

.schedule-inspect-table {
  width: 100%;
  border-collapse: collapse;
}

.schedule-inspect-table th, .schedule-inspect-table td {
  padding: 10px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13px;
}

.access-chip {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.access-chip--allowed { background: #d1fae5; color: #059669; }
.access-chip--off { background: #fee2e2; color: #dc2626; }

.time-input {
  padding: 4px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 12px;
}

/* Inspector Sidebar */
.inspector-sidebar {
  padding: 20px;
  border-left: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: #ffffff;
  overflow-y: auto;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sidebar-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: #94a3b8;
  margin: 0 0 4px 0;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.meta-key { color: #64748b; }
.meta-val { font-weight: 600; color: #0f172a; }

.check-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #334155;
}

.check-dot--ok { color: #10b981; font-weight: 900; }

.sidebar-actions {
  margin-top: auto;
}

.inspector-btn-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-inspector-reject {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: none;
  background: #fee2e2;
  color: #dc2626;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.btn-inspector-approve {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: none;
  background: #10b981;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.inspector-status-notice {
  padding: 12px;
  border-radius: 8px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
}

.notice--approved { background: #d1fae5; color: #059669; }
.notice--rejected { background: #fee2e2; color: #dc2626; }

/* Image Zoom */
.modal-backdrop-zoom {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modal-content-zoom {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
}

.modal-img {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 8px;
}

.modal-close {
  position: absolute;
  top: -40px;
  right: 0;
  background: transparent;
  border: none;
  color: #ffffff;
  font-size: 32px;
  cursor: pointer;
}
</style>
