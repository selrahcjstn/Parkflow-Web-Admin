<script setup lang="ts">
import { ref, watch } from 'vue'
import type { VehicleType } from '../types'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', payload: {
    plateNumber: string
    vehicleType: VehicleType
    brand: string
    phoneNumber: string
    ownerName?: string
    role?: string
    gate?: number
    entryReason?: string
  }): void
}>()

const plateNumber = ref('')
const vehicleType = ref<VehicleType>('Car')
const brand = ref('')
const phoneNumber = ref('')
const ownerName = ref('')
const role = ref('Student')
const gate = ref(1)
const entryReason = ref('RFID Card Failure / Tag Issue')

const resetForm = () => {
  plateNumber.value = ''
  vehicleType.value = 'Car'
  brand.value = ''
  phoneNumber.value = ''
  ownerName.value = ''
  role.value = 'Student'
  gate.value = 1
  entryReason.value = 'RFID Card Failure / Tag Issue'
}

watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) resetForm()
  }
)

const handleSubmit = () => {
  emit('submit', {
    plateNumber: plateNumber.value.trim().toUpperCase(),
    vehicleType: vehicleType.value,
    brand: brand.value.trim(),
    phoneNumber: phoneNumber.value.trim(),
    ownerName: ownerName.value.trim() || 'Manual Guest Entry',
    role: role.value,
    gate: gate.value,
    entryReason: entryReason.value
  })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="modal-backdrop" @click="emit('close')">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <div>
              <h3 class="modal-title">Guard Manual Entry Override</h3>
              <p class="modal-subtitle">Log a manual vehicle check-in when RFID tag scan fails or for guest visitors</p>
            </div>
            <button class="close-btn" @click="emit('close')">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="handleSubmit">
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label for="plateNumber">Plate Number *</label>
                  <input
                    id="plateNumber"
                    v-model="plateNumber"
                    type="text"
                    placeholder="ABC 1234"
                    class="form-input monospace"
                    required
                  />
                </div>

                <div class="form-group">
                  <label for="vehicleType">Vehicle Type *</label>
                  <select id="vehicleType" v-model="vehicleType" class="form-select" required>
                    <option value="Car">Car</option>
                    <option value="Motorcycle">Motorcycle</option>
                    <option value="ElectricBike">E-Bike</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="ownerName">Driver / Owner Name</label>
                  <input
                    id="ownerName"
                    v-model="ownerName"
                    type="text"
                    placeholder="Juan Dela Cruz"
                    class="form-input"
                  />
                </div>

                <div class="form-group">
                  <label for="role">Classification</label>
                  <select id="role" v-model="role" class="form-select">
                    <option value="Student">Student</option>
                    <option value="UniversityStaff">Faculty Member</option>
                    <option value="NonAcademicPersonnel">Staff / NAP</option>
                    <option value="Guard">Security Guard</option>
                    <option value="Guest">Guest / Visitor</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="brand">Vehicle Brand / Model</label>
                  <input
                    id="brand"
                    v-model="brand"
                    type="text"
                    placeholder="Toyota Vios, Yamaha Mio"
                    class="form-input"
                  />
                </div>

                <div class="form-group">
                  <label for="phoneNumber">Contact Phone Number</label>
                  <input
                    id="phoneNumber"
                    v-model="phoneNumber"
                    type="text"
                    placeholder="+639..."
                    class="form-input"
                  />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="gate">Entry Gate *</label>
                  <select id="gate" v-model.number="gate" class="form-select" required>
                    <option :value="1">Gate 1 (Main Gate)</option>
                    <option :value="2">Gate 2 (North Gate)</option>
                    <option :value="3">Gate 3 (South Gate)</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="entryReason">Reason for Manual Entry</label>
                  <select id="entryReason" v-model="entryReason" class="form-select">
                    <option value="RFID Card Failure / Tag Issue">RFID Tag / Scanner Failure</option>
                    <option value="Guest Visitor Pass">Guest Visitor Pass</option>
                    <option value="Manual Guard Override">Manual Guard Override</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="cancel-btn" @click="emit('close')">Cancel</button>
              <button type="submit" class="submit-btn">Log Check-in</button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  background: var(--color-overlay);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
}

.modal-content {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  width: 100%;
  max-width: 540px;
  box-shadow: var(--shadow-modal);
  overflow: hidden;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@media (max-width: 640px) {
  .modal-content {
    max-width: 92vw;
  }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.modal-subtitle {
  font-size: 13px;
  color: var(--color-muted);
  margin: 4px 0 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms ease;
}

.close-btn:hover {
  background: var(--color-surface-lighter);
  color: var(--color-text);
}

.modal-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (max-width: 520px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.form-input,
.form-select {
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface-muted);
  color: var(--color-text);
  font-size: 14px;
  outline: none;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.monospace {
  font-family: var(--font-mono, monospace);
  font-weight: 700;
  letter-spacing: 1px;
}

.form-input:focus,
.form-select:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  background: var(--color-surface-muted);
}

.cancel-btn {
  padding: 10px 18px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 150ms ease;
}

.cancel-btn:hover {
  background: var(--color-surface-lighter);
}

.submit-btn {
  padding: 10px 20px;
  border: none;
  background: #4f46e5;
  color: #ffffff;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 150ms ease;
  box-shadow: 0 2px 6px rgba(79, 70, 229, 0.3);
}

.submit-btn:hover {
  background: #4338ca;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
