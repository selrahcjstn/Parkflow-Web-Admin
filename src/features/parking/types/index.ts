export type ParkingStatus = 'Parked' | 'Exited' | 'Overstay'
export type EntryMethod = 'QrCode' | 'Manual'
export type VehicleType = 'Motorcycle' | 'ElectricBike' | 'Car'

export interface ActiveSession {
  id: string
  vehiclePlate: string
  brand: string
  vehicleType: VehicleType
  ownerName: string
  role: string
  checkInTime: string
  duration: string
  gate: number
  status: ParkingStatus
  scheduledEndTime?: string
  maximumExitTime?: string
  maxAllowedHours?: number
  overstayHours?: number
  amount?: number
  fee?: string
}

export interface ParkingHistoryItem {
  id: string
  vehiclePlate: string
  brand: string
  vehicleType: VehicleType
  ownerName: string
  role: string
  checkInTime: string
  checkOutTime: string
  duration: string
  charge: string
  status: ParkingStatus
  method: EntryMethod
}
