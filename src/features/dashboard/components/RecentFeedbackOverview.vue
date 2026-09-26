<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'

import { cachedFeedbacks } from '../dashboardCache'

const router = useRouter()
const isLoading = ref(!cachedFeedbacks.value)

interface FeedbackOverviewItem {
  id: string
  fullName: string
  email: string
  category: string
  rating: number
  message: string
  createdAt: string
  status: string
}

const feedbacks = ref<FeedbackOverviewItem[]>(cachedFeedbacks.value || [])

const averageRating = computed(() => {
  if (feedbacks.value.length === 0) return '4.8'
  const sum = feedbacks.value.reduce((acc, curr) => acc + (curr.rating || 0), 0)
  return (sum / feedbacks.value.length).toFixed(1)
})

const recentFeedbacks = computed(() => {
  return feedbacks.value.slice(0, 3)
})

function getInitials(name?: string): string {
  if (!name) return 'U'
  const parts = name.trim().split(' ')
  const p0 = parts[0]
  const p1 = parts[1]
  if (parts.length >= 2 && p0 && p1 && p0[0] && p1[0]) {
    return (p0[0] + p1[0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function getCategoryBadgeClass(category?: string): string {
  const cat = (category || '').toLowerCase()
  if (cat.includes('bug')) return 'badge-bug'
  if (cat.includes('feature')) return 'badge-feature'
  if (cat.includes('ui') || cat.includes('ux')) return 'badge-ui'
  return 'badge-general'
}

function getStatusBadgeClass(status?: string): string {
  const s = String(status || '').toLowerCase()
  if (s === '3' || s.includes('resolved')) return 'status-resolved'
  if (s === '2' || s.includes('reviewed')) return 'status-reviewed'
  return 'status-pending'
}

function getStatusLabel(status?: string): string {
  const s = String(status || '').toLowerCase()
  if (s === '3' || s.includes('resolved')) return 'Resolved'
  if (s === '2' || s.includes('reviewed')) return 'Reviewed'
  return 'Pending'
}

function getTimeAgo(dateStr?: string): string {
  if (!dateStr) return 'Recently'
  try {
    const created = new Date(dateStr).getTime()
    const now = new Date().getTime()
    const diffHours = (now - created) / (1000 * 60 * 60)
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${Math.round(diffHours)}h ago`
    const diffDays = Math.round(diffHours / 24)
    return `${diffDays}d ago`
  } catch {
    return 'Recently'
  }
}

onMounted(async () => {
  if (!cachedFeedbacks.value) {
    isLoading.value = true
  }
  try {
    const res = await api.get('/feedbacks')
    const rawData = Array.isArray(res.data) ? res.data : (res.data?.data || [])
    if (Array.isArray(rawData) && rawData.length > 0) {
      const mapped = rawData.map((item: any) => ({
        id: item.id || Math.random().toString(),
        fullName: item.fullName || item.userFullName || 'Campus Driver',
        email: item.email || item.userEmail || '',
        category: item.category || 'General',
        rating: item.rating || 5,
        message: item.description || item.message || '',
        createdAt: item.createdAt || new Date().toISOString(),
        status: item.statusName || item.status || 'Pending'
      }))
      feedbacks.value = mapped
      cachedFeedbacks.value = mapped
    } else {
      populateMockFeedbacks()
    }
  } catch (err) {
    populateMockFeedbacks()
  } finally {
    isLoading.value = false
  }
})

function populateMockFeedbacks() {
  feedbacks.value = [
    {
      id: 'fb-1',
      fullName: 'Marcus Vance',
      email: 'm.vance@bulsu.edu.ph',
      category: 'UI/UX',
      rating: 5,
      message: 'The QR entry verification at Gate 2 is super fast now. Great improvement on mobile responsiveness!',
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      status: 'Reviewed'
    },
    {
      id: 'fb-2',
      fullName: 'Clarisse Santos',
      email: 'csantos@bulsu.edu.ph',
      category: 'Feature Request',
      rating: 5,
      message: 'Would love an automatic notification 15 mins before my schedule grace period ends.',
      createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
      status: 'Pending'
    },
    {
      id: 'fb-3',
      fullName: 'Engr. David Reyes',
      email: 'dreyes@bulsu.edu.ph',
      category: 'General',
      rating: 4,
      message: 'Very smooth parking reservation workflow for faculty events this semester.',
      createdAt: new Date(Date.now() - 3600000 * 42).toISOString(),
      status: 'Resolved'
    }
  ]
}

function goToFeedbackPage() {
  router.push('/feedback')
}
</script>

<template>
  <div class="feedback-overview-widget">
    <!-- Header Row -->
    <div class="widget-header">
      <div class="title-wrap">
        <h3 class="widget-title">User Reviews & Feedback</h3>
      </div>
      <button class="see-all-btn" @click="goToFeedbackPage">
        View all →
      </button>
    </div>

    <!-- Rating Summary Bar -->
    <div class="summary-bar">
      <div class="summary-left">
        <span class="summary-score">{{ averageRating }}</span>
        <div class="stars-row">
          <span class="star-icon">★★★★★</span>
          <span class="summary-count">{{ feedbacks.length }} reviews logged</span>
        </div>
      </div>
      <div class="summary-action" @click="goToFeedbackPage">
        <span class="action-text">Review Queue</span>
        <span class="action-count">{{ feedbacks.filter(f => getStatusLabel(f.status) === 'Pending').length }} Pending</span>
      </div>
    </div>

    <!-- Feedback List -->
    <div class="feedback-list">
      <div v-if="isLoading" class="loading-placeholder">
        <div class="skel-row" v-for="i in 3" :key="`skel-fb-${i}`" />
      </div>

      <div v-else-if="recentFeedbacks.length === 0" class="empty-state">
        <span>💬 No feedback submissions logged yet</span>
      </div>

      <div
        v-else
        v-for="item in recentFeedbacks"
        :key="item.id"
        class="feedback-card"
        @click="goToFeedbackPage"
      >
        <div class="card-header-row">
          <div class="user-meta">
            <div class="user-avatar">{{ getInitials(item.fullName) }}</div>
            <div class="user-text">
              <span class="user-name">{{ item.fullName }}</span>
              <span class="user-time">{{ getTimeAgo(item.createdAt) }}</span>
            </div>
          </div>
          <span class="category-tag" :class="getCategoryBadgeClass(item.category)">
            {{ item.category }}
          </span>
        </div>

        <div class="card-body-row">
          <div class="stars-inline">
            <span v-for="star in 5" :key="star" class="star" :class="{ filled: star <= item.rating }">★</span>
          </div>
          <p class="message-snippet" :title="item.message">{{ item.message }}</p>
        </div>

        <div class="card-footer-row">
          <span class="status-pill" :class="getStatusBadgeClass(item.status)">
            {{ getStatusLabel(item.status) }}
          </span>
          <span class="inspect-link">Inspect & Reply →</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.feedback-overview-widget {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: none !important;
}

/* Header */
.widget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.widget-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  letter-spacing: -0.2px;
}

.rating-badge {
  font-size: 11px;
  font-weight: 700;
  color: #D22730;
  background: rgba(210, 39, 48, 0.08);
  border: 1px solid rgba(210, 39, 48, 0.2);
  padding: 2px 7px;
  border-radius: 6px;
}

.see-all-btn {
  font-size: 12px;
  font-weight: 600;
  color: #D22730;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: opacity var(--transition-fast);
}

.see-all-btn:hover {
  opacity: 0.8;
  text-decoration: underline;
}

/* Summary bar */
.summary-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: var(--color-surface-lighter, #f8f9fb);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 12px;
}

.summary-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.summary-score {
  font-size: 22px;
  font-weight: 800;
  color: var(--color-text);
  line-height: 1;
}

.stars-row {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.star-icon {
  font-size: 11px;
  color: #f59e0b;
  letter-spacing: 1px;
}

.summary-count {
  font-size: 11px;
  color: var(--color-muted);
}

.summary-action {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  cursor: pointer;
}

.action-text {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-muted);
}

.action-count {
  font-size: 10.5px;
  font-weight: 700;
  color: #d97706;
  background: rgba(245, 158, 11, 0.12);
  padding: 1.5px 6px;
  border-radius: 4px;
}

/* Feedback list */
.feedback-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.loading-placeholder {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skel-row {
  height: 90px;
  border-radius: 12px;
  background: var(--color-surface-muted);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 0.3; }
}

.empty-state {
  padding: 20px;
  text-align: center;
  font-size: 12.5px;
  color: var(--color-muted);
  background: var(--color-surface-lighter);
  border-radius: 12px;
}

.feedback-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: #ffffff;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 12px;
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
}

.feedback-card:hover {
  background: #f0f4fe;
  border-color: #818cf8;
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.08);
}

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.user-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #D22730;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  letter-spacing: 0.5px;
}

.user-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.user-name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1;
}

.user-time {
  font-size: 10px;
  color: var(--color-muted);
  line-height: 1;
}

.category-tag {
  font-size: 9.5px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  flex-shrink: 0;
}

.badge-bug { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.badge-feature { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.badge-ui { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
.badge-general { background: rgba(100, 116, 139, 0.1); color: #64748b; }

.card-body-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.stars-inline {
  display: flex;
  gap: 1px;
}

.star {
  font-size: 11px;
  color: #cbd5e1;
}

.star.filled {
  color: #f59e0b;
}

.message-snippet {
  font-size: 12px;
  color: var(--color-text-secondary, #475569);
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 4px;
  border-top: 1px dashed var(--color-border, #e2e8f0);
}

.status-pill {
  font-size: 12px;
  font-weight: 600;
  padding: 0;
}

.status-resolved { background: transparent; color: #059669; }
.status-reviewed { background: transparent; color: #64748b; }
.status-pending { background: transparent; color: #d97706; }

.inspect-link {
  font-size: 11px;
  font-weight: 600;
  color: #D22730;
}
</style>
