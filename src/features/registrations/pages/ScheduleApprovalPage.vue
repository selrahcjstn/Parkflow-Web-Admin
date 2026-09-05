<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
  }
]

const submissions = ref<CorSubmissionItem[]>(initialMockSubmissions)
const isLoading = ref(true)
const selectedTab = ref<'pending' | 'verified' | 'rejected' | 'all'>('pending')
const searchQuery = ref('')
const selectedSubmission = ref<CorSubmissionItem | null>(initialMockSubmissions[0] || null)
const activeDocTab = ref<'cor' | 'orcr' | 'motor'>('cor')
const isZoomed = ref(false)
const zoomedImage = ref('')
const apiErrorNotice = ref<string | null>(null)

const dayNames: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  0: 'Sunday'
}

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
    if (submissions.value.length > 0 && !selectedSubmission.value) {
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

function selectSubmission(item: CorSubmissionItem) {
  selectedSubmission.value = item
  activeDocTab.value = 'cor'
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

const weeklyDays = [1, 2, 3, 4, 5, 6] // Monday through Saturday
</script>

<template>
  <div class="schedule-approval-page">
    <!-- Header Banner -->
    <div class="page-header">
      <div class="header-left">
        <div class="header-badge">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Schedule & COR Verification Portal
        </div>
        <h1 class="page-title">COR & Attendance Schedule Verification</h1>
        <p class="page-subtitle">Inspect uploaded Certificate of Registration (COR) side-by-side with user declared attendance schedules for access approval.</p>
      </div>
      <button class="refresh-btn" @click="fetchSubmissions">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.5 2v6h-6M2.5 22v-6h6"/>
          <path d="M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8M22 12.5a10 10 0 0 1-18.8 4.2L2.5 16"/>
        </svg>
        Refresh Submissions
      </button>
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
          placeholder="Search student name, email, or plate number..."
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
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
      <h3>No COR Submissions Found</h3>
      <p>There are no submissions matching your current filter criteria.</p>
    </div>

    <!-- Main Side-by-Side Dual Verification Layout -->
    <div v-else class="dual-workspace">
      <!-- Left Column: Applicants List Selector -->
      <div class="applicants-sidebar">
        <div class="sidebar-header">
          <span class="sidebar-title">Submissions ({{ filteredSubmissions.length }})</span>
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
                  'status--pending': sub.verificationStatus === 1,
                  'status--verified': sub.verificationStatus === 2,
                  'status--rejected': sub.verificationStatus === 3
                }"
              >
                {{ sub.verificationStatus === 2 ? 'Verified' : sub.verificationStatus === 3 ? 'Rejected' : 'Pending' }}
              </span>
            </div>
            <div class="applicant-details">
              <span class="detail-item">{{ sub.email }}</span>
              <span class="detail-item plate-tag">{{ sub.vehiclePlate }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Dual View Inspector (COR Document & Schedule Side-by-Side) -->
      <div v-if="selectedSubmission" class="inspector-workspace">
        <div class="inspector-header">
          <div class="user-meta">
            <h2 class="user-name">{{ selectedSubmission.fullName }}</h2>
            <span class="user-email">{{ selectedSubmission.email }}</span>
            <span class="plate-badge">{{ selectedSubmission.vehiclePlate }} ({{ selectedSubmission.vehicleType }})</span>
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
              Approve Verification
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

          <!-- RIGHT SIDE: Submitted Duty/Class Schedule -->
          <div class="side-panel schedule-panel">
            <div class="panel-header">
              <h3 class="panel-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Submitted Class / Work Schedule
              </h3>
              <span class="term-badge">Academic Term: {{ selectedSubmission.academicTerm || '2024-2025' }}</span>
            </div>

            <div class="schedule-table-wrapper">
              <table class="schedule-table">
                <thead>
                  <tr>
                    <th>Day of Week</th>
                    <th>Allowed Entry Time</th>
                    <th>Required Exit Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="dayKey in weeklyDays" :key="dayKey">
                    <td class="day-name font-bold">{{ dayNames[dayKey] }}</td>
                    <template v-if="selectedSubmission.schedules?.find(s => s.dayOfWeek === dayKey)">
                      <td class="time-slot">{{ formatTimeSpan(selectedSubmission.schedules.find(s => s.dayOfWeek === dayKey)?.startTime) }}</td>
                      <td class="time-slot">{{ formatTimeSpan(selectedSubmission.schedules.find(s => s.dayOfWeek === dayKey)?.endTime) }}</td>
                      <td>
                        <span class="day-chip day-chip--active">Campus Allowed</span>
                      </td>
                    </template>
                    <template v-else>
                      <td class="text-muted">—</td>
                      <td class="text-muted">—</td>
                      <td>
                        <span class="day-chip day-chip--off">No Campus Access</span>
                      </td>
                    </template>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="verification-guide-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <div>
                <strong>Dual Verification Checklist:</strong> Cross-reference the class schedules printed on the Certificate of Registration (COR) image on the left with the user's declared weekly schedule on the right before granting campus parking authorization.
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
  gap: 20px;
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(210, 39, 48, 0.1);
  color: var(--color-primary, #d22730);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 8px;
}

.page-title {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text);
  margin: 0;
}

.page-subtitle {
  font-size: 13px;
  color: var(--color-muted);
  margin: 4px 0 0;
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}

.refresh-btn:hover {
  background: var(--color-surface-muted);
}

.filter-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 12px 16px;
}

.tab-group {
  display: flex;
  gap: 8px;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
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
  padding: 2px 8px;
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
  gap: 10px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px 12px;
  width: 320px;
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

.loading-state, .empty-state {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 48px;
  text-align: center;
  color: var(--color-muted);
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary, #d22730);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin { to { transform: rotate(360deg); } }

.dual-workspace {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 20px;
  min-height: 640px;
}

.applicants-sidebar {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border);
  font-weight: 700;
  font-size: 13px;
  color: var(--color-text);
}

.applicants-list {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  max-height: 600px;
}

.applicant-card {
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 150ms ease;
}

.applicant-card:hover {
  background: var(--color-surface-muted);
}

.applicant-card.active {
  background: rgba(210, 39, 48, 0.08);
  border-left: 4px solid var(--color-primary, #d22730);
}

.applicant-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.applicant-name {
  font-size: 14px;
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
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.inspector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}

.user-name {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-text);
  margin: 0;
}

.user-email {
  font-size: 13px;
  color: var(--color-muted);
  margin-right: 12px;
}

.plate-badge {
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text);
  font-family: monospace;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.btn-approve, .btn-reject {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 13px;
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
  gap: 20px;
}

.side-panel {
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.cor-type-tag {
  font-size: 11px;
  font-weight: 700;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 3px 8px;
  border-radius: 4px;
  color: var(--color-muted);
}

.doc-viewer-box {
  position: relative;
  width: 100%;
  height: 380px;
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
  bottom: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
  z-index: 10;
}

.pdf-open-btn {
  background: rgba(0, 0, 0, 0.75);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  transition: all 150ms ease;
}

.pdf-open-btn:hover {
  background: rgba(0, 0, 0, 0.9);
}

.zoom-btn {
  background: rgba(0, 0, 0, 0.75);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.term-badge {
  font-size: 11px;
  font-weight: 700;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 3px 8px;
  border-radius: 4px;
  color: var(--color-muted);
}

.schedule-table-wrapper {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.schedule-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.schedule-table th {
  background: var(--color-surface-muted);
  padding: 10px 12px;
  text-align: left;
  font-weight: 700;
  color: var(--color-muted);
  border-bottom: 1px solid var(--color-border);
}

.schedule-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
}

.day-chip {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.day-chip--active { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.day-chip--off { background: rgba(148, 163, 184, 0.15); color: #94a3b8; }

.verification-guide-box {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #f59e0b;
  padding: 12px;
  border-radius: 8px;
  font-size: 12px;
  display: flex;
  gap: 10px;
  line-height: 1.5;
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
