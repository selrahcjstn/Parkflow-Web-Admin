export function getVehicleTypeLabel(type: any): string {
  if (type === 0 || type === '0' || type === 'Motorcycle' || type === 'motorcycle') return 'Motorcycle'
  if (type === 1 || type === '1' || type === 'ElectricBike' || type === 'electricbike' || type === 'E-Bike' || type === 'ebike') return 'E-Bike'
  if (type === 2 || type === '2' || type === 'Car' || type === 'car') return 'Car'
  return String(type || 'Car')
}
