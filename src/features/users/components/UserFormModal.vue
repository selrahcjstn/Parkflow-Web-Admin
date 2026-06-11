<script setup lang="ts">
import { ref, watch } from 'vue'
import type { UserWithDetails, UserRole } from '../types'

const props = defineProps<{
  isOpen: boolean
  userToEdit: UserWithDetails | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', form: any): void
}>()

const form = ref({
  id: '',
  firstName: '',
  lastName: '',
  middleName: '',
  email: '',
  phoneNumber: '',
  role: 'Student' as UserRole,
  status: 'Verified' as 'Verified' | 'Suspended' | 'PendingVerification',
  // Role specific
  studentNumber: '',
  course: '',
  section: '',
  yearLevel: 1,
  idCardNumber: '',
  department: '',
  assignedGate: 1
})

const resetForm = () => {
  form.value = {
    id: '',
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    phoneNumber: '',
    role: 'Student',
    status: 'Verified',
    studentNumber: '',
    course: '',
    section: '',
    yearLevel: 1,
    idCardNumber: '',
    department: '',
    assignedGate: 1
  }
}

watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) {
      if (props.userToEdit) {
        form.value = {
          id: props.userToEdit.id,
          firstName: props.userToEdit.firstName,
          lastName: props.userToEdit.lastName,
          middleName: props.userToEdit.middleName || '',
          email: props.userToEdit.email,
          phoneNumber: props.userToEdit.phoneNumber,
          role: props.userToEdit.role,
          status: props.userToEdit.status,
          studentNumber: props.userToEdit.student?.studentNumber || '',
          course: props.userToEdit.student?.course || '',
          section: props.userToEdit.student?.section || '',
          yearLevel: props.userToEdit.student?.yearLevel || 1,
          idCardNumber: props.userToEdit.personnel?.idCardNumber || '',
          department: props.userToEdit.personnel?.department || '',
          assignedGate: props.userToEdit.guard?.assignedGate || 1
        }
      } else {
        resetForm()
      }
    }
  }
)

const handleSubmit = () => {
  emit('submit', { ...form.value })
}
</script>

<template>
  <Transition name="fade">
    <div v-if="isOpen" class="modal-backdrop" @click="emit('close')">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">{{ userToEdit ? 'Edit User Account' : 'Register New User' }}</h3>
          <button class="close-btn" @click="emit('close')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="modal-body">
            <!-- Basic Details -->
            <div class="form-row">
              <div class="form-group">
                <label for="firstName">First Name</label>
                <input id="firstName" v-model="form.firstName" type="text" required />
              </div>
              <div class="form-group">
                <label for="lastName">Last Name</label>
                <input id="lastName" v-model="form.lastName" type="text" required />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="email">Email Address</label>
                <input id="email" v-model="form.email" type="email" required />
              </div>
              <div class="form-group">
                <label for="phone">Phone Number</label>
                <input id="phone" v-model="form.phoneNumber" type="text" placeholder="+639..." required />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="role">User Role</label>
                <select id="role" v-model="form.role" class="form-select">
                  <option value="Student">Student</option>
                  <option value="UniversityStaff">University Staff (Faculty)</option>
                  <option value="NonAcademicPersonnel">Non-Academic Personnel</option>
                  <option value="Guard">Security Guard</option>
                  <option value="Admin">Administrator</option>
                </select>
              </div>
              <div class="form-group">
                <label for="status">Account Status</label>
                <select id="status" v-model="form.status" class="form-select">
                  <option value="Verified">Verified</option>
                  <option value="PendingVerification">Pending Verification</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            <!-- Dynamic Role-Specific Fields -->
            <div class="divider"></div>

            <!-- Student Fields -->
            <div v-if="form.role === 'Student'" class="role-fields">
              <h4 class="fields-title">Student Credentials</h4>
              <div class="form-row">
                <div class="form-group">
                  <label for="studentNum">Student Number</label>
                  <input id="studentNum" v-model="form.studentNumber" type="text" placeholder="202X-XXXXX" required />
                </div>
                <div class="form-group">
                  <label for="course">Course</label>
                  <input id="course" v-model="form.course" type="text" placeholder="BSCS, BSIT, etc." required />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="section">Section</label>
                  <input id="section" v-model="form.section" type="text" placeholder="CS-4A" required />
                </div>
                <div class="form-group">
                  <label for="yearLvl">Year Level</label>
                  <input id="yearLvl" v-model.number="form.yearLevel" type="number" min="1" max="6" required />
                </div>
              </div>
            </div>

            <!-- Staff/Faculty Fields -->
            <div v-if="form.role === 'UniversityStaff' || form.role === 'NonAcademicPersonnel'" class="role-fields">
              <h4 class="fields-title">Employee Details</h4>
              <div class="form-row">
                <div class="form-group">
                  <label for="idCard">ID Card Number</label>
                  <input id="idCard" v-model="form.idCardNumber" type="text" placeholder="EMP-XXXX" required />
                </div>
                <div class="form-group">
                  <label for="dept">Department</label>
                  <input id="dept" v-model="form.department" type="text" placeholder="Engineering, Registrar, etc." required />
                </div>
              </div>
            </div>

            <!-- Guard Fields -->
            <div v-if="form.role === 'Guard'" class="role-fields">
              <h4 class="fields-title">Guard Assignment</h4>
              <div class="form-row">
                <div class="form-group">
                  <label for="gate">Assigned Gate Number</label>
                  <input id="gate" v-model.number="form.assignedGate" type="number" min="1" max="10" required />
                </div>
              </div>
            </div>

            <!-- Admin Fields -->
            <div v-if="form.role === 'Admin'" class="role-fields">
              <h4 class="fields-title">Administrator System Key</h4>
              <div class="no-fields-needed">
                System admin rights will be granted upon creation.
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="cancel-btn" @click="emit('close')">Cancel</button>
            <button type="submit" class="submit-btn">{{ userToEdit ? 'Save Changes' : 'Create Account' }}</button>
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
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
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
  max-width: 580px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-card);
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
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: flex;
  gap: 16px;
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

input, select {
  background: var(--color-surface-lighter);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-button);
  padding: 10px 14px;
  font-size: 14px;
  color: var(--color-text);
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

input:focus, select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-glow);
}

.form-select {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23b5bac1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 14px center;
  background-size: 16px;
  padding-right: 40px;
}

.divider {
  height: 1px;
  background: var(--color-border);
  margin: 8px 0;
}

.fields-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
  text-transform: uppercase;
  letter-spacing: 0.75px;
  margin: 0 0 12px 0;
}

.role-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.no-fields-needed {
  padding: 16px;
  background: var(--color-surface-muted);
  border-radius: var(--radius-button);
  color: var(--color-muted);
  font-size: 13px;
  text-align: center;
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
  background: #dc2626;
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
