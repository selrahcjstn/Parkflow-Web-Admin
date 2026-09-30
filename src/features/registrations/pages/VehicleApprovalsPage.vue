<script setup lang="ts">
import { ref, computed } from 'vue'
import { useApprovals } from '../composables/useApprovals'
import type { ApprovalItem } from '../types'
import ApprovalStatsBar from '../components/ApprovalStatsBar.vue'
import ApprovalFilterBar from '../components/ApprovalFilterBar.vue'
import ApprovalCard from '../components/ApprovalCard.vue'
import ApprovalTable from '../components/ApprovalTable.vue'
import ApprovalInspectorModal from '../components/ApprovalInspectorModal.vue'
import DocumentZoomModal from '../components/DocumentZoomModal.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import TablePagination from '@/components/ui/TablePagination.vue'

const {
  approvals,
  isLoading,
  apiErrorNotice,
  actionSuccessMsg,
  fetchApprovals,
  approveItem,
  rejectItem
} = useApprovals('Vehicle')

// Filter and View State
const searchQuery = ref('')
const selectedStatusTab = ref<'all' | 'pending' | 'approved' | 'rejected'>('pending')
const selectedRole = ref('all')
const viewMode = ref<'grid' | 'table'>('grid')

// Pagination State
const currentPage = ref(1)
const itemsPerPage = ref(9)

// Modal State
const inspectorItem = ref<ApprovalItem | null>(null)
const isInspectorOpen = ref(false)
const selectedZoomImage = ref<string | null>(null)

// Confirmation Modal State
const isConfirmApproveOpen = ref(false)
const isConfirmRejectOpen = ref(false)
const itemToActOn = ref<ApprovalItem | null>(null)
const rejectFeedbackReason = ref('')

// Computed counts
const totalCount = computed(() => approvals.value.length)
const pendingCount = computed(() => approvals.value.filter((r) => r.status === 'pending').length)
const approvedCount = computed(() => approvals.value.filter((r) => r.status === 'approved').length)
const rejectedCount = computed(() => approvals.value.filter((r) => r.status === 'rejected').length)

// Filtered items
const filteredApprovals = computed(() => {
  return approvals.value.filter((item) => {
    const q = (searchQuery.value || '').toLowerCase().trim()
    const matchesQuery =
      !q ||
      (item.fullName || '').toLowerCase().includes(q) ||
      (item.email || '').toLowerCase().includes(q) ||
      (item.vehiclePlate || '').toLowerCase().includes(q) ||
      (item.brand || '').toLowerCase().includes(q) ||
      (item.role || '').toLowerCase().includes(q)

    const matchesStatus =
      selectedStatusTab.value === 'all' || item.status === selectedStatusTab.value

    const matchesRole =
      selectedRole.value === 'all' || item.role.toLowerCase() === selectedRole.value.toLowerCase()

    return matchesQuery && matchesStatus && matchesRole
  })
})

const totalPages = computed(() => Math.ceil(filteredApprovals.value.length / itemsPerPage.value) || 1)

const paginatedApprovals = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredApprovals.value.slice(start, start + itemsPerPage.value)
})

// Actions
function openInspector(item: ApprovalItem) {
  inspectorItem.value = item
  isInspectorOpen.value = true
}

function closeInspector() {
  isInspectorOpen.value = false
  inspectorItem.value = null
}

function promptApprove(item: ApprovalItem) {
  itemToActOn.value = item
  isConfirmApproveOpen.value = true
}

async function handleConfirmApprove() {
  if (itemToActOn.value) {
    await approveItem(itemToActOn.value)
    isConfirmApproveOpen.value = false
    itemToActOn.value = null
    closeInspector()
  }
}

function promptReject(item: ApprovalItem) {
  itemToActOn.value = item
  rejectFeedbackReason.value = ''
  isConfirmRejectOpen.value = true
}

async function handleConfirmReject() {
  if (itemToActOn.value) {
    await rejectItem(itemToActOn.value, rejectFeedbackReason.value)
    isConfirmRejectOpen.value = false
    itemToActOn.value = null
    closeInspector()
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight m-0">
          Vehicle Approvals
        </h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Review and verify vehicle documents, OR/CR registrations, and photos submitted by campus motorists.
        </p>
      </div>
    </div>

    <!-- Alert Notices -->
    <div
      v-if="actionSuccessMsg"
      class="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-sm font-medium flex items-center justify-between transition-all"
    >
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span>{{ actionSuccessMsg }}</span>
      </div>
      <button
        type="button"
        class="text-blue-700 hover:text-blue-900 dark:text-blue-300 border-none bg-transparent cursor-pointer font-bold"
        @click="actionSuccessMsg = null"
      >
        ✕
      </button>
    </div>

    <div
      v-if="apiErrorNotice"
      class="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm font-medium flex items-center justify-between"
    >
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>{{ apiErrorNotice }}</span>
      </div>
      <button
        type="button"
        class="text-amber-700 hover:text-amber-900 border-none bg-transparent cursor-pointer font-bold"
        @click="apiErrorNotice = null"
      >
        ✕
      </button>
    </div>

    <!-- Stats Overview -->
    <ApprovalStatsBar
      :total-count="totalCount"
      :pending-count="pendingCount"
      :approved-count="approvedCount"
      :rejected-count="rejectedCount"
      :active-status-tab="selectedStatusTab"
      :is-loading="isLoading"
      @select-status="selectedStatusTab = $event"
    />

    <!-- Filter Bar -->
    <ApprovalFilterBar
      v-model:search-query="searchQuery"
      v-model:selected-status-tab="selectedStatusTab"
      v-model:selected-role="selectedRole"
      v-model:view-mode="viewMode"
      :total-count="totalCount"
      :pending-count="pendingCount"
      :approved-count="approvedCount"
      :rejected-count="rejectedCount"
      :is-loading="isLoading"
      show-role-filter
      @refresh="fetchApprovals"
    />

    <!-- Main Content Area -->
    <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <SkeletonLoader v-for="n in 6" :key="n" type="card" height="240px" />
    </div>

    <div v-else-if="filteredApprovals.length === 0" class="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      <div class="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400">
        <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
      <h3 class="text-base font-bold text-slate-900 dark:text-white">No Vehicle Submissions Found</h3>
      <p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
        There are currently no vehicle update submissions matching your filter criteria.
      </p>
    </div>

    <div v-else>
      <!-- Grid Cards View -->
      <div v-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ApprovalCard
          v-for="(item, idx) in paginatedApprovals"
          :key="item.guid || idx"
          :item="item"
          :index="idx"
          @inspect="openInspector(item)"
          @approve="promptApprove(item)"
          @reject="promptReject(item)"
          @zoom-image="selectedZoomImage = $event"
        />
      </div>

      <!-- Table View -->
      <div v-else>
        <ApprovalTable
          :items="paginatedApprovals"
          @inspect="openInspector"
          @approve="promptApprove"
          @reject="promptReject"
        />
      </div>

      <!-- Pagination -->
      <div class="mt-6">
        <TablePagination
          v-if="filteredApprovals.length > itemsPerPage"
          :total-items="filteredApprovals.length"
          v-model:current-page="currentPage"
          v-model:items-per-page="itemsPerPage"
        />
      </div>
    </div>

    <!-- Document Inspector Modal -->
    <ApprovalInspectorModal
      :item="inspectorItem"
      :is-open="isInspectorOpen"
      @close="closeInspector"
      @approve="promptApprove"
      @reject="promptReject"
      @zoom-image="selectedZoomImage = $event"
    />

    <!-- Document Image Zoom Modal -->
    <DocumentZoomModal
      :image-url="selectedZoomImage"
      @close="selectedZoomImage = null"
    />

    <!-- Approve Confirmation Dialog -->
    <ConfirmModal
      :is-open="isConfirmApproveOpen"
      title="Approve Vehicle Registration"
      :message="`Are you sure you want to approve the vehicle ${itemToActOn?.vehiclePlate} for ${itemToActOn?.fullName}?`"
      confirm-label="Yes, Approve Vehicle"
      cancel-label="Cancel"
      type="success"
      @confirm="handleConfirmApprove"
      @cancel="isConfirmApproveOpen = false"
    />

    <!-- Reject Confirmation Dialog -->
    <ConfirmModal
      :is-open="isConfirmRejectOpen"
      title="Reject Vehicle Submission"
      :message="`Are you sure you want to reject the vehicle submission for ${itemToActOn?.fullName}?`"
      confirm-label="Reject Submission"
      cancel-label="Cancel"
      type="danger"
      @confirm="handleConfirmReject"
      @cancel="isConfirmRejectOpen = false"
    >
      <div class="mt-3">
        <label class="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
          Reason for rejection / feedback:
        </label>
        <textarea
          v-model="rejectFeedbackReason"
          rows="3"
          class="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
          placeholder="e.g. Expired OR/CR, unclear plate number photo..."
        ></textarea>
      </div>
    </ConfirmModal>
  </div>
</template>
