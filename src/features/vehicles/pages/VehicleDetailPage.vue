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

// Zoom Modal State
const isZoomed = ref(false)
const zoomedImage = ref('')
const zoomedTitle = ref('')

function openZoom(url: string, title: string) {
  if (!url) return
  zoomedImage.value = url
  zoomedTitle.value = title
  isZoomed.value = true
}

function closeZoom() {
  isZoomed.value = false
  zoomedImage.value = ''
  zoomedTitle.value = ''
}

function checkIsPdf(url?: string | null): boolean {
  if (!url) return false
  return url.toLowerCase().includes('.pdf')
}

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
    ownerEmail: v.ownerEmail || v.email || '',
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
        <p class="page-subtitle">Inspect registration verification documents, vehicle specifications, and owner clearance.</p>
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

      <!-- TOP VIEW: 2-COLUMN UPLOADED DOCUMENTS -->
      <div class="form-card">
        <div class="card-header">
          <div class="card-icon-badge card-icon-badge--blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <div>
            <h3 class="card-title">Uploaded Registration Documents</h3>
            <p class="card-subtitle">Official vehicle photograph and OR/CR certificate for identity verification</p>
          </div>
        </div>

        <div class="docs-2col-grid">
          
          <!-- Column 1: Proof of Vehicle (Photo) -->
          <div class="doc-panel">
            <div class="panel-header-strip">
              <div class="panel-header-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="6" rx="2" />
                  <path d="M5 17h14" />
                  <circle cx="7" cy="17" r="2" />
                  <circle cx="17" cy="17" r="2" />
                  <path d="M6 11l1.5-4.5h9L18 11" />
                </svg>
                <span>Proof of Vehicle (Photo)</span>
              </div>
              <a
                v-if="vehicle.vehiclePictureUrl"
                :href="vehicle.vehiclePictureUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="panel-link-btn"
                title="Open original photo in new tab"
              >
                <span>Open Original</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>

            <!-- Vehicle Photo Frame -->
            <div class="doc-display-frame">
              <div
                v-if="vehicle.vehiclePictureUrl"
                class="doc-media-wrapper"
                @click="openZoom(vehicle.vehiclePictureUrl, 'Proof of Vehicle Photo')"
                title="Click to enlarge"
              >
                <img
                  :src="vehicle.vehiclePictureUrl"
                  alt="Proof of Vehicle"
                  class="doc-preview-img"
                />
                <div class="doc-hover-overlay">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    <line x1="11" y1="8" x2="11" y2="14"/>
                    <line x1="8" y1="11" x2="14" y2="11"/>
                  </svg>
                  <span>Click to Zoom</span>
                </div>
              </div>
              <div v-else class="doc-empty-box">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
                  <rect x="3" y="11" width="18" height="6" rx="2" />
                  <path d="M5 17h14" />
                  <circle cx="7" cy="17" r="2" />
                  <circle cx="17" cy="17" r="2" />
                  <path d="M6 11l1.5-4.5h9L18 11" />
                </svg>
                <span>No vehicle photo uploaded</span>
              </div>
            </div>

            <!-- Panel Metadata Strip -->
            <div class="panel-meta-row">
              <div>
                <span class="meta-label">Plate Number</span>
                <span class="meta-value font-mono font-bold">{{ vehicle.plateNumber }}</span>
              </div>
              <div>
                <span class="meta-label">Brand &amp; Model</span>
                <span class="meta-value">{{ vehicle.brand }}</span>
              </div>
            </div>
          </div>

          <!-- Column 2: OR/CR Document -->
          <div class="doc-panel">
            <div class="panel-header-strip">
              <div class="panel-header-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <span>OR/CR Document (Registration)</span>
              </div>
              <a
                v-if="vehicle.orcrDocumentUrl"
                :href="vehicle.orcrDocumentUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="panel-link-btn"
                title="Open original OR/CR document in new tab"
              >
                <span>Open Original</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>

            <!-- OR/CR Document Frame -->
            <div class="doc-display-frame">
              <div
                v-if="vehicle.orcrDocumentUrl && !checkIsPdf(vehicle.orcrDocumentUrl)"
                class="doc-media-wrapper"
                @click="openZoom(vehicle.orcrDocumentUrl, 'OR/CR Registration Document')"
                title="Click to enlarge"
              >
                <img
                  :src="vehicle.orcrDocumentUrl"
                  alt="OR/CR Document"
                  class="doc-preview-img"
                />
                <div class="doc-hover-overlay">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    <line x1="11" y1="8" x2="11" y2="14"/>
                    <line x1="8" y1="11" x2="14" y2="11"/>
                  </svg>
                  <span>Click to Zoom</span>
                </div>
              </div>
              <iframe
                v-else-if="vehicle.orcrDocumentUrl && checkIsPdf(vehicle.orcrDocumentUrl)"
                :src="vehicle.orcrDocumentUrl"
                class="doc-pdf-frame"
                title="OR/CR PDF Document"
              />
              <div v-else class="doc-empty-box">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span>No OR/CR document uploaded</span>
              </div>
            </div>

            <!-- Panel Metadata Strip -->
            <div class="panel-meta-row">
              <div>
                <span class="meta-label">Document Type</span>
                <span class="meta-value">Official Receipt / Certificate</span>
              </div>
              <div>
                <span class="meta-label">Format</span>
                <span class="meta-value">{{ checkIsPdf(vehicle.orcrDocumentUrl) ? 'PDF Document' : 'Digital Photo' }}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- CARD 2: Registration Properties -->
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
              class="detail-value font-bold"
              :style="{ color: getVerificationColor(vehicle.verificationStatus) }"
            >
              {{ getVerificationLabel(vehicle.verificationStatus) }}
            </span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Primary Clearance Pass</span>
            <span class="detail-value">{{ vehicle.isPrimary ? 'Yes (Primary Pass)' : 'No (Secondary Pass)' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">System Record ID</span>
            <span class="detail-value font-mono text-xs text-slate-600">{{ vehicle.id }}</span>
          </div>
        </div>
      </div>

      <!-- CARD 3: Owner Information -->
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
            <p class="card-subtitle">Registered vehicle owner and campus classification</p>
          </div>
        </div>

        <div class="details-grid">
          <div class="detail-item">
            <span class="detail-label">Full Name</span>
            <span class="detail-value">{{ vehicle.ownerName }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Campus Classification</span>
            <span class="detail-value">{{ getRoleLabel(vehicle.ownerRole) }}</span>
          </div>
          <div class="detail-item" v-if="vehicle.ownerEmail">
            <span class="detail-label">Email Address</span>
            <span class="detail-value font-mono text-sm">{{ vehicle.ownerEmail }}</span>
          </div>
        </div>
      </div>

    </div>

    <!-- Zoom Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="isZoomed" class="zoom-modal-backdrop" @click="closeZoom">
          <div class="zoom-modal-content" @click.stop>
            <div class="zoom-header">
              <span class="zoom-title">{{ zoomedTitle }}</span>
              <button class="close-zoom-btn" @click="closeZoom">&times;</button>
            </div>
            <img :src="zoomedImage" alt="Zoomed Document" class="zoomed-image" />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.vehicle-detail-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ── Header ── */
.page-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--color-muted, #64748b);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  transition: color 150ms ease;
  width: fit-content;
}

.back-btn:hover {
  color: #4f46e5;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text, #1e293b);
  margin: 0;
  letter-spacing: -0.3px;
}

.page-subtitle {
  font-size: 13px;
  color: var(--color-muted, #64748b);
  margin: 0;
}

/* ── Loading Skeleton ── */
.loading-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.skeleton-card {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-card, 16px);
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
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-card, 16px);
  color: var(--color-muted, #64748b);
  text-align: center;
}
.not-found-card p { font-size: 15px; font-weight: 600; margin: 0; }

/* ── Detail Container ── */
.detail-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ── Form Card ── */
.form-card {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-card, 16px);
  padding: 24px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border, #f1f5f9);
  margin-bottom: 20px;
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
  color: var(--color-text, #1e293b);
  margin: 0;
}

.card-subtitle {
  font-size: 12px;
  color: var(--color-muted, #64748b);
  margin: 2px 0 0 0;
}

/* =====================================================================
   2-COLUMN DOCUMENTS TOP VIEW
   ===================================================================== */
.docs-2col-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 860px) {
  .docs-2col-grid {
    grid-template-columns: 1fr;
  }
}

.doc-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 12px;
  overflow: hidden;
  background: #f8fafc;
}

.panel-header-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #ffffff;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  gap: 10px;
}

.panel-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text, #1e293b);
}

.panel-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: #4f46e5;
  text-decoration: none;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 150ms ease;
}

.panel-link-btn:hover {
  background: rgba(79, 70, 229, 0.08);
}

.doc-display-frame {
  height: 280px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  overflow: hidden;
}

.doc-media-wrapper {
  width: 100%;
  height: 100%;
  cursor: pointer;
  position: relative;
}

.doc-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 200ms ease;
}

.doc-media-wrapper:hover .doc-preview-img {
  transform: scale(1.02);
}

.doc-hover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  opacity: 0;
  transition: opacity 150ms ease;
}

.doc-media-wrapper:hover .doc-hover-overlay {
  opacity: 1;
}

.doc-pdf-frame {
  width: 100%;
  height: 100%;
  border: none;
}

.doc-empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 500;
}

.panel-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #ffffff;
  border-top: 1px solid var(--color-border, #e2e8f0);
}

.meta-label {
  display: block;
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-muted, #64748b);
}

.meta-value {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text, #1e293b);
  margin-top: 1px;
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
  letter-spacing: 0.05em;
  color: var(--color-muted, #64748b);
  font-weight: 600;
}

.detail-value {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--color-text, #1e293b);
}

/* ── Zoom Modal ── */
.zoom-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  padding: 20px;
}

.zoom-modal-content {
  background: #ffffff;
  border-radius: 16px;
  overflow: hidden;
  max-width: 820px;
  width: 100%;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
}

.zoom-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.zoom-title {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
}

.close-zoom-btn {
  background: transparent;
  border: none;
  font-size: 24px;
  line-height: 1;
  color: #64748b;
  cursor: pointer;
  padding: 0;
}

.zoomed-image {
  width: 100%;
  max-height: 75vh;
  object-fit: contain;
  background: #0f172a;
  display: block;
}
</style>
