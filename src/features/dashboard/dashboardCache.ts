import { ref } from 'vue'

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

// Global persistent reactive cache stores
export const cachedStatsData = ref<DashboardStatsCache | null>(null)
export const cachedActivityData = ref<ActivityDataItem[] | null>(null)
export const cachedRegistrations = ref<PendingRegistrationCacheItem[] | null>(null)
export const cachedSubmissionGuids = ref<Record<number, string>>({})
export const cachedParkingLogs = ref<ParkingLogCacheItem[] | null>(null)
export const cachedReservations = ref<ReservationCacheItem[] | null>(null)
export const cachedFeedbacks = ref<FeedbackOverviewCacheItem[] | null>(null)
export const cachedUsers = ref<any[] | null>(null)
export const cachedApprovals = ref<any[] | null>(null)

