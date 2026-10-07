export type VehicleType = 'Car' | 'Motorcycle' | 'ElectricBike'

export interface Vehicle {
  id: string
  rawId?: string
  plateNumber: string
  brand: string
  qrCodeHash: string
  vehicleType: VehicleType
  status: 'Active' | 'Suspended'
  isPrimary: boolean
  ownerName: string
  ownerRole: string
  verificationStatus?: 0 | 1 | 2 | 3  // 0=NotSubmitted, 1=Pending, 2=Verified, 3=Rejected
}
