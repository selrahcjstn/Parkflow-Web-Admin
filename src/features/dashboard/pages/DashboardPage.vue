<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import StatsCard from '../components/StatsCard.vue'
import ParkingChart from '../components/ParkingChart.vue'
import RecentActivity from '../components/RecentActivity.vue'
import PendingRegistrations from '../components/PendingRegistrations.vue'
import DashboardCalendar from '../components/DashboardCalendar.vue'
import RecentFeedbackOverview from '../components/RecentFeedbackOverview.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import api from '@/api/axios'

import { cachedStatsData, cachedActivityData } from '@/stores/appCache'

const isLoading = ref(!cachedStatsData.value)

const formattedDate = computed(() =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date())
)

const statsData = ref(cachedStatsData.value || {
  totalUsers: 0,
  activeParking: 0,
  todayRevenue: 0,
  violations: 0,
  maxCapacity: 500
})

const stats = computed(() => {
  const occPercent = statsData.value.maxCapacity > 0
    ? Math.round((statsData.value.activeParking / statsData.value.maxCapacity) * 100)
    : 0

  return [
    {
      title: 'Registered Clients',
      value: statsData.value.totalUsers.toLocaleString(),
      subtitle: 'Permits & driver accounts',
      trend: '+12.5%',
      trendUp: true,
      accentColor: '#2563eb',
      badgeBg: 'rgba(37, 99, 235, 0.12)'
    },
    {
      title: 'Slot Occupancy',
      value: `${statsData.value.activeParking} / ${statsData.value.maxCapacity}`,
      subtitle: `${statsData.value.maxCapacity - statsData.value.activeParking} slots available`,
      trend: `${occPercent}% full`,
      trendUp: occPercent < 85,
      accentColor: '#059669',
      badgeBg: 'rgba(16, 185, 129, 0.12)',
      progressPercent: occPercent
    },
    {
      title: 'Daily Revenue',
      value: `₱${statsData.value.todayRevenue.toLocaleString()}`,
      subtitle: "Today's logged collections",
      trend: '+8.1%',
      trendUp: true,
      accentColor: '#d97706',
      badgeBg: 'rgba(245, 158, 11, 0.12)'
    },
    {
      title: 'Pending Citations',
      value: `${statsData.value.violations} Citations`,
      subtitle: 'Unsettled parking fines',
      trend: '-3.4%',
      trendUp: false,
      accentColor: '#D22730',
      badgeBg: 'rgba(210, 39, 48, 0.12)'
    }
  ]
})

const activityData = ref<{ day: string; checkIns: number; checkOuts: number }[]>(cachedActivityData.value || [])

const fetchDashboardStats = async () => {
  try {
    const response = await api.get('/dashboard/summary')
    if (response.data?.isSuccess && response.data?.data) {
      const data = response.data.data
      const newStats = {
        totalUsers: data.totalUsers,
        activeParking: data.activeParking,
        maxCapacity: data.maxCapacity,
        todayRevenue: data.todayRevenue,
        violations: data.violationsCount
      }
      const newActivity = Array.isArray(data.activityOverLast7Days) ? data.activityOverLast7Days : []

      statsData.value = newStats
      activityData.value = newActivity

      cachedStatsData.value = newStats
      cachedActivityData.value = newActivity
    }
  } catch (error) {
    console.error('Error loading dashboard stats:', error)
  } finally {
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
