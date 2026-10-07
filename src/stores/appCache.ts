import { ref, customRef } from 'vue'

export interface DashboardStatsCache {
  totalUsers: number
  activeParking: number
  todayRevenue: number
  violations: number
  maxCapacity: number
}

export interface ActivityDataItem {
  day: string
  checkIns: number
  checkOuts: number
}

export interface PendingRegistrationCacheItem {
  id: number
  fullName: string
  email: string
  dateApplied: string
  vehiclePlate: string
  vehicleType: string
  status: 'pending' | 'approved' | 'rejected'
}

export interface ParkingLogCacheItem {
  id: number
  vehiclePlate: string
  ownerName: string
  duration: string
  charge: string
  status: string
}

export interface ReservationCacheItem {
  id: string
  userName: string
  userRole: string
  plateNumber: string
  date: string
  startTime: string
  endTime: string
  status: string
  type: string
}

export interface FeedbackOverviewCacheItem {
  id: string
  fullName: string
  email: string
  category: string
  rating: number
  message: string
  createdAt: string
  status: string
}

// Short-lived, account-scoped snapshots. Empty arrays are valid cached results.
let cacheOwner: string | null = null
const resets = new Set<() => void>()
function snapshot<T>(initial: T) {
  let value = initial
  let expiresAt = 0
  return customRef<T>((track, trigger) => {
    resets.add(() => {
      value = initial
      expiresAt = 0
      trigger()
    })
    return {
      get() {
        track()
        return expiresAt > Date.now() ? value : initial
      },
      set(next) {
        value = next
        expiresAt = Date.now() + 60_000
        trigger()
      },
    }
  })
}
export function resetAppCache() {
  resets.forEach((reset) => reset())
  cachedSubmissionGuids.value = {}
}
export function syncCacheOwner(token: string | null) {
  if (cacheOwner !== token) {
    cacheOwner = token
    resetAppCache()
  }
}
export const cachedStatsData = snapshot<DashboardStatsCache | null>(null)
export const cachedActivityData = snapshot<ActivityDataItem[] | null>(null)
export const cachedRegistrations = snapshot<PendingRegistrationCacheItem[] | null>(null)
export const cachedSubmissionGuids = ref<Record<number, string>>({})
export const cachedParkingLogs = snapshot<ParkingLogCacheItem[] | null>(null)
export const cachedReservations = snapshot<ReservationCacheItem[] | null>(null)
export const cachedFeedbacks = snapshot<any[] | null>(null)
export const cachedUsers = snapshot<any[] | null>(null)
export const cachedApprovals = snapshot<any[] | null>(null)
export const cachedScheduleSubmissions = snapshot<any[] | null>(null)
export const cachedVehicleApprovals = snapshot<any[] | null>(null)
export const cachedActiveSessions = snapshot<any[] | null>(null)
export const cachedHistorySessions = snapshot<any[] | null>(null)
export const cachedViolations = snapshot<any[] | null>(null)
export const cachedVehicles = snapshot<any[] | null>(null)
