<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import StatsCard from '../components/StatsCard.vue'
import ParkingChart from '../components/ParkingChart.vue'
import RecentActivity from '../components/RecentActivity.vue'
import PendingRegistrations from '../components/PendingRegistrations.vue'
import DashboardCalendar from '../components/DashboardCalendar.vue'
import RecentFeedbackOverview from '../components/RecentFeedbackOverview.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import UiButton from '@/components/ui/UiButton.vue'
import api from '@/api/axios'

import { cachedStatsData, cachedActivityData, type DashboardStatsCache } from '@/stores/appCache'

const isLoading = ref(!cachedStatsData.value)
const statsError = ref('')
const isFetching = ref(false)

const formattedDate = computed(() =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date())
)

const statsData = ref<DashboardStatsCache | null>(cachedStatsData.value)

function trend(percent: number | null | undefined, lowerIsBetter = false) {
  if (typeof percent !== 'number' || !Number.isFinite(percent)) {
    return { trend: 'No comparison', trendTone: 'neutral' as const, trendUp: undefined }
  }
  const direction = percent > 0 ? true : percent < 0 ? false : undefined
  return {
    trend: `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`,
    trendUp: direction,
    trendTone: direction === undefined ? 'neutral' as const
      : (lowerIsBetter ? percent < 0 : percent > 0) ? 'positive' as const : 'negative' as const,
  }
}

const stats = computed(() => {
  const data = statsData.value
  if (!data) return []
  const occPercent = data.maxCapacity > 0
    ? (data.activeParking / data.maxCapacity) * 100
    : undefined
  const comparisonLabel = data.trends?.comparisonDate
    ? `Compared with ${data.trends.comparisonDate.slice(0, 10)} (Philippine time). Client and charge counts use yesterday's closing records; revenue uses yesterday's total. No comparison is shown when the previous value is zero and the current value is nonzero, or payment dates are missing.`
    : 'Comparison data is not available. A percentage cannot be calculated against a nonzero value when the previous value is zero.'

  return [
    {
      title: 'Registered Clients',
      value: data.totalUsers.toLocaleString('en-PH'),
      subtitle: 'Client accounts, excluding admins and guards',
      ...trend(data.trends?.registeredClientsPercent),
      trendLabel: comparisonLabel,
      accentColor: 'var(--color-info)',
      badgeBg: 'var(--color-info-bg)'
    },
    {
      title: 'Slot Occupancy',
      value: `${data.activeParking.toLocaleString('en-PH')} / ${data.maxCapacity.toLocaleString('en-PH')}`,
      subtitle: `Cars ${data.carCount ?? 0}/${data.carCapacity ?? 0} · Motorcycles ${data.motorcycleCount ?? 0}/${data.motorcycleCapacity ?? 0}`,
      trend: occPercent === undefined ? 'Capacity not set' : `${occPercent.toFixed(1)}% full`,
      trendLabel: 'Registered and visitor vehicles currently inside divided by total parking capacity.',
      trendTone: 'neutral' as const,
      trendUp: undefined,
      accentColor: 'var(--color-success)',
      badgeBg: 'var(--color-success-bg)',
      progressPercent: occPercent
    },
    {
      title: 'Daily Revenue',
      value: `₱${data.todayRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: "Today's recorded payments (Philippine time)",
      ...trend(data.trends?.revenuePercent),
      trendLabel: comparisonLabel,
      accentColor: 'var(--color-warning)',
      badgeBg: 'var(--color-warning-bg)'
    },
    {
      title: 'Pending Charges',
      value: data.violations.toLocaleString('en-PH'),
      subtitle: 'Unpaid parking charges and citations',
      ...trend(data.trends?.pendingChargesPercent, true),
      trendLabel: comparisonLabel,
      accentColor: 'var(--color-primary)',
      badgeBg: 'var(--color-primary-light)'
    }
  ]
})

const activityData = ref<{ day: string; checkIns: number; checkOuts: number }[]>(cachedActivityData.value || [])

const fetchDashboardStats = async () => {
  if (isFetching.value) return
  isFetching.value = true
  statsError.value = ''
  if (!statsData.value) isLoading.value = true
  try {
    const response = await api.get('/dashboard/summary')
    if (response.data?.isSuccess && response.data?.data) {
      const data = response.data.data
      const counts = [data.totalUsers, data.activeParking, data.maxCapacity, data.violationsCount]
      if (!counts.every(value => Number.isSafeInteger(value) && value >= 0) ||
          typeof data.todayRevenue !== 'number' || !Number.isFinite(data.todayRevenue) || data.todayRevenue < 0) {
        throw new Error('Invalid dashboard metrics')
      }
      const newStats = {
        totalUsers: data.totalUsers,
        activeParking: data.activeParking,
        maxCapacity: data.maxCapacity,
        carCount: data.carCount, motorcycleCount: data.motorcycleCount,
        carCapacity: data.carCapacity, motorcycleCapacity: data.motorcycleCapacity,
        todayRevenue: data.todayRevenue,
        violations: data.violationsCount,
        trends: data.trends
      }
      const newActivity = Array.isArray(data.activityOverLast7Days) ? data.activityOverLast7Days : []

      statsData.value = newStats
      activityData.value = newActivity

      cachedStatsData.value = newStats
      cachedActivityData.value = newActivity
    } else {
      throw new Error('Dashboard metrics could not be loaded')
    }
  } catch (error) {
    console.error('Error loading dashboard stats:', error)
    statsError.value = statsData.value
      ? 'Could not update metrics. Last loaded values are shown.'
      : 'Could not load dashboard metrics. Please try again.'
  } finally {
    isFetching.value = false
    isLoading.value = false
  }
}

onMounted(() => {
  if (!cachedStatsData.value) {
    isLoading.value = true
  }
  fetchDashboardStats()
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Welcome Header -->
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight m-0">
        Welcome back, Admin
      </h1>
      <p class="text-sm font-medium text-slate-500 dark:text-slate-400 m-0">
        {{ formattedDate }}
      </p>
    </div>

    <div v-if="statsError" role="alert" class="flex flex-wrap items-center justify-between gap-3 rounded-card border border-warning/30 bg-warning-bg p-4 text-sm text-text">
      <span>{{ statsError }}</span>
      <UiButton variant="secondary" size="sm" :loading="isFetching" @click="fetchDashboardStats">Retry</UiButton>
    </div>

    <!-- Stats Grid (Full Width Baseline) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <template v-if="isLoading">
        <SkeletonLoader v-for="i in 4" :key="`skel-stat-${i}`" variant="rect" height="148px" />
      </template>
      <template v-else>
        <StatsCard
          v-for="(stat, i) in stats"
          :key="i"
          :title="stat.title"
          :value="stat.value"
          :subtitle="stat.subtitle"
          :trend="stat.trend"
          :trend-up="stat.trendUp"
          :trend-tone="stat.trendTone"
          :trend-label="stat.trendLabel"
          :accent-color="stat.accentColor"
          :badge-bg="stat.badgeBg"
          :progress-percent="stat.progressPercent"
        >
          <template #icon>
            <!-- Registered Clients Icon -->
            <svg v-if="i === 0" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <!-- Slot Occupancy Icon -->
            <svg v-else-if="i === 1" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="4" />
              <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
              <circle cx="16" cy="15" r="1.5" fill="currentColor" />
            </svg>
            <!-- Daily Revenue Icon -->
            <svg v-else-if="i === 2" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="3" />
              <line x1="2" y1="10" x2="22" y2="10" />
              <path d="M6 15h2" />
              <circle cx="16" cy="15" r="1.5" fill="currentColor" />
            </svg>
            <!-- Pending Citations Icon -->
            <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <circle cx="12" cy="16" r="1" fill="currentColor" />
            </svg>
          </template>
        </StatsCard>
      </template>
    </div>

    <p v-if="statsData?.trends" class="m-0 text-xs text-muted">
      Changes vs yesterday (Philippine time). Slot occupancy shows current capacity usage.
    </p>

    <!-- Main Content Area: Chart & Tables on Left, Calendar & Feedback on Right -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Main Column (2 cols wide on desktop) -->
      <div class="lg:col-span-2 flex flex-col gap-6 min-w-0">
        <!-- Parking Chart -->
        <div class="w-full">
          <template v-if="isLoading">
            <SkeletonLoader variant="rect" height="300px" />
          </template>
          <template v-else>
            <ParkingChart :activity-data="activityData" />
          </template>
        </div>

        <!-- Recent Activity Table -->
        <RecentActivity />

        <!-- Pending Registrations -->
        <PendingRegistrations />
      </div>

      <!-- Right Column: Grounded Calendar & Feedback Overview (1 col wide on desktop) -->
      <div class="flex flex-col gap-6">
        <DashboardCalendar />
        <RecentFeedbackOverview />
      </div>
    </div>
  </div>
</template>
