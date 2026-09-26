<template>
  <AppLayout
    :title="client.name || 'Clinic Details'"
    subtitle="Tenant configuration, appointment logs, and Meta WhatsApp integration"
  >
    <!-- Top Action Bar -->
    <template #header-actions>
      <router-link
        to="/clients"
        class="inline-flex items-center gap-1.5 px-3 py-2 rounded-[12px] bg-[#0a0d3a] hover:bg-[#23272a] text-[#ffffff] text-[14px] font-[500] border border-[#23272a] transition-colors duration-120"
      >
        <ArrowLeft :size="16" :stroke-width="1.75" />
        <span>Back to Clinics</span>
      </router-link>

      <button
        @click="openEditDrawer"
        class="inline-flex items-center gap-1.5 px-4 py-2 rounded-[12px] bg-[#5865f2] hover:bg-[#4752c4] text-[#ffffff] text-[15px] font-[500] transition-colors duration-120 cursor-pointer"
      >
        <Edit2 :size="16" :stroke-width="1.75" />
        <span>Edit Clinic</span>
      </button>
    </template>

    <!-- Loading Skeleton for Header -->
    <div v-if="isLoading" class="rounded-[16px] bg-[#1e2353] border border-[#23272a] p-6 animate-pulse space-y-3">
      <div class="h-8 w-64 bg-[#0a0d3a] rounded-[8px]"></div>
      <div class="h-4 w-96 bg-[#0a0d3a]/60 rounded-[6px]"></div>
    </div>

    <!-- Client Title Banner with Status Badge alongside -->
    <div v-else class="rounded-[16px] bg-[#1e2353] border border-[#23272a] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="space-y-1.5">
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="text-[28px] sm:text-[34px] font-[800] text-[#ffffff] font-display uppercase tracking-tight leading-[1.1]">
            {{ client.name }}
          </h1>

          <span
            v-if="clientStatus === 'ACTIVE'"
            class="inline-flex items-center gap-1.5 text-[14px] font-[500] text-[#35ed7e]"
          >
            <span class="w-2.5 h-2.5 rounded-full bg-[#35ed7e]"></span>
            Active
          </span>
          <span
            v-else-if="clientStatus === 'WARNING'"
            class="inline-flex items-center gap-1.5 text-[14px] font-[500] text-amber-400"
          >
            <span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            Quota Warning
          </span>
          <span
            v-else
            class="inline-flex items-center gap-1.5 text-[14px] font-[500] text-[#ffffff]/50"
          >
            <span class="w-2.5 h-2.5 rounded-full bg-[#ffffff]/40"></span>
            Revoked
          </span>
        </div>

        <div class="flex items-center gap-3 text-[13px] text-[#ffffff]/60 font-mono">
          <span>Slug: <span class="text-[#00b0f4]">{{ client.slug }}</span></span>
          <span>•</span>
          <span>Phone: <span class="text-[#ffffff]/90">{{ client.phone || client.phoneId }}</span></span>
          <span>•</span>
          <span>Plan: <span class="text-[#35ed7e]">{{ planLabel }}</span></span>
        </div>
      </div>
    </div>

    <!-- Main 2-Column Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- LEFT COLUMN (7 Cols): Settings Summary + Recent Appointments Data Table -->
      <div class="lg:col-span-7 space-y-6">
        <!-- Settings Summary -->
        <div class="rounded-[16px] bg-[#1e2353] border border-[#23272a] p-6 space-y-5">
          <div class="border-b border-[#23272a] pb-3 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <SlidersHorizontal :size="16" :stroke-width="1.75" class="text-[#5865f2]" />
              <h2 class="text-[18px] font-[700] text-[#ffffff] font-display uppercase tracking-tight">
                Clinic Rules &amp; Consultation Timings
              </h2>
            </div>
            <span class="text-[11px] font-mono text-[#ffffff]/40">Active Integration</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[14px]">
            <div class="rounded-[12px] bg-[#0a0d3a] border border-[#23272a] p-3.5 space-y-1">
              <span class="text-[11px] font-[600] uppercase tracking-wider text-[#ffffff]/40 font-display">OPD / Clinic Hours</span>
              <div class="font-[600] text-[#ffffff] font-mono">{{ client.openingTime || '10:00' }} — {{ client.closingTime || '20:30' }}</div>
              <p class="text-[11px] text-[#ffffff]/50">Off-hours: WhatsApp bot collects patient callback details</p>
            </div>

            <div class="rounded-[12px] bg-[#0a0d3a] border border-[#23272a] p-3.5 space-y-1">
              <span class="text-[11px] font-[600] uppercase tracking-wider text-[#ffffff]/40 font-display">Webhook Routing</span>
              <div class="font-[600] text-[#00b0f4] font-mono">/api/v1/meta/{{ client.slug }}</div>
              <p class="text-[11px] text-[#ffffff]/50">Signed HMAC SHA256 validation</p>
            </div>
          </div>

          <!-- Prompt Guardrail -->
          <div class="rounded-[12px] bg-[#0a0d3a] border border-[#23272a] p-4 space-y-1.5">
            <span class="text-[11px] font-[600] uppercase tracking-wider text-[#ffffff]/40 font-display">Custom AI Bot Instructions</span>
            <p class="text-[13px] text-[#ffffff]/80 leading-[1.5]">
              {{ client.promptGuardrail || 'Doctor consultation and appointment scheduling bot.' }}
            </p>
          </div>
        </div>

        <!-- Recent Appointments Data-Table -->
        <div class="rounded-[16px] bg-[#1e2353] border border-[#23272a] p-0 overflow-hidden">
          <div class="p-5 border-b border-[#23272a] flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Calendar :size="16" :stroke-width="1.75" class="text-[#00b0f4]" />
              <h2 class="text-[18px] font-[700] text-[#ffffff] font-display uppercase tracking-tight">
                Recent WhatsApp Appointments
              </h2>
            </div>
            <button
              @click="fetchBookings"
              :disabled="isLoadingBookings"
              class="px-2.5 py-1 rounded-[50px] bg-[#0a0d3a] hover:bg-[#23272a] border border-[#23272a] text-[12px] text-[#ffffff]/80 font-mono transition-colors duration-120 cursor-pointer"
            >
              <RotateCw :size="12" class="inline mr-1" :class="{ 'animate-spin': isLoadingBookings }" />
              Refresh
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse font-sans">
              <thead>
                <tr class="bg-[#0a0d3a]/60 border-b border-[#23272a] text-[12px] font-[600] uppercase tracking-wider text-[#ffffff]/70 font-display">
                  <th class="py-2.5 px-4">Patient Name / Phone</th>
                  <th class="py-2.5 px-4">Party Size</th>
                  <th class="py-2.5 px-4">Appointment Slot</th>
                  <th class="py-2.5 px-4">Status</th>
                  <th class="py-2.5 px-4 text-right">Booked</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#23272a] text-[13px]">
                <template v-if="isLoadingBookings">
                  <tr v-for="n in 3" :key="'b-skel-' + n" class="animate-pulse">
                    <td class="py-3 px-4"><div class="h-3.5 w-28 bg-[#0a0d3a] rounded"></div></td>
                    <td class="py-3 px-4"><div class="h-3.5 w-16 bg-[#0a0d3a] rounded"></div></td>
                    <td class="py-3 px-4"><div class="h-3.5 w-24 bg-[#0a0d3a] rounded"></div></td>
                    <td class="py-3 px-4"><div class="h-5 w-20 bg-[#0a0d3a] rounded-full"></div></td>
                    <td class="py-3 px-4 text-right"><div class="h-3 w-16 bg-[#0a0d3a] rounded ml-auto"></div></td>
                  </tr>
                </template>
                <template v-else-if="recentBookings.length > 0">
                  <tr
                    v-for="booking in recentBookings"
                    :key="booking.id"
                    class="hover:bg-[#0a0d3a]/40 transition-colors duration-120"
                  >
                    <td class="py-2.5 px-4">
                      <div class="font-[600] text-[#ffffff]">{{ booking.guestName || booking.name || 'Patient' }}</div>
                      <div class="text-[11px] text-[#ffffff]/50 font-mono">{{ booking.phone || booking.customerPhone }}</div>
                    </td>
                    <td class="py-2.5 px-4 font-mono text-[#ffffff]/90">
                      {{ booking.guests || booking.partySize || 1 }} patient(s)
                    </td>
                    <td class="py-2.5 px-4 font-mono text-[#00b0f4]">
                      {{ booking.slotTime || booking.bookingDate || 'Today, 5:30 PM' }}
                    </td>
                    <td class="py-2.5 px-4">
                      <span
                        :class="[
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-[50px] text-[11px] font-[600]',
                          booking.status === 'CONFIRMED'
                            ? 'bg-[#35ed7e]/20 text-[#35ed7e] border border-[#35ed7e]/40'
                            : 'bg-[#5865f2]/20 text-[#00b0f4] border border-[#5865f2]/40'
                        ]"
                      >
                        <span class="w-1 h-1 rounded-full bg-current"></span>
                        {{ booking.status || 'CONFIRMED' }}
                      </span>
                    </td>
                    <td class="py-2.5 px-4 text-right text-[11px] text-[#ffffff]/50 font-mono">
                      {{ booking.createdAt || '15m ago' }}
                    </td>
                  </tr>
                </template>
                <template v-else>
                  <tr>
                    <td colspan="5" class="py-6 text-center text-[#ffffff]/50 text-[13px]">
                      No recent appointments received yet for this clinic engine.
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- RIGHT COLUMN (5 Cols): 3 Stacked Panels -->
      <div class="lg:col-span-5 space-y-6">
        <!-- Panel 1: "Quota this month" -->
        <div class="rounded-[40px] bg-gradient-to-br from-[#ec48bd] via-[#b32b8a] to-[#5865f2] p-6 sm:p-7 text-[#ffffff] shadow-[0_3px_68px_rgba(236,72,189,0.22)] space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-[700] uppercase tracking-wider font-display bg-[#000000]/30 px-2.5 py-0.5 rounded-[50px]">
              Quota This Month
            </span>
            <Activity :size="18" :stroke-width="2" />
          </div>

          <div class="space-y-1">
            <div class="text-[36px] font-[800] font-display leading-[1.05]">
              {{ (client.quotaUsed || 0).toLocaleString('en-IN') }}
              <span class="text-[18px] text-[#ffffff]/70 font-[400]">/ {{ (client.quotaMax || 10000).toLocaleString('en-IN') }}</span>
            </div>
            <p class="text-[12px] text-[#ffffff]/90 font-[500]">
              {{ quotaPercent }}% of allocated WhatsApp patient messages consumed
            </p>
          </div>

          <!-- Progress Bar -->
          <div class="w-full h-2 rounded-full bg-[#000000]/40 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-300"
              :style="{ width: `${quotaPercent}%` }"
              :class="[
                quotaPercent >= 95
                  ? 'bg-rose-400'
                  : 'bg-[#ffffff]'
              ]"
            />
          </div>

          <div class="text-[11px] text-[#ffffff]/80 font-mono border-t border-[#ffffff]/20 pt-2 flex items-center justify-between">
            <span>Resets on 1st of month</span>
            <span>Plan: {{ planLabel }}</span>
          </div>
        </div>

        <!-- Panel 2: "WhatsApp connection" -->
        <div class="rounded-[16px] bg-[#1e2353] border border-[#23272a] p-6 space-y-4">
          <div class="border-b border-[#23272a] pb-3 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <MessageSquare :size="16" :stroke-width="1.75" class="text-[#35ed7e]" />
              <h2 class="text-[16px] font-[700] text-[#ffffff] font-display uppercase tracking-tight">
                WhatsApp Connection
              </h2>
            </div>
            <span class="text-[11px] font-mono text-[#35ed7e] flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-[#35ed7e]"></span>
              Meta Graph v21.0
            </span>
          </div>

          <div class="space-y-3 text-[13px]">
            <div class="flex items-center justify-between p-3 rounded-[12px] bg-[#0a0d3a] border border-[#23272a]">
              <span class="text-[#ffffff]/60">Phone Number ID</span>
              <span class="font-mono text-[#ffffff]">{{ maskedPhoneId }}</span>
            </div>

            <div class="flex items-center justify-between p-3 rounded-[12px] bg-[#0a0d3a] border border-[#23272a]">
              <span class="text-[#ffffff]/60">Token Status</span>
              <span class="font-mono text-[#35ed7e] font-[600]">Permanent (Valid)</span>
            </div>
          </div>

          <button
            @click="rotateToken"
            class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[12px] bg-[#0a0d3a] hover:bg-[#23272a] text-[#ffffff] text-[14px] font-[500] border border-[#23272a] transition-colors duration-120 cursor-pointer"
          >
            <Key :size="15" :stroke-width="1.75" class="text-[#00b0f4]" />
            <span>Rotate Token</span>
          </button>
        </div>

        <!-- Panel 3: "Danger zone" -->
        <div class="rounded-[16px] bg-[#1e2353] border border-rose-900/60 p-6 space-y-4">
          <div class="border-b border-rose-900/40 pb-2.5 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <AlertTriangle :size="16" :stroke-width="1.75" class="text-rose-400" />
              <h2 class="text-[16px] font-[700] text-rose-400 font-display uppercase tracking-tight">
                Danger Zone
              </h2>
            </div>
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-[14px] font-[600] text-[#ffffff]">
                  {{ clientStatus === 'REVOKED' ? 'Restore Clinic Engine' : 'Revoke Clinic Access' }}
                </div>
                <p class="text-[12px] text-[#ffffff]/60 mt-0.5 leading-[1.4]">
                  {{ clientStatus === 'REVOKED'
                    ? 'Re-enables webhook ingestion and auto-reply scheduling.'
                    : 'Immediately deactivates automated reservation handlers on WhatsApp.'
                  }}
                </p>
              </div>

              <button
                type="button"
                @click="toggleRevocation"
                :class="clientStatus === 'REVOKED' ? 'bg-[#23272a]' : 'bg-[#5865f2]'"
                class="relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-120 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <span
                  :class="clientStatus !== 'REVOKED' ? 'translate-x-5' : 'translate-x-0'"
                  class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[#ffffff] transition duration-120"
                />
              </button>
            </div>
          </div>

          <div class="border-t border-[#23272a] pt-3">
            <button
              @click="deleteClient"
              class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[12px] border border-rose-800/60 text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 text-[14px] font-[600] transition-colors duration-120 cursor-pointer"
            >
              <Trash2 :size="15" :stroke-width="1.75" />
              <span>Delete Clinic Permanently</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Client Edit Drawer -->
    <ClientDrawer
      :is-open="isEditDrawerOpen"
      :client-data="client"
      @close="isEditDrawerOpen = false"
      @saved="handleClientUpdated"
    />

    <!-- Action Confirmation Dialog -->
    <ConfirmDialog
      :is-open="confirmState.isOpen"
      :title="confirmState.title"
      :description="confirmState.description"
      :type="confirmState.type"
      :confirm-label="confirmState.confirmLabel"
      :confirm-slug="confirmState.confirmSlug"
      @close="confirmState.isOpen = false"
      @confirm="confirmState.onConfirm"
    />

    <!-- Toast Notifications -->
    <AppToast ref="toastRef" />
  </AppLayout>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import ClientDrawer from '@/components/ClientDrawer.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import AppToast from '@/components/AppToast.vue'
import {
  getClient,
  getClientBookings,
  setClientAccess,
  rotateToken as apiRotateToken,
  deleteClient as apiDeleteClient
} from '@/api/clients'
import {
  ArrowLeft,
  Edit2,
  SlidersHorizontal,
  Calendar,
  Activity,
  MessageSquare,
  Key,
  AlertTriangle,
  Trash2,
  RotateCw
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const toastRef = ref(null)
const isEditDrawerOpen = ref(false)
const isLoading = ref(false)
const isLoadingBookings = ref(false)

const client = ref({
  id: route.params.id || 1,
  name: 'Smize Dental Clinic & Implant Center',
  slug: 'smize-dental-pune',
  phone: '+91 98765 43210',
  phoneId: '109876543210987',
  status: 'ACTIVE',
  quotaUsed: 3200,
  quotaMax: 10000,
  plan: 'QUARTERLY',
  mrr: 1000,
  openingTime: '10:00',
  closingTime: '20:30',
  promptGuardrail: 'Dental consultations and implant inquiries. Slot booking duration: 30 minutes.'
})

const recentBookings = ref([
  {
    id: 'b-101',
    guestName: 'Ananya Verma',
    phone: '+91 98111 22334',
    guests: 1,
    slotTime: 'Today, 5:00 PM',
    status: 'CONFIRMED',
    createdAt: '12m ago'
  },
  {
    id: 'b-102',
    guestName: 'Rohan Mehta',
    phone: '+91 98222 33445',
    guests: 2,
    slotTime: 'Today, 6:30 PM',
    status: 'CONFIRMED',
    createdAt: '45m ago'
  },
  {
    id: 'b-103',
    guestName: 'Siddharth Rao',
    phone: '+91 98333 44556',
    guests: 1,
    slotTime: 'Tomorrow, 11:30 AM',
    status: 'PENDING',
    createdAt: '2h ago'
  },
  {
    id: 'b-104',
    guestName: 'Pooja Iyer',
    phone: '+91 98444 55667',
    guests: 1,
    slotTime: 'Tomorrow, 4:30 PM',
    status: 'CONFIRMED',
    createdAt: '5h ago'
  }
])

const confirmState = reactive({
  isOpen: false,
  title: '',
  description: '',
  type: 'warning',
  confirmLabel: 'Confirm',
  confirmSlug: '',
  onConfirm: () => {}
})

onMounted(() => {
  fetchClientData()
  fetchBookings()
})

async function fetchClientData() {
  isLoading.value = true
  try {
    const data = await getClient(route.params.id)
    if (data) {
      client.value = { ...client.value, ...data }
    }
  } catch (err) {
    // Graceful fallback to initial mock state
  } finally {
    isLoading.value = false
  }
}

async function fetchBookings() {
  isLoadingBookings.value = true
  try {
    const data = await getClientBookings(route.params.id)
    if (Array.isArray(data)) {
      recentBookings.value = data
    } else if (data?.bookings) {
      recentBookings.value = data.bookings
    }
  } catch (err) {
    // Keep baseline mock bookings
  } finally {
    isLoadingBookings.value = false
  }
}

const clientStatus = computed(() => {
  if (client.value.status) return client.value.status
  if (client.value.active === false) return 'REVOKED'
  const pct = quotaPercent.value
  if (pct >= 80) return 'WARNING'
  return 'ACTIVE'
})

const planLabel = computed(() => {
  if (client.value.plan === 'QUARTERLY' || client.value.mrr === 1000 || client.value.mrr === 3000) {
    return '₹3,000/qtr'
  }
  return '₹999/mo'
})

const quotaPercent = computed(() => {
  const used = client.value.quotaUsed || 0
  const max = client.value.quotaMax || 10000
  return Math.min(100, Math.round((used / max) * 100))
})

const maskedPhoneId = computed(() => {
  const id = client.value.phoneId || '109876543210987'
  return id.slice(0, 4) + '••••••••' + id.slice(-3)
})

function openEditDrawer() {
  isEditDrawerOpen.value = true
}

function handleClientUpdated(updated) {
  client.value = { ...client.value, ...updated }
  toastRef.value?.showToast({
    title: 'Clinic Updated',
    message: `${client.value.name} configuration saved.`,
    type: 'success'
  })
}

function rotateToken() {
  confirmState.title = 'Rotate WhatsApp Access Token'
  confirmState.description = `Rotating this token will invalidate existing Meta webhook credentials for ${client.value.name}.`
  confirmState.type = 'rotate'
  confirmState.confirmLabel = 'Rotate Token'
  confirmState.confirmSlug = ''
  confirmState.onConfirm = async () => {
    try {
      await apiRotateToken(client.value.id)
      toastRef.value?.showToast({
        title: 'Secret Token Rotated',
        message: 'New Meta webhook permanent signature generated.',
        type: 'info'
      })
    } catch (err) {
      toastRef.value?.showToast({
        title: 'Rotation Failed',
        message: err.response?.data?.message || err.message,
        type: 'error'
      })
    }
  }
  confirmState.isOpen = true
}

function toggleRevocation() {
  if (clientStatus.value === 'REVOKED') {
    confirmState.title = 'Restore WhatsApp Access'
    confirmState.description = `Re-enable automated appointment intake for ${client.value.name}?`
    confirmState.type = 'warning'
    confirmState.confirmLabel = 'Restore Access'
    confirmState.confirmSlug = ''
    confirmState.onConfirm = async () => {
      try {
        await setClientAccess(client.value.id, true)
        client.value.status = 'ACTIVE'
        client.value.active = true
        toastRef.value?.showToast({
          title: 'Engine Restored',
          message: `${client.value.name} WhatsApp automation is now active.`,
          type: 'success'
        })
      } catch (err) {
        toastRef.value?.showToast({
          title: 'Failed to Restore',
          message: err.response?.data?.message || err.message,
          type: 'error'
        })
      }
    }
    confirmState.isOpen = true
  } else {
    confirmState.title = 'Revoke WhatsApp Access'
    confirmState.description = `Are you sure you want to suspend WhatsApp automated appointment services for ${client.value.name}?`
    confirmState.type = 'warning'
    confirmState.confirmLabel = 'Revoke Access'
    confirmState.confirmSlug = ''
    confirmState.onConfirm = async () => {
      try {
        await setClientAccess(client.value.id, false)
        client.value.status = 'REVOKED'
        client.value.active = false
        toastRef.value?.showToast({
          title: 'Engine Revoked',
          message: `${client.value.name} WhatsApp access has been suspended.`,
          type: 'error'
        })
      } catch (err) {
        toastRef.value?.showToast({
          title: 'Failed to Revoke',
          message: err.response?.data?.message || err.message,
          type: 'error'
        })
      }
    }
    confirmState.isOpen = true
  }
}

function deleteClient() {
  confirmState.title = `Delete ${client.value.name}?`
  confirmState.description = 'This action cannot be undone. All patient appointment histories and clinic configurations will be permanently purged.'
  confirmState.type = 'delete'
  confirmState.confirmLabel = 'Delete Clinic'
  confirmState.confirmSlug = client.value.slug
  confirmState.onConfirm = async () => {
    try {
      await apiDeleteClient(client.value.id)
      toastRef.value?.showToast({
        title: 'Clinic Deleted',
        message: `${client.value.name} has been removed. Returning to clinics...`,
        type: 'error'
      })
      setTimeout(() => {
        router.push('/clients')
      }, 1000)
    } catch (err) {
      toastRef.value?.showToast({
        title: 'Delete Failed',
        message: err.response?.data?.message || err.message,
        type: 'error'
      })
    }
  }
  confirmState.isOpen = true
}
</script>
