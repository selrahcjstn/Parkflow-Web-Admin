import api from '@/api/axios'

export type ActivityRange = 'today' | '7d' | '30d'

export interface ActivityBucket { key: string; label: string; entries: number; exits: number }
export interface HourOfDay { hour: number; label: string; entries: number; exits: number }

export interface DashboardActivity {
  range: ActivityRange
  granularity: 'hour' | 'day'
  timezone: string
  startUtc: string
  endUtc: string
  peakWindowDays: number
  totalEntries: number
  totalExits: number
  series: ActivityBucket[]
  peakHours: HourOfDay[]
}

export interface AccountBreakdown {
  total: number; students: number; personnel: number; guards: number; admins: number
  active: number; pendingVerification: number; suspended: number
}
export interface VehicleBreakdown {
  total: number; motorcycles: number; cars: number; electricBikes: number
  pending: number; approved: number; rejected: number
}
export interface PendingWork { accounts: number; vehicles: number; corSchedules: number }
export interface TodayOperations {
  entries: number; exits: number; yesterdayEntries: number; yesterdayExits: number; currentlyInside: number
}
export interface RecentParkingActivity {
  source: 'Registered' | 'Visitor'
  identifier: string
  owner: string
  vehicleType: string
  entryTime: string
  exitTime: string | null
  status: 'Inside' | 'Exited'
}
export interface DashboardOverview {
  accounts: AccountBreakdown
  vehicles: VehicleBreakdown
  pending: PendingWork
  today: TodayOperations
  recent: RecentParkingActivity[]
  generatedAtUtc: string
}

export interface DashboardSummary {
  totalUsers: number
  activeParking: number
  maxCapacity: number
  carCount?: number
  motorcycleCount?: number
  carCapacity?: number
  motorcycleCapacity?: number
  trends?: { registeredClientsPercent?: number | null; comparisonDate?: string }
}

async function unwrap<T>(request: Promise<{ data: any }>, fallbackMessage: string): Promise<T> {
  const response = await request
  if (!response.data?.isSuccess || !response.data?.data) {
    throw new Error(response.data?.message || fallbackMessage)
  }
  return response.data.data as T
}

export const dashboardApi = {
  overview: () => unwrap<DashboardOverview>(api.get('/dashboard/overview'), 'Dashboard overview could not be loaded.'),
  activity: (range: ActivityRange) =>
    unwrap<DashboardActivity>(api.get('/dashboard/activity', { params: { range } }), 'Parking activity could not be loaded.'),
  summary: async (): Promise<DashboardSummary> => {
    const data = await unwrap<any>(api.get('/dashboard/summary'), 'Dashboard metrics could not be loaded.')
    const counts = [data.totalUsers, data.activeParking, data.maxCapacity]
    if (!counts.every((value) => Number.isSafeInteger(value) && value >= 0)) throw new Error('Invalid dashboard metrics')
    return data as DashboardSummary
  },
}
