<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import api from '@/api/axios'

interface RegistrationItem {
  id: number
  guid: string
  fullName: string
  email: string
  dateApplied: string
  vehiclePlate: string
  vehicleType: string
  orcrUrl?: string
  motorPicUrl?: string
  status: 'pending' | 'approved' | 'rejected'
}

const registrations = reactive<RegistrationItem[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const selectedTab = ref<'all' | 'pending' | 'approved' | 'rejected'>('pending')
const selectedImage = ref<string | null>(null)

const avatarGradients = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #3b82f6, #1d4ed8)',
]

function getInitials(name: string): string {
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

async function fetchSubmissions() {
  isLoading.value = true
  try {
    const response = await api.get('/cor-submissions')
    if (response.data?.isSuccess && Array.isArray(response.data?.data)) {
      const submissions = response.data.data
      registrations.length = 0

      submissions.forEach((sub: any, i: number) => {
        let mappedStatus: 'pending' | 'approved' | 'rejected' = 'pending'
        if (sub.verificationStatus === 2) mappedStatus = 'approved'
        if (sub.verificationStatus === 3) mappedStatus = 'rejected'

        registrations.push({
          id: i + 1,
          guid: sub.id,
          fullName: sub.fullName || `User ${sub.userAccountId?.slice(0, 6)?.toUpperCase() || i + 1}`,
          email: sub.email || `user-${i + 1}@parkflow.app`,
          dateApplied: sub.createdAt ? new Date(sub.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently',
          vehiclePlate: sub.vehiclePlate || sub.plateNumber || 'N/A',
          vehicleType: sub.vehicleType || 'Vehicle',
          orcrUrl: sub.orcrDocumentPath || sub.orcrUrl,
          motorPicUrl: sub.motorPicturePath || sub.motorPicUrl,
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

async function approve(reg: RegistrationItem) {
  if (!reg.guid) {
    reg.status = 'approved'
    return
  }

  try {
    const response = await api.patch(`/cor-submissions/${reg.guid}/validate`, {
      verificationStatus: 2 // Verified
    })
    if (response.data?.isSuccess) {
      reg.status = 'approved'
    }
  } catch (error) {
    console.error('Error approving submission:', error)
  }
}

async function reject(reg: RegistrationItem) {
  if (!reg.guid) {
    reg.status = 'rejected'
    return
  }

  try {
    const response = await api.patch(`/cor-submissions/${reg.guid}/validate`, {
      verificationStatus: 3 // Rejected
    })
    if (response.data?.isSuccess) {
      reg.status = 'rejected'
    }
  } catch (error) {
    console.error('Error rejecting submission:', error)
  }
}

function openImage(url?: string) {
  if (url) {
    selectedImage.value = url
  }
}
</script>

<template>
  <div class="registrations-page">
    <!-- Header -->
    <div class="registrations-page__header">
      <div>
        <h1 class="registrations-page__title">Pending Registrations</h1>
        <p class="registrations-page__subtitle">Review and verify student vehicle & document applications</p>
      </div>
      <button class="registrations-page__refresh-btn" @click="fetchSubmissions">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21.5 2v6h-6M2.13 15.57a10 10 0 1 0 3.82-10.43L.5 9" />
        </svg>
        Refresh
      </button>
    </div>

    <!-- Summary Cards -->
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
          <span class="stat-card__label">Pending Approval</span>
        </div>
      </div>

      <div class="stat-card stat-card--approved">
        <div class="stat-card__icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <div class="stat-card__content">
          <span class="stat-card__value">{{ approvedCount }}</span>
          <span class="stat-card__label">Approved</span>
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
          <span class="stat-card__label">Rejected</span>
        </div>
      </div>
    </div>

    <!-- Controls & Filters -->
    <div class="registrations-page__controls">
      <!-- Tabs -->
      <div class="registrations-page__tabs">
        <button
          class="tab-btn"
          :class="{ active: selectedTab === 'pending' }"
          @click="selectedTab = 'pending'"
        >
          Pending
          <span class="tab-badge" v-if="pendingCount > 0">{{ pendingCount }}</span>
        </button>
        <button
          class="tab-btn"
          :class="{ active: selectedTab === 'all' }"
          @click="selectedTab = 'all'"
        >
          All Applications
        </button>
        <button
          class="tab-btn"
          :class="{ active: selectedTab === 'approved' }"
          @click="selectedTab = 'approved'"
        >
          Approved
        </button>
        <button
          class="tab-btn"
          :class="{ active: selectedTab === 'rejected' }"
          @click="selectedTab = 'rejected'"
        >
          Rejected
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

    <!-- Main List Container -->
    <div class="registrations-card">
      <div v-if="isLoading" class="registrations-card__loading">
        <div class="spinner"></div>
        <span>Loading registrations...</span>
      </div>

      <div v-else-if="filteredRegistrations.length === 0" class="registrations-card__empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <line x1="7" y1="8" x2="17" y2="8" />
          <line x1="7" y1="12" x2="13" y2="12" />
        </svg>
        <p class="empty-title">No registrations found</p>
        <p class="empty-sub">There are currently no registration applications matching your filter criteria.</p>
      </div>

      <div v-else class="registrations-table-wrapper">
        <table class="registrations-table">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Date Applied</th>
              <th>Vehicle Details</th>
              <th>Documents</th>
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
                  <span class="vehicle-plate">{{ reg.vehiclePlate }}</span>
                  <span class="vehicle-type">{{ reg.vehicleType }}</span>
                </div>
              </td>

              <td>
                <div class="doc-links">
                  <button v-if="reg.orcrUrl" class="doc-btn" @click="openImage(reg.orcrUrl)">OR/CR Document</button>
                  <button v-if="reg.motorPicUrl" class="doc-btn" @click="openImage(reg.motorPicUrl)">Vehicle Photo</button>
                  <span v-if="!reg.orcrUrl && !reg.motorPicUrl" class="doc-empty">None</span>
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
                  ✓ Verified
                </span>
                <span v-else class="result-text result-text--rejected">
                  ✗ Declined
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Image Modal Viewer -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="selectedImage" class="modal-backdrop" @click="selectedImage = null">
          <div class="modal-content" @click.stop>
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
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: var(--radius-button, 8px);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;
}

.registrations-page__refresh-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.15);
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

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;
}

.tab-btn.active {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.tab-badge {
  background: var(--color-primary, #ef4444);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
  line-height: 1;
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
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  margin: 12px 0 4px;
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
  background: rgba(0, 0, 0, 0.2);
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
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: var(--color-text);
  vertical-align: middle;
}

.registrations-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.02);
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
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #60a5fa;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: background 150ms ease;
}

.doc-btn:hover {
  background: rgba(96, 165, 250, 0.15);
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

/* Image Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 24px;
}

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
</style>
