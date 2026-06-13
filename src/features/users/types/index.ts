export type AccountStatus = 'Suspended' | 'PendingVerification' | 'Active'
export type CorVerificationStatus = 'NotSubmitted' | 'Pending' | 'Verified' | 'Rejected'
export type AuthProvider = 'Manual' | 'Microsoft'
export type UserRole = 'Student' | 'UniversityStaff' | 'NonAcademicPersonnel' | 'Guard' | 'Admin'

export interface VehicleInfo {
  plateNumber: string
  brand: string
  vehicleType: 'Motorcycle' | 'ElectricBike' | 'Car'
  isPrimary: boolean
}

export interface StudentDetails {
  studentNumber: string
  course: string
  section: string
  yearLevel: number
}

export interface PersonnelDetails {
  idCardNumber: string
  department: string
}

export interface GuardDetails {
  assignedGate: number
}

export interface UserWithDetails {
  id: string
  firstName: string
  lastName: string
  middleName?: string
  fullName: string
  email: string
  phoneNumber: string
  status: AccountStatus
  corVerificationStatus: CorVerificationStatus
  authProvider: AuthProvider
  role: UserRole
  createdAt: string
  profilePictureUrl?: string
  student?: StudentDetails
  personnel?: PersonnelDetails
  guard?: GuardDetails
  vehicles: VehicleInfo[]
}
