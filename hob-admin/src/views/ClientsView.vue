<template>
  <AppLayout
    title="Restaurant Clients"
    subtitle="Manage multi-tenant WhatsApp booking engines, quotas, and credentials"
  >
    <template #header-actions>
      <button
        @click="openAddClient"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-[12px] bg-[#5865f2] hover:bg-[#4752c4] active:bg-[#3c45a5] text-[#ffffff] text-[16px] font-[500] leading-[1.4] transition-colors duration-120 focus:outline-none focus:ring-2 focus:ring-[#5865f2] cursor-pointer"
      >
        <Plus :size="18" :stroke-width="1.75" />
        <span>+ Add Client</span>
      </button>
    </template>

    <!-- Summary Strip: 1 Compact Feature-Card-Gradient (MRR) + Surface-Indigo Stats Container -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
      <!-- ONE Feature-Card-Gradient (Magenta, rounded.xl 40px, compact stat-card, subtle glow) -->
      <div class="lg:col-span-5 rounded-[40px] bg-gradient-to-br from-[#ec48bd] via-[#b32b8a] to-[#5865f2] p-6 text-[#ffffff] shadow-[0_3px_68px_rgba(236,72,189,0.20)] flex flex-col justify-between">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-[700] uppercase tracking-wider font-display bg-[#000000]/30 px-2.5 py-0.5 rounded-[50px]">
            Platform MRR
          </span>
          <Sparkles :size="18" :stroke-width="2" />
        </div>
        <div class="my-2">
          <div class="text-[34px] font-[700] font-display leading-[1.1]">
            ${{ totalMRR.toLocaleString() }}
          </div>
          <p class="text-[12px] text-[#ffffff]/90 font-[500] mt-0.5">
            Active monthly subscriptions
          </p>
        </div>
        <div class="text-[11px] text-[#ffffff]/70 font-mono border-t border-[#ffffff]/20 pt-2 flex justify-between">
          <span>Tier billing cycle</span>
          <span>Next invoice: 1st of month</span>
        </div>
      </div>

      <!-- Plain Text Pairs Container (Surface-Indigo, hairline dividers, no gradient/card chrome) -->
      <div class="lg:col-span-7 rounded-[16px] bg-[#1e2353] border border-[#23272a] p-6 flex flex-col sm:flex-row items-stretch justify-around divide-y sm:divide-y-0 sm:divide-x divide-[#23272a]">
        <!-- Stat Pair 1: Active Clients -->
        <div class="flex-1 px-4 py-2 sm:py-0 flex flex-col justify-center space-y-1">
          <span class="text-[12px] font-[600] uppercase tracking-wider text-[#ffffff]/50 font-display">
            Active Clients
          </span>
          <div class="text-[32px] font-[700] font-display text-[#ffffff] leading-none">
            {{ activeClientsCount }} <span class="text-[16px] text-[#ffffff]/40 font-[400]">/ {{ clients.length }}</span>
          </div>
          <div class="text-[12px] text-[#35ed7e] font-[500] flex items-center gap-1.5 font-mono pt-1">
            <span class="w-1.5 h-1.5 rounded-full bg-[#35ed7e]"></span>
            All bots connected
          </div>
        </div>

        <!-- Stat Pair 2: Quota Warnings -->
        <div class="flex-1 px-4 py-2 sm:py-0 flex flex-col justify-center space-y-1">
          <span class="text-[12px] font-[600] uppercase tracking-wider text-[#ffffff]/50 font-display">
            Quota Warnings
          </span>
          <div class="text-[32px] font-[700] font-display text-[#00b0f4] leading-none">
            {{ warningClientsCount }}
          </div>
          <div class="text-[12px] text-[#00b0f4] font-[500] flex items-center gap-1.5 font-mono pt-1">
            <AlertTriangle :size="13" :stroke-width="2" />
            &gt;80% threshold reached
          </div>
        </div>

        <!-- Stat Pair 3: Total Monthly Bookings -->
        <div class="flex-1 px-4 py-2 sm:py-0 flex flex-col justify-center space-y-1">
          <span class="text-[12px] font-[600] uppercase tracking-wider text-[#ffffff]/50 font-display">
            30d Bookings
          </span>
          <div class="text-[32px] font-[700] font-display text-[#ffffff] leading-none">
            {{ totalBookingsEstimate }}
          </div>
          <div class="text-[12px] text-[#ffffff]/60 font-[500] flex items-center gap-1.5 font-mono pt-1">
            <span>avg 42 / day</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="rounded-[16px] bg-[#1e2353] border border-[#23272a] p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      <!-- Search Input -->
      <div class="relative flex-1 max-w-md">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by client name, slug, or phone..."
          class="w-full rounded-[12px] border border-[#23272a] bg-[#0a0d3a] pl-9 pr-4 py-2 text-[14px] text-[#ffffff] placeholder-[#ffffff]/40 transition-colors duration-120 focus:border-[#5865f2] focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
        />
        <Search :size="16" :stroke-width="1.75" class="absolute left-3 top-2.5 text-[#ffffff]/40" />
      </div>

      <!-- Filters & Actions -->
      <div class="flex items-center gap-3">
        <div class="relative">
          <select
            v-model="statusFilter"
            class="rounded-[12px] border border-[#23272a] bg-[#0a0d3a] px-4 py-2 text-[14px] text-[#ffffff] font-[500] transition-colors duration-120 focus:border-[#5865f2] focus:outline-none focus:ring-2 focus:ring-[#5865f2] cursor-pointer"
          >
            <option value="ALL">All Statuses ({{ clients.length }})</option>
            <option value="ACTIVE">Active ({{ activeClientsCount }})</option>
            <option value="WARNING">Quota Warning ({{ warningClientsCount }})</option>
            <option value="REVOKED">Revoked ({{ revokedClientsCount }})</option>
          </select>
        </div>

        <button
          v-if="searchQuery || statusFilter !== 'ALL'"
          @click="resetFilters"
          class="px-3 py-2 rounded-[12px] bg-[#0a0d3a] hover:bg-[#23272a] text-[#ffffff]/70 hover:text-[#ffffff] text-[13px] font-[500] border border-[#23272a] transition-colors duration-120 cursor-pointer"
        >
          Reset
        </button>

        <button
          @click="fetchClients"
          :disabled="isLoading"
          title="Refresh Data"
          class="w-9 h-9 rounded-[12px] bg-[#0a0d3a] hover:bg-[#23272a] text-[#ffffff]/80 hover:text-[#ffffff] border border-[#23272a] flex items-center justify-center transition-colors duration-120 cursor-pointer disabled:opacity-50"
        >
          <RotateCw :size="16" :stroke-width="1.75" :class="{ 'animate-spin': isLoading }" />
        </button>
      </div>
    </div>

    <!-- Data Table Container with Loading Skeletons -->
    <div class="rounded-[12px] bg-[#0a0d3a] border border-[#23272a] overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse font-sans">
          <thead>
            <tr class="bg-[#1e2353] border-b border-[#23272a] text-[13px] font-[600] uppercase tracking-wider text-[#ffffff]/80 font-display">
              <th class="py-3 px-4">Client Name</th>
              <th class="py-3 px-4">Phone ID</th>
              <th class="py-3 px-4">Status</th>
              <th class="py-3 px-4 min-w-[160px]">Monthly Quota</th>
              <th class="py-3 px-4">MRR Tier</th>
              <th class="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#23272a] text-[14px]">
            <!-- Skeleton Rows while Loading -->
            <template v-if="isLoading">
              <tr v-for="n in 4" :key="'skel-' + n" class="animate-pulse">
                <td class="py-4 px-4">
                  <div class="h-4 w-40 bg-[#1e2353] rounded-[4px] mb-1.5"></div>
                  <div class="h-3 w-24 bg-[#1e2353]/60 rounded-[4px]"></div>
                </td>
                <td class="py-4 px-4">
                  <div class="h-3.5 w-28 bg-[#1e2353] rounded-[4px]"></div>
                </td>
                <td class="py-4 px-4">
                  <div class="h-6 w-20 bg-[#1e2353] rounded-[50px]"></div>
                </td>
                <td class="py-4 px-4">
                  <div class="h-3 w-28 bg-[#1e2353] rounded-[4px] mb-1.5"></div>
                  <div class="h-1.5 w-full bg-[#1e2353] rounded-full"></div>
                </td>
                <td class="py-4 px-4">
                  <div class="h-3.5 w-16 bg-[#1e2353] rounded-[4px]"></div>
                </td>
                <td class="py-4 px-4 text-right">
                  <div class="h-7 w-7 bg-[#1e2353] rounded-full ml-auto"></div>
                </td>
              </tr>
            </template>

            <!-- Rendered Clients Rows -->
            <template v-else-if="filteredClients.length > 0">
              <tr
                v-for="client in filteredClients"
                :key="client.id"
                :class="[
                  'transition-colors duration-120 group relative',
                  client.status === 'REVOKED' || client.active === false ? 'opacity-70 bg-[#0a0d3a]' : 'hover:bg-[#1e2353]/50'
                ]"
              >
                <!-- Client Name & Slug -->
                <td class="py-3 px-4">
                  <router-link
                    :to="`/clients/${client.id}`"
                    class="font-[600] text-[#ffffff] text-[15px] flex items-center gap-2 hover:text-[#5865f2] transition-colors duration-120"
                  >
                    <span>{{ client.name }}</span>
                    <span v-if="client.isFeatured" class="px-1.5 py-0.2 rounded-[4px] bg-[#ec48bd]/20 text-[#ec48bd] text-[10px] font-[700] uppercase">
                      Pro
                    </span>
                  </router-link>
                  <div class="text-[12px] text-[#00b0f4] font-mono">{{ client.slug }}</div>
                </td>

                <!-- WhatsApp Phone ID -->
                <td class="py-3 px-4 font-mono text-[#ffffff]/80 text-[13px]">
                  {{ client.phone || client.phoneId || '—' }}
                </td>

                <!-- Status Column (Badge / Status Pill Component) -->
                <td class="py-3 px-4">
                  <!-- Magenta-tinted Active -->
                  <span
                    v-if="getClientStatus(client) === 'ACTIVE'"
                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-[50px] bg-[#ec48bd]/20 border border-[#ec48bd]/40 text-[#ec48bd] text-[12px] font-[600]"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-[#ec48bd]"></span>
                    Active
                  </span>

                  <!-- Cyan/Amber-tinted Quota Warning -->
                  <span
                    v-else-if="getClientStatus(client) === 'WARNING'"
                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-[50px] bg-[#5865f2]/20 border border-[#5865f2]/50 text-[#00b0f4] text-[12px] font-[600]"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-[#00b0f4]"></span>
                    Quota Warning
                  </span>

                  <!-- Muted-gray Revoked -->
                  <span
                    v-else
                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-[50px] bg-[#23272a] border border-[#333333] text-[#ffffff]/50 text-[12px] font-[500]"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-[#ffffff]/30"></span>
                    Revoked
                  </span>
                </td>

                <!-- Quota Column (Thin progress bar) -->
                <td class="py-3 px-4">
                  <div class="space-y-1">
                    <div class="flex items-center justify-between text-[12px] font-mono">
                      <span class="text-[#ffffff]/70">{{ (client.quotaUsed || 0).toLocaleString() }} / {{ (client.quotaMax || 10000).toLocaleString() }}</span>
                      <span
                        :class="[
                          calculateQuotaPercent(client) >= 95
                            ? 'text-rose-400 font-[700]'
                            : calculateQuotaPercent(client) >= 80
                            ? 'text-[#00b0f4] font-[600]'
                            : 'text-[#ffffff]/60'
                        ]"
                      >
                        {{ calculateQuotaPercent(client) }}%
                      </span>
                    </div>
                    <div class="w-full h-1.5 rounded-full bg-[#23272a] overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all duration-300"
                        :style="{ width: `${calculateQuotaPercent(client)}%` }"
                        :class="[
                          calculateQuotaPercent(client) >= 95
                            ? 'bg-rose-500'
                            : calculateQuotaPercent(client) >= 80
                            ? 'bg-[#00b0f4]'
                            : 'bg-[#5865f2]'
                        ]"
                      />
                    </div>
                  </div>
                </td>

                <!-- MRR Tier -->
                <td class="py-3 px-4 font-mono text-[#ffffff]/80 text-[13px]">
                  ${{ client.mrr || 450 }}/mo
                </td>

                <!-- Actions Kebab Menu -->
                <td class="py-3 px-4 text-right relative">
                  <div class="inline-flex items-center justify-end">
                    <button
                      type="button"
                      @click.stop="toggleKebab(client.id)"
                      class="w-8 h-8 rounded-full hover:bg-[#23272a] text-[#ffffff]/70 hover:text-[#ffffff] flex items-center justify-center transition-colors duration-120 cursor-pointer"
                      aria-label="Actions"
                    >
                      <MoreVertical :size="16" :stroke-width="1.75" />
                    </button>

                    <!-- Kebab Dropdown Menu -->
                    <div
                      v-if="activeKebabId === client.id"
                      class="absolute right-4 top-11 z-30 w-48 rounded-[12px] border border-[#23272a] bg-[#1e2353] shadow-[0_3px_24px_rgba(0,0,0,0.4)] py-1.5 text-left text-[13px] font-sans"
                    >
                      <button
                        @click="handleAction('edit', client)"
                        class="w-full px-3 py-1.5 text-[#ffffff]/90 hover:bg-[#0a0d3a] hover:text-[#ffffff] flex items-center gap-2 transition-colors duration-120 text-left cursor-pointer"
                      >
                        <Edit2 :size="14" :stroke-width="1.75" class="text-[#00b0f4]" />
                        <span>Edit Client</span>
                      </button>

                      <router-link
                        :to="`/clients/${client.id}`"
                        class="w-full px-3 py-1.5 text-[#ffffff]/90 hover:bg-[#0a0d3a] hover:text-[#ffffff] flex items-center gap-2 transition-colors duration-120 text-left"
                      >
                        <Calendar :size="14" :stroke-width="1.75" class="text-[#5865f2]" />
                        <span>View Bookings</span>
                      </router-link>

                      <div class="my-1 border-t border-[#23272a]"></div>

                      <!-- Revoke or Restore -->
                      <button
                        v-if="getClientStatus(client) !== 'REVOKED'"
                        @click="handleAction('revoke', client)"
                        class="w-full px-3 py-1.5 text-[#ffffff]/90 hover:bg-[#0a0d3a] hover:text-[#ffffff] flex items-center gap-2 transition-colors duration-120 text-left cursor-pointer"
                      >
                        <PauseCircle :size="14" :stroke-width="1.75" class="text-amber-400" />
                        <span>Revoke Access</span>
                      </button>
                      <button
                        v-else
                        @click="handleAction('restore', client)"
                        class="w-full px-3 py-1.5 text-[#35ed7e] hover:bg-[#0a0d3a] flex items-center gap-2 transition-colors duration-120 text-left cursor-pointer"
                      >
                        <PlayCircle :size="14" :stroke-width="1.75" class="text-[#35ed7e]" />
                        <span>Restore Access</span>
                      </button>

                      <!-- Rotate token -->
                      <button
                        @click="handleAction('rotate-token', client)"
                        class="w-full px-3 py-1.5 text-[#ffffff]/90 hover:bg-[#0a0d3a] hover:text-[#ffffff] flex items-center gap-2 transition-colors duration-120 text-left cursor-pointer"
                      >
                        <Key :size="14" :stroke-width="1.75" class="text-[#00b0f4]" />
                        <span>Rotate Token</span>
                      </button>

                      <div class="my-1 border-t border-[#23272a]"></div>

                      <!-- Delete -->
                      <button
                        @click="handleAction('delete', client)"
                        class="w-full px-3 py-1.5 text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 flex items-center gap-2 transition-colors duration-120 text-left cursor-pointer font-[500]"
                      >
                        <Trash2 :size="14" :stroke-width="1.75" class="text-rose-400" />
                        <span>Delete Tenant</span>
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Empty State: Allowed to use Feature-Card-Dark with rounded.xl (40px) -->
    <div
      v-if="!isLoading && filteredClients.length === 0"
      class="rounded-[40px] bg-[#1e2353] border border-[#23272a] p-12 text-center max-w-xl mx-auto space-y-5 my-8 shadow-[0_3px_68px_rgba(88,101,242,0.12)]"
    >
      <div class="w-16 h-16 rounded-full bg-[#0a0d3a] border border-[#23272a] flex items-center justify-center text-[#5865f2] mx-auto">
        <UtensilsCrossed :size="28" :stroke-width="1.75" />
      </div>

      <div class="space-y-1.5">
        <h3 class="text-[22px] font-[700] font-display text-[#ffffff] uppercase tracking-tight">
          No matching restaurant clients found
        </h3>
        <p class="text-[14px] text-[#ffffff]/60 max-w-md mx-auto">
          No active or revoked tenant engines matched your query filter. Reset filters or provision a new WhatsApp restaurant tenant.
        </p>
      </div>

      <div class="flex items-center justify-center gap-3 pt-2">
        <button
          @click="resetFilters"
          class="px-4 py-2 rounded-[12px] bg-[#0a0d3a] hover:bg-[#23272a] text-[#ffffff] text-[14px] font-[500] border border-[#23272a] transition-colors duration-120 cursor-pointer"
        >
          Clear Filters
        </button>
        <button
          @click="openAddClient"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-[12px] bg-[#5865f2] hover:bg-[#4752c4] text-[#ffffff] text-[16px] font-[500] transition-colors duration-120 cursor-pointer"
        >
          <Plus :size="18" :stroke-width="1.75" />
          <span>+ Add Client</span>
        </button>
      </div>
    </div>

    <!-- Client Side Panel Drawer -->
    <ClientDrawer
      :is-open="isDrawerOpen"
      :client-data="selectedClient"
      @close="isDrawerOpen = false"
      @saved="handleClientSaved"
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

    <!-- Toast Notification Container -->
    <AppToast ref="toastRef" />
  </AppLayout>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import ClientDrawer from '@/components/ClientDrawer.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import AppToast from '@/components/AppToast.vue'
import {
  getClients,
  setClientAccess,
  rotateToken as apiRotateToken,
  deleteClient as apiDeleteClient
} from '@/api/clients'
import {
  Sparkles,
  Plus,
  Search,
  AlertTriangle,
  MoreVertical,
  Edit2,
  Calendar,
  Key,
  PauseCircle,
  PlayCircle,
  Trash2,
  UtensilsCrossed,
  RotateCw
} from 'lucide-vue-next'

const toastRef = ref(null)
const searchQuery = ref('')
const statusFilter = ref('ALL')
const activeKebabId = ref(null)
const isDrawerOpen = ref(false)
const selectedClient = ref(null)
const isLoading = ref(false)

const clients = ref([])

const confirmState = reactive({
  isOpen: false,
  title: '',
  description: '',
  type: 'warning',
  confirmLabel: 'Confirm',
  confirmSlug: '',
  onConfirm: () => {}
})

// Initial fallback mock data if backend not yet running
const initialClients = [
  {
    id: 1,
    name: 'Spice Factory Rooftop & Lounge',
    slug: 'sf-rooftop-01',
    phone: '+91 98765 43210',
    phoneId: '109876543210987',
    status: 'ACTIVE',
    quotaUsed: 3200,
    quotaMax: 10000,
    mrr: 450,
    isFeatured: true,
    openingTime: '12:00',
    closingTime: '23:30',
    promptGuardrail: 'Max table size 8 guests. Request deposit for terrace tables.'
  },
  {
    id: 2,
    name: 'The Bombay Courtyard Kitchen',
    slug: 'bc-mumbai-02',
    phone: '+91 91234 56789',
    phoneId: '109876543210988',
    status: 'WARNING',
    quotaUsed: 8900,
    quotaMax: 10000,
    mrr: 650,
    isFeatured: false,
    openingTime: '11:30',
    closingTime: '23:00',
    promptGuardrail: 'No outside food or alcohol allowed.'
  },
  {
    id: 3,
    name: 'Heritage Bistro Old Town',
    slug: 'hb-delhi-09',
    phone: '+91 99887 76655',
    phoneId: '109876543210989',
    status: 'REVOKED',
    quotaUsed: 0,
    quotaMax: 5000,
    mrr: 0,
    isFeatured: false,
    openingTime: '10:00',
    closingTime: '22:00',
    promptGuardrail: ''
  },
  {
    id: 4,
    name: 'Saffron & Smoke BBQ Grill',
    slug: 'ss-bangalore-04',
    phone: '+91 97711 22334',
    phoneId: '109876543210990',
    status: 'ACTIVE',
    quotaUsed: 5400,
    quotaMax: 10000,
    mrr: 450,
    isFeatured: false,
    openingTime: '13:00',
    closingTime: '00:00',
    promptGuardrail: 'BBQ pit bookings require 2 hour minimum notice.'
  },
  {
    id: 5,
    name: 'Coastal Haven Seafood Lounge',
    slug: 'ch-goa-07',
    phone: '+91 94455 66778',
    phoneId: '109876543210991',
    status: 'WARNING',
    quotaUsed: 9650,
    quotaMax: 10000,
    mrr: 850,
    isFeatured: true,
    openingTime: '12:00',
    closingTime: '01:00',
    promptGuardrail: 'Catch of the day reservations require card authorization.'
  }
]

onMounted(() => {
  fetchClients()
})

async function fetchClients() {
  isLoading.value = true
  try {
    const data = await getClients()
    clients.value = Array.isArray(data) ? data : (data?.clients || initialClients)
  } catch (err) {
    // Graceful fallback to initial state with non-intrusive toast
    if (clients.value.length === 0) {
      clients.value = initialClients
    }
    toastRef.value?.showToast({
      title: 'API Sync Notice',
      message: err.message || 'Connecting to local development API...',
      type: 'info',
      duration: 3000
    })
  } finally {
    isLoading.value = false
  }
}

function getClientStatus(client) {
  if (client.status) return client.status
  if (client.active === false) return 'REVOKED'
  const pct = calculateQuotaPercent(client)
  if (pct >= 80) return 'WARNING'
  return 'ACTIVE'
}

function calculateQuotaPercent(client) {
  const used = client.quotaUsed || 0
  const max = client.quotaMax || 10000
  return Math.min(100, Math.round((used / max) * 100))
}

const totalMRR = computed(() => {
  return clients.value.reduce((sum, c) => sum + (c.mrr || 450), 0)
})

const totalBookingsEstimate = computed(() => {
  return clients.value.length * 280
})

const activeClientsCount = computed(() => clients.value.filter(c => getClientStatus(c) === 'ACTIVE').length)
const warningClientsCount = computed(() => clients.value.filter(c => getClientStatus(c) === 'WARNING').length)
const revokedClientsCount = computed(() => clients.value.filter(c => getClientStatus(c) === 'REVOKED').length)

const filteredClients = computed(() => {
  return clients.value.filter((client) => {
    const st = getClientStatus(client)
    if (statusFilter.value !== 'ALL' && st !== statusFilter.value) {
      return false
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      const matchName = (client.name || '').toLowerCase().includes(q)
      const matchSlug = (client.slug || '').toLowerCase().includes(q)
      const matchPhone = (client.phone || client.phoneId || '').toLowerCase().includes(q)
      if (!matchName && !matchSlug && !matchPhone) return false
    }
    return true
  })
})

function openAddClient() {
  selectedClient.value = null
  isDrawerOpen.value = true
}

function toggleKebab(id) {
  if (activeKebabId.value === id) {
    activeKebabId.value = null
  } else {
    activeKebabId.value = id
  }
}

function resetFilters() {
  searchQuery.value = ''
  statusFilter.value = 'ALL'
}

function handleClientSaved(savedClient) {
  const index = clients.value.findIndex(c => c.id === savedClient.id)
  if (index >= 0) {
    clients.value[index] = { ...clients.value[index], ...savedClient }
    toastRef.value?.showToast({
      title: 'Client Updated',
      message: `${savedClient.name} settings updated successfully.`,
      type: 'success'
    })
  } else {
    clients.value.unshift(savedClient)
    toastRef.value?.showToast({
      title: 'New Client Created',
      message: `${savedClient.name} provisioned with WhatsApp Webhook.`,
      type: 'success'
    })
  }
}

function handleAction(type, client) {
  activeKebabId.value = null

  if (type === 'edit') {
    selectedClient.value = { ...client }
    isDrawerOpen.value = true
  } else if (type === 'revoke') {
    confirmState.title = 'Revoke WhatsApp Access'
    confirmState.description = `Are you sure you want to suspend WhatsApp automated booking services for ${client.name}?`
    confirmState.type = 'warning'
    confirmState.confirmLabel = 'Revoke Access'
    confirmState.confirmSlug = ''
    confirmState.onConfirm = async () => {
      try {
        await setClientAccess(client.id, false)
        client.status = 'REVOKED'
        client.active = false
        toastRef.value?.showToast({
          title: 'Access Revoked',
          message: `${client.name} WhatsApp webhook suspended.`,
          type: 'error'
        })
      } catch (err) {
        toastRef.value?.showToast({
          title: 'Error Revoking Access',
          message: err.response?.data?.message || err.message,
          type: 'error'
        })
      }
    }
    confirmState.isOpen = true
  } else if (type === 'restore') {
    confirmState.title = 'Restore WhatsApp Access'
    confirmState.description = `Re-enable automated message ingestion for ${client.name}?`
    confirmState.type = 'warning'
    confirmState.confirmLabel = 'Restore Access'
    confirmState.confirmSlug = ''
    confirmState.onConfirm = async () => {
      try {
        await setClientAccess(client.id, true)
        client.status = 'ACTIVE'
        client.active = true
        toastRef.value?.showToast({
          title: 'Access Restored',
          message: `${client.name} is now online.`,
          type: 'success'
        })
      } catch (err) {
        toastRef.value?.showToast({
          title: 'Error Restoring Access',
          message: err.response?.data?.message || err.message,
          type: 'error'
        })
      }
    }
    confirmState.isOpen = true
  } else if (type === 'rotate-token') {
    confirmState.title = 'Rotate Signing Secret'
    confirmState.description = `Generating a new token will invalidate active webhook signatures for ${client.name}.`
    confirmState.type = 'rotate'
    confirmState.confirmLabel = 'Rotate Token'
    confirmState.confirmSlug = ''
    confirmState.onConfirm = async () => {
      try {
        await apiRotateToken(client.id)
        toastRef.value?.showToast({
          title: 'Secret Token Rotated',
          message: `New signing key deployed for ${client.name}.`,
          type: 'info'
        })
      } catch (err) {
        toastRef.value?.showToast({
          title: 'Token Rotation Failed',
          message: err.response?.data?.message || err.message,
          type: 'error'
        })
      }
    }
    confirmState.isOpen = true
  } else if (type === 'delete') {
    confirmState.title = `Delete ${client.name}?`
    confirmState.description = 'This action cannot be undone. All conversation histories and tenant configurations will be permanently purged.'
    confirmState.type = 'delete'
    confirmState.confirmLabel = 'Delete Tenant'
    confirmState.confirmSlug = client.slug
    confirmState.onConfirm = async () => {
      try {
        await apiDeleteClient(client.id)
        clients.value = clients.value.filter(c => c.id !== client.id)
        toastRef.value?.showToast({
          title: 'Tenant Deleted',
          message: `${client.name} permanently removed.`,
          type: 'error'
        })
      } catch (err) {
        toastRef.value?.showToast({
          title: 'Deletion Failed',
          message: err.response?.data?.message || err.message,
          type: 'error'
        })
      }
    }
    confirmState.isOpen = true
  }
}
</script>
