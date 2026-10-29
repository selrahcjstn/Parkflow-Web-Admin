export interface VehicleParkingSettings {
  totalCapacity: number
  reservationAllocationSlots: number
  violationRatePerHour: number
  baseFee: number
  entryFee: number
  dailyOverstayFee: number
  studentEntryFee: number
  facultyEntryFee: number
  personnelEntryFee: number
  visitorFee: number
  vipEntryFee: number
}

export const parkingVehicleGroups = [
  { key: 'carParking', label: 'Cars' },
  { key: 'motorcycleParking', label: 'Motorcycles' },
] as const
