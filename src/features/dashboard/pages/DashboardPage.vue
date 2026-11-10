<script setup lang="ts">
import { computed, onErrorCaptured, ref } from 'vue'
import PendingRegistrations from '../components/PendingRegistrations.vue'
import DashboardCalendar from '../components/DashboardCalendar.vue'
import KpiCard from '../components/analytics/KpiCard.vue'
import ChartPanel from '../components/analytics/ChartPanel.vue'
import ActivityLineChart from '../components/analytics/ActivityLineChart.vue'
import PeakHoursChart from '../components/analytics/PeakHoursChart.vue'
import DonutChart, { type DonutItem } from '../components/analytics/DonutChart.vue'
import StatusStackedBars, { type StatusRow } from '../components/analytics/StatusStackedBars.vue'
import ApprovalWorkload from '../components/analytics/ApprovalWorkload.vue'
import OccupancyPanel from '../components/analytics/OccupancyPanel.vue'
import RecentParkingTable from '../components/analytics/RecentParkingTable.vue'
import QuickActions from '../components/analytics/QuickActions.vue'
import DashIcon from '../components/analytics/DashIcon.vue'
import { useDashboardAnalytics } from '../composables/useDashboardAnalytics'
import type { ActivityRange } from '../api/dashboard.api'

const { range, summary, overview, activity, refreshAll } = useDashboardAnalytics()

const RED = '#D22730'
const GOLD = '#FDB813'
const SLATE = '#334155'
const GRAY = '#94a3b8'

// Missing data shows a dash, never a misleading 0.
const number = (value: number | undefined | null) => (value == null ? '—' : value.toLocaleString('en-PH'))

const dateLabel = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
}).format(new Date())

const timeFormatter = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' })
const updatedAt = computed(() => {
  const generated = overview.data.value?.generatedAtUtc
  const date = generated ? new Date(generated) : null
  // Intl throws on an invalid date, so never format one.
  return date && !Number.isNaN(date.getTime()) ? timeFormatter.format(date) : ''
})

// One widget throwing while it renders must not take the whole dashboard down. Log what failed
// (visible in the browser console) and tell the user, instead of leaving them a blank page.
const widgetFailure = ref(false)
onErrorCaptured((error, _instance, info) => {
  console.error('[Dashboard] a widget failed to render:', info, error)
  widgetFailure.value = true
  return false
})
const reloadPage = () => window.location.reload()
const refreshing = computed(() => summary.refreshing.value || overview.refreshing.value || activity.refreshing.value)

const ranges: Array<{ id: ActivityRange; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
]
const rangeSubtitle = computed(() => ({
  today: 'Hourly entries and exits today (Philippine time)',
  '7d': 'Daily entries and exits over the last 7 days',
  '30d': 'Daily entries and exits over the last 30 days',
}[range.value]))

// Registered-client growth vs yesterday's close. Only shown when the API returned a real percentage.
const clientsDelta = computed(() => {
  const percent = summary.data.value?.trends?.registeredClientsPercent
  if (typeof percent !== 'number' || !Number.isFinite(percent)) return {}
  return {
    delta: `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`,
    deltaDirection: percent > 0 ? ('up' as const) : percent < 0 ? ('down' as const) : ('flat' as const),
    deltaTone: percent > 0 ? ('positive' as const) : percent < 0 ? ('negative' as const) : ('neutral' as const),
  }
})

const totalPendingDecisions = computed(() => {
  const p = overview.data.value?.pending
  return p ? p.vehicles + p.corSchedules : undefined
})

const vehicleItems = computed<DonutItem[]>(() => {
  const v = overview.data.value?.vehicles
  return v ? [
    { label: 'Motorcycle', value: v.motorcycles, color: RED },
    { label: 'Car', value: v.cars, color: SLATE },
    { label: 'E-bike', value: v.electricBikes, color: GOLD },
  ] : []
})

const userItems = computed<DonutItem[]>(() => {
  const a = overview.data.value?.accounts
  return a ? [
    { label: 'Students', value: a.students, color: RED },
    { label: 'Personnel', value: a.personnel, color: GOLD },
    { label: 'Guards', value: a.guards, color: SLATE },
    { label: 'Administrators', value: a.admins, color: GRAY },
  ].filter((item) => item.value > 0) : []
})

const statusRows = computed<StatusRow[]>(() => {
  const o = overview.data.value
  if (!o) return []
  return [
    { label: 'Vehicles', to: '/vehicles', approved: o.vehicles.approved, pending: o.vehicles.pending, rejected: o.vehicles.rejected },
    {
      label: 'Accounts', to: '/users', approved: o.accounts.active, pending: o.accounts.pendingVerification, rejected: o.accounts.suspended,
      approvedLabel: 'Active', rejectedLabel: 'Suspended',
    },
  ]
})

const hasActivity = computed(() => (activity.data.value?.series ?? []).some((b) => b.entries + b.exits > 0))
const hasPeakData = computed(() => (activity.data.value?.peakHours ?? []).some((h) => h.entries + h.exits > 0))
const occupancy = computed(() => {
  const s = summary.data.value
  // Not capped: over-capacity must be visible. The progress bar clamps its own width.
  return s && s.maxCapacity > 0 ? (s.activeParking / s.maxCapacity) * 100 : undefined
})
const available = computed(() => {
  const s = summary.data.value
  return s && s.maxCapacity > 0 ? Math.max(0, s.maxCapacity - s.activeParking) : undefined
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Header -->
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="m-0 text-2xl font-bold tracking-tight text-text">Dashboard</h1>
        <p class="m-0 mt-1 text-sm text-muted">{{ dateLabel }}</p>
      </div>
      <div class="flex items-center gap-3">
        <span v-if="updatedAt" class="text-[12.5px] text-muted">Updated {{ updatedAt }}</span>
        <button
          type="button"
          class="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-[13px] font-medium text-text transition-colors hover:border-[#D22730]/40 hover:text-[#D22730] disabled:opacity-60"
          :disabled="refreshing"
          @click="refreshAll"
        >
          <DashIcon name="refresh" :size="15" :class="refreshing ? 'animate-spin' : ''" />Refresh
        </button>
      </div>
    </div>

    <div v-if="summary.error.value || overview.error.value" role="alert" class="flex flex-wrap items-center justify-between gap-3 rounded-card border border-warning/30 bg-warning-bg p-3 text-sm text-text">
      <span>{{ overview.error.value || summary.error.value }}</span>
      <button type="button" class="font-semibold text-[#D22730] hover:underline" @click="refreshAll">Retry</button>
    </div>

    <div v-if="widgetFailure" role="alert" class="flex flex-wrap items-center justify-between gap-3 rounded-card border border-warning/30 bg-warning-bg p-3 text-sm text-text">
      <span>Part of the dashboard could not be displayed. The rest is unaffected.</span>
      <button type="button" class="font-semibold text-[#D22730] hover:underline" @click="reloadPage">Reload page</button>
    </div>

    <QuickActions />

    <!-- Parking operations -->
    <section aria-labelledby="ops-heading">
      <h2 id="ops-heading" class="m-0 mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted">Parking operations</h2>
      <div class="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          title="Currently parked" icon="parking" tone="brand"
          :loading="summary.loading.value && !summary.data.value"
          :value="number(summary.data.value?.activeParking)"
          :progress="occupancy"
          :hint="occupancy === undefined ? 'Capacity not configured' : `${occupancy.toFixed(1)}% of ${number(summary.data.value?.maxCapacity)} spaces`"
          to="/parking"
        />
        <KpiCard
          title="Entries today" icon="log-in" tone="gold"
          :loading="overview.loading.value && !overview.data.value"
          :value="number(overview.data.value?.today.entries)"
          :hint="overview.data.value ? `Yesterday: ${number(overview.data.value.today.yesterdayEntries)} (full day)` : ''"
        />
        <KpiCard
          title="Exits today" icon="log-out"
          :loading="overview.loading.value && !overview.data.value"
          :value="number(overview.data.value?.today.exits)"
          :hint="overview.data.value ? `Yesterday: ${number(overview.data.value.today.yesterdayExits)} (full day)` : ''"
        />
        <KpiCard
          title="Available spaces" icon="check"
          :loading="summary.loading.value && !summary.data.value"
          :value="available === undefined ? '—' : number(available)"
          :hint="available === undefined ? 'Set a capacity in Settings' : 'Capacity minus vehicles inside'"
        />
      </div>
    </section>

    <!-- Registry -->
    <section aria-labelledby="registry-heading">
      <h2 id="registry-heading" class="m-0 mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted">Accounts and vehicles</h2>
      <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          title="Registered users" icon="users" tone="slate" to="/users"
          :loading="overview.loading.value && !overview.data.value"
          :value="number(overview.data.value?.accounts.total)"
          :hint="overview.data.value ? `${number(overview.data.value.accounts.students)} students · ${number(overview.data.value.accounts.personnel)} personnel` : ''"
          v-bind="clientsDelta"
        />
        <KpiCard
          title="Registered vehicles" icon="car" tone="slate" to="/vehicles"
          :loading="overview.loading.value && !overview.data.value"
          :value="number(overview.data.value?.vehicles.total)"
          :hint="overview.data.value ? `${number(overview.data.value.vehicles.motorcycles)} moto · ${number(overview.data.value.vehicles.cars)} car · ${number(overview.data.value.vehicles.electricBikes)} e-bike` : ''"
        />
        <KpiCard
          title="Pending approvals" icon="clock" tone="gold" to="/vehicles?status=pending"
          :loading="overview.loading.value && !overview.data.value"
          :value="number(totalPendingDecisions)"
          :hint="overview.data.value ? `${number(overview.data.value.pending.vehicles)} vehicles · ${number(overview.data.value.pending.corSchedules)} schedules` : ''"
        />
        <KpiCard
          title="Approved vehicles" icon="check" tone="slate" to="/vehicles?status=approved"
          :loading="overview.loading.value && !overview.data.value"
          :value="number(overview.data.value?.vehicles.approved)"
          :hint="overview.data.value && overview.data.value.vehicles.total ? `${((overview.data.value.vehicles.approved / overview.data.value.vehicles.total) * 100).toFixed(0)}% of registered` : ''"
        />
        <KpiCard
          title="Rejected vehicles" icon="x-circle" tone="slate" to="/vehicles?status=rejected"
          :loading="overview.loading.value && !overview.data.value"
          :value="number(overview.data.value?.vehicles.rejected)"
        />
      </div>
    </section>

    <!-- Activity + occupancy -->
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div class="xl:col-span-2">
        <ChartPanel
          title="Parking activity" :subtitle="rangeSubtitle"
          :loading="activity.loading.value && !activity.data.value"
          :error="activity.error.value" :empty="!activity.data.value || !hasActivity"
          empty-message="No entries or exits were recorded in this period." min-height="300px"
          @retry="activity.load"
        >
          <template #actions>
            <div class="inline-flex rounded-lg border border-border p-0.5 text-[12.5px]" role="tablist" aria-label="Time range">
              <button
                v-for="option in ranges" :key="option.id" type="button" role="tab" :aria-selected="range === option.id"
                class="min-h-8 rounded-md px-3 font-medium transition-colors"
                :class="range === option.id ? 'bg-text text-surface' : 'text-muted hover:text-text'"
                @click="range = option.id"
              >{{ option.label }}</button>
            </div>
          </template>
          <ActivityLineChart v-if="activity.data.value" :series="activity.data.value.series" :granularity="activity.data.value.granularity" />
          <template #footer>
            <span v-if="activity.data.value">
              <b class="text-text tabular-nums">{{ number(activity.data.value.totalEntries) }}</b> entries ·
              <b class="text-text tabular-nums">{{ number(activity.data.value.totalExits) }}</b> exits in this period, including visitors.
            </span>
          </template>
        </ChartPanel>
      </div>
      <ChartPanel title="Parking occupancy" subtitle="Vehicles inside against configured capacity" :loading="summary.loading.value && !summary.data.value"
        :error="summary.error.value" :empty="!summary.data.value" @retry="summary.load">
        <OccupancyPanel v-if="summary.data.value" :summary="summary.data.value" />
      </ChartPanel>
    </div>

    <!-- Peak hours + approvals -->
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div class="xl:col-span-2">
        <ChartPanel
          title="Peak parking hours"
          :subtitle="`Busiest hours of the day, last ${activity.data.value?.peakWindowDays ?? 7} days`"
          :loading="activity.loading.value && !activity.data.value"
          :error="activity.error.value" :empty="!activity.data.value || !hasPeakData"
          empty-message="Peak hours appear once entries or exits are recorded." min-height="260px"
          @retry="activity.load"
        >
          <PeakHoursChart v-if="activity.data.value" :hours="activity.data.value.peakHours" />
        </ChartPanel>
      </div>
      <ChartPanel title="Approval workload" subtitle="Items waiting for an admin" :loading="overview.loading.value && !overview.data.value"
        :error="overview.error.value" :empty="!overview.data.value" @retry="overview.load">
        <ApprovalWorkload v-if="overview.data.value" :pending="overview.data.value.pending" />
      </ChartPanel>
    </div>

    <!-- Distributions -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <ChartPanel title="Vehicle distribution" subtitle="Registered vehicles by type" :loading="overview.loading.value && !overview.data.value"
        :error="overview.error.value" :empty="!overview.data.value || overview.data.value.vehicles.total === 0"
        empty-message="No vehicles are registered yet." @retry="overview.load">
        <DonutChart :items="vehicleItems" center-label="Vehicles" chart-label="Registered vehicles by type" />
      </ChartPanel>
      <ChartPanel title="User distribution" subtitle="Accounts by role" :loading="overview.loading.value && !overview.data.value"
        :error="overview.error.value" :empty="!overview.data.value || userItems.length === 0"
        empty-message="No accounts yet." @retry="overview.load">
        <DonutChart :items="userItems" center-label="Accounts" chart-label="Accounts by role" />
      </ChartPanel>
      <div class="lg:col-span-2 xl:col-span-1">
        <ChartPanel title="Approval status" subtitle="Current state of vehicles and accounts" :loading="overview.loading.value && !overview.data.value"
          :error="overview.error.value" :empty="!overview.data.value" @retry="overview.load">
          <StatusStackedBars :rows="statusRows" />
        </ChartPanel>
      </div>
    </div>

    <!-- Activity table + side widgets -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Children grow to share any spare height, so both columns end on the same line. -->
      <div class="flex min-w-0 flex-col gap-6 lg:col-span-2 [&>*]:flex-1">
        <ChartPanel title="Recent parking activity" subtitle="Latest entries and exits, registered and visitor vehicles"
          :loading="overview.loading.value && !overview.data.value" :error="overview.error.value"
          :empty="!overview.data.value || overview.data.value.recent.length === 0" empty-message="No parking transactions have been recorded yet."
          @retry="overview.load">
          <template #actions>
            <RouterLink to="/parking" class="text-[13px] font-semibold text-[#D22730] hover:underline">View all</RouterLink>
          </template>
          <RecentParkingTable v-if="overview.data.value" :rows="overview.data.value.recent" />
        </ChartPanel>
        <PendingRegistrations />
      </div>
      <div class="flex min-w-0 flex-col [&>*]:flex-1">
        <DashboardCalendar />
      </div>
    </div>
  </div>
</template>
