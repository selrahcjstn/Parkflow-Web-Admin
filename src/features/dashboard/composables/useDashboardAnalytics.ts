import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { useAdminNotificationStore } from '@/stores/notification.store'
import { cachedStatsData } from '@/stores/appCache'
import {
  dashboardApi,
  type ActivityRange,
  type DashboardActivity,
  type DashboardOverview,
  type DashboardSummary,
} from '../api/dashboard.api'

const REFRESH_INTERVAL_MS = 60_000

/** One independently loading/erroring request. Late responses from an older call are ignored. */
function useResource<T>(fetcher: () => Promise<T>, initial: T | null = null) {
  const data = ref(initial) as Ref<T | null>
  const loading = ref(initial === null)
  const refreshing = ref(false)
  const error = ref('')
  let sequence = 0

  async function load() {
    const id = ++sequence
    if (data.value === null) loading.value = true
    else refreshing.value = true
    error.value = ''
    try {
      const result = await fetcher()
      if (id === sequence) data.value = result
    } catch (e: any) {
      if (id === sequence) error.value = e?.response?.data?.message || e?.message || 'Request failed.'
    } finally {
      if (id === sequence) {
        loading.value = false
        refreshing.value = false
      }
    }
  }

  return { data, loading, refreshing, error, load }
}

/**
 * Loads everything the dashboard shows. The summary request keeps its existing cache so the
 * page paints instantly on return visits; overview and activity refresh together on a timer
 * and whenever an approval changes.
 */
export function useDashboardAnalytics() {
  const range = ref<ActivityRange>('7d')

  const summary = useResource<DashboardSummary>(dashboardApi.summary, cachedStatsData.value as DashboardSummary | null)
  const overview = useResource<DashboardOverview>(dashboardApi.overview)
  const activity = useResource<DashboardActivity>(() => dashboardApi.activity(range.value))

  const summaryLoad = summary.load
  summary.load = async () => {
    await summaryLoad()
    if (summary.data.value) cachedStatsData.value = summary.data.value as any
  }

  function refreshAll() {
    void summary.load()
    void overview.load()
    void activity.load()
  }

  watch(range, () => void activity.load())

  let timer: ReturnType<typeof setInterval> | undefined
  let unsubscribe: (() => void) | undefined

  onMounted(() => {
    refreshAll()
    timer = setInterval(() => {
      if (document.visibilityState === 'visible') refreshAll()
    }, REFRESH_INTERVAL_MS)
    const notifications = useAdminNotificationStore()
    unsubscribe = notifications.onApprovalUpdate(() => {
      void overview.load()
      void summary.load()
    })
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
    unsubscribe?.()
  })

  return { range, summary, overview, activity, refreshAll }
}
