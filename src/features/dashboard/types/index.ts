export interface StatsCardData {
  title: string
  value: string
  trend: string
  trendUp: boolean
}

export interface ParkingLog {
  id: number
  vehiclePlate: string
  ownerName: string
  duration: string
  charge: string
  status: string
}

export interface PendingRegistration {
  id: number
  fullName: string
  email: string
  dateApplied: string
  vehiclePlate: string
  vehicleType: string
  status: 'pending' | 'approved' | 'rejected'
}
