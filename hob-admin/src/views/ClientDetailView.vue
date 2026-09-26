<template>
  <AppLayout
    :title="client.name || 'Client Details'"
    subtitle="Tenant configuration, live bookings, and Meta WhatsApp integration"
  >
    <!-- Top Action Bar -->
    <template #header-actions>
      <router-link
        to="/clients"
        class="inline-flex items-center gap-1.5 px-3 py-2 rounded-[12px] bg-[#0a0d3a] hover:bg-[#23272a] text-[#ffffff] text-[14px] font-[500] border border-[#23272a] transition-colors duration-120"
      >
        <ArrowLeft :size="16" :stroke-width="1.75" />
        <span>Back to Clients</span>
      </router-link>

      <button
        @click="openEditDrawer"
        class="inline-flex items-center gap-1.5 px-4 py-2 rounded-[12px] bg-[#5865f2] hover:bg-[#4752c4] text-[#ffffff] text-[15px] font-[500] transition-colors duration-120 cursor-pointer"
      >
        <Edit2 :size="16" :stroke-width="1.75" />
        <span>Edit Client</span>
      </button>
    </template>

    <!-- Client Title Banner with Status Badge alongside -->
    <div class="rounded-[16px] bg-[#1e2353] border border-[#23272a] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="space-y-1.5">
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="text-[28px] sm:text-[34px] font-[800] text-[#ffffff] font-display uppercase tracking-tight leading-[1.1]">
            {{ client.name }}
          </h1>

          <!-- Status Badge / Status Pill -->
          <span
            v-if="client.status === 'ACTIVE'"
            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-[50px] bg-[#ec48bd]/20 border border-[#ec48bd]/40 text-[#ec48bd] text-[12px] font-[600]"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-[#ec48bd]"></span>
            Active
          </span>
          <span
            v-else-if="client.status === 'WARNING'"
            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-[50px] bg-[#5865f2]/20 border border-[#5865f2]/50 text-[#00b0f4] text-[12px] font-[600]"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-[#00b0f4]"></span>
            Quota Warning
          </span>
          <span
            v-else-if="client.status === 'REVOKED'"
            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-[50px] bg-[#23272a] border border-[#333333] text-[#ffffff]/50 text-[12px] font-[500]"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-[#ffffff]/30"></span>
            Revoked
          </span>
        </div>

        <div class="flex items-center gap-3 text-[13px] text-[#ffffff]/60 font-mono">
          <span>Slug: <span class="text-[#00b0f4]">{{ client.slug }}</span></span>
          <span>•</span>
          <span>Phone: <span class="text-[#ffffff]/90">{{ client.phone }}</span></span>
          <span>•</span>
          <span>MRR: <span class="text-[#35ed7e]">${{ client.mrr }}/mo</span></span>
        </div>
      </div>
    </div>

    <!-- Main 2-Column Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- LEFT COLUMN (7 Cols): Settings Summary + Recent Bookings Data Table -->
      <div class="lg:col-span-7 space-y-6">
        <!-- Settings Summary: Flat Surface-Indigo Card (rounded.lg 16px, hairline border, NOT gradient) -->
        <div class="rounded-[16px] bg-[#1e2353] border border-[#23272a] p-6 space-y-5">
          <div class="border-b border-[#23272a] pb-3 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <SlidersHorizontal :size="16" :stroke-width="1.75" class="text-[#5865f2]" />
              <h2 class="text-[18px] font-[700] text-[#ffffff] font-display uppercase tracking-tight">
                Engine &amp; Business Rules
              </h2>
            </div>
            <span class="text-[11px] font-mono text-[#ffffff]/40">Last updated 2h ago</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[14px]">
            <div class="rounded-[12px] bg-[#0a0d3a] border border-[#23272a] p-3.5 space-y-1">
              <span class="text-[11px] font-[600] uppercase tracking-wider text-[#ffffff]/40 font-display">Operating Hours</span>
              <div class="font-[600] text-[#ffffff] font-mono">{{ client.openingTime }} — {{ client.closingTime }}</div>
              <p class="text-[11px] text-[#ffffff]/50">Outside hours: AI collects callback details</p>
            </div>

            <div class="rounded-[12px] bg-[#0a0d3a] border border-[#23272a] p-3.5 space-y-1">
              <span class="text-[11px] font-[600] uppercase tracking-wider text-[#ffffff]/40 font-display">Webhook Routing</span>
              <div class="font-[600] text-[#00b0f4] font-mono">/api/v1/meta/{{ client.slug }}</div>
              <p class="text-[11px] text-[#ffffff]/50">Signed HMAC SHA256 validation</p>
            </div>
          </div>

          <!-- Prompt Guardrail -->
          <div class="rounded-[12px] bg-[#0a0d3a] border border-[#23272a] p-4 space-y-1.5">
            <span class="text-[11px] font-[600] uppercase tracking-wider text-[#ffffff]/40 font-display">Custom AI Bot Guardrails</span>
            <p class="text-[13px] text-[#ffffff]/80 leading-[1.5]">
              {{ client.promptGuardrail || 'No custom guardrails configured. Using platform baseline.' }}
            </p>
          </div>
        </div>

        <!-- Recent Bookings Data-Table (Matching List Table Spec) -->
        <div class="rounded-[16px] bg-[#1e2353] border border-[#23272a] p-0 overflow-hidden">
          <div class="p-5 border-b border-[#23272a] flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Calendar :size="16" :stroke-width="1.75" class="text-[#00b0f4]" />
              <h2 class="text-[18px] font-[700] text-[#ffffff] font-display uppercase tracking-tight">
                Recent WhatsApp Bookings
              </h2>
            </div>
            <span class="px-2.5 py-0.5 rounded-[50px] bg-[#0a0d3a] border border-[#23272a] text-[12px] text-[#ffffff]/70 font-mono">
              Live Stream
            </span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse font-sans">
              <thead>
                <tr class="bg-[#0a0d3a]/60 border-b border-[#23272a] text-[12px] font-[600] uppercase tracking-wider text-[#ffffff]/70 font-display">
                  <th class="py-2.5 px-4">Guest Name / Phone</th>
                  <th class="py-2.5 px-4">Party</th>
                  <th class="py-2.5 px-4">Slot Time</th>
                  <th class="py-2.5 px-4">Status</th>
                  <th class="py-2.5 px-4 text-right">Created</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#23272a] text-[13px]">
                <tr
                  v-for="booking in recentBookings"
                  :key="booking.id"
                  class="hover:bg-[#0a0d3a]/40 transition-colors duration-120"
                >
                  <td class="py-2.5 px-4">
                    <div class="font-[600] text-[#ffffff]">{{ booking.guestName }}</div>
                    <div class="text-[11px] text-[#ffffff]/50 font-mono">{{ booking.phone }}</div>
                  </td>
                  <td class="py-2.5 px-4 font-mono text-[#ffffff]/90">
                    {{ booking.guests }} guests
                  </td>
                  <td class="py-2.5 px-4 font-mono text-[#00b0f4]">
                    {{ booking.slotTime }}
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
                      {{ booking.status }}
                    </span>
                  </td>
                  <td class="py-2.5 px-4 text-right text-[11px] text-[#ffffff]/50 font-mono">
                    {{ booking.createdAt }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- RIGHT COLUMN (5 Cols): 3 Stacked Panels -->
      <div class="lg:col-span-5 space-y-6">
        <!-- Panel 1: "Quota this month" (The ONE feature-card-gradient spotlight card, magenta, rounded.xl 40px) -->
        <div class="rounded-[40px] bg-gradient-to-br from-[#ec48bd] via-[#b32b8a] to-[#5865f2] p-6 sm:p-7 text-[#ffffff] shadow-[0_3px_68px_rgba(236,72,189,0.22)] space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-[700] uppercase tracking-wider font-display bg-[#000000]/30 px-2.5 py-0.5 rounded-[50px]">
              Quota This Month
            </span>
            <Activity :size="18" :stroke-width="2" />
          </div>

          <div class="space-y-1">
            <div class="text-[36px] font-[800] font-display leading-[1.05]">
              {{ client.quotaUsed?.toLocaleString() }}
              <span class="text-[18px] text-[#ffffff]/70 font-[400]">/ {{ client.quotaMax?.toLocaleString() }}</span>
            </div>
            <p class="text-[12px] text-[#ffffff]/90 font-[500]">
              {{ client.quotaPercent }}% of allocated WhatsApp messages consumed
            </p>
          </div>

          <!-- Progress Bar -->
          <div class="w-full h-2 rounded-full bg-[#000000]/40 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-300"
              :style="{ width: `${client.quotaPercent}%` }"
              :class="[
                client.quotaPercent >= 95
                  ? 'bg-rose-400'
                  : client.quotaPercent >= 80
                  ? 'bg-[#ffffff]'
                  : 'bg-[#ffffff]'
              ]"
            />
          </div>

          <div class="text-[11px] text-[#ffffff]/80 font-mono border-t border-[#ffffff]/20 pt-2 flex items-center justify-between">
            <span>Resets on 1st of month</span>
            <span>Billing tier: ${{ client.mrr }}/mo</span>
          </div>
        </div>

        <!-- Panel 2: "WhatsApp connection" (Flat surface-indigo card, masked phone ID, token status, button-ghost Rotate) -->
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
            <!-- Masked Phone ID -->
            <div class="flex items-center justify-between p-3 rounded-[12px] bg-[#0a0d3a] border border-[#23272a]">
              <span class="text-[#ffffff]/60">Phone Number ID</span>
              <span class="font-mono text-[#ffffff]">{{ maskedPhoneId }}</span>
            </div>

            <!-- Token Status -->
            <div class="flex items-center justify-between p-3 rounded-[12px] bg-[#0a0d3a] border border-[#23272a]">
              <span class="text-[#ffffff]/60">Token Status</span>
              <span class="font-mono text-[#35ed7e] font-[600]">Permanent (Valid)</span>
            </div>
          </div>

          <!-- Rotate Token Button (button-ghost) -->
          <button
            @click="rotateToken"
            class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[12px] bg-[#0a0d3a] hover:bg-[#23272a] text-[#ffffff] text-[14px] font-[500] border border-[#23272a] transition-colors duration-120 cursor-pointer"
          >
            <Key :size="15" :stroke-width="1.75" class="text-[#00b0f4]" />
            <span>Rotate Token</span>
          </button>
        </div>

        <!-- Panel 3: "Danger zone" (Surface-indigo card with danger-tinted hairline border, Revoke toggle, Delete button) -->
        <div class="rounded-[16px] bg-[#1e2353] border border-rose-900/60 p-6 space-y-4">
          <div class="border-b border-rose-900/40 pb-2.5 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <AlertTriangle :size="16" :stroke-width="1.75" class="text-rose-400" />
              <h2 class="text-[16px] font-[700] text-rose-400 font-display uppercase tracking-tight">
                Danger Zone
              </h2>
            </div>
          </div>

          <!-- Revoke / Restore Toggle Action -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-[14px] font-[600] text-[#ffffff]">
                  {{ client.status === 'REVOKED' ? 'Restore Client Engine' : 'Revoke Client Access' }}
                </div>
                <p class="text-[12px] text-[#ffffff]/60 mt-0.5 leading-[1.4]">
                  {{ client.status === 'REVOKED'
                    ? 'Re-enables webhook ingestion and auto-reply scheduling.'
                    : 'Immediately deactivates automated reservation handlers on WhatsApp.'
                  }}
                </p>
              </div>

              <!-- Toggle -->
              <button
                type="button"
                @click="toggleRevocation"
                :class="client.status === 'REVOKED' ? 'bg-[#23272a]' : 'bg-[#5865f2]'"
                class="relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-120 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <span
                  :class="client.status !== 'REVOKED' ? 'translate-x-5' : 'translate-x-0'"
                  class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[#ffffff] transition duration-120"
                />
              </button>
            </div>
          </div>

          <!-- Hairline Divider -->
          <div class="border-t border-[#23272a] pt-3">
            <button
              @click="deleteClient"
              class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[12px] border border-rose-800/60 text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 text-[14px] font-[600] transition-colors duration-120 cursor-pointer"
            >
              <Trash2 :size="15" :stroke-width="1.75" />
              <span>Delete Client Permanently</span>
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

    <!-- Toast Notifications -->
    <AppToast ref="toastRef" />
  </AppLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import ClientDrawer from '@/components/ClientDrawer.vue'
import AppToast from '@/components/AppToast.vue'
import {
  ArrowLeft,
  Edit2,
  SlidersHorizontal,
  Calendar,
  Activity,
  MessageSquare,
  Key,
  AlertTriangle,
  Trash2
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const toastRef = ref(null)
const isEditDrawerOpen = ref(false)

// Sample database matching the list screen
const mockClients = {
  1: {
    id: 1,
    name: 'Spice Factory Rooftop & Lounge',
    slug: 'sf-rooftop-01',
    phone: '+91 98765 43210',
    phoneId: '109876543210987',
    status: 'ACTIVE',
    quotaUsed: 3200,
    quotaMax: 10000,
    quotaPercent: 32,
    mrr: 450,
    openingTime: '12:00',
    closingTime: '23:30',
    promptGuardrail: 'Max table size 8 guests. Request deposit for terrace tables.',
    isFeatured: true
  },
  2: {
    id: 2,
    name: 'The Bombay Courtyard Kitchen',
    slug: 'bc-mumbai-02',
    phone: '+91 91234 56789',
    phoneId: '109876543210988',
    status: 'WARNING',
    quotaUsed: 8900,
    quotaMax: 10000,
    quotaPercent: 89,
    mrr: 650,
    openingTime: '11:30',
    closingTime: '23:00',
    promptGuardrail: 'No outside food or alcohol allowed.',
    isFeatured: false
  },
  3: {
    id: 3,
    name: 'Heritage Bistro Old Town',
    slug: 'hb-delhi-09',
    phone: '+91 99887 76655',
    phoneId: '109876543210989',
    status: 'REVOKED',
    quotaUsed: 0,
    quotaMax: 5000,
    quotaPercent: 0,
    mrr: 0,
    openingTime: '10:00',
    closingTime: '22:00',
    promptGuardrail: '',
    isFeatured: false
  }
}

const clientId = route.params.id || 1
const client = ref(mockClients[clientId] || mockClients[1])

const maskedPhoneId = computed(() => {
  const id = client.value.phoneId || '109876543210987'
  return id.slice(0, 4) + '••••••••' + id.slice(-3)
})

const recentBookings = ref([
  {
    id: 'b-101',
    guestName: 'Ananya Verma',
    phone: '+91 98111 22334',
    guests: 4,
    slotTime: 'Today, 8:00 PM',
    status: 'CONFIRMED',
    createdAt: '12m ago'
  },
  {
    id: 'b-102',
    guestName: 'Rohan Mehta',
    phone: '+91 98222 33445',
    guests: 2,
    slotTime: 'Today, 9:30 PM',
    status: 'CONFIRMED',
    createdAt: '45m ago'
  },
  {
    id: 'b-103',
    guestName: 'Siddharth Rao',
    phone: '+91 98333 44556',
    guests: 6,
    slotTime: 'Tomorrow, 1:30 PM',
    status: 'PENDING',
    createdAt: '2h ago'
  },
  {
    id: 'b-104',
    guestName: 'Pooja Iyer',
    phone: '+91 98444 55667',
    guests: 3,
    slotTime: 'Tomorrow, 8:30 PM',
    status: 'CONFIRMED',
    createdAt: '5h ago'
  }
])

function openEditDrawer() {
  isEditDrawerOpen.value = true
}

function handleClientUpdated(updated) {
  client.value = { ...client.value, ...updated }
  toastRef.value?.showToast({
    title: 'Client Updated',
    message: `${client.value.name} configuration saved.`,
    type: 'success'
  })
}

function rotateToken() {
  toastRef.value?.showToast({
    title: 'Secret Token Rotated',
    message: 'New Meta webhook permanent signature generated.',
    type: 'info'
  })
}

function toggleRevocation() {
  if (client.value.status === 'REVOKED') {
    client.value.status = 'ACTIVE'
    toastRef.value?.showToast({
      title: 'Engine Restored',
      message: `${client.value.name} WhatsApp automation is now active.`,
      type: 'success'
    })
  } else {
    client.value.status = 'REVOKED'
    toastRef.value?.showToast({
      title: 'Engine Revoked',
      message: `${client.value.name} WhatsApp access has been suspended.`,
      type: 'error'
    })
  }
}

function deleteClient() {
  toastRef.value?.showToast({
    title: 'Tenant Deleted',
    message: `${client.value.name} has been removed. Returning to clients...`,
    type: 'error'
  })
  setTimeout(() => {
    router.push('/clients')
  }, 1200)
}
</script>
