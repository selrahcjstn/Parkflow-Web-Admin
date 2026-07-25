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
  }): void
}>()

const plateNumber = ref('')
const vehicleType = ref<VehicleType>('Car')
const brand = ref('')
const phoneNumber = ref('')

const resetForm = () => {
  plateNumber.value = ''
  vehicleType.value = 'Car'
  brand.value = ''
  phoneNumber.value = ''
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
    phoneNumber: phoneNumber.value.trim()
  })
}
</script>

<template>
  <Transition name="fade">
    <div v-if="isOpen" class="modal-backdrop" @click="emit('close')">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">Log Manual Entry</h3>
          <button class="close-btn" @click="emit('close')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="modal-body">
            <div class="form-group">
              <label for="plateNumber">Plate Number</label>
              <input
                id="plateNumber"
                v-model="plateNumber"
                type="text"
                placeholder="ABC 1234"
                class="form-input"
                required
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="vehicleType">Vehicle Type</label>
                <select id="vehicleType" v-model="vehicleType" class="form-select" required>
                  <option value="Car">Car</option>
                  <option value="Motorcycle">Motorcycle</option>
                  <option value="ElectricBike">E-Bike</option>
                </select>
              </div>

              <div class="form-group">
                <label for="brand">Brand / Model</label>
                <input
                  id="brand"
                  v-model="brand"
                  type="text"
                  placeholder="Toyota Vios, Yamaha Mio"
                  class="form-input"
                />
              </div>
            </div>

            <div class="form-group">
              <label for="phoneNumber">Owner Contact (Phone Number)</label>
              <input
                id="phoneNumber"
                v-model="phoneNumber"
                type="text"
                placeholder="+639..."
                class="form-input"
              />
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="cancel-btn" @click="emit('close')">Cancel</button>
            <button type="submit" class="submit-btn">Register Entry</button>
          </div>
        </form>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(8px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-content {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  width: 100%;
  max-width: 460px;
  box-shadow: var(--shadow-modal);
  overflow: hidden;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@media (max-width: 640px) {
  .modal-content {
    max-width: 90vw;
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
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
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
  display: flex;
  gap: 16px;
}

@media (max-width: 640px) {
  .form-row {
    flex-direction: column;
  }
}

.form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-input, .form-select {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-button);
  padding: 10px 14px;
  font-size: 14px;
  color: var(--color-text);
  transition: border-color 150ms ease, box-shadow 150ms ease;
  width: 100%;
  box-sizing: border-box;
}

.form-input:focus, .form-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.form-select {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 14px center;
  background-size: 16px;
  padding-right: 40px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-btn {
  background: var(--color-surface-muted);
  border: none;
  color: var(--color-text);
  padding: 10px 18px;
  border-radius: var(--radius-button);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms ease;
}

.cancel-btn:hover {
  background: var(--color-surface-lighter);
}

.submit-btn {
  background: var(--color-primary);
  border: none;
  color: #fff;
  padding: 10px 18px;
  border-radius: var(--radius-button);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms ease;
}

.submit-btn:hover {
  background: var(--color-primary-dark);
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
