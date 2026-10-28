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
  email?: string
  checkInTime: string
  duration: string
  gate: number
  status: ParkingStatus
  method: EntryMethod
  scheduledEndTime?: string
  maximumExitTime?: string
  maxAllowedHours?: number
  overstayHours?: number
}

export interface ParkingHistoryItem {
  id: string
  vehiclePlate: string
  brand: string
  vehicleType: VehicleType
  ownerName: string
  role: string
  email?: string
  checkInTime: string
  checkOutTime: string
  duration: string
  status: ParkingStatus
  method: EntryMethod
}
