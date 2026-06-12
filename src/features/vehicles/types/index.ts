export type VehicleType = 'Car' | 'Motorcycle' | 'ElectricBike'

export interface Vehicle {
  id: string
  plateNumber: string
  brand: string
  qrCodeHash: string
  vehicleType: VehicleType
  status: 'Active' | 'Suspended'
  isPrimary: boolean
  ownerName: string
  ownerRole: string
}
