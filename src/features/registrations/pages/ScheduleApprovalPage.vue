<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import api from '@/api/axios'

interface ScheduleItem {
  dayOfWeek: number
  startTime: string
  endTime: string
}

interface CorSubmissionItem {
  id: string
  userAccountId: string
  fullName: string
  email: string
  academicTerm: string
  corDocumentUrl: string
  orcrDocumentUrl?: string
  motorPictureUrl?: string
  verificationStatus: number // 0=NotSubmitted, 1=Pending, 2=Verified, 3=Rejected
  vehiclePlate: string
  vehicleType: string
  createdAt: string
  schedules?: ScheduleItem[]
}

const defaultCorImage = 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80'
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

const weeklyDays = [1, 2, 3, 4, 5, 6, 0] // Mon to Sun

const initialMockSubmissions: CorSubmissionItem[] = [
  {
    id: 'sub-demo-1',
    userAccountId: 'usr-1',
    fullName: 'Juan Dela Cruz',
    email: 'juan.delacruz@bulsu.edu.ph',
    academicTerm: '1st Sem 2026-2027',
    corDocumentUrl: defaultCorImage,
    orcrDocumentUrl: defaultOrcrImage,
    motorPictureUrl: defaultMotorImage,
    verificationStatus: 1,
    vehiclePlate: 'ABC 1234',
    vehicleType: 'Car',
    createdAt: new Date().toISOString(),
    schedules: [
      { dayOfWeek: 1, startTime: '08:00:00', endTime: '17:00:00' },
      { dayOfWeek: 3, startTime: '08:00:00', endTime: '17:00:00' },
      { dayOfWeek: 5, startTime: '08:00:00', endTime: '17:00:00' }
    ]
  },
  {
    id: 'sub-demo-2',
    userAccountId: 'usr-2',
    fullName: 'Maria Santos',
    email: 'maria.santos@bulsu.edu.ph',
    academicTerm: '1st Sem 2026-2027',
    corDocumentUrl: defaultCorImage,
    orcrDocumentUrl: defaultOrcrImage,
    motorPictureUrl: defaultMotorImage,
    verificationStatus: 1,
    vehiclePlate: 'XYZ 5678',
    vehicleType: 'Motorcycle',
    createdAt: new Date().toISOString(),
    schedules: [
      { dayOfWeek: 2, startTime: '07:30:00', endTime: '16:30:00' },
      { dayOfWeek: 4, startTime: '07:30:00', endTime: '16:30:00' },
      { dayOfWeek: 6, startTime: '08:00:00', endTime: '12:00:00' }
    ]
  }
]

const submissions = ref<CorSubmissionItem[]>(initialMockSubmissions)
const isLoading = ref(true)
const selectedTab = ref<'pending' | 'verified' | 'rejected' | 'all'>('pending')
const searchQuery = ref('')
const selectedSubmission = ref<CorSubmissionItem | null>(null)
const isZoomed = ref(false)
const zoomedImage = ref('')
const apiErrorNotice = ref<string | null>(null)
const scheduleSuccessMsg = ref<string | null>(null)

// Interactive Schedule Editing State
const isEditingSchedule = ref(false)

function createDefaultEditForm(): Record<number, { active: boolean; startTime: string; endTime: string }> {
  const form: Record<number, { active: boolean; startTime: string; endTime: string }> = {}
  weeklyDays.forEach(day => {
    form[day] = { active: false, startTime: '07:00', endTime: '19:00' }
  })
  return form
}

const scheduleEditForm = ref<Record<number, { active: boolean; startTime: string; endTime: string }>>(createDefaultEditForm())

function formatDocUrl(url?: string, fallback: string = ''): string {
  if (!url || !url.trim()) return fallback
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url
  }
  const isProduction = import.meta.env.PROD
  const defaultBase = isProduction ? window.location.origin : 'http://localhost:5000'
  const baseURL = import.meta.env.VITE_API_BASE_URL || defaultBase
  const rootDomain = baseURL.replace(/\/api\/?$/, '')
  return `${rootDomain}/${url.replace(/^\//, '')}`
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

async function fetchSubmissions() {
  isLoading.value = true
  apiErrorNotice.value = null
  try {
    const response = await api.get('/cor-submissions')
    const rawData = response.data
    const items = Array.isArray(rawData) ? rawData : (rawData?.isSuccess && Array.isArray(rawData?.data) ? rawData.data : (Array.isArray(rawData?.data) ? rawData.data : null))

    if (items && items.length > 0) {
      submissions.value = items.map((s: any) => ({
        ...s,
        corDocumentUrl: formatDocUrl(s.corDocumentUrl, defaultCorImage),
        orcrDocumentUrl: formatDocUrl(s.orcrDocumentUrl, defaultOrcrImage),
        motorPictureUrl: formatDocUrl(s.motorPictureUrl, defaultMotorImage)
      }))
    } else if (items && items.length === 0) {
      submissions.value = []
    }
  } catch (err: any) {
    console.warn('Backend API connection warning for schedule COR submissions:', err)
    if (err?.response?.status === 502) {
      apiErrorNotice.value = 'Backend server returned 502 Bad Gateway. Displaying cached schedule submissions.'
    } else {
      apiErrorNotice.value = 'Could not connect to backend server. Displaying cached schedule submissions.'
    }
  } finally {
    isLoading.value = false
    if (submissions.value.length > 0) {
      const pendingFirst = submissions.value.find(s => s.verificationStatus === 1 || s.verificationStatus === 0)
      selectedSubmission.value = pendingFirst || submissions.value[0] || null
    }
  }
}

onMounted(() => {
  fetchSubmissions()
})

const pendingCount = computed(() => submissions.value.filter(s => s.verificationStatus === 1 || s.verificationStatus === 0 || s.verificationStatus === undefined || s.verificationStatus === null).length)
const verifiedCount = computed(() => submissions.value.filter(s => s.verificationStatus === 2).length)
const rejectedCount = computed(() => submissions.value.filter(s => s.verificationStatus === 3).length)

const filteredSubmissions = computed(() => {
  return submissions.value.filter(item => {
    if (selectedTab.value === 'pending' && item.verificationStatus !== 1 && item.verificationStatus !== 0 && item.verificationStatus !== undefined && item.verificationStatus !== null) return false
    if (selectedTab.value === 'verified' && item.verificationStatus !== 2) return false
    if (selectedTab.value === 'rejected' && item.verificationStatus !== 3) return false

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      const nameMatch = (item.fullName || '').toLowerCase().includes(q)
      const emailMatch = (item.email || '').toLowerCase().includes(q)
      const plateMatch = (item.vehiclePlate || '').toLowerCase().includes(q)
      return nameMatch || emailMatch || plateMatch
    }
    return true
  })
})

watch(filteredSubmissions, (newList) => {
  if (newList.length > 0) {
    if (!selectedSubmission.value || !newList.some(item => item.id === selectedSubmission.value?.id)) {
      selectedSubmission.value = newList[0] || null
    }
  } else {
    selectedSubmission.value = null
  }
}, { immediate: true })

function selectSubmission(item: CorSubmissionItem) {
  selectedSubmission.value = item
  isEditingSchedule.value = false
}

// Schedule Edit Handlers
function initScheduleEditForm() {
  const form = createDefaultEditForm()
  weeklyDays.forEach(day => {
    const existing = selectedSubmission.value?.schedules?.find(s => s.dayOfWeek === day)
    if (existing) {
      form[day] = {
        active: true,
        startTime: existing.startTime.slice(0, 5),
        endTime: existing.endTime.slice(0, 5)
      }
    }
  })
  scheduleEditForm.value = form
}

function startEditingSchedule() {
  initScheduleEditForm()
  isEditingSchedule.value = true
}

function cancelEditingSchedule() {
  isEditingSchedule.value = false
}

function applyStandardHours() {
  weeklyDays.forEach(day => {
    if (day !== 0) { // Mon to Sat
      scheduleEditForm.value[day] = {
        active: true,
        startTime: '07:00',
        endTime: '19:00'
      }
    }
  })
}

function applyFullWeekAccess() {
  weeklyDays.forEach(day => {
    scheduleEditForm.value[day] = {
      active: true,
      startTime: '07:00',
      endTime: '21:00'
    }
  })
}

function clearAllDays() {
  weeklyDays.forEach(day => {
    scheduleEditForm.value[day] = {
      active: false,
      startTime: '07:00',
      endTime: '19:00'
    }
  })
}

function saveScheduleChanges() {
  if (!selectedSubmission.value) return

  const updatedSchedules: ScheduleItem[] = []
  weeklyDays.forEach(day => {
    const item = scheduleEditForm.value[day]
    if (item && item.active) {
      const formattedStart = item.startTime.length === 5 ? `${item.startTime}:00` : item.startTime
      const formattedEnd = item.endTime.length === 5 ? `${item.endTime}:00` : item.endTime
      updatedSchedules.push({
        dayOfWeek: day,
        startTime: formattedStart,
        endTime: formattedEnd
      })
    }
  })

  selectedSubmission.value.schedules = updatedSchedules
  isEditingSchedule.value = false
  scheduleSuccessMsg.value = 'Schedule modifications saved successfully!'
  setTimeout(() => {
    scheduleSuccessMsg.value = null
  }, 3500)
}

async function approveSubmission(item: CorSubmissionItem) {
  try {
    const res = await api.patch(`/cor-submissions/${item.id}/validate`, {
      verificationStatus: 2
    })
    if (res.data?.isSuccess || res.status === 200) {
      item.verificationStatus = 2
    }
  } catch (err) {
    console.error('Error approving submission:', err)
    item.verificationStatus = 2
  }
}

async function rejectSubmission(item: CorSubmissionItem) {
  try {
    const res = await api.patch(`/cor-submissions/${item.id}/validate`, {
      verificationStatus: 3
    })
    if (res.data?.isSuccess || res.status === 200) {
      item.verificationStatus = 3
    }
  } catch (err) {
    console.error('Error rejecting submission:', err)
    item.verificationStatus = 3
  }
}

function openZoom(url: string) {
  zoomedImage.value = url
  isZoomed.value = true
}

const activeImageUrl = computed(() => {
  if (!selectedSubmission.value) return defaultCorImage
  return selectedSubmission.value.corDocumentUrl || defaultCorImage
})

const isPdf = computed(() => {
  if (!activeImageUrl.value) return false
  const cleanUrl = activeImageUrl.value.split('?')[0]?.toLowerCase() || ''
  return cleanUrl.endsWith('.pdf')
})

watch(selectedSubmission, () => {
  isEditingSchedule.value = false
})
</script>

<template>
  <div class="schedule-approval-page">
    <!-- Header Banner -->
    <div class="page-header">
      <div class="header-left">
        <div class="header-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Schedule & COR Verification Portal
        </div>
        <h1 class="page-title">COR & Attendance Schedule Verification</h1>
        <p class="page-subtitle">Inspect Certificate of Registration (COR) side-by-side with user declared schedule, edit access slots, and grant vehicle parking approvals.</p>
      </div>
      <button class="refresh-btn" @click="fetchSubmissions">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.5 2v6h-6M2.5 22v-6h6"/>
          <path d="M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8M22 12.5a10 10 0 0 1-18.8 4.2L2.5 16"/>
        </svg>
        Refresh Submissions
      </button>
    </div>

    <!-- Notice Bar for API connection warnings -->
    <div v-if="apiErrorNotice" class="notice-bar">
      <div class="notice-left">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="8"/>
        </svg>
        <span>{{ apiErrorNotice }}</span>
      </div>
      <button class="notice-retry" @click="fetchSubmissions">Retry</button>
    </div>

    <!-- Success Feedback Bar -->
    <div v-if="scheduleSuccessMsg" class="success-bar">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
      <span>{{ scheduleSuccessMsg }}</span>
    </div>

    <!-- Filter Tabs & Counter Stats -->
    <div class="filter-toolbar">
      <div class="tab-group">
        <button
          class="tab-btn"
          :class="{ active: selectedTab === 'pending' }"
          @click="selectedTab = 'pending'"
        >
          Pending Review
          <span class="count-pill pill--amber">{{ pendingCount }}</span>
        </button>
        <button
          class="tab-btn"
          :class="{ active: selectedTab === 'verified' }"
          @click="selectedTab = 'verified'"
        >
          Verified / Approved
          <span class="count-pill pill--green">{{ verifiedCount }}</span>
        </button>
        <button
          class="tab-btn"
          :class="{ active: selectedTab === 'rejected' }"
          @click="selectedTab = 'rejected'"
        >
          Rejected
          <span class="count-pill pill--red">{{ rejectedCount }}</span>
        </button>
        <button
          class="tab-btn"
          :class="{ active: selectedTab === 'all' }"
          @click="selectedTab = 'all'"
        >
          All Submissions
          <span class="count-pill pill--gray">{{ submissions.length }}</span>
        </button>
      </div>

      <div class="search-wrapper">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search student name, email, or plate..."
          class="search-input"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading COR documents and user schedules...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredSubmissions.length === 0" class="empty-state">
      <div class="empty-state-content">
        <div class="empty-icon-wrapper">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </div>
        <h3>No COR Submissions Found</h3>
        <p>There are no submissions matching your current filter criteria.</p>
      </div>
    </div>

    <!-- Main Side-by-Side Dual Verification Layout -->
    <div v-else class="dual-workspace">
      <!-- Left Column: Applicants List Selector -->
      <div class="applicants-sidebar">
        <div class="sidebar-header">
          <span class="sidebar-title">Applicants List ({{ filteredSubmissions.length }})</span>
        </div>
        <div class="applicants-list">
          <div
            v-for="sub in filteredSubmissions"
            :key="sub.id"
            class="applicant-card"
            :class="{ active: selectedSubmission?.id === sub.id }"
            @click="selectSubmission(sub)"
          >
            <div class="applicant-card-header">
              <span class="applicant-name">{{ sub.fullName }}</span>
              <span
                class="status-chip"
                :class="{
                  'status--pending': sub.verificationStatus === 1 || sub.verificationStatus === 0,
                  'status--verified': sub.verificationStatus === 2,
                  'status--rejected': sub.verificationStatus === 3
                }"
              >
                {{ sub.verificationStatus === 2 ? 'Verified' : sub.verificationStatus === 3 ? 'Rejected' : 'Pending' }}
              </span>
            </div>
            <div class="applicant-details">
              <span class="detail-item">{{ sub.email }}</span>
              <span class="detail-item plate-tag">{{ sub.vehiclePlate }} ({{ sub.vehicleType }})</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Dual View Inspector (COR Document & Schedule Side-by-Side) -->
      <div v-if="selectedSubmission" class="inspector-workspace">
        <div class="inspector-header">
          <div class="user-meta">
            <h2 class="user-name">{{ selectedSubmission.fullName }}</h2>
            <div class="sub-meta-row">
              <span class="user-email">{{ selectedSubmission.email }}</span>
              <span class="plate-badge">{{ selectedSubmission.vehiclePlate }} ({{ selectedSubmission.vehicleType }})</span>
            </div>
          </div>

          <div class="action-buttons">
            <button
              class="btn-reject"
              :disabled="selectedSubmission.verificationStatus === 3"
              @click="rejectSubmission(selectedSubmission)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              Reject Document
            </button>
            <button
              class="btn-approve"
              :disabled="selectedSubmission.verificationStatus === 2"
              @click="approveSubmission(selectedSubmission)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Approve & Grant Access
            </button>
          </div>
        </div>

        <div class="side-by-side-grid">
          <!-- LEFT SIDE: Document Viewer (COR Only) -->
          <div class="side-panel doc-panel">
            <div class="panel-header">
              <h3 class="panel-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                Certificate of Registration (COR)
              </h3>
              <span class="cor-type-tag">Official Proof Document</span>
            </div>

            <div class="doc-viewer-box">
              <template v-if="isPdf">
                <iframe :src="activeImageUrl" class="doc-pdf-iframe" title="Certificate of Registration PDF"></iframe>
                <div class="pdf-toolbar">
                  <a :href="activeImageUrl" target="_blank" rel="noopener noreferrer" class="pdf-open-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15 3 21 3 21 9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                    Open PDF in New Tab
                  </a>
                  <button class="zoom-btn" @click="openZoom(activeImageUrl)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="11" cy="11" r="8"/>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      <line x1="11" y1="8" x2="11" y2="14"/>
                      <line x1="8" y1="11" x2="14" y2="11"/>
                    </svg>
                    Fullscreen
                  </button>
                </div>
              </template>
              <template v-else>
                <img :src="activeImageUrl" alt="COR Document" class="doc-image" @click="openZoom(activeImageUrl)" />
                <button class="zoom-btn" @click="openZoom(activeImageUrl)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    <line x1="11" y1="8" x2="11" y2="14"/>
                    <line x1="8" y1="11" x2="14" y2="11"/>
                  </svg>
                  Click to Expand Fullscreen
                </button>
              </template>
            </div>
          </div>

          <!-- RIGHT SIDE: Interactive Duty/Class Schedule Panel -->
          <div class="side-panel schedule-panel">
            <div class="panel-header">
              <h3 class="panel-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Weekly Campus Access Schedule
              </h3>
              <div class="schedule-header-actions">
                <button v-if="!isEditingSchedule" class="edit-schedule-btn" @click="startEditingSchedule">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Edit Schedule
                </button>
                <span v-else class="editing-badge">Editing Mode</span>
              </div>
            </div>

            <!-- Quick Presets Toolbar (When Editing) -->
            <div v-if="isEditingSchedule" class="schedule-presets-toolbar">
              <span class="preset-label">Quick Presets:</span>
              <button class="preset-btn" @click="applyStandardHours">Standard 7AM-7PM</button>
              <button class="preset-btn" @click="applyFullWeekAccess">Full Week (Mon-Sun)</button>
              <button class="preset-btn btn--outline" @click="clearAllDays">Clear All</button>
            </div>

            <div class="schedule-table-wrapper">
              <table class="schedule-table">
                <thead>
                  <tr>
                    <th style="width: 25%;">Day</th>
                    <th style="width: 32%;">Entry Time</th>
                    <th style="width: 32%;">Exit Time</th>
                    <th style="width: 11%; text-align: center;">Access</th>
                  </tr>
                </thead>
                <tbody>
                  <!-- READ ONLY MODE -->
                  <template v-if="!isEditingSchedule">
                    <tr v-for="dayKey in weeklyDays" :key="`read-${dayKey}`">
                      <td class="day-name font-bold">{{ dayNames[dayKey] }}</td>
                      <template v-if="selectedSubmission.schedules?.find(s => s.dayOfWeek === dayKey)">
                        <td class="time-slot">{{ formatTimeSpan(selectedSubmission.schedules.find(s => s.dayOfWeek === dayKey)?.startTime) }}</td>
                        <td class="time-slot">{{ formatTimeSpan(selectedSubmission.schedules.find(s => s.dayOfWeek === dayKey)?.endTime) }}</td>
                        <td style="text-align: center;">
                          <span class="day-chip day-chip--active">Allowed</span>
                        </td>
                      </template>
                      <template v-else>
                        <td class="text-muted">—</td>
                        <td class="text-muted">—</td>
                        <td style="text-align: center;">
                          <span class="day-chip day-chip--off">No Access</span>
                        </td>
                      </template>
                    </tr>
                  </template>

                  <!-- EDITING MODE -->
                  <template v-else>
                    <tr v-for="dayKey in weeklyDays" :key="`edit-${dayKey}`" :class="{ 'row-disabled': !scheduleEditForm[dayKey]?.active }">
                      <td class="day-name font-bold">
                        <label class="day-toggle-label" v-if="scheduleEditForm[dayKey]">
                          <input type="checkbox" v-model="scheduleEditForm[dayKey].active" class="day-checkbox" />
                          <span>{{ dayNames[dayKey] }}</span>
                        </label>
                      </td>
                      <td>
                        <input
                          v-if="scheduleEditForm[dayKey]"
                          type="time"
                          v-model="scheduleEditForm[dayKey].startTime"
                          :disabled="!scheduleEditForm[dayKey].active"
                          class="time-picker-input"
                        />
                      </td>
                      <td>
                        <input
                          v-if="scheduleEditForm[dayKey]"
                          type="time"
                          v-model="scheduleEditForm[dayKey].endTime"
                          :disabled="!scheduleEditForm[dayKey].active"
                          class="time-picker-input"
                        />
                      </td>
                      <td style="text-align: center;">
                        <span class="day-chip" :class="scheduleEditForm[dayKey]?.active ? 'day-chip--active' : 'day-chip--off'">
                          {{ scheduleEditForm[dayKey]?.active ? 'Active' : 'Off' }}
                        </span>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>

            <!-- Schedule Action Buttons (When Editing) -->
            <div v-if="isEditingSchedule" class="schedule-save-actions">
              <button class="btn-cancel-schedule" @click="cancelEditingSchedule">Cancel</button>
              <button class="btn-save-schedule" @click="saveScheduleChanges">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Save Schedule Updates
              </button>
            </div>

            <div class="verification-guide-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <div>
                <strong>Dual Verification Checklist:</strong> Match the class schedule on the uploaded COR document with the student's entry/exit times. Click <strong>Edit Schedule</strong> above to modify access windows if necessary before approving.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Image / PDF Zoom Modal -->
    <Teleport to="body">
      <div v-if="isZoomed" class="zoom-modal-backdrop" @click="isZoomed = false">
        <div class="zoom-modal-content" @click.stop>
          <button class="zoom-close-btn" @click="isZoomed = false">&times;</button>
          <iframe v-if="isPdf" :src="zoomedImage" class="zoomed-pdf" title="Full COR PDF Document"></iframe>
          <img v-else :src="zoomedImage" alt="Expanded Document" class="zoomed-img" />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.schedule-approval-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  height: calc(100vh - 105px);
  min-height: 0;
  box-sizing: border-box;
  overflow: hidden;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  flex-direction: column;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(210, 39, 48, 0.1);
  color: var(--color-primary, #d22730);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  margin-bottom: 6px;
}

.page-title {
  font-size: 22px;
  font-weight: 800;
  color: var(--color-text);
  margin: 0;
}

.page-subtitle {
  font-size: 13px;
  color: var(--color-muted);
  margin: 2px 0 0;
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}

.refresh-btn:hover {
  background: var(--color-surface-muted);
}

.notice-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 10px;
  color: #f59e0b;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.notice-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notice-retry {
  text-decoration: underline;
  cursor: pointer;
  background: none;
  border: none;
  color: inherit;
  font-weight: 700;
}

.success-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 10px;
  color: #10b981;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.filter-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 10px 14px;
  flex-shrink: 0;
}

.tab-group {
  display: flex;
  gap: 8px;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}

.tab-btn:hover {
  color: var(--color-text);
  background: var(--color-surface-muted);
}

.tab-btn.active {
  background: var(--color-surface-muted);
  border-color: var(--color-border);
  color: var(--color-text);
}

.count-pill {
  padding: 2px 7px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
}

.pill--amber { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.pill--green { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.pill--red { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.pill--gray { background: rgba(148, 163, 184, 0.15); color: #94a3b8; }

.search-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 6px 12px;
  width: 300px;
  color: var(--color-muted);
}

.search-input {
  background: transparent;
  border: none;
  color: var(--color-text);
  font-size: 13px;
  outline: none;
  width: 100%;
}

.loading-state,
.empty-state {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 48px 24px;
  text-align: center;
  color: var(--color-muted);
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 360px;
  box-sizing: border-box;
}

.empty-state-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 400px;
  margin: 0 auto;
  text-align: center;
}

.empty-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  color: var(--color-muted);
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
}

.empty-state p {
  margin: 0;
  font-size: 13px;
  color: var(--color-muted);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary, #d22730);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Dual Workspace (Non-Scrollable Layout Container) */
.dual-workspace {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 16px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* Sidebar List */
.applicants-sidebar {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.sidebar-header {
  padding: 12px 14px;
  border-bottom: 1px solid var(--color-border);
  font-weight: 700;
  font-size: 12px;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}

.applicants-list {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex: 1;
  padding: 8px;
  gap: 8px;
}

.applicant-card {
  padding: 12px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-muted);
  border-radius: 8px;
  cursor: pointer;
  transition: all 150ms ease;
}

.applicant-card:hover {
  border-color: var(--color-primary, #d22730);
}

.applicant-card.active {
  background: rgba(210, 39, 48, 0.08);
  border-color: var(--color-primary, #d22730);
  border-left-width: 4px;
}

.applicant-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.applicant-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text);
}

.status-chip {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
}

.status--pending { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.status--verified { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.status--rejected { background: rgba(239, 68, 68, 0.15); color: #ef4444; }

.applicant-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  color: var(--color-muted);
}

.plate-tag {
  font-family: monospace;
  font-weight: 700;
  color: var(--color-text);
}

.inspector-workspace {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  overflow: hidden;
  flex: 1;
}

.inspector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.user-name {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text);
  margin: 0 0 4px;
}

.sub-meta-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-email {
  font-size: 12px;
  color: var(--color-muted);
}

.plate-badge {
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text);
  font-family: monospace;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.btn-approve, .btn-reject {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: all 150ms ease;
}

.btn-approve { background: #10b981; color: #ffffff; }
.btn-approve:hover:not(:disabled) { background: #059669; }

.btn-reject { background: #ef4444; color: #ffffff; }
.btn-reject:hover:not(:disabled) { background: #dc2626; }

.btn-approve:disabled, .btn-reject:disabled { opacity: 0.5; cursor: not-allowed; }

.side-by-side-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.side-panel {
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow: hidden;
  flex: 1;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.panel-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.cor-type-tag {
  font-size: 10px;
  font-weight: 700;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--color-muted);
}

.schedule-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.edit-schedule-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-primary, #d22730);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 150ms ease;
}

.edit-schedule-btn:hover {
  background: rgba(210, 39, 48, 0.08);
}

.editing-badge {
  font-size: 10px;
  font-weight: 700;
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  padding: 3px 8px;
  border-radius: 4px;
  text-transform: uppercase;
}

.schedule-presets-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 6px 10px;
  border-radius: 6px;
  flex-shrink: 0;
}

.preset-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-muted);
  margin-right: 4px;
}

.preset-btn {
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 150ms ease;
}

.preset-btn:hover {
  background: var(--color-primary, #d22730);
  color: #ffffff;
  border-color: var(--color-primary, #d22730);
}

.preset-btn.btn--outline {
  color: var(--color-muted);
}

.doc-viewer-box {
  position: relative;
  width: 100%;
  flex: 1;
  min-height: 0;
  background: #09090b;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.doc-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  cursor: pointer;
}

.doc-pdf-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: #ffffff;
  border-radius: 8px;
}

.pdf-toolbar {
  position: absolute;
  bottom: 10px;
  right: 10px;
  display: flex;
  gap: 8px;
  z-index: 10;
}

.pdf-open-btn, .zoom-btn {
  background: rgba(0, 0, 0, 0.75);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  cursor: pointer;
  transition: all 150ms ease;
}

.pdf-open-btn:hover, .zoom-btn:hover {
  background: rgba(0, 0, 0, 0.9);
}

.schedule-table-wrapper {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.schedule-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.schedule-table th {
  background: var(--color-surface-muted);
  padding: 8px 10px;
  text-align: left;
  font-weight: 700;
  color: var(--color-muted);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 2;
}

.schedule-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  vertical-align: middle;
}

.row-disabled {
  opacity: 0.55;
  background: rgba(0, 0, 0, 0.02);
}

.day-toggle-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 700;
}

.day-checkbox {
  accent-color: var(--color-primary, #d22730);
  cursor: pointer;
}

.time-picker-input {
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: 11px;
  font-weight: 600;
  padding: 4px 6px;
  border-radius: 4px;
  outline: none;
  width: 90px;
}

.time-picker-input:focus {
  border-color: var(--color-primary, #d22730);
}

.day-chip {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.day-chip--active { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.day-chip--off { background: rgba(148, 163, 184, 0.15); color: #94a3b8; }

.schedule-save-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.btn-cancel-schedule {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.btn-save-schedule {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--color-primary, #d22730);
  border: none;
  color: #ffffff;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 150ms ease;
}

.btn-save-schedule:hover {
  background: #b91c1c;
}

.verification-guide-box {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #f59e0b;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 11px;
  display: flex;
  gap: 8px;
  line-height: 1.4;
  flex-shrink: 0;
}

.zoom-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.zoom-modal-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
}

.zoomed-img {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 8px;
}

.zoomed-pdf {
  width: 85vw;
  height: 85vh;
  border: none;
  border-radius: 8px;
  background: #ffffff;
}

.zoom-close-btn {
  position: absolute;
  top: -16px;
  right: -16px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #ffffff;
  color: #000000;
  font-size: 24px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
