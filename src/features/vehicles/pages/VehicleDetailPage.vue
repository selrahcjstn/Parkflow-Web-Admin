<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api/axios'
import { cachedVehicleApprovals } from '@/stores/appCache'

const route = useRoute()
const router = useRouter()

const vehicleId = computed(() => String(route.params.id || ''))

const isLoading = ref(true)
const vehicle = ref<any>(null)

// --- Helpers ---
function getVehicleTypeLabel(type: any): string {
  if (type === 0 || type === 'Motorcycle') return 'Motorcycle'
  if (type === 1 || type === 'ElectricBike') return 'E-Bike'
  if (type === 2 || type === 'Car') return 'Car'
  return String(type ?? '—')
}

function getVerificationLabel(status: any): string {
  const n = typeof status === 'number' ? status : Number(status)
  if (n === 2) return 'Approved'
  if (n === 3) return 'Rejected'
  return 'Pending'
}

function getVerificationColor(status: any): string {
  const n = typeof status === 'number' ? status : Number(status)
  if (n === 2) return '#059669'
  if (n === 3) return '#dc2626'
  return '#d97706'
}

function getRoleLabel(role: string): string {
  if (role === 'UniversityStaff') return 'Faculty'
  if (role === 'NonAcademicPersonnel') return 'Staff'
  return role || '—'
}

function cleanOwnerName(name?: string): string {
  if (!name || !name.trim()) return 'Unassigned'
  const parts = name.split(/\s+/).filter(Boolean)
  const unique = parts.filter((item, index) => parts.indexOf(item) === index)
  return unique.join(' ')
}

// --- Data fetch ---
function mapRawVehicle(v: any) {
  return {
    id: String(v.id ?? v.vehicleId ?? v.guid ?? v.vehicleGuid ?? ''),
    plateNumber: v.plateNumber || 'N/A',
    brand: v.brand || '—',
    vehicleType: v.vehicleType,
    verificationStatus: typeof v.verificationStatus === 'number' ? v.verificationStatus : 1,
    isPrimary: Boolean(v.isPrimary),
    ownerName: cleanOwnerName(v.ownerName || v.ownerFullName || v.fullName || v.ownerEmail || ''),
    ownerRole: v.ownerRole || 'Student',
    vehiclePictureUrl: v.vehiclePictureUrl || v.vehiclePhotoUrl || v.photoUrl || null,
    orcrDocumentUrl: v.orcrDocumentUrl || v.orcrUrl || v.documentUrl || null
  }
}

onMounted(async () => {
  isLoading.value = true

  // 1. Check cachedVehicleApprovals
  if (cachedVehicleApprovals.value && Array.isArray(cachedVehicleApprovals.value)) {
    const found = cachedVehicleApprovals.value.find(
      (v: any) => String(v.id ?? v.vehicleId ?? v.guid ?? '') === vehicleId.value
    )
    if (found) {
      vehicle.value = mapRawVehicle(found)
      isLoading.value = false
      return
    }
  }

  // 2. Fallback: fetch from API
  try {
    const response = await api.get('/vehicles')
    const raw = response.data
    const items: any[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.data)
      ? raw.data
      : []

    if (items.length > 0) {
      cachedVehicleApprovals.value = items
    }

    const found = items.find(
      (v: any) => String(v.id ?? v.vehicleId ?? v.guid ?? '') === vehicleId.value
    )
    if (found) {
      vehicle.value = mapRawVehicle(found)
    }
  } catch (err) {
    console.error('Error fetching vehicle detail:', err)
  } finally {
    isLoading.value = false
  }
})

function goBack() {
  router.push('/vehicles')
}
</script>

<template>
  <div class="vehicle-detail-page">
    <!-- Page Header -->
    <div class="page-header">
      <button class="back-btn" @click="goBack">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to Vehicle Directory
      </button>
      <div class="header-titles">
        <h1 class="page-title">Vehicle Record Details</h1>
        <p class="page-subtitle">Inspect full vehicle registration info, documents, and owner classification.</p>
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
    <div v-else-if="!vehicle" class="not-found-card">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p>Vehicle record not found.</p>
      <button class="back-btn" @click="goBack">Go back to directory</button>
    </div>

    <!-- Content -->
    <div v-else class="detail-container">

      <!-- Card 1: Vehicle Photo & Identity -->
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
            <h3 class="card-title">Vehicle</h3>
            <p class="card-subtitle">Registered vehicle identification and photo</p>
          </div>
        </div>

        <!-- Hero: Vehicle Photo -->
        <div class="vehicle-hero">
          <img
            v-if="vehicle.vehiclePictureUrl"
            :src="vehicle.vehiclePictureUrl"
            alt="Vehicle Photo"
            class="vehicle-hero-img"
          />
          <div v-else class="vehicle-hero-placeholder">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
              <rect x="3" y="11" width="18" height="6" rx="2" />
              <path d="M5 17h14" />
              <circle cx="7" cy="17" r="2" />
              <circle cx="17" cy="17" r="2" />
              <path d="M6 11l1.5-4.5h9L18 11" />
            </svg>
            <span class="hero-placeholder-text">No photo uploaded</span>
          </div>
        </div>

        <!-- Plate + Brand below hero -->
        <div class="hero-info-row">
          <div>
            <div class="plate-label">Plate Number</div>
            <div class="plate-number">{{ vehicle.plateNumber }}</div>
          </div>
          <div>
            <div class="plate-label">Brand &amp; Model</div>
            <div class="brand-text">{{ vehicle.brand }}</div>
          </div>
        </div>
      </div>

      <!-- Card 2: Registration Properties -->
      <div class="form-card">
        <div class="card-header">
          <div class="card-icon-badge card-icon-badge--purple">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div>
            <h3 class="card-title">Registration Properties</h3>
            <p class="card-subtitle">Vehicle classification and approval status</p>
          </div>
        </div>

        <div class="details-grid">
          <div class="detail-item">
            <span class="detail-label">Vehicle Type</span>
            <span class="detail-value">{{ getVehicleTypeLabel(vehicle.vehicleType) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Approval Status</span>
            <span
              class="detail-value"
              :style="{ color: getVerificationColor(vehicle.verificationStatus), fontWeight: '700' }"
            >
              {{ getVerificationLabel(vehicle.verificationStatus) }}
            </span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Primary Pass</span>
            <span class="detail-value">{{ vehicle.isPrimary ? 'Yes' : 'No' }}</span>
          </div>
          <div class="detail-item">
            <!-- placeholder cell for grid alignment -->
          </div>
        </div>
      </div>

      <!-- Card 3: Owner Information -->
      <div class="form-card">
        <div class="card-header">
          <div class="card-icon-badge card-icon-badge--orange">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <h3 class="card-title">Owner Information</h3>
            <p class="card-subtitle">Registered owner and campus classification</p>
          </div>
        </div>

        <div class="details-grid">
          <div class="detail-item">
            <span class="detail-label">Full Name</span>
            <span class="detail-value">{{ vehicle.ownerName }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Classification</span>
            <span class="detail-value">{{ getRoleLabel(vehicle.ownerRole) }}</span>
          </div>
        </div>
      </div>

      <!-- Card 4: Documents (only if at least one doc exists) -->
      <div
        v-if="vehicle.vehiclePictureUrl || vehicle.orcrDocumentUrl"
        class="form-card"
      >
        <div class="card-header">
          <div class="card-icon-badge card-icon-badge--green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div>
            <h3 class="card-title">Documents</h3>
            <p class="card-subtitle">OR/CR and vehicle photo files</p>
          </div>
        </div>

        <div class="doc-list">
          <div class="doc-row">
            <div class="doc-info">
              <span class="doc-name">OR/CR Document</span>
              <span class="doc-hint">Official Receipt / Certificate of Registration</span>
            </div>
            <a
              v-if="vehicle.orcrDocumentUrl"
              :href="vehicle.orcrDocumentUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="doc-btn"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              View Document
            </a>
            <span v-else class="doc-empty">Not uploaded</span>
          </div>

          <div class="doc-row">
            <div class="doc-info">
              <span class="doc-name">Vehicle Photo</span>
              <span class="doc-hint">Registration vehicle photo</span>
            </div>
            <a
              v-if="vehicle.vehiclePictureUrl"
              :href="vehicle.vehiclePictureUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="doc-btn"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              View Photo
            </a>
            <span v-else class="doc-empty">Not uploaded</span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.vehicle-detail-page {
  animation: fadeSlideUp 0.4s ease both;
}

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Header ── */
.page-header {
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  transition: color 150ms ease;
  align-self: flex-start;
}
.back-btn:hover { color: #4f46e5; }

.header-titles { display: flex; flex-direction: column; gap: 4px; }

.page-title {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text);
  margin: 0;
  letter-spacing: -0.3px;
}

.page-subtitle {
  font-size: 13px;
  color: var(--color-muted);
  margin: 0;
}

/* ── Loading skeleton ── */
.loading-container { display: flex; flex-direction: column; gap: 20px; }

.skeleton-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  padding: 24px;
}

.skeleton {
  background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 6px;
}

.skeleton-hero { height: 200px; width: 100%; border-radius: 10px; }
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
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  color: var(--color-muted);
  text-align: center;
}
.not-found-card p { font-size: 15px; font-weight: 600; margin: 0; }

/* ── Detail Container ── */
.detail-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ── Card ── */
.form-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  padding: 24px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border, #f1f5f9);
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

.card-icon-badge--blue   { background: rgba(79, 70, 229, 0.1);  color: #4f46e5; }
.card-icon-badge--purple { background: rgba(147, 51, 234, 0.1); color: #9333ea; }
.card-icon-badge--orange { background: rgba(245, 158, 11, 0.1); color: #d97706; }
.card-icon-badge--green  { background: rgba(5, 150, 105, 0.1);  color: #059669; }

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.card-subtitle {
  font-size: 12px;
  color: var(--color-muted);
  margin: 2px 0 0 0;
}

/* ── Vehicle Hero ── */
.vehicle-hero {
  width: 100%;
  border-radius: 10px;
  overflow: hidden;
  background: #f1f5f9;
  max-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vehicle-hero-img {
  width: 100%;
  max-height: 320px;
  object-fit: cover;
  display: block;
}

.vehicle-hero-placeholder {
  width: 100%;
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: #f1f5f9;
}

.hero-placeholder-text {
  font-size: 13px;
  color: #94a3b8;
  font-weight: 500;
}

/* ── Plate + Brand row ── */
.hero-info-row {
  display: flex;
  gap: 40px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.plate-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-muted);
  font-weight: 600;
  margin-bottom: 4px;
}

.plate-number {
  font-family: 'Courier New', Courier, monospace;
  font-size: 26px;
  font-weight: 800;
  color: var(--color-text);
  letter-spacing: 0.08em;
}

.brand-text {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
}

/* ── Details Grid ── */
.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px 32px;
}

@media (max-width: 560px) {
  .details-grid { grid-template-columns: 1fr; }
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-muted);
  font-weight: 600;
}

.detail-value {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

/* ── Documents ── */
.doc-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.doc-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid var(--color-border, #f1f5f9);
}

.doc-row:last-child { border-bottom: none; }

.doc-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.doc-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.doc-hint {
  font-size: 12px;
  color: var(--color-muted);
}

.doc-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(79, 70, 229, 0.08);
  color: #4f46e5;
  border: 1px solid rgba(79, 70, 229, 0.2);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: background 150ms ease;
  white-space: nowrap;
}

.doc-btn:hover { background: rgba(79, 70, 229, 0.15); }

.doc-empty {
  font-size: 13px;
  color: var(--color-muted);
  font-style: italic;
}
</style>
