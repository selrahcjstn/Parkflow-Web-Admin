<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  dateRangeLabel: string
  reportVehicleTypeLabel: string
  generatedBy: string
  generatedAt: string
  reportRef: string
  summary: {
    totalEntries: number
    peakOccupancy: string
    avgDuration: string
    totalRevenue: string
    totalViolations: number
    activeParked: number
    totalVehicles: number
  }
  hourlyTraffic: Array<{
    timeSlot: string
    loadPercent: number
    status: string
  }>
  vehicleBreakdown: {
    cars: number
    motos: number
    ebikes: number
    total: number
    carPct: number
    motoPct: number
    ebikePct: number
  }
  violations: Array<{
    ref: string
    plate: string
    driver: string
    type: string
    status: string
    amount: number
    date: string
  }>
  recentLogs: Array<{
    plate: string
    driver: string
    type: string
    entryTime: string
    exitTime: string
    duration: string
    method: string
    status: string
  }>
}>()
</script>

<template>
  <div class="print-document font-sans text-slate-900 bg-white p-8 max-w-[850px] mx-auto">
    <!-- Institutional Header -->
    <div class="border-b-2 border-[#D22730] pb-4 mb-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img src="/parkflow.png" alt="ParkFlow Logo" class="w-12 h-12 object-contain rounded-xl border border-slate-100" />
          <div>
            <h1 class="text-lg font-extrabold text-[#D22730] uppercase tracking-wide leading-tight m-0">
              Bulacan State University
            </h1>
            <h2 class="text-xs font-bold text-slate-600 uppercase tracking-wider m-0">
              ParkFlow Campus Smart Parking System · Operations & Analytics
            </h2>
          </div>
        </div>

        <div class="text-right text-xs text-slate-500">
          <p class="font-bold text-slate-800 m-0">OFFICIAL AUDIT REPORT</p>
          <p class="font-mono text-[11px] m-0">Ref: {{ reportRef }}</p>
        </div>
      </div>
    </div>

    <!-- Metadata Grid -->
    <div class="grid grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs mb-6">
      <div>
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reporting Period</span>
        <span class="font-bold text-slate-800">{{ dateRangeLabel }}</span>
      </div>
      <div>
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vehicle Scope</span>
        <span class="font-bold text-slate-800">{{ reportVehicleTypeLabel }}</span>
      </div>
      <div>
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Generated Date & Time</span>
        <span class="font-bold text-slate-800">{{ generatedAt }}</span>
      </div>
      <div>
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prepared By</span>
        <span class="font-bold text-slate-800">{{ generatedBy }}</span>
      </div>
    </div>

    <!-- Section 1: Executive KPI Metrics -->
    <div class="mb-6">
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700 pb-1.5 mb-2.5 border-b border-slate-200 flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-[#D22730]"></span>
        1. Executive Performance Summary
      </h3>

      <div class="grid grid-cols-4 gap-2.5">
        <div class="p-3 bg-white border border-slate-200 rounded-lg">
          <span class="text-[10px] text-slate-500 uppercase font-semibold block">Total Logged Entries</span>
          <span class="text-lg font-black text-slate-900 block mt-0.5">{{ summary.totalEntries }}</span>
          <span class="text-[10px] text-emerald-600 font-medium">Gate Inflow Verified</span>
        </div>

        <div class="p-3 bg-white border border-slate-200 rounded-lg">
          <span class="text-[10px] text-slate-500 uppercase font-semibold block">Peak Bay Occupancy</span>
          <span class="text-lg font-black text-[#D22730] block mt-0.5">{{ summary.peakOccupancy }}</span>
          <span class="text-[10px] text-slate-500 font-medium">Recorded Mid-Day</span>
        </div>

        <div class="p-3 bg-white border border-slate-200 rounded-lg">
          <span class="text-[10px] text-slate-500 uppercase font-semibold block">Average Dwell Duration</span>
          <span class="text-lg font-black text-slate-900 block mt-0.5">{{ summary.avgDuration }}</span>
          <span class="text-[10px] text-slate-500 font-medium">Per Session</span>
        </div>

        <div class="p-3 bg-white border border-slate-200 rounded-lg">
          <span class="text-[10px] text-slate-500 uppercase font-semibold block">Settled Fines Collection</span>
          <span class="text-lg font-black text-emerald-600 block mt-0.5">{{ summary.totalRevenue }}</span>
          <span class="text-[10px] text-slate-500 font-medium">{{ summary.totalViolations }} Citations Recorded</span>
        </div>
      </div>
    </div>

    <!-- Section 2: Fleet Distribution & Hourly Traffic Load -->
    <div class="grid grid-cols-2 gap-4 mb-6">
      <!-- Fleet Breakdown -->
      <div>
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700 pb-1.5 mb-2.5 border-b border-slate-200 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-slate-700"></span>
          2. Registered Vehicle Census
        </h3>
        <table class="w-full text-xs border-collapse">
          <thead>
            <tr class="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
              <th class="py-1.5 px-2 text-left">Category</th>
              <th class="py-1.5 px-2 text-right">Units</th>
              <th class="py-1.5 px-2 text-right">Share</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-slate-100">
              <td class="py-1.5 px-2 font-medium">Automobiles (Cars/SUVs)</td>
              <td class="py-1.5 px-2 text-right font-bold">{{ vehicleBreakdown.cars }}</td>
              <td class="py-1.5 px-2 text-right text-slate-600">{{ vehicleBreakdown.carPct }}%</td>
            </tr>
            <tr class="border-b border-slate-100">
              <td class="py-1.5 px-2 font-medium">Motorcycles & Scooters</td>
              <td class="py-1.5 px-2 text-right font-bold">{{ vehicleBreakdown.motos }}</td>
              <td class="py-1.5 px-2 text-right text-slate-600">{{ vehicleBreakdown.motoPct }}%</td>
            </tr>
            <tr class="border-b border-slate-100">
              <td class="py-1.5 px-2 font-medium">Electric Bikes & Scooters</td>
              <td class="py-1.5 px-2 text-right font-bold">{{ vehicleBreakdown.ebikes }}</td>
              <td class="py-1.5 px-2 text-right text-slate-600">{{ vehicleBreakdown.ebikePct }}%</td>
            </tr>
            <tr class="bg-slate-50 font-bold border-t border-slate-200">
              <td class="py-1.5 px-2">Total Registered Fleet</td>
              <td class="py-1.5 px-2 text-right">{{ vehicleBreakdown.total }}</td>
              <td class="py-1.5 px-2 text-right">100%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Hourly Traffic Load -->
      <div>
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700 pb-1.5 mb-2.5 border-b border-slate-200 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-amber-500"></span>
          3. Hourly Peak Distribution
        </h3>
        <table class="w-full text-xs border-collapse">
          <thead>
            <tr class="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
              <th class="py-1.5 px-2 text-left">Time Window</th>
              <th class="py-1.5 px-2 text-center">Load Factor</th>
              <th class="py-1.5 px-2 text-right">Intensity</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="h in hourlyTraffic.slice(0, 4)" :key="h.timeSlot" class="border-b border-slate-100">
              <td class="py-1.5 px-2 font-medium">{{ h.timeSlot }}</td>
              <td class="py-1.5 px-2 text-center font-bold text-[#D22730]">{{ h.loadPercent }}%</td>
              <td class="py-1.5 px-2 text-right font-medium text-slate-600">{{ h.status }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Section 3: Recent Citations & Revenue Ledger -->
    <div class="mb-6">
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700 pb-1.5 mb-2.5 border-b border-slate-200 flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-[#D22730]"></span>
        4. Citations & Overstay Ledger Audit
      </h3>
      <table class="w-full text-xs border-collapse">
        <thead>
          <tr class="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
            <th class="py-1.5 px-2 text-left">Citation Ref</th>
            <th class="py-1.5 px-2 text-left">Plate No.</th>
            <th class="py-1.5 px-2 text-left">Driver / Owner</th>
            <th class="py-1.5 px-2 text-left">Infraction Type</th>
            <th class="py-1.5 px-2 text-center">Settlement</th>
            <th class="py-1.5 px-2 text-right">Penalty Fee</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!violations.length" class="border-b border-slate-100">
            <td colspan="6" class="py-3 text-center text-slate-400 italic">No violation citations recorded for this reporting period.</td>
          </tr>
          <tr v-for="v in violations.slice(0, 8)" :key="v.ref" class="border-b border-slate-100">
            <td class="py-1.5 px-2 font-mono font-bold text-slate-800">{{ v.ref }}</td>
            <td class="py-1.5 px-2 font-mono">{{ v.plate }}</td>
            <td class="py-1.5 px-2">{{ v.driver }}</td>
            <td class="py-1.5 px-2 font-medium">{{ v.type }}</td>
            <td class="py-1.5 px-2 text-center font-bold" :class="v.status === 'Paid' || v.status === 'Settled' ? 'text-emerald-600' : 'text-amber-600'">
              {{ v.status }}
            </td>
            <td class="py-1.5 px-2 text-right font-bold text-slate-900">₱{{ Number(v.amount).toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Official Sign-off & Verification -->
    <div class="pt-6 border-t-2 border-slate-200 mt-8">
      <div class="grid grid-cols-2 gap-12 text-xs">
        <div>
          <p class="font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-8">Prepared & Verified By:</p>
          <div class="border-b border-slate-800 pb-1">
            <p class="font-bold text-slate-900 m-0">{{ generatedBy }}</p>
          </div>
          <p class="text-[10.5px] text-slate-500 mt-1">ParkFlow System Administrator · BulSU</p>
        </div>

        <div>
          <p class="font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-8">Endorsed By:</p>
          <div class="border-b border-slate-800 pb-1">
            <p class="font-bold text-slate-900 m-0">Campus Safety & Administrative Services</p>
          </div>
          <p class="text-[10.5px] text-slate-500 mt-1">Bulacan State University Main Campus</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  .print-document {
    padding: 0 !important;
    max-width: 100% !important;
  }
}
</style>
