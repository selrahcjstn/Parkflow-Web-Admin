export interface VehicleParkingSettings {
  totalCapacity: number
  reservationAllocationSlots: number
}

export const parkingVehicleGroups = [
  { key: 'carParking', label: 'Cars' },
  { key: 'motorcycleParking', label: 'Motorcycles' },
] as const
