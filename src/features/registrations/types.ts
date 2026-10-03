export type ApprovalCategory = 'Registration' | 'Schedule' | 'Vehicle'

export interface ScheduleItem {
  dayOfWeek: number
  startTime: string
  endTime: string
}

export interface ApprovalItem {
  id: number | string
  guid: string
  corGuid?: string
  vehicleGuid?: string
  userId?: string
  category: ApprovalCategory
  fullName: string
  email: string
  role: string
  dateApplied: string
  academicTerm?: string
  vehiclePlate: string
  vehicleType: string | number
  brand: string
  corUrl?: string
  orcrUrl?: string
  motorPicUrl?: string
  schedules?: ScheduleItem[]
  status: 'pending' | 'approved' | 'rejected'
  verificationStatus: number
}
