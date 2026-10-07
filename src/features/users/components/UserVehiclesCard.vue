<script setup lang="ts">
import { ref } from 'vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import type { VehicleInfo } from '../types'
import { getVehicleTypeLabel } from '@/utils/vehicleType'
import { formatDocUrl, isPdfDoc } from '@/utils/documentUrl'

defineProps<{
  vehicles: VehicleInfo[]
}>()

// Zoom Modal State
const isZoomed = ref(false)
const zoomedImage = ref('')
const zoomedTitle = ref('')

function openZoom(url?: string | null, title: string = 'Vehicle Document') {
  if (!url) return
  zoomedImage.value = formatDocUrl(url)
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

function getVerificationBadgeVariant(
  status?: string | number,
): 'success' | 'warning' | 'danger' | 'neutral' {
  const str = String(status || '').toLowerCase()
  if (str === 'verified' || str === 'approved' || str === '2') return 'success'
  if (str === 'pending' || str === '1') return 'warning'
  if (str === 'rejected' || str === '3') return 'danger'
  return 'neutral'
}

function formatVerificationText(status?: string | number): string {
  const str = String(status || '').toLowerCase()
  if (str === 'verified' || str === 'approved' || str === '2') return 'Approved'
  if (str === 'pending' || str === '1') return 'Pending'
  if (str === 'rejected' || str === '3') return 'Rejected'
  return 'Not Submitted'
}
</script>

<template>
  <UiCard class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3.5 pb-4 border-b border-border">
      <div
        class="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center flex-shrink-0"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="6" rx="2" />
          <path d="M5 17h14" />
          <circle cx="7" cy="17" r="2" />
          <circle cx="17" cy="17" r="2" />
          <path d="M6 11l1.5-4.5h9L18 11" />
        </svg>
      </div>
      <div>
        <h3 class="text-base font-bold text-text">
          Registered Vehicles &amp; Verification Documents
        </h3>
        <p class="text-xs text-muted">
          Inspected vehicle records, uploaded proof photos, and OR/CR clearance certificates
        </p>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="!vehicles || vehicles.length === 0"
      class="text-center py-9 px-4 rounded-xl bg-surface-lighter border border-dashed border-border/60"
    >
      <div
        class="w-12 h-12 rounded-xl bg-surface-muted text-subtle flex items-center justify-center mx-auto mb-2.5"
      >
        <svg
          class="w-6 h-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <rect x="3" y="11" width="18" height="6" rx="2" />
          <circle cx="7" cy="17" r="2" />
          <circle cx="17" cy="17" r="2" />
        </svg>
      </div>
      <p class="text-sm font-bold text-text-secondary m-0">No Registered Vehicles Found</p>
      <p class="text-xs text-muted mt-1 mb-0">
        This client account has not yet registered any vehicles on campus.
      </p>
    </div>

    <!-- Vehicles Detailed Showcase List -->
    <div v-else class="space-y-6">
      <div
        v-for="veh in vehicles"
        :key="veh.plateNumber || veh.id"
        class="rounded-2xl bg-surface-lighter border border-border p-5 space-y-5"
      >
        <!-- Vehicle Top Banner -->
        <div
          class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border"
        >
          <div class="flex items-center gap-3.5 min-w-0">
            <div
              class="w-11 h-11 rounded-xl bg-surface text-text flex items-center justify-center flex-shrink-0 shadow-sm"
            >
              <svg
                v-if="veh.vehicleType === 'Car'"
                class="w-5 h-5"
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
              <svg
                v-else
                class="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="5" cy="18" r="3" />
                <circle cx="19" cy="18" r="3" />
                <path d="M12 18V8h4" />
                <path d="M5 18h14" opacity="0.3" />
              </svg>
            </div>
            <div class="flex flex-col min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-mono font-black text-text text-base tracking-wider">{{
                  veh.plateNumber
                }}</span>
                <UiBadge v-if="veh.isPrimary" variant="success" size="xs"> Primary Pass </UiBadge>
              </div>
              <span class="text-xs font-semibold text-muted truncate">
                Vehicle Brand: {{ veh.brand || 'Unspecified' }} •
                {{ getVehicleTypeLabel(veh.vehicleType) }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <UiBadge :variant="getVerificationBadgeVariant(veh.verificationStatus)" size="xs">
              {{ formatVerificationText(veh.verificationStatus) }}
            </UiBadge>
          </div>
        </div>

        <!-- Rejection Alert Callout if Rejected -->
        <div
          v-if="veh.rejectionReason"
          class="p-3.5 rounded-xl bg-danger-bg border border-danger flex items-start gap-2.5 text-xs text-danger"
        >
          <svg
            class="w-4 h-4 text-danger flex-shrink-0 mt-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <strong class="font-bold block mb-0.5">Verification Remarks:</strong>
            <span>{{ veh.rejectionReason }}</span>
          </div>
        </div>

        <!-- 2-Column Media Showcase: Proof of Vehicle & OR/CR Document -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- 1. Vehicle Photo -->
          <div
            class="flex flex-col rounded-xl bg-surface border border-border overflow-hidden shadow-xs"
          >
            <div
              class="px-4 py-2.5 bg-surface-lighter border-b border-border flex items-center justify-between"
            >
              <span class="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                <svg
                  class="w-3.5 h-3.5 text-info"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                Proof of Vehicle (Photo)
              </span>
              <a
                v-if="veh.vehiclePictureUrl"
                :href="formatDocUrl(veh.vehiclePictureUrl)"
                target="_blank"
                rel="noopener noreferrer"
                class="text-[11px] font-semibold text-info hover:underline flex items-center gap-1"
                title="Open photo in new tab"
              >
                <span>Original</span>
                <svg
                  class="w-3 h-3"
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

            <!-- Vehicle Image Frame -->
            <div class="p-3 flex items-center justify-center min-h-[190px] bg-surface-lighter">
              <div
                v-if="veh.vehiclePictureUrl"
                class="relative group cursor-pointer w-full h-[180px] rounded-lg overflow-hidden border border-border bg-surface-muted"
                @click="openZoom(veh.vehiclePictureUrl, `Vehicle Photo - ${veh.plateNumber}`)"
                title="Click to enlarge"
              >
                <img
                  :src="formatDocUrl(veh.vehiclePictureUrl)"
                  alt="Proof of Vehicle"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div
                  class="absolute inset-0 bg-surface/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-text text-xs font-semibold"
                >
                  <svg
                    class="w-4 h-4"
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
                class="flex flex-col items-center justify-center text-center p-6 text-muted"
              >
                <svg
                  class="w-8 h-8 mb-2 opacity-50"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span class="text-xs font-medium">No Vehicle Photo Uploaded</span>
              </div>
            </div>
          </div>

          <!-- 2. OR/CR Certificate Document -->
          <div
            class="flex flex-col rounded-xl bg-surface border border-border overflow-hidden shadow-xs"
          >
            <div
              class="px-4 py-2.5 bg-surface-lighter border-b border-border flex items-center justify-between"
            >
              <span class="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                <svg
                  class="w-3.5 h-3.5 text-purple-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Official OR/CR Document
              </span>
              <a
                v-if="veh.orcrDocumentUrl"
                :href="formatDocUrl(veh.orcrDocumentUrl)"
                target="_blank"
                rel="noopener noreferrer"
                class="text-[11px] font-semibold text-info hover:underline flex items-center gap-1"
                title="Open document in new tab"
              >
                <span>Original</span>
                <svg
                  class="w-3 h-3"
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

            <!-- OR/CR Display Frame -->
            <div class="p-3 flex items-center justify-center min-h-[190px] bg-surface-lighter">
              <template v-if="veh.orcrDocumentUrl">
                <!-- PDF Preview -->
                <div
                  v-if="checkIsPdf(veh.orcrDocumentUrl)"
                  class="flex flex-col items-center justify-center text-center p-4 w-full h-[180px] rounded-lg border border-border bg-surface-muted"
                >
                  <div
                    class="w-10 h-10 rounded-xl bg-danger-bg text-danger flex items-center justify-center mb-2 shadow-xs"
                  >
                    <svg
                      class="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <span class="text-xs font-bold text-text mb-2">OR/CR PDF Certificate</span>
                  <div class="flex items-center gap-2">
                    <a
                      :href="formatDocUrl(veh.orcrDocumentUrl)"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-info-bg text-text hover:bg-info-bg transition-colors inline-flex items-center gap-1 text-decoration-none"
                    >
                      <span>View PDF</span>
                      <svg
                        class="w-3 h-3"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                      </svg>
                    </a>
                  </div>
                </div>

                <!-- Image Preview -->
                <div
                  v-else
                  class="relative group cursor-pointer w-full h-[180px] rounded-lg overflow-hidden border border-border bg-surface-muted"
                  @click="openZoom(veh.orcrDocumentUrl, `OR/CR Document - ${veh.plateNumber}`)"
                  title="Click to enlarge"
                >
                  <img
                    :src="formatDocUrl(veh.orcrDocumentUrl)"
                    alt="OR/CR Certificate"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div
                    class="absolute inset-0 bg-surface/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-text text-xs font-semibold"
                  >
                    <svg
                      class="w-4 h-4"
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
              </template>

              <div
                v-else
                class="flex flex-col items-center justify-center text-center p-6 text-muted"
              >
                <svg
                  class="w-8 h-8 mb-2 opacity-50"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span class="text-xs font-medium">No OR/CR Document Uploaded</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Zoom Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-150"
        leave-active-class="transition-opacity duration-150"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isZoomed"
          class="fixed inset-0 z-[99999] flex items-center justify-center bg-overlay p-4"
          @click="closeZoom"
        >
          <div
            class="relative max-w-4xl w-full max-h-[90vh] bg-surface rounded-2xl overflow-hidden shadow-modal flex flex-col border border-border"
            @click.stop
          >
            <!-- Modal Header -->
            <div
              class="flex items-center justify-between px-5 py-3.5 bg-surface-muted border-b border-border text-text"
            >
              <span class="text-sm font-bold truncate">{{ zoomedTitle }}</span>
              <div class="flex items-center gap-2">
                <a
                  :href="zoomedImage"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="px-2.5 py-1 rounded-lg bg-surface-muted hover:bg-primary-light text-text text-xs font-semibold transition-colors flex items-center gap-1.5 text-decoration-none"
                >
                  <svg
                    class="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  <span>Open Original</span>
                </a>
                <button
                  type="button"
                  class="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-primary-light transition-colors cursor-pointer border-none bg-transparent"
                  @click="closeZoom"
                >
                  <svg
                    class="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Modal Body -->
            <div
              class="p-4 flex items-center justify-center overflow-auto max-h-[calc(90vh-60px)] bg-surface-muted"
            >
              <iframe
                v-if="checkIsPdf(zoomedImage)"
                :src="zoomedImage"
                class="w-full h-[70vh] rounded-lg border border-border"
              />
              <img
                v-else
                :src="zoomedImage"
                :alt="zoomedTitle"
                class="max-w-full max-h-[75vh] object-contain rounded-lg shadow-soft"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </UiCard>
</template>
