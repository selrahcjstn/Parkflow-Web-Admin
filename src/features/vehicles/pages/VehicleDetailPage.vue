<script setup lang="ts">
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import UiStatusText from '@/components/ui/UiStatusText.vue'
import UiCard from '@/components/ui/UiCard.vue'
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api/axios'
import { cachedVehicleApprovals } from '@/stores/appCache'
import { formatDocUrl, isPdfDoc } from '@/utils/documentUrl'

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
  return isPdfDoc(url || '')
}

// --- Helpers ---
function getVehicleTypeLabel(type: any): string {
  if (type === 0 || type === 'Motorcycle') return 'Motorcycle'
  if (type === 1 || type === 'ElectricBike') return 'E-Bike'
  if (type === 2 || type === 'Car') return 'Car'
  return String(type ?? '—')
}

function getVerificationLabel(status: any): string {
  if (status === 2 || status === '2' || status === 'Verified' || status === 'Approved')
    return 'Approved'
  if (status === 3 || status === '3' || status === 'Rejected') return 'Rejected'
  return 'Pending'
}

function getVerificationVariant(status: string | number): 'success' | 'danger' | 'warning' {
  const label = getVerificationLabel(status)
  return label === 'Approved' ? 'success' : label === 'Rejected' ? 'danger' : 'warning'
}

function getRoleLabel(role: string): string {
  if (role === 'UniversityStaff') return 'Faculty'
  if (role === 'NonAcademicPersonnel') return 'University Staff'
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
  const vehPic = v.vehiclePictureUrl || v.vehiclePhotoUrl || v.photoUrl || null
  const orcrDoc = v.orcrDocumentUrl || v.orcrUrl || v.documentUrl || null

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
    vehiclePictureUrl: vehPic ? formatDocUrl(vehPic, '') : null,
    orcrDocumentUrl: orcrDoc ? formatDocUrl(orcrDoc, '') : null,
  }
}

onMounted(async () => {
  isLoading.value = true

  // 1. Check cachedVehicleApprovals
  if (cachedVehicleApprovals.value && Array.isArray(cachedVehicleApprovals.value)) {
    const found = cachedVehicleApprovals.value.find(
      (v: any) => String(v.id ?? v.vehicleId ?? v.guid ?? '') === vehicleId.value,
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
    const items: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []

    if (items.length > 0) {
      cachedVehicleApprovals.value = items
    }

    const found = items.find(
      (v: any) => String(v.id ?? v.vehicleId ?? v.guid ?? '') === vehicleId.value,
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
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="space-y-3">
      <button
        class="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
        @click="goBack"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to Vehicle Directory
      </button>
      <div class="min-w-0 space-y-1">
        <h1 class="text-2xl font-bold tracking-tight text-text">Vehicle Record Details</h1>
        <p class="text-sm leading-6 text-muted">
          Inspect registration verification documents, vehicle specifications, and owner clearance.
        </p>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="isLoading" class="space-y-5" role="status" aria-label="Loading record">
      <SkeletonLoader variant="rect" height="128px" class="rounded-card" />
      <div class="grid gap-6 xl:grid-cols-2">
        <SkeletonLoader variant="rect" height="220px" class="rounded-card" />
        <SkeletonLoader variant="rect" height="220px" class="rounded-card" />
      </div>
    </div>

    <!-- Not Found -->
    <div
      v-else-if="!vehicle"
      class="flex flex-col items-center gap-4 rounded-card border border-border bg-surface px-6 py-12 text-center text-muted"
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p>Vehicle record not found.</p>
      <button
        class="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
        @click="goBack"
      >
        Go back to directory
      </button>
    </div>

    <!-- Content -->
    <div v-else class="space-y-6">
      <!-- TOP VIEW: 2-COLUMN UPLOADED DOCUMENTS -->
      <UiCard custom-class="p-6">
        <div class="mb-5 flex items-start gap-3 border-b border-border pb-4">
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-button bg-primary-light text-primary"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-semibold text-text">Uploaded Registration Documents</h3>
            <p class="mt-1 text-sm leading-5 text-muted">
              Official vehicle photograph and OR/CR certificate for identity verification
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <!-- Column 1: Proof of Vehicle (Photo) -->
          <div class="overflow-hidden rounded-button border border-border bg-surface-lighter">
            <div
              class="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface p-4"
            >
              <div class="flex items-center gap-2 text-sm font-semibold text-text">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
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
                class="inline-flex min-h-9 items-center gap-2 rounded-button px-2 text-sm font-medium text-primary hover:bg-primary-light"
                title="Open original photo in new tab"
              >
                <span>Open Original</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>

            <!-- Vehicle Photo Frame -->
            <div
              class="relative flex h-72 items-center justify-center overflow-hidden bg-surface-muted"
            >
              <div
                v-if="vehicle.vehiclePictureUrl"
                class="group relative h-full w-full cursor-zoom-in"
                @click="openZoom(vehicle.vehiclePictureUrl, 'Proof of Vehicle Photo')"
                title="Click to enlarge"
              >
                <img
                  :src="vehicle.vehiclePictureUrl"
                  alt="Proof of Vehicle"
                  class="h-full w-full object-contain"
                />
                <div
                  class="absolute inset-0 flex items-center justify-center gap-2 bg-overlay text-sm font-medium text-text-inverse opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="11" y1="8" x2="11" y2="14" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                  <span>Click to Zoom</span>
                </div>
              </div>
              <div
                v-else
                class="flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted"
              >
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                >
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
            <div
              class="grid grid-cols-1 gap-3 border-t border-border bg-surface p-4 sm:grid-cols-2"
            >
              <div>
                <span class="block text-sm text-muted">Plate Number</span>
                <span
                  class="mt-1 block break-words text-sm font-medium text-text font-mono font-bold"
                  >{{ vehicle.plateNumber }}</span
                >
              </div>
              <div>
                <span class="block text-sm text-muted">Brand &amp; Model</span>
                <span class="mt-1 block break-words text-sm font-medium text-text">{{
                  vehicle.brand
                }}</span>
              </div>
            </div>
          </div>

          <!-- Column 2: OR/CR Document -->
          <div class="overflow-hidden rounded-button border border-border bg-surface-lighter">
            <div
              class="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface p-4"
            >
              <div class="flex items-center gap-2 text-sm font-semibold text-text">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
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
                class="inline-flex min-h-9 items-center gap-2 rounded-button px-2 text-sm font-medium text-primary hover:bg-primary-light"
                title="Open original OR/CR document in new tab"
              >
                <span>Open Original</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>

            <!-- OR/CR Document Frame -->
            <div
              class="relative flex h-72 items-center justify-center overflow-hidden bg-surface-muted"
            >
              <div
                v-if="vehicle.orcrDocumentUrl && !checkIsPdf(vehicle.orcrDocumentUrl)"
                class="group relative h-full w-full cursor-zoom-in"
                @click="openZoom(vehicle.orcrDocumentUrl, 'OR/CR Registration Document')"
                title="Click to enlarge"
              >
                <img
                  :src="vehicle.orcrDocumentUrl"
                  alt="OR/CR Document"
                  class="h-full w-full object-contain"
                />
                <div
                  class="absolute inset-0 flex items-center justify-center gap-2 bg-overlay text-sm font-medium text-text-inverse opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="11" y1="8" x2="11" y2="14" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                  <span>Click to Zoom</span>
                </div>
              </div>
              <iframe
                v-else-if="vehicle.orcrDocumentUrl && checkIsPdf(vehicle.orcrDocumentUrl)"
                :src="vehicle.orcrDocumentUrl"
                class="h-full w-full border-0"
                title="OR/CR PDF Document"
              />
              <div
                v-else
                class="flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted"
              >
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span>No OR/CR document uploaded</span>
              </div>
            </div>

            <!-- Panel Metadata Strip -->
            <div
              class="grid grid-cols-1 gap-3 border-t border-border bg-surface p-4 sm:grid-cols-2"
            >
              <div>
                <span class="block text-sm text-muted">Document Type</span>
                <span class="mt-1 block break-words text-sm font-medium text-text"
                  >Official Receipt / Certificate</span
                >
              </div>
              <div>
                <span class="block text-sm text-muted">Format</span>
                <span class="mt-1 block break-words text-sm font-medium text-text">{{
                  checkIsPdf(vehicle.orcrDocumentUrl) ? 'PDF Document' : 'Digital Photo'
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </UiCard>

      <!-- CARD 2: Registration Properties -->
      <UiCard custom-class="p-6">
        <div class="mb-5 flex items-start gap-3 border-b border-border pb-4">
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-button bg-primary-light text-primary"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-semibold text-text">Registration Properties</h3>
            <p class="mt-1 text-sm leading-5 text-muted">
              Vehicle classification and approval status
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          <div class="min-w-0 space-y-1">
            <span class="block text-sm text-muted">Vehicle Type</span>
            <span class="block break-words text-sm font-medium text-text">{{
              getVehicleTypeLabel(vehicle.vehicleType)
            }}</span>
          </div>
          <div class="min-w-0 space-y-1">
            <span class="block text-sm text-muted">Approval Status</span>
            <UiStatusText :variant="getVerificationVariant(vehicle.verificationStatus)">
              {{ getVerificationLabel(vehicle.verificationStatus) }}
            </UiStatusText>
          </div>
          <div class="min-w-0 space-y-1">
            <span class="block text-sm text-muted">Primary Clearance Pass</span>
            <span class="block break-words text-sm font-medium text-text">{{
              vehicle.isPrimary ? 'Yes (Primary Pass)' : 'No (Secondary Pass)'
            }}</span>
          </div>
          <div class="min-w-0 space-y-1">
            <span class="block text-sm text-muted">System Record ID</span>
            <span
              class="block break-words text-sm font-medium font-mono text-xs text-text-secondary"
              >{{ vehicle.id }}</span
            >
          </div>
        </div>
      </UiCard>

      <!-- CARD 3: Owner Information -->
      <UiCard custom-class="p-6">
        <div class="mb-5 flex items-start gap-3 border-b border-border pb-4">
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-button bg-primary-light text-primary"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-semibold text-text">Owner Information</h3>
            <p class="mt-1 text-sm leading-5 text-muted">
              Registered vehicle owner and campus classification
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          <div class="min-w-0 space-y-1">
            <span class="block text-sm text-muted">Full Name</span>
            <span class="block break-words text-sm font-medium text-text">{{
              vehicle.ownerName
            }}</span>
          </div>
          <div class="min-w-0 space-y-1">
            <span class="block text-sm text-muted">Campus Classification</span>
            <span class="block break-words text-sm font-medium text-text">{{
              getRoleLabel(vehicle.ownerRole)
            }}</span>
          </div>
          <div class="min-w-0 space-y-1" v-if="vehicle.ownerEmail">
            <span class="block text-sm text-muted">Email Address</span>
            <span class="block break-words text-sm font-medium text-text font-mono">{{
              vehicle.ownerEmail
            }}</span>
          </div>
        </div>
      </UiCard>
    </div>

    <!-- Zoom Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="isZoomed"
          class="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-5"
          @click="closeZoom"
        >
          <div
            class="w-full max-w-4xl overflow-hidden rounded-card border border-border bg-surface shadow-modal"
            @click.stop
          >
            <div class="flex items-center justify-between gap-4 border-b border-border p-5">
              <span class="text-base font-semibold text-text">{{ zoomedTitle }}</span>
              <button
                class="flex size-10 items-center justify-center rounded-button text-2xl text-muted hover:bg-surface-muted"
                @click="closeZoom"
              >
                &times;
              </button>
            </div>
            <img
              :src="zoomedImage"
              alt="Zoomed Document"
              class="max-h-[75vh] w-full object-contain"
            />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
