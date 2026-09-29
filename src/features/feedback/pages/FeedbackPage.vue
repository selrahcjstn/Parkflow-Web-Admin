<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { FeedbackItem, FeedbackStatus } from '../types'
import TablePagination from '@/components/ui/TablePagination.vue'
import UiTable, { type TableColumn } from '@/components/ui/UiTable.vue'
import UiStatusText from '@/components/ui/UiStatusText.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import FeedbackStats from '../components/FeedbackStats.vue'
import FeedbackFilters from '../components/FeedbackFilters.vue'
import FeedbackDetailModal from '../components/FeedbackDetailModal.vue'
import api from '@/api/axios'
import { cachedFeedbacks } from '@/stores/appCache'
import { useAdminNotificationStore } from '@/stores/notification.store'

const feedColumns: TableColumn[] = [
  { key: 'user', label: 'User / Applicant' },
  { key: 'category', label: 'Category' },
  { key: 'rating', label: 'Rating' },
  { key: 'message', label: 'Feedback Message' },
  { key: 'sla', label: 'Inquiry SLA' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Action', align: 'right' }
]

interface Toast {
  id: number
  message: string
  type: 'success' | 'info' | 'warning' | 'danger'
}

const toasts = ref<Toast[]>([])
const nextToastId = ref(1)

const showToast = (message: string, type: 'success' | 'info' | 'warning' | 'danger' = 'success') => {
  const id = nextToastId.value++
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 4000)
}

const notifStore = useAdminNotificationStore()
let unsubscribeApprovalUpdates: (() => void) | null = null

// State with reactive cache initialization
const feedbacks = ref<FeedbackItem[]>(cachedFeedbacks.value || [])
const isLoading = ref(!cachedFeedbacks.value || cachedFeedbacks.value.length === 0)
const searchQuery = ref('')
const selectedCategory = ref('All')
const selectedStatus = ref<string>('All')
const selectedRating = ref<number | 'All'>('All')

// Modal state
const isDetailModalOpen = ref(false)
const activeFeedback = ref<FeedbackItem | null>(null)
const editStatus = ref<FeedbackStatus>('Pending')
const replyMessage = ref('')
const markAsResolved = ref(true)
const isSendingReply = ref(false)

// Pagination State
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Helpers for normalizing backend fields
const getUserName = (f: FeedbackItem) => f.fullName || f.userFullName || 'Anonymous User'
const getUserEmail = (f: FeedbackItem) => f.email || f.userEmail || 'N/A'
const getMessageText = (f: FeedbackItem) => f.description || f.message || ''

const getInitials = (name: string, email: string) => {
  if (name && name !== 'Anonymous User') {
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  }
  if (email && email !== 'N/A') {
    return email.slice(0, 2).toUpperCase()
  }
  return 'PF'
}

const getNormalizedStatus = (f: FeedbackItem): FeedbackStatus => {
  const s = f.statusName || f.status
  if (String(s) === '3' || s === 'Resolved') return 'Resolved'
  if (String(s) === '2' || s === 'Reviewed') return 'Reviewed'
  return 'Pending'
}

const getNormalizedCategory = (category?: string): string => {
  const cat = (category || '').toLowerCase()
  if (cat.includes('bug')) return 'Bug Report'
  if (cat.includes('feature')) return 'Feature Request'
  if (cat.includes('ui') || cat.includes('ux')) return 'UI/UX'
  return 'General'
}

const getHoursElapsed = (createdAt?: string) => {
  if (!createdAt) return 0
  const created = new Date(createdAt).getTime()
  const now = new Date().getTime()
  const diffHours = (now - created) / (1000 * 60 * 60)
  return Math.max(0, Math.round(diffHours * 10) / 10)
}

const formatDate = (dateString?: string) => {
  if (!dateString) return 'Just now'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Recently'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date)
}

// Fetch Feedback items from API
const fetchFeedbacks = async () => {
  if (!cachedFeedbacks.value || cachedFeedbacks.value.length === 0) {
    isLoading.value = true
  }
  try {
    const res = await api.get<any>('/feedbacks')
    const rawData = Array.isArray(res.data) ? res.data : (res.data?.data || [])
    const items = Array.isArray(rawData) ? rawData : []
    feedbacks.value = items
    cachedFeedbacks.value = [...items]
  } catch (err: any) {
    console.error('Failed to fetch feedbacks:', err)
    showToast(err.response?.data?.message || 'Failed to load feedbacks.', 'danger')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchFeedbacks()
  unsubscribeApprovalUpdates = notifStore.onApprovalUpdate(() => {
    fetchFeedbacks()
  })
})

onUnmounted(() => {
  if (unsubscribeApprovalUpdates) {
    unsubscribeApprovalUpdates()
  }
})

// KPI Computations
const totalCount = computed(() => feedbacks.value.length)
const pendingCount = computed(() => feedbacks.value.filter((f) => getNormalizedStatus(f) === 'Pending').length)
const reviewedCount = computed(() => feedbacks.value.filter((f) => getNormalizedStatus(f) === 'Reviewed').length)
const resolvedCount = computed(() => feedbacks.value.filter((f) => getNormalizedStatus(f) === 'Resolved').length)

const averageRating = computed(() => {
  if (feedbacks.value.length === 0) return '0.0'
  const sum = feedbacks.value.reduce((acc, curr) => acc + (curr.rating || 0), 0)
  return (sum / feedbacks.value.length).toFixed(1)
})

// Filtering logic
const filteredFeedbacks = computed(() => {
  return feedbacks.value.filter((item) => {
    const q = searchQuery.value.toLowerCase().trim()
    const matchesSearch =
      !q ||
      getMessageText(item).toLowerCase().includes(q) ||
      getUserName(item).toLowerCase().includes(q) ||
      getUserEmail(item).toLowerCase().includes(q)

    const normCat = getNormalizedCategory(item.category)
    const matchesCategory = selectedCategory.value === 'All' || normCat === selectedCategory.value

    const normStat = getNormalizedStatus(item)
    const matchesStatus = selectedStatus.value === 'All' || normStat === selectedStatus.value

    const matchesRating = selectedRating.value === 'All' || item.rating === selectedRating.value

    return matchesSearch && matchesCategory && matchesStatus && matchesRating
  })
})

const paginatedFeedbacks = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredFeedbacks.value.slice(start, end)
})

watch([searchQuery, selectedCategory, selectedStatus, selectedRating, itemsPerPage], () => {
  currentPage.value = 1
})

const openDetailModal = (item: FeedbackItem) => {
  activeFeedback.value = item
  editStatus.value = getNormalizedStatus(item)
  replyMessage.value = ''
  markAsResolved.value = true
  isDetailModalOpen.value = true
}

const closeDetailModal = () => {
  isDetailModalOpen.value = false
  activeFeedback.value = null
  replyMessage.value = ''
}

const handleSendReply = async () => {
  if (!activeFeedback.value) return

  isSendingReply.value = true
  const targetId = activeFeedback.value.id
  const targetStatus = markAsResolved.value ? 'Resolved' : editStatus.value

  try {
    await api.post(`/feedbacks/${targetId}/reply`, {
      replyMessage: replyMessage.value.trim() || undefined,
      status: targetStatus === 'Resolved' ? 3 : targetStatus === 'Reviewed' ? 2 : 1
    })

    showToast('Reply dispatched and notification email sent to user!', 'success')
    closeDetailModal()
    await fetchFeedbacks()
  } catch (err: any) {
    console.error('Failed to submit reply:', err)
    showToast(err.response?.data?.message || 'Failed to dispatch reply.', 'danger')
  } finally {
    isSendingReply.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-6 w-full">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight m-0">
          Feedback & Inquiries
        </h1>
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 mb-0 max-w-2xl">
          Track user ratings, manage app improvement inquiries, and send thank-you responses.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <UiButton
          variant="secondary"
          size="md"
          :loading="isLoading"
          @click="fetchFeedbacks"
          title="Refresh Feedbacks"
        >
          <template #icon>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </template>
          Refresh
        </UiButton>
      </div>
    </div>

    <!-- Stats Grid Component -->
    <FeedbackStats
      :is-loading="isLoading"
      :total-count="totalCount"
      :pending-count="pendingCount"
      :reviewed-count="reviewedCount"
      :resolved-count="resolvedCount"
      :average-rating="averageRating"
    />

    <!-- Filters Bar Component -->
    <FeedbackFilters
      v-model:search-query="searchQuery"
      v-model:selected-category="selectedCategory"
      v-model:selected-status="selectedStatus"
      v-model:selected-rating="selectedRating"
    />

    <!-- Data Table Container -->
    <UiCard custom-class="p-0 overflow-hidden">
      <UiTable
        :columns="feedColumns"
        :data="paginatedFeedbacks"
        :is-loading="isLoading"
        empty-text="No user feedback matches your current search and filter criteria."
      >
        <template #cell-user="{ item }">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
              {{ getInitials(getUserName(item), getUserEmail(item)) }}
            </div>
            <div class="flex flex-col min-w-0">
              <span class="font-semibold text-slate-900 dark:text-white text-xs">{{ getUserName(item) }}</span>
              <span class="text-[11px] text-slate-500 dark:text-slate-400">{{ getUserEmail(item) }}</span>
            </div>
          </div>
        </template>

        <template #cell-category="{ item }">
          <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {{ getNormalizedCategory(item.category) }}
          </span>
        </template>

        <template #cell-rating="{ item }">
          <div class="flex items-center gap-1 text-amber-400 text-xs">
            <span v-for="star in 5" :key="star" :class="star <= (item.rating || 0) ? 'opacity-100' : 'opacity-30'">
              ★
            </span>
            <span class="text-slate-400 text-[11px] ml-1">({{ item.rating }})</span>
          </div>
        </template>

        <template #cell-message="{ item }">
          <div class="flex flex-col gap-1 max-w-sm">
            <p class="text-xs text-slate-700 dark:text-slate-300 truncate m-0" :title="getMessageText(item)">
              {{ getMessageText(item) }}
            </p>
            <span v-if="item.adminReplyMessage" class="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
              💬 Replied: "{{ item.adminReplyMessage }}"
            </span>
          </div>
        </template>

        <template #cell-sla="{ item }">
          <div class="flex flex-col">
            <span class="font-semibold text-slate-900 dark:text-white text-xs">{{ formatDate(item.createdAt) }}</span>
            <span class="text-[10.5px] font-semibold" :class="getHoursElapsed(item.createdAt) <= 24 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
              ⏱ {{ getHoursElapsed(item.createdAt) }}h ago
            </span>
          </div>
        </template>

        <template #cell-status="{ item }">
          <UiStatusText
            :variant="getNormalizedStatus(item) === 'Resolved' ? 'success' : getNormalizedStatus(item) === 'Reviewed' ? 'info' : 'warning'"
            size="xs"
          >
            {{ getNormalizedStatus(item) }}
          </UiStatusText>
        </template>

        <template #cell-actions="{ item }">
          <button
            type="button"
            class="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors cursor-pointer border-none"
            @click="openDetailModal(item)"
          >
            Inspect & Reply
          </button>
        </template>
      </UiTable>

      <TablePagination
        v-model:current-page="currentPage"
        v-model:items-per-page="itemsPerPage"
        :total-items="filteredFeedbacks.length"
      />
    </UiCard>

    <!-- Inspection & Reply Modal Component -->
    <FeedbackDetailModal
      :is-open="isDetailModalOpen"
      :feedback="activeFeedback"
      :status="editStatus"
      :reply-message="replyMessage"
      :mark-as-resolved="markAsResolved"
      :is-sending-reply="isSendingReply"
      @update:status="editStatus = $event"
      @update:reply-message="replyMessage = $event"
      @update:mark-as-resolved="markAsResolved = $event"
      @close="closeDetailModal"
      @send-reply="handleSendReply"
    />

    <!-- Toast Notifications -->
    <div class="fixed bottom-7 right-7 z-50 flex flex-col gap-2.5 pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="px-4.5 py-3 rounded-xl text-sm font-semibold backdrop-blur-md shadow-lg pointer-events-auto max-w-xs transition-all"
          :class="[
            toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
          ]"
        >
          {{ toast.message }}
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>
