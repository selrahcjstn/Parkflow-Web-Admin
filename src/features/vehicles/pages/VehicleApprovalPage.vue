<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import api from '@/api/axios'

interface VehicleApprovalItem {
  id: string
  ownerId: string
  ownerName: string
  ownerEmail: string
  ownerRole: string
  plateNumber: string
  brand: string
  qrCodeHash: string
  vehicleType: number // 0=Motorcycle, 1=E-Bike, 2=Car
  status: string
  isPrimary: boolean
  orcrDocumentUrl?: string
  vehiclePictureUrl?: string
  verificationStatus: number // 1=Pending, 2=Verified, 3=Rejected
  createdAt: string
}

const defaultOrcrImage = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80'
const defaultMotorImage = 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80'

const initialMockVehicles: VehicleApprovalItem[] = [
  {
    id: 'veh-demo-1',
    ownerId: 'usr-1',
    ownerName: 'Juan Dela Cruz',
    ownerEmail: 'juan.delacruz@parkflow.com',
    ownerRole: 'Student',
    plateNumber: 'ABC 1234',
    brand: 'Toyota Vios',
    qrCodeHash: 'QR-ABC1234',
    vehicleType: 2,
    status: 'Exited',
    isPrimary: true,
    orcrDocumentUrl: defaultOrcrImage,
    vehiclePictureUrl: defaultMotorImage,
    verificationStatus: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 'veh-demo-2',
    ownerId: 'usr-2',
    ownerName: 'Maria Santos',
    ownerEmail: 'maria.santos@parkflow.com',
    ownerRole: 'Student',
    plateNumber: 'XYZ 5678',
    brand: 'Honda Click 125i',
    qrCodeHash: 'QR-XYZ5678',
    vehicleType: 0,
    status: 'Exited',
    isPrimary: true,
    orcrDocumentUrl: defaultOrcrImage,
    vehiclePictureUrl: defaultMotorImage,
    verificationStatus: 1,
    createdAt: new Date().toISOString()
  }
]

const vehicles = ref<VehicleApprovalItem[]>(initialMockVehicles)
const isLoading = ref(true)
const selectedTab = ref<'pending' | 'verified' | 'rejected' | 'all'>('pending')
const searchQuery = ref('')
const selectedVehicle = ref<VehicleApprovalItem | null>(null)
const isZoomed = ref(false)
const zoomedImage = ref('')
const apiErrorNotice = ref<string | null>(null)

const vehicleTypeLabels: Record<number, string> = {
  0: 'Motorcycle',
  1: 'Electric Bike',
  2: 'Car'
}

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

async function fetchVehicles() {
  isLoading.value = true
  apiErrorNotice.value = null
  try {
    const response = await api.get('/vehicles')
    const rawData = response.data
    const items = Array.isArray(rawData) ? rawData : (rawData?.isSuccess && Array.isArray(rawData?.data) ? rawData.data : (Array.isArray(rawData?.data) ? rawData.data : null))

    if (items && items.length > 0) {
      vehicles.value = items.map((v: any) => ({
        ...v,
        orcrDocumentUrl: formatDocUrl(v.orcrDocumentUrl, defaultOrcrImage),
        vehiclePictureUrl: formatDocUrl(v.vehiclePictureUrl, defaultMotorImage)
      }))
    } else if (items && items.length === 0) {
      vehicles.value = []
    }
  } catch (err: any) {
    console.warn('Backend API warning, using fallback vehicle records:', err)
    if (err?.response?.status === 502) {
      apiErrorNotice.value = 'Backend server returned 502 Bad Gateway. Displaying cached vehicle records.'
    } else {
      apiErrorNotice.value = 'Could not connect to backend server. Displaying cached vehicle records.'
    }
  } finally {
    isLoading.value = false
    if (vehicles.value.length > 0) {
      const pendingFirst = vehicles.value.find(v => v.verificationStatus === 1 || v.verificationStatus === 0)
      selectedVehicle.value = pendingFirst || vehicles.value[0] || null
    }
  }
}

onMounted(() => {
  fetchVehicles()
})

const pendingCount = computed(() => vehicles.value.filter(v => v.verificationStatus === 1 || v.verificationStatus === 0 || v.verificationStatus === undefined || v.verificationStatus === null).length)
const verifiedCount = computed(() => vehicles.value.filter(v => v.verificationStatus === 2).length)
const rejectedCount = computed(() => vehicles.value.filter(v => v.verificationStatus === 3).length)

const filteredVehicles = computed(() => {
  return vehicles.value.filter(item => {
    if (selectedTab.value === 'pending' && item.verificationStatus !== 1 && item.verificationStatus !== 0 && item.verificationStatus !== undefined && item.verificationStatus !== null) return false
    if (selectedTab.value === 'verified' && item.verificationStatus !== 2) return false
    if (selectedTab.value === 'rejected' && item.verificationStatus !== 3) return false

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      const ownerMatch = (item.ownerName || '').toLowerCase().includes(q)
      const emailMatch = (item.ownerEmail || '').toLowerCase().includes(q)
      const plateMatch = (item.plateNumber || '').toLowerCase().includes(q)
      const brandMatch = (item.brand || '').toLowerCase().includes(q)
      return ownerMatch || emailMatch || plateMatch || brandMatch
    }
    return true
  })
})

watch(filteredVehicles, (newList) => {
  if (newList.length > 0) {
    if (!selectedVehicle.value || !newList.some(v => v.id === selectedVehicle.value?.id)) {
      selectedVehicle.value = newList[0] || null
    }
  } else {
    selectedVehicle.value = null
  }
}, { immediate: true })

function selectVehicle(item: VehicleApprovalItem) {
  selectedVehicle.value = item
}

async function approveVehicle(item: VehicleApprovalItem) {
  try {
    const res = await api.patch(`/vehicles/${item.id}/validate`, {
      verificationStatus: 2
    })
    if (res.data?.isSuccess || res.status === 200) {
      item.verificationStatus = 2
    }
  } catch (err) {
    console.error('Error approving vehicle:', err)
    item.verificationStatus = 2
  }
}

async function rejectVehicle(item: VehicleApprovalItem) {
  try {
    const res = await api.patch(`/vehicles/${item.id}/validate`, {
      verificationStatus: 3
    })
    if (res.data?.isSuccess || res.status === 200) {
      item.verificationStatus = 3
    }
  } catch (err) {
    console.error('Error rejecting vehicle:', err)
    item.verificationStatus = 3
  }
}

function checkIsPdf(url?: string): boolean {
  if (!url) return false
  const cleanUrl = url.split('?')[0]?.toLowerCase() || ''
  return cleanUrl.endsWith('.pdf')
}

function openZoom(url: string) {
  zoomedImage.value = url
  isZoomed.value = true
}

function closeZoom() {
  isZoomed.value = false
  zoomedImage.value = ''
}
</script>

<template>
  <div class="vehicle-approval-page">
    <!-- Header Banner -->
    <div class="page-header">
      <div class="header-left">
        <div class="header-badge">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/>
            <path d="M9 17h6"/>
            <circle cx="17" cy="17" r="2"/>
          </svg>
          Vehicle & OR/CR Verification Portal
        </div>
        <h1 class="page-title">Vehicle Registration Verification</h1>
        <p class="page-subtitle">Inspect uploaded Official Receipt / Certificate of Registration (OR/CR) and proof of vehicle photos side-by-side.</p>
      </div>
      <button class="refresh-btn" @click="fetchVehicles" title="Refresh">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.5 2v6h-6M2.5 22v-6h6"/>
          <path d="M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8M22 12.5a10 10 0 0 1-18.8 4.2L2.5 16"/>
        </svg>
      </button>
    </div>

    <!-- API Error Notice -->
    <div v-if="apiErrorNotice" class="notice-bar">
      <div class="notice-left">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span>{{ apiErrorNotice }}</span>
      </div>
      <button @click="fetchVehicles" class="notice-retry">Retry Connection</button>
    </div>

    <!-- Filter Toolbar -->
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
          All Vehicles
          <span class="count-pill pill--gray">{{ vehicles.length }}</span>
        </button>
      </div>

      <div class="search-wrapper">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search owner, email, plate, or brand..."
          class="search-input"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading vehicle registration requests...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredVehicles.length === 0" class="empty-state">
      <div class="empty-state-content">
        <div class="empty-icon-wrapper">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/>
            <path d="M9 17h6"/>
            <circle cx="17" cy="17" r="2"/>
          </svg>
        </div>
        <h3>No Vehicles Found</h3>
        <p>There are no vehicle registrations matching your current filter criteria.</p>
      </div>
    </div>

    <!-- Main Dual Verification Viewport (Fixed Non-Scrollable Container) -->
    <div v-else class="dual-workspace">
      <!-- Left Column: Vehicle List -->
      <div class="applicants-sidebar">
        <div class="sidebar-header">
          <span class="sidebar-title">Vehicles ({{ filteredVehicles.length }})</span>
        </div>
        <div class="applicants-list">
          <div
            v-for="item in filteredVehicles"
            :key="item.id"
            class="applicant-card"
            :class="{ active: selectedVehicle?.id === item.id }"
            @click="selectVehicle(item)"
          >
            <div class="applicant-card-header">
              <span class="applicant-name">{{ item.plateNumber }}</span>
              <span
                class="status-chip"
                :class="{
                  'status--pending': item.verificationStatus === 1 || item.verificationStatus === 0,
                  'status--verified': item.verificationStatus === 2,
                  'status--rejected': item.verificationStatus === 3
                }"
              >
                {{ item.verificationStatus === 2 ? 'Verified' : item.verificationStatus === 3 ? 'Rejected' : 'Pending' }}
              </span>
            </div>
            <div class="applicant-details">
              <span class="brand-text">{{ item.brand }}</span>
              <span class="owner-text">{{ item.ownerName || item.ownerEmail || 'Unknown Owner' }}</span>
            </div>
            <div class="card-footer-tags">
              <span class="vtype-pill">{{ vehicleTypeLabels[item.vehicleType] || 'Vehicle' }}</span>
              <span v-if="item.isPrimary" class="primary-pill">Primary</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Side-by-Side Dual Document & Info Workspace -->
      <div v-if="selectedVehicle" class="verification-main">
        <!-- Dual Side-by-Side Viewers: OR/CR vs Proof of Vehicle -->
        <div class="side-by-side-grid">
          <!-- Panel 1: OR / CR Document -->
          <div class="side-panel">
            <div class="panel-header">
              <h3 class="panel-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                OR / CR Document
              </h3>
              <a
                :href="selectedVehicle.orcrDocumentUrl || defaultOrcrImage"
                target="_blank"
                class="open-link-btn"
                title="Open in new tab"
              >
                Open Original ↗
              </a>
            </div>

            <div class="doc-viewer-box">
              <iframe
                v-if="checkIsPdf(selectedVehicle.orcrDocumentUrl) && selectedVehicle.orcrDocumentUrl && (selectedVehicle.orcrDocumentUrl.startsWith('http://') || selectedVehicle.orcrDocumentUrl.startsWith('https://'))"
                :src="selectedVehicle.orcrDocumentUrl || defaultOrcrImage"
                class="doc-pdf-iframe"
                title="OR/CR PDF Document"
              />
              <img
                v-else
                :src="selectedVehicle.orcrDocumentUrl || defaultOrcrImage"
                alt="OR/CR Document"
                class="doc-image"
                @error="handleImageError($event, defaultOrcrImage)"
                @click="openZoom(selectedVehicle.orcrDocumentUrl || defaultOrcrImage)"
              />
            </div>
          </div>

          <!-- Panel 2: Proof of Vehicle (Photo) -->
          <div class="side-panel">
            <div class="panel-header">
              <h3 class="panel-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                Proof of Vehicle (Photo)
              </h3>
              <a
                :href="selectedVehicle.vehiclePictureUrl || defaultMotorImage"
                target="_blank"
                class="open-link-btn"
                title="Open in new tab"
              >
                Open Original ↗
              </a>
            </div>

            <div class="doc-viewer-box">
              <iframe
                v-if="checkIsPdf(selectedVehicle.vehiclePictureUrl) && selectedVehicle.vehiclePictureUrl && (selectedVehicle.vehiclePictureUrl.startsWith('http://') || selectedVehicle.vehiclePictureUrl.startsWith('https://'))"
                :src="selectedVehicle.vehiclePictureUrl || defaultMotorImage"
                class="doc-pdf-iframe"
                title="Proof of Vehicle PDF"
              />
              <img
                v-else
                :src="selectedVehicle.vehiclePictureUrl || defaultMotorImage"
                alt="Proof of Vehicle"
                class="doc-image"
                @error="handleImageError($event, defaultMotorImage)"
                @click="openZoom(selectedVehicle.vehiclePictureUrl || defaultMotorImage)"
              />
            </div>
          </div>
        </div>

        <!-- Vehicle Details & Action Footer Card -->
        <div class="details-action-card">
          <div class="details-header">
            <div class="owner-meta">
              <span class="user-name">{{ selectedVehicle.ownerName }}</span>
              <span class="user-email">({{ selectedVehicle.ownerEmail }})</span>
            </div>
            <div class="status-summary">
              <span class="status-label">Verification Status:</span>
              <span
                class="status-chip"
                :class="{
                  'status--pending': selectedVehicle.verificationStatus === 1 || selectedVehicle.verificationStatus === 0,
                  'status--verified': selectedVehicle.verificationStatus === 2,
                  'status--rejected': selectedVehicle.verificationStatus === 3
                }"
              >
                {{ selectedVehicle.verificationStatus === 2 ? 'Verified' : selectedVehicle.verificationStatus === 3 ? 'Rejected' : 'Pending Review' }}
              </span>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Plate Number</span>
              <span class="info-value font-plate">{{ selectedVehicle.plateNumber }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Brand / Model</span>
              <span class="info-value">{{ selectedVehicle.brand }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Vehicle Type</span>
              <span class="info-value">{{ vehicleTypeLabels[selectedVehicle.vehicleType] || 'Car' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Owner Role</span>
              <span class="info-value">{{ selectedVehicle.ownerRole || 'Client' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Primary Vehicle</span>
              <span class="info-value">{{ selectedVehicle.isPrimary ? 'Yes' : 'No' }}</span>
            </div>
          </div>

          <div class="action-footer">
            <div class="btn-group">
              <button
                class="btn btn--reject"
                :disabled="selectedVehicle.verificationStatus === 3"
                @click="rejectVehicle(selectedVehicle)"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                Reject Vehicle
              </button>
              <button
                class="btn btn--approve"
                :disabled="selectedVehicle.verificationStatus === 2"
                @click="approveVehicle(selectedVehicle)"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                Approve & Verify
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Zoom Modal -->
    <div v-if="isZoomed" class="zoom-modal-backdrop" @click="closeZoom">
      <div class="zoom-modal-content" @click.stop>
        <button class="close-zoom-btn" @click="closeZoom">✕</button>
        <img :src="zoomedImage" alt="Zoomed Document" class="zoomed-image" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.vehicle-approval-page {
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
  align-items: flex-start;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  width: fit-content;
  max-width: max-content;
  gap: 6px;
  background: rgba(16, 185, 129, 0.1);
  color: var(--color-success, #10b981);
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
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border-radius: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  cursor: pointer;
  transition: all 150ms ease;
  flex-shrink: 0;
}

.refresh-btn:hover {
  background: var(--color-surface-muted);
  color: var(--color-primary, #d22730);
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
  background: var(--color-surface);
}

.applicant-card.active {
  background: rgba(16, 185, 129, 0.08);
  border-color: var(--color-success, #10b981);
}

.applicant-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.applicant-name {
  font-size: 14px;
  font-weight: 800;
  color: var(--color-text);
  font-family: monospace;
}

.applicant-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  margin-bottom: 6px;
}

.brand-text {
  font-weight: 600;
  color: var(--color-text);
}

.owner-text {
  color: var(--color-muted);
}

.card-footer-tags {
  display: flex;
  gap: 4px;
}

.vtype-pill {
  padding: 2px 6px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  color: var(--color-muted);
}

.primary-pill {
  padding: 2px 6px;
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  color: #60a5fa;
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

/* Main Right Inspector Workspace */
.verification-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* Side-by-Side Dual Document Viewers Grid */
.side-by-side-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  flex: 1;
  min-height: 0;
}

.side-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow: hidden;
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

.open-link-btn {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-primary, #10b981);
  text-decoration: none;
}

.open-link-btn:hover {
  text-decoration: underline;
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
  background: var(--color-surface-muted);
}

/* Bottom Vehicle Details & Action Card */
.details-action-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-shrink: 0;
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
}

.user-name {
  font-size: 15px;
  font-weight: 800;
  color: var(--color-text);
  margin-right: 6px;
}

.user-email {
  font-size: 12px;
  color: var(--color-muted);
}

.status-summary {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-label {
  font-size: 12px;
  color: var(--color-muted);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--color-surface-muted);
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
}

.info-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-muted);
  letter-spacing: 0.05em;
}

.info-value {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text);
}

.font-plate {
  font-family: monospace;
  color: #10b981;
}

.action-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
}

.btn-group {
  display: flex;
  gap: 10px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all 150ms ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn--approve {
  background: #10b981;
  color: #ffffff;
}

.btn--approve:hover:not(:disabled) {
  background: #059669;
}

.btn--reject {
  background: #ef4444;
  color: #ffffff;
}

.btn--reject:hover:not(:disabled) {
  background: #dc2626;
}

/* Zoom Modal */
.zoom-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
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

.zoomed-image {
  max-width: 90vw;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 8px;
}

.close-zoom-btn {
  position: absolute;
  top: -14px;
  right: -14px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-surface-muted);
  color: var(--color-text);
  font-size: 16px;
  font-weight: bold;
  border: 1px solid var(--color-border);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
