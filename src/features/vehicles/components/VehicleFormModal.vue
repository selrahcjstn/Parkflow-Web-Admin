<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Vehicle, VehicleType } from '../types'

const props = defineProps<{
  isOpen: boolean
  vehicleToEdit: Vehicle | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', payload: Omit<Vehicle, 'id' | 'qrCodeHash'> & { id?: string }): void
}>()

const plateNumber = ref('')
const brand = ref('')
const vehicleType = ref<VehicleType>('Car')
const status = ref<'Active' | 'Suspended'>('Active')
const isPrimary = ref(true)
const ownerName = ref('')
const ownerRole = ref('Student')

const resetForm = () => {
  if (props.vehicleToEdit) {
    plateNumber.value = props.vehicleToEdit.plateNumber
    brand.value = props.vehicleToEdit.brand
    vehicleType.value = props.vehicleToEdit.vehicleType
    status.value = props.vehicleToEdit.status
    isPrimary.value = props.vehicleToEdit.isPrimary
    ownerName.value = props.vehicleToEdit.ownerName
    ownerRole.value = props.vehicleToEdit.ownerRole
  } else {
    plateNumber.value = ''
    brand.value = ''
    vehicleType.value = 'Car'
    status.value = 'Active'
    isPrimary.value = true
    ownerName.value = ''
    ownerRole.value = 'Student'
  }
}

watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) resetForm()
  }
)

watch(
  () => props.vehicleToEdit,
  () => {
    resetForm()
  }
)

const handleSubmit = () => {
  emit('submit', {
    id: props.vehicleToEdit?.id,
    plateNumber: plateNumber.value.trim().toUpperCase(),
    brand: brand.value.trim(),
    vehicleType: vehicleType.value,
    status: status.value,
    isPrimary: isPrimary.value,
    ownerName: ownerName.value.trim(),
    ownerRole: ownerRole.value
  })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="modal-backdrop" @click="emit('close')">
        <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">{{ vehicleToEdit ? 'Edit Vehicle Info' : 'Register Vehicle' }}</h3>
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
                class="form-input monospace"
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
                  placeholder="Toyota Vios, Honda Click"
                  class="form-input"
                  required
                />
              </div>
            </div>

            <!-- Owner details in Vehicle forms -->
            <div class="form-row">
              <div class="form-group">
                <label for="ownerName">Owner Full Name</label>
                <input
                  id="ownerName"
                  v-model="ownerName"
                  type="text"
                  placeholder="Juan Dela Cruz"
                  class="form-input"
                  required
                />
              </div>

              <div class="form-group">
                <label for="ownerRole">Classification</label>
                <select id="ownerRole" v-model="ownerRole" class="form-select" required>
                  <option value="Student">Student</option>
                  <option value="UniversityStaff">Faculty</option>
                  <option value="NonAcademicPersonnel">Staff</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="status">System Status</label>
                <select id="status" v-model="status" class="form-select" required>
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>

              <div class="form-group flex-row">
                <label class="checkbox-container">
                  <input type="checkbox" v-model="isPrimary" />
                  <span class="checkmark"></span>
                  Set as Primary Vehicle
                </label>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="cancel-btn" @click="emit('close')">Cancel</button>
            <button type="submit" class="submit-btn">{{ vehicleToEdit ? 'Save Changes' : 'Register Vehicle' }}</button>
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
  inset: 0;
  background: var(--color-overlay);
  backdrop-filter: blur(8px);
  z-index: 9999;
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
  max-width: 480px;
  box-shadow: var(--shadow-modal);
  overflow: hidden;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
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
    gap: 16px;
  }
}

.form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.form-group.flex-row {
  flex-direction: row;
  align-items: flex-end;
  padding-bottom: 8px;
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

.monospace {
  font-family: monospace;
}

/* Custom Checkbox */
.checkbox-container {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  text-transform: none;
  letter-spacing: 0;
  user-select: none;
  position: relative;
}

.checkbox-container input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkmark {
  height: 18px;
  width: 18px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  display: inline-block;
  position: relative;
  transition: all 150ms ease;
}

.checkbox-container:hover input ~ .checkmark {
  border-color: var(--color-muted);
}

.checkbox-container input:checked ~ .checkmark {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}

.checkmark:after {
  content: "";
  position: absolute;
  display: none;
  left: 6px;
  top: 2px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.checkbox-container input:checked ~ .checkmark:after {
  display: block;
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
