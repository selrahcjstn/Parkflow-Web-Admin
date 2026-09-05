<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { FeedbackItem, FeedbackStatus } from '../types'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import api from '@/api/axios'

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

// State
const feedbacks = ref<FeedbackItem[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const selectedCategory = ref('All')
const selectedStatus = ref<string>('All')
const selectedRating = ref<number | 'All'>('All')

// Modal state
const isDetailModalOpen = ref(false)
const activeFeedback = ref<FeedbackItem | null>(null)
const editStatus = ref<FeedbackStatus>('Pending')
const editAdminNotes = ref('')
const isSaving = ref(false)

// Reply & Invoice Form state
const replyMessage = ref('')
const shouldIssueInvoice = ref(false)
const invoiceAmount = ref<number | null>(null)
const invoiceDescription = ref('')
const markAsResolved = ref(true)
const isSendingReply = ref(false)

const categories = ['All', 'Bug Report', 'Feature Request', 'UI/UX', 'General']
const statuses = ['All', 'Pending', 'Reviewed', 'Resolved']

// Helpers for normalizing backend fields
const getUserName = (f: FeedbackItem) => f.fullName || f.userFullName || 'Anonymous User'
const getUserEmail = (f: FeedbackItem) => f.email || f.userEmail || 'N/A'
const getMessageText = (f: FeedbackItem) => f.description || f.message || ''

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

// Calculate hours elapsed since submission
const getHoursElapsed = (createdAt?: string) => {
  if (!createdAt) return 0
  const created = new Date(createdAt).getTime()
  const now = new Date().getTime()
  const diffHours = (now - created) / (1000 * 60 * 60)
  return Math.max(0, Math.round(diffHours * 10) / 10)
}

// Fetch Feedback items from API
const fetchFeedbacks = async () => {
  isLoading.value = true
  try {
    const res = await api.get<any>('/feedbacks')
    const rawData = Array.isArray(res.data) ? res.data : (res.data?.data || [])
    feedbacks.value = Array.isArray(rawData) ? rawData : []
  } catch (err: any) {
    console.error('Failed to fetch feedbacks:', err)
    showToast(err.response?.data?.message || 'Failed to load feedbacks.', 'danger')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchFeedbacks()
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

// Filtering
const filteredFeedbacks = computed(() => {
  return feedbacks.value.filter((f) => {
    // Category match
    if (selectedCategory.value !== 'All') {
      const normCat = getNormalizedCategory(f.category)
      if (normCat !== selectedCategory.value) return false
    }

    // Status match
    if (selectedStatus.value !== 'All') {
      const normStatus = getNormalizedStatus(f)
      if (normStatus !== selectedStatus.value) return false
    }

    // Rating match
    if (selectedRating.value !== 'All' && f.rating !== Number(selectedRating.value)) {
      return false
    }

    // Search query match
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      const name = getUserName(f).toLowerCase()
      const email = getUserEmail(f).toLowerCase()
      const msg = getMessageText(f).toLowerCase()
      const cat = getNormalizedCategory(f.category).toLowerCase()
      if (!name.includes(q) && !email.includes(q) && !msg.includes(q) && !cat.includes(q)) {
        return false
      }
    }
    return true
  })
})

// Open Inspection Modal
const openDetailModal = (item: FeedbackItem) => {
  activeFeedback.value = item
  editStatus.value = getNormalizedStatus(item)
  editAdminNotes.value = item.adminNotes || ''
  
  // Reset reply/invoice fields
  replyMessage.value = item.adminReplyMessage || ''
  shouldIssueInvoice.value = Boolean(item.invoiceNumber || (item.invoiceAmount && item.invoiceAmount > 0))
  invoiceAmount.value = item.invoiceAmount || null
  invoiceDescription.value = item.invoiceDescription || ''
  markAsResolved.value = getNormalizedStatus(item) === 'Resolved'

  isDetailModalOpen.value = true
}

const closeDetailModal = () => {
  isDetailModalOpen.value = false
  activeFeedback.value = null
}

// Send Admin Reply & Email User
const handleSendReply = async () => {
  const current = activeFeedback.value
  if (!current) return
  if (!replyMessage.value.trim()) {
    showToast('Please type a response / thank you message.', 'warning')
    return
  }

  isSendingReply.value = true
  try {
    const payload = {
      replyMessage: replyMessage.value.trim(),
      markResolved: markAsResolved.value
    }

    const targetId = current.id
    const res = await api.post(`/feedbacks/${targetId}/reply`, payload)
    const updatedDto = res.data?.data || res.data

    // Update local state
    const index = feedbacks.value.findIndex((f) => f.id === targetId)
    if (index !== -1) {
      const item = feedbacks.value[index]
      if (item) {
        if (updatedDto) {
          feedbacks.value[index] = { ...item, ...updatedDto }
        } else {
          item.adminReplyMessage = payload.replyMessage
          item.adminRepliedAt = new Date().toISOString()
          item.status = payload.markResolved ? 'Resolved' : 'Reviewed'
          item.statusName = payload.markResolved ? 'Resolved' : 'Reviewed'
        }
      }
    }

    showToast('Reply and automated email sent successfully to user!', 'success')
    closeDetailModal()
  } catch (err: any) {
    console.error('Failed to send reply:', err)
    showToast(err.response?.data?.message || 'Failed to send reply to user.', 'danger')
  } finally {
    isSendingReply.value = false
  }
}

// Update Status API Call
const handleUpdateStatus = async () => {
  const current = activeFeedback.value
  if (!current) return
  isSaving.value = true

  try {
    const payload = {
      status: editStatus.value,
      adminNotes: editAdminNotes.value
    }
    await api.put(`/feedbacks/${current.id}/status`, payload)
    
    // Update local state
    const targetItem = feedbacks.value.find((f) => f.id === current.id)
    if (targetItem) {
      targetItem.status = editStatus.value
      targetItem.statusName = editStatus.value
      targetItem.adminNotes = editAdminNotes.value
      targetItem.updatedAt = new Date().toISOString()
    }

    showToast('Feedback status updated successfully!', 'success')
    closeDetailModal()
  } catch (err: any) {
    console.error('Failed to update feedback status:', err)
    showToast(err.response?.data?.message || 'Failed to update feedback status.', 'danger')
  } finally {
    isSaving.value = false
  }
}

// Helpers
const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'N/A'
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  } catch {
    return dateStr
  }
}

const getInitials = (name?: string, email?: string) => {
  const target = name || email || 'User'
  const parts = target.trim().split(' ')
  const p0 = parts[0]
  const p1 = parts[1]
  if (parts.length >= 2 && p0 && p1 && p0[0] && p1[0]) {
    return (p0[0] + p1[0]).toUpperCase()
  }
  return target.slice(0, 2).toUpperCase()
}

const getCategoryBadgeClass = (category?: string) => {
  const norm = getNormalizedCategory(category)
  switch (norm) {
    case 'Bug Report':
      return 'badge-bug'
    case 'Feature Request':
      return 'badge-feature'
    case 'UI/UX':
      return 'badge-ui'
    default:
      return 'badge-general'
  }
}

const getStatusBadgeClass = (status?: FeedbackStatus) => {
  switch (status) {
    case 'Resolved':
      return 'status-resolved'
    case 'Reviewed':
      return 'status-reviewed'
    default:
      return 'status-pending'
  }
}
</script>

<template>
  <div class="feedback-page">
    <!-- Toast Notifications -->
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div v-for="t in toasts" :key="t.id" class="toast-item" :class="`toast-${t.type}`">
          <span>{{ t.message }}</span>
        </div>
      </TransitionGroup>
    </div>

    <!-- Header Section -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">Feedback & Suggestions</h1>
        <p class="page-subtitle">Review user inquiries, issue response thank-you notes, and generate invoices.</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="fetchFeedbacks" :disabled="isLoading">
          <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          Refresh Data
        </button>
      </div>
    </div>

    <!-- KPI Summary Cards -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon-wrap kpi-blue">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <div class="kpi-content">
          <span class="kpi-label">Total Submissions</span>
          <span class="kpi-value">{{ totalCount }}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-wrap kpi-gold">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        </div>
        <div class="kpi-content">
          <span class="kpi-label">Average Rating</span>
          <span class="kpi-value">{{ averageRating }} <span class="kpi-sub">/ 5.0</span></span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-wrap kpi-amber">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        <div class="kpi-content">
          <span class="kpi-label">Pending Inquiry SLA</span>
          <span class="kpi-value text-amber">{{ pendingCount }}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-wrap kpi-green">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <div class="kpi-content">
          <span class="kpi-label">Resolved Items</span>
          <span class="kpi-value text-green">{{ resolvedCount }}</span>
        </div>
      </div>
    </div>

    <!-- Filters & Search Section -->
    <div class="filter-card">
      <div class="filter-row">
        <!-- Search input -->
        <div class="search-wrap">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by user name, email, feedback content..."
            class="search-input"
          />
          <button v-if="searchQuery" @click="searchQuery = ''" class="search-clear">✕</button>
        </div>

        <!-- Select Filters -->
        <div class="select-group">
          <!-- Status Dropdown -->
          <div class="select-wrap">
            <label class="select-label">Status</label>
            <select v-model="selectedStatus" class="custom-select">
              <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>

          <!-- Rating Dropdown -->
          <div class="select-wrap">
            <label class="select-label">Rating</label>
            <select v-model="selectedRating" class="custom-select">
              <option value="All">All Ratings</option>
              <option :value="5">5 Stars ★★★★★</option>
              <option :value="4">4 Stars ★★★★☆</option>
              <option :value="3">3 Stars ★★★☆☆</option>
              <option :value="2">2 Stars ★★☆☆☆</option>
              <option :value="1">1 Star ★☆☆☆☆</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Category Tabs -->
      <div class="category-tabs">
        <button
          v-for="cat in categories"
          :key="cat"
          class="cat-tab"
          :class="{ active: selectedCategory === cat }"
          @click="selectedCategory = cat"
        >
          {{ cat }}
        </button>
      </div>
    </div>

    <!-- Data Table Container -->
    <div class="table-card">
      <div v-if="isLoading" class="p-6">
        <SkeletonLoader :count="5" />
      </div>

      <div v-else-if="filteredFeedbacks.length === 0" class="empty-state">
        <div class="empty-icon">💬</div>
        <h3>No Feedback Submissions Found</h3>
        <p>No user feedback matches your current search and filter criteria.</p>
      </div>

      <div v-else class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>User / Applicant</th>
              <th>Category</th>
              <th>Rating</th>
              <th>Feedback Message</th>
              <th>Inquiry SLA</th>
              <th>Status</th>
              <th class="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredFeedbacks" :key="item.id" class="table-row">
              <!-- User -->
              <td>
                <div class="user-cell">
                  <div class="avatar-circle">
                    {{ getInitials(getUserName(item), getUserEmail(item)) }}
                  </div>
                  <div class="user-details">
                    <span class="user-name">{{ getUserName(item) }}</span>
                    <span class="user-email">{{ getUserEmail(item) }}</span>
                  </div>
                </div>
              </td>

              <!-- Category -->
              <td>
                <span class="category-badge" :class="getCategoryBadgeClass(item.category)">
                  {{ getNormalizedCategory(item.category) }}
                </span>
              </td>

              <!-- Rating -->
              <td>
                <div class="stars-wrap">
                  <span v-for="star in 5" :key="star" class="star" :class="{ filled: star <= item.rating }">
                    ★
                  </span>
                  <span class="rating-num">({{ item.rating }})</span>
                </div>
              </td>

              <!-- Message preview -->
              <td class="message-cell">
                <p class="message-text" :title="getMessageText(item)">{{ getMessageText(item) }}</p>
                <span v-if="item.adminReplyMessage" class="reply-tag">
                  💬 Replied: "{{ item.adminReplyMessage }}"
                </span>
                <span v-if="item.invoiceNumber" class="invoice-tag">
                  📄 Invoice Issued (₱{{ Number(item.invoiceAmount || 0).toFixed(2) }})
                </span>
              </td>

              <!-- Inquiry SLA Timer -->
              <td class="date-cell">
                <div class="sla-wrap">
                  <span class="sla-time">{{ formatDate(item.createdAt) }}</span>
                  <span class="sla-pill" :class="getHoursElapsed(item.createdAt) <= 24 ? 'sla-active' : 'sla-overdue'">
                    ⏱ {{ getHoursElapsed(item.createdAt) }}h ago
                  </span>
                </div>
              </td>

              <!-- Status -->
              <td>
                <span class="status-badge" :class="getStatusBadgeClass(getNormalizedStatus(item))">
                  {{ getNormalizedStatus(item) }}
                </span>
              </td>

              <!-- Action -->
              <td class="text-right">
                <button class="btn btn-sm btn-inspect" @click="openDetailModal(item)">
                  Inspect & Reply
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Inspection & Reply / Invoice Modal -->
    <Transition name="modal-fade">
      <div v-if="isDetailModalOpen && activeFeedback" class="modal-overlay" @click.self="closeDetailModal">
        <div class="modal-card">
          <!-- Modal Header -->
          <div class="modal-header">
            <div>
              <h2 class="modal-title">Inspect Feedback & Answer Inquiry</h2>
              <span class="modal-subtitle">ID: {{ activeFeedback.id }}</span>
            </div>
            <button class="modal-close" @click="closeDetailModal">✕</button>
          </div>

          <!-- Modal Body -->
          <div class="modal-body">
            <!-- Inquiry Response Window SLA Banner -->
            <div class="sla-banner">
              <span class="sla-icon">⏱</span>
              <div>
                <strong>Inquiry Reply Window SLA:</strong> Submitted {{ getHoursElapsed(activeFeedback.createdAt) }} hours ago.
                <span v-if="getHoursElapsed(activeFeedback.createdAt) <= 24" class="text-green-600 font-bold"> (Active SLA Window)</span>
                <span v-else class="text-amber-600 font-bold"> (Follow-up Window)</span>
              </div>
            </div>

            <!-- User Info Bar -->
            <div class="modal-user-bar">
              <div class="avatar-circle large">
                {{ getInitials(getUserName(activeFeedback), getUserEmail(activeFeedback)) }}
              </div>
              <div class="user-meta">
                <h4>{{ getUserName(activeFeedback) }}</h4>
                <p>{{ getUserEmail(activeFeedback) }} &bull; {{ activeFeedback.userRole || 'User' }}</p>
                <span class="modal-date">Submitted on {{ formatDate(activeFeedback.createdAt) }}</span>
              </div>
            </div>

            <!-- Category & Rating Bar -->
            <div class="modal-meta-bar">
              <div class="meta-item">
                <span class="meta-label">Category:</span>
                <span class="category-badge" :class="getCategoryBadgeClass(activeFeedback.category)">
                  {{ getNormalizedCategory(activeFeedback.category) }}
                </span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Rating:</span>
                <div class="stars-wrap">
                  <span v-for="star in 5" :key="star" class="star" :class="{ filled: star <= activeFeedback.rating }">
                    ★
                  </span>
                  <span class="rating-num">({{ activeFeedback.rating }} / 5)</span>
                </div>
              </div>
            </div>

            <!-- Message Block -->
            <div class="section-block">
              <label class="block-label">Feedback Content</label>
              <div class="message-box">
                <p>{{ getMessageText(activeFeedback) }}</p>
              </div>
            </div>

            <!-- Existing Reply & Invoice Display if present -->
            <div v-if="activeFeedback.adminReplyMessage" class="reply-card">
              <div class="reply-header">
                <span>💬 Sent Admin Response</span>
                <span class="reply-date">{{ formatDate(activeFeedback.adminRepliedAt || activeFeedback.createdAt) }}</span>
              </div>
              <p class="reply-body">{{ activeFeedback.adminReplyMessage }}</p>
              
              <div v-if="activeFeedback.invoiceNumber" class="invoice-box">
                <div class="invoice-row">
                  <span class="inv-badge">📄 INVOICE {{ activeFeedback.invoiceNumber }}</span>
                  <span class="inv-amount">₱{{ Number(activeFeedback.invoiceAmount || 0).toFixed(2) }}</span>
                </div>
                <p class="inv-desc">{{ activeFeedback.invoiceDescription || 'Service Fee' }}</p>
              </div>
            </div>

            <hr class="modal-divider" />

            <!-- Send Response & Invoice Form Section -->
            <div class="section-block">
              <label class="block-label">Answer Inquiry & Send Thank You Message</label>
              <textarea
                v-model="replyMessage"
                placeholder="Type your thank you message, inquiry response, or service resolution details to the user..."
                class="admin-notes-textarea"
                rows="3"
              ></textarea>
            </div>

            <!-- Email Notification Info Banner -->
            <div class="email-notice-box">
              <span class="email-notice-icon">📧</span>
              <div class="email-notice-text">
                <strong>Automated Email Notification:</strong> Submitting this response will automatically email <strong>{{ getUserEmail(activeFeedback) }}</strong>. Replies for further inquiries are processed within a few hours.
              </div>
            </div>

            <!-- Mark Resolved Checkbox -->
            <div class="section-block">
              <label class="checkbox-label">
                <input type="checkbox" v-model="markAsResolved" />
                <span class="checkbox-title">Mark Feedback as Resolved</span>
              </label>
            </div>

            <!-- Admin Notes Input -->
            <div class="section-block">
              <label class="block-label">Internal Admin Notes (Private)</label>
              <textarea
                v-model="editAdminNotes"
                placeholder="Add internal notes for security staff..."
                class="admin-notes-textarea"
                rows="2"
              ></textarea>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeDetailModal" :disabled="isSendingReply || isSaving">Cancel</button>
            <button class="btn btn-secondary" @click="handleUpdateStatus" :disabled="isSendingReply || isSaving">Save Status Only</button>
            <button class="btn btn-primary" @click="handleSendReply" :disabled="isSendingReply || isSaving">
              <span v-if="isSendingReply">Sending Email...</span>
              <span v-else>Send Reply & Email User</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.feedback-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Page Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}

.page-title {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text);
  margin: 0;
}

.page-subtitle {
  font-size: 13.5px;
  color: var(--color-muted);
  margin-top: 4px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.kpi-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  padding: 20px;
  box-shadow: var(--shadow-soft);
}

.kpi-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 12px;
  flex-shrink: 0;
}

.kpi-blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.kpi-gold { background: rgba(253, 184, 19, 0.12); color: #fdb813; }
.kpi-amber { background: rgba(245, 158, 11, 0.12); color: #f59e0b; }
.kpi-green { background: rgba(16, 185, 129, 0.12); color: #10b981; }

.kpi-content {
  display: flex;
  flex-direction: column;
}

.kpi-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.kpi-value {
  font-size: 22px;
  font-weight: 800;
  color: var(--color-text);
  margin-top: 2px;
}

.kpi-sub {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-muted);
}

/* Filter Card */
.filter-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: var(--shadow-soft);
}

.filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.search-wrap {
  position: relative;
  flex: 1;
  min-width: 280px;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-subtle);
}

.search-input {
  width: 100%;
  height: 42px;
  padding: 0 16px 0 40px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface-muted);
  color: var(--color-text);
  font-size: 13.5px;
  transition: all var(--transition-fast);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: var(--color-surface);
}

.search-clear {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  font-size: 14px;
}

.select-group {
  display: flex;
  gap: 14px;
}

.select-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.select-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-muted);
}

.custom-select {
  height: 42px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 13px;
  cursor: pointer;
}

/* Category Tabs */
.category-tabs {
  display: flex;
  gap: 8px;
  border-top: 1px solid var(--color-border);
  padding-top: 14px;
  overflow-x: auto;
}

.cat-tab {
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-border);
  background: var(--color-surface-muted);
  color: var(--color-muted);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition-fast);
}

.cat-tab.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #ffffff;
}

/* Table Card */
.table-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
  overflow: hidden;
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.data-table th {
  padding: 14px 18px;
  background: var(--color-surface-muted);
  color: var(--color-muted);
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  border-bottom: 1px solid var(--color-border);
}

.data-table td {
  padding: 16px 18px;
  border-bottom: 1px solid var(--color-border);
  font-size: 13px;
  color: var(--color-text);
}

.table-row:hover {
  background: var(--color-primary-lighter);
}

/* Cell Styles */
.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), #fb7185);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.avatar-circle.large {
  width: 48px;
  height: 48px;
  font-size: 16px;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 700;
  color: var(--color-text);
}

.user-email {
  font-size: 11.5px;
  color: var(--color-muted);
}

/* Category Badges */
.category-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.badge-bug { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
.badge-feature { background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2); }
.badge-ui { background: rgba(168, 85, 247, 0.1); color: #a855f7; border: 1px solid rgba(168, 85, 247, 0.2); }
.badge-general { background: rgba(100, 116, 139, 0.1); color: #64748b; border: 1px solid rgba(100, 116, 139, 0.2); }

/* Stars Rating */
.stars-wrap {
  display: flex;
  align-items: center;
  gap: 2px;
}

.star {
  font-size: 15px;
  color: var(--color-border);
}

.star.filled {
  color: #fdb813;
}

.rating-num {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--color-muted);
  margin-left: 4px;
}

/* Message Cell */
.message-cell {
  max-width: 320px;
}

.message-text {
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
  color: var(--color-text-secondary);
}

.reply-tag {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #2563eb;
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.invoice-tag {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #059669;
  margin-top: 2px;
}

.date-cell {
  white-space: nowrap;
  color: var(--color-muted);
  font-size: 12px;
}

.sla-wrap {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.sla-time { font-size: 11.5px; color: var(--color-muted); }
.sla-pill {
  display: inline-block;
  padding: 2px 7px;
  border-radius: var(--radius-pill);
  font-size: 10.5px;
  font-weight: 700;
}
.sla-active { background: rgba(16, 185, 129, 0.12); color: #059669; }
.sla-overdue { background: rgba(245, 158, 11, 0.12); color: #d97706; }

/* Status Badges */
.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-size: 11.5px;
  font-weight: 700;
}

.status-pending { background: rgba(245, 158, 11, 0.12); color: #d97706; }
.status-reviewed { background: rgba(59, 130, 246, 0.12); color: #2563eb; }
.status-resolved { background: rgba(16, 185, 129, 0.12); color: #059669; }

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 40px;
  padding: 0 16px;
  border-radius: var(--radius-button);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all var(--transition-fast);
}

.btn-primary { background: var(--color-primary); color: #ffffff; }
.btn-primary:hover { background: var(--color-primary-hover); }

.btn-secondary { background: var(--color-surface-muted); color: var(--color-text); border: 1px solid var(--color-border); }
.btn-secondary:hover { background: var(--color-border); }

.btn-inspect {
  background: var(--color-primary-light);
  color: var(--color-primary);
  border: 1px solid rgba(210, 39, 48, 0.2);
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 12px;
}
.btn-inspect:hover {
  background: var(--color-primary);
  color: #ffffff;
}

.text-right { text-align: right; }
.text-amber { color: #f59e0b; }
.text-green { color: #10b981; }

/* Empty state */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--color-muted);
}
.empty-icon { font-size: 42px; margin-bottom: 12px; }
.empty-state h3 { font-size: 18px; color: var(--color-text); margin-bottom: 6px; }

/* Modal Styling */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: var(--color-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
  backdrop-filter: blur(4px);
}

.modal-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  width: 100%;
  max-width: 620px;
  box-shadow: var(--shadow-modal);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
}

.modal-title { font-size: 18px; font-weight: 800; color: var(--color-text); margin: 0; }
.modal-subtitle { font-size: 11px; color: var(--color-muted); }
.modal-close { background: none; border: none; font-size: 18px; color: var(--color-muted); cursor: pointer; }

.modal-body {
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.sla-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 12.5px;
  color: var(--color-text);
}

.sla-icon { font-size: 16px; }

.modal-user-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--color-surface-muted);
  padding: 16px;
  border-radius: 12px;
}

.user-meta h4 { font-size: 15px; font-weight: 700; color: var(--color-text); margin: 0; }
.user-meta p { font-size: 12px; color: var(--color-muted); margin: 2px 0; }
.modal-date { font-size: 11px; color: var(--color-subtle); }

.modal-meta-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.meta-item { display: flex; align-items: center; gap: 8px; }
.meta-label { font-size: 12px; font-weight: 700; color: var(--color-muted); }

.section-block { display: flex; flex-direction: column; gap: 8px; }
.block-label { font-size: 12px; font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }

.message-box {
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 14px;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--color-text);
}

.reply-card {
  background: rgba(16, 185, 129, 0.06);
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 14px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reply-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 700;
  color: #059669;
}

.reply-date { font-size: 11px; font-weight: 500; color: var(--color-muted); }
.reply-body { font-size: 13px; color: var(--color-text); margin: 0; line-height: 1.4; }

.invoice-box {
  background: var(--color-surface);
  border: 1px dashed #10b981;
  border-radius: 10px;
  padding: 10px 12px;
  margin-top: 4px;
}

.invoice-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 800;
  font-size: 13px;
}

.inv-badge { color: #059669; }
.inv-amount { color: var(--color-primary); font-size: 14px; }
.inv-desc { font-size: 11.5px; color: var(--color-muted); margin: 4px 0 0; }

.modal-divider { border: 0; border-top: 1px solid var(--color-border); margin: 4px 0; }

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.checkbox-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text);
}

.invoice-form-group {
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 14px;
  margin-top: 4px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.flex-2 { flex: 2; }

.admin-notes-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
}
.admin-notes-textarea:focus { outline: none; border-color: var(--color-primary); }

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

/* Toast styling */
.toast-container {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toast-item {
  padding: 12px 18px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  box-shadow: var(--shadow-card);
}
.toast-success { background: #10b981; }
.toast-danger { background: #ef4444; }
.toast-warning { background: #f59e0b; }
.toast-info { background: #3b82f6; }

/* Email Notice Card */
.email-notice-box {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: 10px;
  padding: 12px 14px;
  margin-top: 10px;
  margin-bottom: 16px;
}

.email-notice-icon {
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 1px;
}

.email-notice-text {
  font-size: 13px;
  color: var(--color-text);
  line-height: 1.5;
}

.email-notice-text strong {
  color: #2563eb;
}

/* Transitions */
.toast-enter-active, .toast-leave-active { transition: all 300ms ease; }
.toast-enter-from { opacity: 0; transform: translateY(-10px); }
.toast-leave-to { opacity: 0; transform: translateX(20px); }

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 250ms ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>
