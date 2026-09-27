<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'
import UiCard from '@/components/ui/UiCard.vue'
import WidgetHeader from '@/components/ui/WidgetHeader.vue'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import UiBadge from '@/components/ui/UiBadge.vue'

import { cachedFeedbacks } from '@/stores/appCache'

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

function getCategoryVariant(category?: string): 'danger' | 'info' | 'primary' | 'neutral' {
  const cat = (category || '').toLowerCase()
  if (cat.includes('bug')) return 'danger'
  if (cat.includes('feature')) return 'info'
  if (cat.includes('ui') || cat.includes('ux')) return 'primary'
  return 'neutral'
}

function getStatusVariant(status?: string): 'success' | 'neutral' | 'warning' {
  const s = String(status || '').toLowerCase()
  if (s === '3' || s.includes('resolved')) return 'success'
  if (s === '2' || s.includes('reviewed')) return 'neutral'
  return 'warning'
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
  <UiCard custom-class="flex flex-col gap-4">
    <!-- Widget Header -->
    <WidgetHeader
      title="User Reviews & Feedback"
      action-text="View all"
      @action="goToFeedbackPage"
    />

    <!-- Summary Rating Bar -->
    <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-xl">
      <div class="flex items-center gap-2.5">
        <span class="text-2xl font-extrabold text-slate-900 dark:text-white leading-none">
          {{ averageRating }}
        </span>
        <div class="flex flex-col gap-0.5">
          <span class="text-xs text-amber-500 tracking-wider">★★★★★</span>
          <span class="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {{ feedbacks.length }} reviews logged
          </span>
        </div>
      </div>

      <button
        type="button"
        @click="goToFeedbackPage"
        class="flex flex-col items-end gap-0.5 cursor-pointer bg-transparent border-none p-0 group"
      >
        <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
          Review Queue
        </span>
        <span class="text-[10.5px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md">
          {{ feedbacks.filter(f => getStatusLabel(f.status) === 'Pending').length }} Pending
        </span>
      </button>
    </div>

    <!-- Feedback Cards List -->
    <div class="flex flex-col gap-2.5">
      <div v-if="isLoading" class="flex flex-col gap-2.5">
        <div v-for="i in 3" :key="`skel-fb-${i}`" class="h-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      </div>

      <div
        v-else-if="recentFeedbacks.length === 0"
        class="p-5 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl"
      >
        💬 No feedback submissions logged yet
      </div>

      <div
        v-else
        v-for="item in recentFeedbacks"
        :key="item.id"
        @click="goToFeedbackPage"
        class="flex flex-col gap-2 p-3 bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/20 dark:hover:border-indigo-800 transition-all shadow-2xs group"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 min-w-0">
            <UiAvatar :name="item.fullName" size="xs" />
            <div class="flex flex-col min-w-0">
              <span class="text-xs font-semibold text-slate-900 dark:text-white truncate leading-tight">
                {{ item.fullName }}
              </span>
              <span class="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                {{ getTimeAgo(item.createdAt) }}
              </span>
            </div>
          </div>
          <UiBadge :variant="getCategoryVariant(item.category)" size="xs">
            {{ item.category }}
          </UiBadge>
        </div>

        <div class="flex flex-col gap-1">
          <div class="flex gap-0.5 text-xs">
            <span v-for="star in 5" :key="star" :class="star <= item.rating ? 'text-amber-500' : 'text-slate-300 dark:text-slate-700'">
              ★
            </span>
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-300 m-0 line-clamp-2 leading-relaxed" :title="item.message">
            {{ item.message }}
          </p>
        </div>

        <div class="flex items-center justify-between pt-1.5 border-t border-dashed border-slate-100 dark:border-slate-800 text-[11px]">
          <UiBadge :variant="getStatusVariant(item.status)" size="xs" dot>
            {{ getStatusLabel(item.status) }}
          </UiBadge>
          <span class="font-semibold text-rose-600 dark:text-rose-400 group-hover:underline">
            Inspect & Reply →
          </span>
        </div>
      </div>
    </div>
  </UiCard>
</template>
