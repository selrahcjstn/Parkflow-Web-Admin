<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
  vehicleType: number // 1=Car, 2=Motorcycle, 3=Bicycle
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
    ownerEmail: 'juan.delacruz@bulsu.edu.ph',
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
    ownerEmail: 'maria.santos@bulsu.edu.ph',
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
const selectedVehicle = ref<VehicleApprovalItem | null>(initialMockVehicles[0] || null)
const activeDocTab = ref<'orcr' | 'motor'>('orcr')
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
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url
  }
  const isProduction = import.meta.env.PROD
  const defaultBase = isProduction ? window.location.origin : 'http://localhost:5000'
  const baseURL = import.meta.env.VITE_API_BASE_URL || defaultBase
  const rootDomain = baseURL.replace(/\/api\/?$/, '')
  return `${rootDomain}/${url.replace(/^\//, '')}`
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
    if (vehicles.value.length > 0 && !selectedVehicle.value) {
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

function selectVehicle(item: VehicleApprovalItem) {
  selectedVehicle.value = item
  activeDocTab.value = 'orcr'
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

const activeImageUrl = computed(() => {
  if (!selectedVehicle.value) return defaultOrcrImage
  if (activeDocTab.value === 'orcr') {
    return selectedVehicle.value.orcrDocumentUrl || defaultOrcrImage
  }
  return selectedVehicle.value.vehiclePictureUrl || defaultMotorImage
})

const isPdf = computed(() => {
  if (!activeImageUrl.value) return false
  const cleanUrl = activeImageUrl.value.split('?')[0]?.toLowerCase() || ''
  return cleanUrl.endsWith('.pdf')
})

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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/>
            <path d="M9 17h6"/>
            <circle cx="17" cy="17" r="2"/>
          </svg>
          Vehicle & OR/CR Verification Portal
        </div>
        <h1 class="page-title">Vehicle Registration Verification</h1>
        <p class="page-subtitle">Inspect uploaded Official Receipt / Certificate of Registration (OR/CR) and proof of vehicle photos to verify user vehicles.</p>
      </div>
      <button class="refresh-btn" @click="fetchVehicles">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.5 2v6h-6M2.5 22v-6h6"/>
          <path d="M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8M22 12.5a10 10 0 0 1-18.8 4.2L2.5 16"/>
        </svg>
        Refresh Vehicles
      </button>
    </div>

    <!-- API Error Connection Warning Banner -->
    <div v-if="apiErrorNotice" class="mb-4 p-3.5 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center justify-between text-amber-300 text-xs font-semibold">
      <div class="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span>{{ apiErrorNotice }}</span>
      </div>
      <button @click="fetchVehicles" class="underline hover:text-white cursor-pointer ml-2">Retry Connection</button>
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
          All Vehicles
          <span class="count-pill pill--gray">{{ vehicles.length }}</span>
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
          placeholder="Search owner, email, plate number, or brand..."
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
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
        <circle cx="7" cy="17" r="2"/>
        <path d="M9 17h6"/>
        <circle cx="17" cy="17" r="2"/>
      </svg>
      <h3>No Vehicles Found</h3>
      <p>There are no vehicle registrations matching your current filter criteria.</p>
    </div>

    <!-- Main Dual Verification Layout -->
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
                  'status--pending': item.verificationStatus === 1,
                  'status--verified': item.verificationStatus === 2,
                  'status--rejected': item.verificationStatus === 3
                }"
              >
                {{ item.verificationStatus === 2 ? 'Verified' : item.verificationStatus === 3 ? 'Rejected' : 'Pending' }}
              </span>
            </div>
            <div class="applicant-details">
              <span class="detail-item font-semibold text-slate-300">{{ item.brand }}</span>
              <span class="detail-item">{{ item.ownerName || item.ownerEmail || 'Unknown Owner' }}</span>
            </div>
            <div class="card-footer-tags">
              <span class="vtype-pill">{{ vehicleTypeLabels[item.vehicleType] || 'Vehicle' }}</span>
              <span v-if="item.isPrimary" class="primary-pill">Primary</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Detail & Document Verification Workspace -->
      <div v-if="selectedVehicle" class="verification-main">
        <!-- Dual Tabs: Document Viewer vs Motor Picture -->
        <div class="doc-viewer-card">
          <div class="doc-viewer-header">
            <div class="doc-tabs">
              <button
                class="doc-tab-btn"
                :class="{ active: activeDocTab === 'orcr' }"
                @click="activeDocTab = 'orcr'"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                OR / CR Document
              </button>
              <button
                class="doc-tab-btn"
                :class="{ active: activeDocTab === 'motor' }"
                @click="activeDocTab = 'motor'"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                Proof of Vehicle (Photo)
              </button>
            </div>
            <div class="doc-actions">
              <a :href="activeImageUrl" target="_blank" class="icon-btn" title="Open original document in new tab">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
            </div>
          </div>

          <!-- Document Content Preview Area -->
          <div class="doc-body">
            <div v-if="isPdf" class="pdf-container">
              <iframe :src="activeImageUrl" class="doc-pdf-iframe" title="PDF Document Viewer" />
            </div>
            <div v-else class="image-container">
              <img
                :src="activeImageUrl"
                alt="Uploaded Document"
                class="doc-image"
                @click="openZoom(activeImageUrl)"
              />
              <div class="zoom-overlay-hint" @click="openZoom(activeImageUrl)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  <line x1="11" y1="8" x2="11" y2="14"/>
                  <line x1="8" y1="11" x2="14" y2="11"/>
                </svg>
                Click image to enlarge
              </div>
            </div>
          </div>
        </div>

        <!-- Vehicle Details Panel -->
        <div class="schedule-details-card">
          <div class="card-header">
            <h3 class="card-title">Vehicle & Owner Information</h3>
            <div class="user-meta">
              <span class="user-name">{{ selectedVehicle.ownerName }}</span>
              <span class="user-email">({{ selectedVehicle.ownerEmail }})</span>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Plate Number</span>
              <span class="info-value font-black text-lg text-emerald-400 tracking-wider">{{ selectedVehicle.plateNumber }}</span>
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
              <span class="info-label">Parking Status</span>
              <span class="info-value">{{ selectedVehicle.status }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Is Primary</span>
              <span class="info-value">{{ selectedVehicle.isPrimary ? 'Yes' : 'No' }}</span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="decision-footer">
            <div class="current-status-box">
              <span class="label">Current Status:</span>
              <span
                class="status-chip"
                :class="{
                  'status--pending': selectedVehicle.verificationStatus === 1,
                  'status--verified': selectedVehicle.verificationStatus === 2,
                  'status--rejected': selectedVehicle.verificationStatus === 3
                }"
              >
                {{ selectedVehicle.verificationStatus === 2 ? 'Verified' : selectedVehicle.verificationStatus === 3 ? 'Rejected' : 'Pending Review' }}
              </span>
            </div>
            <div class="btn-group">
              <button
                class="btn btn--reject"
                :disabled="selectedVehicle.verificationStatus === 3"
                @click="rejectVehicle(selectedVehicle)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
        <button class="close-zoom-btn" @click="closeZoom">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <img :src="zoomedImage" alt="Zoomed Document" class="zoomed-image" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.vehicle-approval-page {
  padding: 1.5rem;
  min-height: 100vh;
  background-color: #0f172a;
  color: #f8fafc;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  padding: 1.25rem 1.5rem;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border: 1px solid #334155;
  border-radius: 12px;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  background-color: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #60a5fa;
  margin-bottom: 0.5rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: #f8fafc;
  margin-bottom: 0.25rem;
}

.page-subtitle {
  font-size: 0.875rem;
  color: #94a3b8;
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.refresh-btn:hover {
  background-color: #334155;
  color: #ffffff;
}

.filter-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.tab-group {
  display: flex;
  gap: 0.5rem;
  background-color: #1e293b;
  padding: 0.25rem;
  border-radius: 10px;
  border: 1px solid #334155;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #94a3b8;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  color: #f8fafc;
}

.tab-btn.active {
  background-color: #0f172a;
  color: #38bdf8;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.count-pill {
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
}

.pill--amber {
  background-color: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.pill--green {
  background-color: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.pill--red {
  background-color: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.pill--gray {
  background-color: rgba(148, 163, 184, 0.2);
  color: #cbd5e1;
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  max-width: 380px;
}

.search-wrapper svg {
  position: absolute;
  left: 0.75rem;
  color: #64748b;
}

.search-input {
  width: 100%;
  padding: 0.625rem 0.75rem 0.625rem 2.25rem;
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #f8fafc;
  font-size: 0.875rem;
}

.search-input:focus {
  outline: none;
  border-color: #38bdf8;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  background-color: #1e293b;
  border: 1px dashed #334155;
  border-radius: 12px;
  text-align: center;
  color: #94a3b8;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(56, 189, 248, 0.2);
  border-top-color: #38bdf8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.dual-workspace {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 1.5rem;
  align-items: start;
}

.applicants-sidebar {
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  overflow: hidden;
  max-height: calc(100vh - 230px);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 1rem;
  background-color: #0f172a;
  border-bottom: 1px solid #334155;
}

.sidebar-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: #cbd5e1;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.applicants-list {
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.applicant-card {
  padding: 0.875rem;
  background-color: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.applicant-card:hover {
  border-color: #475569;
}

.applicant-card.active {
  border-color: #38bdf8;
  background-color: rgba(56, 189, 248, 0.08);
}

.applicant-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.375rem;
}

.applicant-name {
  font-weight: 800;
  font-size: 1.05rem;
  color: #f8fafc;
  letter-spacing: 0.05em;
}

.applicant-details {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  font-size: 0.8rem;
  color: #94a3b8;
  margin-bottom: 0.5rem;
}

.card-footer-tags {
  display: flex;
  gap: 0.375rem;
}

.vtype-pill {
  padding: 0.125rem 0.5rem;
  background-color: #334155;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #e2e8f0;
}

.primary-pill {
  padding: 0.125rem 0.5rem;
  background-color: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.4);
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  color: #60a5fa;
}

.status-chip {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
}

.status--pending {
  background-color: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.status--verified {
  background-color: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.status--rejected {
  background-color: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.verification-main {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.doc-viewer-card {
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  overflow: hidden;
}

.doc-viewer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: #0f172a;
  border-bottom: 1px solid #334155;
}

.doc-tabs {
  display: flex;
  gap: 0.5rem;
}

.doc-tab-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.4rem 0.75rem;
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #94a3b8;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.doc-tab-btn.active {
  background-color: #38bdf8;
  border-color: #38bdf8;
  color: #0f172a;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem;
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #94a3b8;
  cursor: pointer;
  text-decoration: none;
}

.icon-btn:hover {
  color: #f8fafc;
  background-color: #334155;
}

.doc-body {
  position: relative;
  min-height: 400px;
  max-height: 520px;
  background-color: #020617;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.pdf-container {
  width: 100%;
  height: 480px;
}

.doc-pdf-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.image-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.doc-image {
  max-width: 100%;
  max-height: 480px;
  object-fit: contain;
}

.zoom-overlay-hint {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background-color: rgba(15, 23, 42, 0.85);
  border: 1px solid #334155;
  border-radius: 6px;
  color: #cbd5e1;
  font-size: 0.75rem;
  font-weight: 600;
  backdrop-filter: blur(4px);
}

.schedule-details-card {
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 1.25rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #334155;
}

.card-title {
  font-size: 1rem;
  font-weight: 700;
  color: #f8fafc;
}

.user-name {
  font-weight: 700;
  color: #38bdf8;
  margin-right: 0.25rem;
}

.user-email {
  color: #94a3b8;
  font-size: 0.85rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  background-color: #0f172a;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid #334155;
}

.info-label {
  font-size: 0.725rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
  letter-spacing: 0.05em;
}

.info-value {
  font-size: 0.925rem;
  font-weight: 600;
  color: #f8fafc;
}

.decision-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid #334155;
}

.current-status-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.current-status-box .label {
  font-size: 0.85rem;
  color: #94a3b8;
}

.btn-group {
  display: flex;
  gap: 0.75rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn--approve {
  background-color: #10b981;
  color: #ffffff;
}

.btn--approve:hover:not(:disabled) {
  background-color: #059669;
}

.btn--reject {
  background-color: #ef4444;
  color: #ffffff;
}

.btn--reject:hover:not(:disabled) {
  background-color: #dc2626;
}

.zoom-modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(2, 6, 23, 0.9);
  backdrop-filter: blur(6px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
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
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.close-zoom-btn {
  position: absolute;
  top: -2.5rem;
  right: -2.5rem;
  background: transparent;
  border: none;
  color: #ffffff;
  cursor: pointer;
}
</style>
