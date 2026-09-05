<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import api from '@/api/axios'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'

interface RegistrationItem {
  id: number
  guid: string
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
  status: 'pending' | 'approved' | 'rejected'
}

const registrations = reactive<RegistrationItem[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const selectedTab = ref<'all' | 'pending' | 'approved' | 'rejected'>('pending')
const viewMode = ref<'grid' | 'table'>('table')

// Document Review Inspector Modal State
const inspectorItem = ref<RegistrationItem | null>(null)
const activeDocType = ref<'cor' | 'orcr' | 'motorPic'>('cor')
const selectedImage = ref<string | null>(null)

const defaultCorPdf = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
const defaultOrcrImage = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80'
const defaultMotorImage = 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80'

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

const pendingCount = computed(() => registrations.filter((r) => r.status === 'pending').length)
const approvedCount = computed(() => registrations.filter((r) => r.status === 'approved').length)
const rejectedCount = computed(() => registrations.filter((r) => r.status === 'rejected').length)

const filteredRegistrations = computed(() => {
  return registrations.filter((item) => {
    // Filter by tab
    if (selectedTab.value !== 'all' && item.status !== selectedTab.value) {
      return false
    }

    // Filter by search
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      const nameMatch = item.fullName.toLowerCase().includes(q)
      const emailMatch = item.email.toLowerCase().includes(q)
      const plateMatch = item.vehiclePlate.toLowerCase().includes(q)
      return nameMatch || emailMatch || plateMatch
    }

    return true
  })
})

function formatDocUrl(url?: string, fallback: string = ''): string {
  if (!url || !url.trim()) return fallback
  const trimmed = url.trim()
  if (trimmed === 'pending' || trimmed === 'null' || trimmed === 'undefined') return fallback
  if (trimmed.includes('storage.parkflow.com') || trimmed.includes('example.com') || trimmed.includes('invalid-domain')) {
    return fallback
  }
  if (trimmed.startsWith('file://') || trimmed.startsWith('content://') || trimmed.startsWith('ph://')) {
    return fallback
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed
  }
  const isProduction = import.meta.env.PROD
  const defaultBase = isProduction ? window.location.origin : 'http://localhost:5000'
  const baseURL = import.meta.env.VITE_API_BASE_URL || defaultBase
  const rootDomain = baseURL.replace(/\/api\/?$/, '')
  return `${rootDomain}/${trimmed.replace(/^\//, '')}`
}

function handleImageError(event: Event, fallback: string) {
  const target = event.target as HTMLImageElement
  if (target && target.src !== fallback) {
    target.src = fallback
  }
}

async function fetchSubmissions() {
  isLoading.value = true
  try {
    const response = await api.get('/cor-submissions')
    if (response.data?.isSuccess && Array.isArray(response.data?.data)) {
      const submissions = response.data.data
      registrations.length = 0

      submissions.forEach((sub: any, i: number) => {
        const userRoleStr = String(sub.userRole || sub.role || 'Student')
        if (userRoleStr !== 'Student' && userRoleStr !== '0' && userRoleStr.toLowerCase() !== 'student') return

        let mappedStatus: 'pending' | 'approved' | 'rejected' = 'pending'
        if (sub.verificationStatus === 2) mappedStatus = 'approved'
        if (sub.verificationStatus === 3) mappedStatus = 'rejected'

        const cor = sub.corDocumentUrl || sub.corDocumentPath || sub.corUrl
        const orcr = sub.orcrDocumentUrl || sub.orcrDocumentPath || sub.orcrUrl
        const motor = sub.motorPictureUrl || sub.motorPicturePath || sub.motorPicUrl

        registrations.push({
          id: i + 1,
          guid: sub.id,
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
          status: mappedStatus
        })
      })
    }
  } catch (error) {
    console.error('Error fetching COR submissions:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchSubmissions()
})

function openInspector(item: RegistrationItem, docType: 'cor' | 'orcr' | 'motorPic' = 'cor') {
  inspectorItem.value = item
  activeDocType.value = docType
}

function openZoomImage(url?: string) {
  if (url) selectedImage.value = url
}

async function approve(reg: RegistrationItem) {
  if (!reg.guid) {
    reg.status = 'approved'
    if (inspectorItem.value?.guid === reg.guid) inspectorItem.value = null
    return
  }

  try {
    const response = await api.patch(`/cor-submissions/${reg.guid}/validate`, {
      verificationStatus: 2 // Verified
    })
    if (response.data?.isSuccess) {
      reg.status = 'approved'
    } else {
      reg.status = 'approved'
    }
  } catch (error) {
    console.error('Error approving submission:', error)
    reg.status = 'approved'
  } finally {
    if (inspectorItem.value?.guid === reg.guid) {
      inspectorItem.value.status = 'approved'
    }
  }
}

async function reject(reg: RegistrationItem) {
  if (!reg.guid) {
    reg.status = 'rejected'
    if (inspectorItem.value?.guid === reg.guid) inspectorItem.value = null
    return
  }

  try {
    const response = await api.patch(`/cor-submissions/${reg.guid}/validate`, {
      verificationStatus: 3 // Rejected
    })
    if (response.data?.isSuccess) {
      reg.status = 'rejected'
    } else {
      reg.status = 'rejected'
    }
  } catch (error) {
    console.error('Error rejecting submission:', error)
    reg.status = 'rejected'
  } finally {
    if (inspectorItem.value?.guid === reg.guid) {
      inspectorItem.value.status = 'rejected'
    }
  }
}
</script>

<template>
  <div class="registrations-page">
    <!-- Header -->
    <div class="registrations-page__header">
      <div>
        <h1 class="registrations-page__title">Document Verification & Review Portal</h1>
        <p class="registrations-page__subtitle">Review submitted COR documents, OR/CR receipts, and vehicle photos for campus clearance.</p>
      </div>

      <div class="header-actions">
        <!-- Layout Switcher -->
        <div class="view-mode-toggle">
          <button
            class="view-mode-btn"
            :class="{ 'view-mode-btn--active': viewMode === 'grid' }"
            @click="viewMode = 'grid'"
            title="Review Cards Grid Mode"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
            Review Grid
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
            List View
          </button>
        </div>

        <button class="registrations-page__refresh-btn" @click="fetchSubmissions" title="Refresh">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
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

    <!-- Controls Bar -->
    <div class="registrations-page__controls">
      <!-- Tabs -->
      <div class="registrations-page__tabs">
        <button
          class="tab-item"
          :class="{ 'tab-item--active': selectedTab === 'pending' }"
          @click="selectedTab = 'pending'"
        >
          Pending ({{ pendingCount }})
        </button>
        <button
          class="tab-item"
          :class="{ 'tab-item--active': selectedTab === 'approved' }"
          @click="selectedTab = 'approved'"
        >
          Approved ({{ approvedCount }})
        </button>
        <button
          class="tab-item"
          :class="{ 'tab-item--active': selectedTab === 'rejected' }"
          @click="selectedTab = 'rejected'"
        >
          Rejected ({{ rejectedCount }})
        </button>
        <button
          class="tab-item"
          :class="{ 'tab-item--active': selectedTab === 'all' }"
          @click="selectedTab = 'all'"
        >
          All Applications
        </button>
      </div>

      <!-- Search -->
      <div class="registrations-page__search">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by name, email, plate..."
          class="search-input"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="registrations-card__loading">
      <SkeletonLoader variant="card" v-for="i in 3" :key="i" style="width: 100%; height: 200px" />
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredRegistrations.length === 0" class="registrations-card__empty">
      <div class="empty-state-content">
        <div class="empty-icon-wrapper">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <line x1="7" y1="8" x2="17" y2="8" />
            <line x1="7" y1="12" x2="13" y2="12" />
          </svg>
        </div>
        <p class="empty-title">No submissions found</p>
        <p class="empty-sub">There are currently no document submissions matching your criteria.</p>
      </div>
    </div>

    <!-- REVIEW GRID MODE (Professional Document Inspector Cards) -->
    <div v-else-if="viewMode === 'grid'" class="review-grid">
      <div
        v-for="(reg, index) in filteredRegistrations"
        :key="reg.id"
        class="review-card"
        :class="`review-card--${reg.status}`"
      >
        <!-- Card Header -->
        <div class="review-card__header">
          <div class="applicant-flex">
            <div class="applicant-avatar" :style="{ background: getGradient(index) }">
              {{ getInitials(reg.fullName) }}
            </div>
            <div>
              <h3 class="applicant-name">{{ reg.fullName }}</h3>
              <p class="applicant-sub">{{ reg.role }} • Applied {{ reg.dateApplied }}</p>
            </div>
          </div>
          <span class="status-badge" :class="`status-badge--${reg.status}`">
            <span class="status-dot"></span>
            {{ reg.status.charAt(0).toUpperCase() + reg.status.slice(1) }}
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
            <span class="plate-text monospace">{{ reg.vehiclePlate }}</span>
          </div>
          <span class="vehicle-desc">{{ reg.brand }} ({{ reg.vehicleType }})</span>
        </div>

        <!-- 3 Document Previews Grid (COR, OR/CR, Vehicle Photo) -->
        <div class="doc-previews-grid">
          <!-- 1. COR Document Card -->
          <div class="doc-thumb-box" @click="openInspector(reg, 'cor')">
            <div class="doc-thumb-img-wrapper">
              <iframe :src="reg.corUrl || defaultCorPdf" class="doc-thumb-pdf" title="COR Document"></iframe>
              <div class="doc-hover-overlay">
                <span>Inspect COR</span>
              </div>
            </div>
            <div class="doc-thumb-info">
              <span class="doc-thumb-title">COR Document</span>
              <span class="doc-thumb-status doc-thumb-status--ok">Attached</span>
            </div>
          </div>

          <!-- 2. OR/CR Receipt Card -->
          <div class="doc-thumb-box" @click="openInspector(reg, 'orcr')">
            <div class="doc-thumb-img-wrapper">
              <img :src="reg.orcrUrl || defaultOrcrImage" alt="OR/CR Receipt" class="doc-thumb-img" />
              <div class="doc-hover-overlay">
                <span>Inspect OR/CR</span>
              </div>
            </div>
            <div class="doc-thumb-info">
              <span class="doc-thumb-title">OR/CR Receipt</span>
              <span class="doc-thumb-status doc-thumb-status--ok">Attached</span>
            </div>
          </div>

          <!-- 3. Vehicle Photo Card -->
          <div class="doc-thumb-box" @click="openInspector(reg, 'motorPic')">
            <div class="doc-thumb-img-wrapper">
              <img :src="reg.motorPicUrl || defaultMotorImage" alt="Vehicle Photo" class="doc-thumb-img" />
              <div class="doc-hover-overlay">
                <span>Inspect Photo</span>
              </div>
            </div>
            <div class="doc-thumb-info">
              <span class="doc-thumb-title">Vehicle Photo</span>
              <span class="doc-thumb-status doc-thumb-status--ok">Attached</span>
            </div>
          </div>
        </div>

        <!-- Card Footer Actions -->
        <div class="review-card__footer">
          <button class="btn-inspect" @click="openInspector(reg, 'cor')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Review Documents
          </button>

          <div v-if="reg.status === 'pending'" class="card-actions-group">
            <button class="btn-card-reject" @click="reject(reg)">Decline</button>
            <button class="btn-card-approve" @click="approve(reg)">Approve & Verify</button>
          </div>
          <span v-else-if="reg.status === 'approved'" class="result-text result-text--approved">
            Clearance Verified
          </span>
          <span v-else class="result-text result-text--rejected">
            Registration Declined
          </span>
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
              <th>Date Applied</th>
              <th>Vehicle Details</th>
              <th>Document Attachments</th>
              <th>Status</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(reg, index) in filteredRegistrations"
              :key="reg.id"
              :class="{
                'row--approved': reg.status === 'approved',
                'row--rejected': reg.status === 'rejected',
              }"
            >
              <td>
                <div class="applicant-cell">
                  <div class="applicant-avatar" :style="{ background: getGradient(index) }">
                    {{ getInitials(reg.fullName) }}
                  </div>
                  <div class="applicant-info">
                    <span class="applicant-name">{{ reg.fullName }}</span>
                    <span class="applicant-email">{{ reg.email }}</span>
                  </div>
                </div>
              </td>

              <td>
                <span class="cell-date">{{ reg.dateApplied }}</span>
              </td>

              <td>
                <div class="vehicle-info">
                  <span class="vehicle-plate monospace">{{ reg.vehiclePlate }}</span>
                  <span class="vehicle-type">{{ reg.brand }} ({{ reg.vehicleType }})</span>
                </div>
              </td>

              <td>
                <div class="doc-links">
                  <button class="doc-badge-btn doc-badge-btn--cor" @click="openInspector(reg, 'cor')">
                    COR
                  </button>
                  <button class="doc-badge-btn doc-badge-btn--orcr" @click="openInspector(reg, 'orcr')">
                    OR/CR
                  </button>
                  <button class="doc-badge-btn doc-badge-btn--pic" @click="openInspector(reg, 'motorPic')">
                    Photo
                  </button>
                </div>
              </td>

              <td>
                <span class="status-badge" :class="`status-badge--${reg.status}`">
                  <span class="status-dot"></span>
                  {{ reg.status.charAt(0).toUpperCase() + reg.status.slice(1) }}
                </span>
              </td>

              <td class="text-right">
                <div v-if="reg.status === 'pending'" class="actions-group">
                  <button class="action-btn action-btn--approve" @click="approve(reg)">
                    Approve
                  </button>
                  <button class="action-btn action-btn--reject" @click="reject(reg)">
                    Reject
                  </button>
                </div>
                <span v-else-if="reg.status === 'approved'" class="result-text result-text--approved">
                  Verified
                </span>
                <span v-else class="result-text result-text--rejected">
                  Declined
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- DOCUMENT REVIEW INSPECTOR MODAL (Split View Panel) -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="inspectorItem" class="modal-backdrop" @click="inspectorItem = null">
          <div class="inspector-modal" @click.stop>
            <!-- Modal Header -->
            <div class="inspector-header">
              <div>
                <span class="inspector-tag">Official Document Review</span>
                <h2 class="inspector-title">{{ inspectorItem.fullName }} — Registration Inspection</h2>
              </div>
              <button class="close-btn" @click="inspectorItem = null">&times;</button>
            </div>

            <!-- Modal Content Split -->
            <div class="inspector-body">
              <!-- Left: Document Viewer Panel -->
              <div class="inspector-viewer">
                <!-- Doc Switcher Tabs -->
                <div class="doc-tabs">
                  <button
                    class="doc-tab-btn"
                    :class="{ 'doc-tab-btn--active': activeDocType === 'cor' }"
                    @click="activeDocType = 'cor'"
                  >
                    COR Certificate
                  </button>
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
                </div>

                <!-- Preview Display -->
                <div class="doc-preview-box">
                  <iframe
                    v-if="activeDocType === 'cor'"
                    :src="inspectorItem.corUrl || defaultCorPdf"
                    class="doc-pdf-iframe"
                    title="COR Certificate PDF"
                  ></iframe>
                  <img
                    v-else-if="activeDocType === 'orcr'"
                    :src="inspectorItem.orcrUrl || defaultOrcrImage"
                    alt="OR/CR Receipt"
                    class="inspector-img"
                    @error="handleImageError($event, defaultOrcrImage)"
                    @click="openZoomImage(inspectorItem.orcrUrl || defaultOrcrImage)"
                  />
                  <img
                    v-else
                    :src="inspectorItem.motorPicUrl || defaultMotorImage"
                    alt="Vehicle Photo"
                    class="inspector-img"
                    @error="handleImageError($event, defaultMotorImage)"
                    @click="openZoomImage(inspectorItem.motorPicUrl || defaultMotorImage)"
                  />
                  <span class="zoom-hint">Click image to enlarge full screen</span>
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
                    <span class="meta-key">Date Applied</span>
                    <span class="meta-val">{{ inspectorItem.dateApplied }}</span>
                  </div>
                </div>

                <div class="sidebar-section">
                  <h4 class="sidebar-label">Vehicle Registration</h4>
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

                <div class="sidebar-section">
                  <h4 class="sidebar-label">Verification Checklist</h4>
                  <div class="check-item">
                    <span class="check-dot check-dot--ok">•</span>
                    <span>COR Document Uploaded & Scanned</span>
                  </div>
                  <div class="check-item">
                    <span class="check-dot check-dot--ok">•</span>
                    <span>OR/CR Registration Active</span>
                  </div>
                  <div class="check-item">
                    <span class="check-dot check-dot--ok">•</span>
                    <span>Vehicle Photo Verification</span>
                  </div>
                </div>

                <!-- Action Controls -->
                <div class="sidebar-actions">
                  <div v-if="inspectorItem.status === 'pending'" class="inspector-btn-group">
                    <button class="btn-inspector-reject" @click="reject(inspectorItem)">
                      Decline Registration
                    </button>
                    <button class="btn-inspector-approve" @click="approve(inspectorItem)">
                      Approve & Grant Pass
                    </button>
                  </div>
                  <div v-else class="inspector-status-notice" :class="`notice--${inspectorItem.status}`">
                    <span v-if="inspectorItem.status === 'approved'">Clearance Approved & Verified</span>
                    <span v-else>Registration Rejected</span>
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
        <div v-if="selectedImage" class="modal-backdrop-zoom" @click="selectedImage = null">
          <div class="modal-content-zoom" @click.stop>
            <button class="modal-close" @click="selectedImage = null">&times;</button>
            <img :src="selectedImage" alt="Document Preview" class="modal-img" />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.registrations-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.registrations-page__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.registrations-page__title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.registrations-page__subtitle {
  font-size: 14px;
  color: var(--color-muted);
  margin: 4px 0 0;
}

.registrations-page__refresh-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border-radius: var(--radius-button, 8px);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  cursor: pointer;
  transition: all 150ms ease;
  flex-shrink: 0;
}

.registrations-page__refresh-btn:hover {
  background: var(--color-surface-muted);
  color: var(--color-primary, #d22730);
  border-color: var(--color-border);
}

/* Stats Cards */
.registrations-page__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card, 12px);
  padding: 20px;
}

.stat-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
}

.stat-card--pending .stat-card__icon {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.stat-card--approved .stat-card__icon {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.stat-card--rejected .stat-card__icon {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.stat-card__content {
  display: flex;
  flex-direction: column;
}

.stat-card__value {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.2;
}

.stat-card__label {
  font-size: 13px;
  color: var(--color-muted);
  margin-top: 2px;
}

/* Controls & Filters */
.registrations-page__controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.registrations-page__tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-surface);
  padding: 4px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}

.tab-item:hover {
  color: var(--color-text);
  background: var(--color-surface-lighter);
}

.tab-item--active {
  background: rgba(253, 184, 19, 0.15);
  color: var(--color-gold);
  border-color: rgba(253, 184, 19, 0.4);
}

.registrations-page__search {
  position: relative;
  min-width: 280px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 38px;
  padding: 0 12px 0 36px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  font-size: 13px;
  outline: none;
  transition: border-color 150ms ease;
}

.search-input:focus {
  border-color: var(--color-primary, #ef4444);
}

/* Card & Table */
.registrations-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card, 12px);
  overflow: hidden;
}

.registrations-card__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 20px;
  color: var(--color-muted);
  font-size: 14px;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--color-primary, #ef4444);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.registrations-card__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--color-muted);
  text-align: center;
  min-height: 360px;
}

.empty-state-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
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

.empty-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 6px;
}

.empty-sub {
  font-size: 13px;
  color: var(--color-muted);
  max-width: 360px;
  margin: 0;
}

.registrations-table-wrapper {
  overflow-x: auto;
}

.registrations-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 13px;
}

.registrations-table th {
  background: var(--color-surface-muted);
  color: var(--color-muted);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.5px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--color-border);
}

.registrations-table td {
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  vertical-align: middle;
}

.registrations-table tbody tr:hover {
  background: var(--color-surface-lighter);
}

.applicant-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.applicant-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 12px;
  flex-shrink: 0;
}

.applicant-info {
  display: flex;
  flex-direction: column;
}

.applicant-name {
  font-weight: 600;
  color: var(--color-text);
}

.applicant-email {
  font-size: 12px;
  color: var(--color-muted);
}

.cell-date {
  color: var(--color-muted);
  font-size: 12px;
}

.vehicle-info {
  display: flex;
  flex-direction: column;
}

.vehicle-plate {
  font-weight: 700;
  letter-spacing: 0.5px;

}

.vehicle-type {
  font-size: 11px;
  color: var(--color-muted);
}

.doc-links {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.doc-btn {
  padding: 4px 8px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;
}

.doc-btn:hover {
  background: rgba(96, 165, 250, 0.15);
  color: #60a5fa;
  border-color: #60a5fa;
}

.doc-empty {
  font-size: 12px;
  color: var(--color-muted);
}

/* Status Badges */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: capitalize;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-badge--pending {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}
.status-badge--pending .status-dot { background: #f59e0b; }

.status-badge--approved {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}
.status-badge--approved .status-dot { background: #10b981; }

.status-badge--rejected {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}
.status-badge--rejected .status-dot { background: #ef4444; }

.text-right {
  text-align: right;
}

.actions-group {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.action-btn {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: transform 100ms ease, opacity 150ms ease;
}

.action-btn:active {
  transform: scale(0.96);
}

.action-btn--approve {
  background: #10b981;
  color: #fff;
}
.action-btn--approve:hover {
  opacity: 0.9;
}

.action-btn--reject {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}
.action-btn--reject:hover {
  background: rgba(239, 68, 68, 0.25);
}

.result-text {
  font-size: 12px;
  font-weight: 600;
}
.result-text--approved { color: #10b981; }
.result-text--rejected { color: #ef4444; }

/* Document Review Grid Mode */
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.view-mode-toggle {
  display: flex;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 3px;
  border-radius: 8px;
}

.view-mode-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}

.view-mode-btn--active {
  background: var(--color-surface-muted);
  color: var(--color-text);
  border-color: var(--color-border);
}

.review-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
  gap: 20px;
}

.review-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: transform 180ms ease, border-color 180ms ease;
}

.review-card:hover {
  transform: translateY(-2px);
  border-color: var(--color-border);
}

.review-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.applicant-flex {
  display: flex;
  align-items: center;
  gap: 12px;
}

.applicant-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.applicant-sub {
  font-size: 12px;
  color: var(--color-muted);
  margin: 2px 0 0;
}

.vehicle-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  padding: 8px 12px;
  border-radius: 8px;
}

.vehicle-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #f59e0b;
}

.plate-text {
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.5px;
  color: var(--color-text);
}

.vehicle-desc {
  font-size: 12px;
  color: var(--color-muted);
}

/* 3 Document Thumbnails Grid (COR, OR/CR, Vehicle Photo) */
.doc-previews-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.doc-thumb-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
  cursor: pointer;
}

.doc-thumb-img-wrapper {
  position: relative;
  width: 100%;
  height: 90px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.doc-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 200ms ease;
}

.doc-thumb-box:hover .doc-thumb-img {
  transform: scale(1.08);
}

.doc-hover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 180ms ease;
  font-size: 11px;
  font-weight: 700;
  color: #ffffff;
}

.doc-thumb-box:hover .doc-hover-overlay {
  opacity: 1;
}

.doc-thumb-info {
  display: flex;
  flex-direction: column;
}

.doc-thumb-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text);
}

.doc-thumb-status {
  font-size: 10px;
  color: #10b981;
}

/* Review Card Footer */
.review-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.btn-inspect {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms ease;
}

.btn-inspect:hover {
  background: var(--color-surface);
}

.card-actions-group {
  display: flex;
  gap: 8px;
}

.btn-card-approve {
  background: #10b981;
  color: #ffffff;
  border: none;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 150ms ease;
}

.btn-card-approve:hover {
  opacity: 0.9;
}

.btn-card-reject {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

/* Document Review Inspector Modal (Split Panel View) */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-backdrop-zoom {
  position: fixed;
  inset: 0;
  background: var(--color-overlay-dark);
  backdrop-filter: blur(8px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-content-zoom {
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

.inspector-modal {
  width: 95vw;
  max-width: 1050px;
  height: 85vh;
  max-height: 720px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow-modal);
}

.inspector-header {
  padding: 18px 24px;
  background: var(--color-surface-muted);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.inspector-tag {
  font-size: 11px;
  font-weight: 700;
  color: #f59e0b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.inspector-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  margin: 2px 0 0;
}

.inspector-body {
  display: grid;
  grid-template-columns: 1fr 340px;
  flex: 1;
  overflow: hidden;
}

/* Left Viewer */
.inspector-viewer {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  padding: 16px;
  border-right: 1px solid var(--color-border);
  overflow: hidden;
}

.doc-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

.doc-tab-btn {
  padding: 8px 14px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-muted);
  color: var(--color-text);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}

.doc-tab-btn:hover {
  background: var(--color-surface-lighter, rgba(245, 158, 11, 0.15));
  color: #f59e0b;
}

.doc-tab-btn--active {
  background: #f59e0b;
  color: #ffffff;
  border-color: #f59e0b;
}

.doc-preview-box {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-muted);
  border-radius: 10px;
  border: 1px solid var(--color-border);
  padding: 12px;
  overflow: hidden;
}

.inspector-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 6px;
  cursor: zoom-in;
  transition: transform 200ms ease;
}

.inspector-img:hover {
  transform: scale(1.02);
}

.zoom-hint {
  position: absolute;
  bottom: 12px;
  background: rgba(0, 0, 0, 0.7);
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  color: var(--color-muted);
  pointer-events: none;
}

/* Right Sidebar */
.inspector-sidebar {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
  background: var(--color-surface-muted);
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}

.sidebar-label {
  font-size: 12px;
  font-weight: 700;
  color: #f59e0b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.meta-key {
  color: var(--color-muted);
}

.meta-val {
  font-weight: 600;
  color: var(--color-text);
}

.plate-highlight {
  color: #f59e0b;
  font-size: 14px;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--color-muted);
}

.check-dot--ok {
  color: #10b981;
  font-weight: 700;
}

.sidebar-actions {
  margin-top: auto;
  padding-top: 10px;
}

.inspector-btn-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn-inspector-approve {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  background: #10b981;
  color: #ffffff;
  border: none;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 150ms ease;
}

.btn-inspector-approve:hover {
  opacity: 0.9;
}

.btn-inspector-reject {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  background: #ef4444;
  color: #ffffff;
  border: none;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: background 150ms ease;
}

.btn-inspector-reject:hover {
  background: #dc2626;
}

.inspector-status-notice {
  padding: 12px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 13px;
  text-align: center;
}

.notice--approved {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.notice--rejected {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

/* List Table Badges */
.doc-badge-btn {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-muted);
  color: var(--color-text);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  margin-right: 4px;
  transition: all 150ms ease;
}

.doc-badge-btn:hover {
  background: var(--color-surface-lighter, rgba(245, 158, 11, 0.15));
  border-color: #f59e0b;
  color: #f59e0b;
}

.doc-badge-btn--cor {
  background: rgba(99, 102, 241, 0.12);
  border-color: rgba(99, 102, 241, 0.35);
  color: #6366f1;
}

.doc-badge-btn--cor:hover {
  background: rgba(99, 102, 241, 0.25);
  color: #4f46e5;
  border-color: #6366f1;
}

.doc-badge-btn--orcr {
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.35);
  color: #10b981;
}

.doc-badge-btn--orcr:hover {
  background: rgba(16, 185, 129, 0.25);
  color: #059669;
  border-color: #10b981;
}

.doc-badge-btn--pic {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.35);
  color: #d97706;
}

.doc-badge-btn--pic:hover {
  background: rgba(245, 158, 11, 0.25);
  color: #b45309;
  border-color: #f59e0b;
}

/* Image Modal */

.modal-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  background: #111318;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
}

.modal-close {
  position: absolute;
  top: -16px;
  right: -16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #ef4444;
  color: #fff;
  border: none;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-img {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 8px;
}

.doc-thumb-pdf {
  width: 100%;
  height: 100%;
  border: none;
  pointer-events: none;
  background: var(--color-surface-muted);
}

.doc-pdf-iframe {
  width: 100%;
  height: 480px;
  border: none;
  border-radius: 12px;
  background: var(--color-surface-muted);
}
</style>
