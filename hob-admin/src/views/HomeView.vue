<template>
  <AppLayout
    title="Overview &amp; Telemetry"
    subtitle="Multi-Tenant WhatsApp Booking &amp; Appointment Engine console"
    action-label="New Clinic"
    @action="handleCreateTenant"
  >
    <!-- Template Actions Override -->
    <template #header-actions>
      <button
        class="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-[12px] bg-[#0a0d3a] hover:bg-[#23272a] text-[#ffffff] text-[14px] font-[500] border border-[#23272a] transition-colors duration-120 cursor-pointer"
      >
        <RotateCw :size="16" :stroke-width="1.75" />
        <span>Refresh Sync</span>
      </button>

      <router-link
        to="/clients"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-[12px] bg-[#5865f2] hover:bg-[#4752c4] active:bg-[#3c45a5] text-[#ffffff] text-[16px] font-[500] leading-[1.4] transition-colors duration-120 focus:outline-none focus:ring-2 focus:ring-[#5865f2] cursor-pointer"
      >
        <Plus :size="18" :stroke-width="1.75" />
        <span>Onboard Clinic</span>
      </router-link>
    </template>

    <!-- Top Grid: 1 Spotlight Feature Card (Magenta gradient with diffuse glow) + 3 Standard Surface-Indigo Metric Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 1 Spotlight Stat (Magenta Gradient, rounded.xl 40px) -->
      <div class="rounded-[40px] bg-gradient-to-br from-[#ec48bd] via-[#b32b8a] to-[#5865f2] p-6 text-[#ffffff] shadow-[0_3px_68px_rgba(236,72,189,0.22)] flex flex-col justify-between">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-[700] uppercase tracking-wider font-display bg-[#000000]/30 px-2.5 py-0.5 rounded-[50px]">
            Platform MRR
          </span>
          <Sparkles :size="18" :stroke-width="2" />
        </div>
        <div class="my-4">
          <div class="text-[36px] font-[700] font-display leading-[1.1]">₹32,000</div>
          <div class="text-[12px] text-[#ffffff]/90 font-[500] mt-1">+18.4% recurring subscriptions</div>
        </div>
        <div class="text-[11px] text-[#ffffff]/70 font-mono border-t border-[#ffffff]/20 pt-2">
          32 Active Clinic &amp; Service Tenants
        </div>
      </div>

      <!-- Metric 2: Surface Indigo (rounded.lg 16px) -->
      <div class="rounded-[16px] bg-[#1e2353] border border-[#23272a] p-5 flex flex-col justify-between">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-[700] uppercase tracking-wider font-display text-[#ffffff]/60">
            Total Conversations
          </span>
          <MessageSquare :size="18" :stroke-width="1.75" class="text-[#5865f2]" />
        </div>
        <div class="my-3">
          <div class="text-[32px] font-[700] font-display text-[#ffffff]">42,890</div>
          <div class="text-[12px] text-[#35ed7e] font-[500] flex items-center gap-1 mt-0.5 font-mono">
            <span class="w-1.5 h-1.5 rounded-full bg-[#35ed7e]"></span>
            99.98% WhatsApp API health
          </div>
        </div>
        <div class="text-[11px] text-[#ffffff]/40 border-t border-[#23272a] pt-2">
          Past 30 days throughput
        </div>
      </div>

      <!-- Metric 3: Surface Indigo (rounded.lg 16px) -->
      <div class="rounded-[16px] bg-[#1e2353] border border-[#23272a] p-5 flex flex-col justify-between">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-[700] uppercase tracking-wider font-display text-[#ffffff]/60">
            Appointments Booked
          </span>
          <Calendar :size="18" :stroke-width="1.75" class="text-[#00b0f4]" />
        </div>
        <div class="my-3">
          <div class="text-[32px] font-[700] font-display text-[#ffffff]">1,284</div>
          <div class="text-[12px] text-[#00b0f4] font-[500] mt-0.5 font-mono">
            84% auto-scheduled by AI
          </div>
        </div>
        <div class="text-[11px] text-[#ffffff]/40 border-t border-[#23272a] pt-2">
          Average party / patient count: 1.2
        </div>
      </div>

      <!-- Metric 4: Surface Indigo (rounded.lg 16px) -->
      <div class="rounded-[16px] bg-[#1e2353] border border-[#23272a] p-5 flex flex-col justify-between">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-[700] uppercase tracking-wider font-display text-[#ffffff]/60">
            Webhook Latency
          </span>
          <Activity :size="18" :stroke-width="1.75" class="text-[#35ed7e]" />
        </div>
        <div class="my-3">
          <div class="text-[32px] font-[700] font-display text-[#ffffff]">68ms</div>
          <div class="text-[12px] text-[#ffffff]/70 font-[500] mt-0.5 font-mono">
            4 worker nodes active
          </div>
        </div>
        <div class="text-[11px] text-[#ffffff]/40 border-t border-[#23272a] pt-2">
          0 dropped webhooks in 24h
        </div>
      </div>
    </div>

    <!-- Main Content Panel: Active Clinic Tenants Data Table -->
    <div class="rounded-[16px] bg-[#1e2353] border border-[#23272a] overflow-hidden">
      <!-- Panel Header -->
      <div class="p-5 border-b border-[#23272a] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-[22px] font-[700] text-[#ffffff] font-display leading-[1.2]">
            Active Clinic Tenants
          </h2>
          <p class="text-[13px] text-[#ffffff]/60 mt-0.5">
            Real-time status of multi-tenant WhatsApp appointment engines
          </p>
        </div>

        <div class="flex items-center gap-3">
          <div class="relative">
            <input
              type="text"
              placeholder="Search clinic or phone..."
              class="w-64 rounded-[12px] border border-[#23272a] bg-[#0a0d3a] pl-9 pr-3 py-1.5 text-[14px] text-[#ffffff] placeholder-[#ffffff]/40 focus:border-[#5865f2] focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
            />
            <Search :size="15" :stroke-width="1.75" class="absolute left-3 top-2.5 text-[#ffffff]/40" />
          </div>

          <router-link
            to="/clients"
            class="px-3 py-1.5 rounded-[12px] bg-[#0a0d3a] hover:bg-[#23272a] text-[#ffffff] text-[14px] font-[500] border border-[#23272a] flex items-center gap-1.5 transition-colors duration-120"
          >
            <Filter :size="15" :stroke-width="1.75" />
            <span>Manage All</span>
          </router-link>
        </div>
      </div>

      <!-- Dense Data Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse font-sans">
          <thead>
            <tr class="bg-[#0a0d3a]/60 border-b border-[#23272a] text-[13px] font-[600] uppercase tracking-wider text-[#ffffff]/70">
              <th class="py-3 px-5">Clinic Tenant</th>
              <th class="py-3 px-5">Phone ID</th>
              <th class="py-3 px-5">Engine Status</th>
              <th class="py-3 px-5">Today's Appointments</th>
              <th class="py-3 px-5">Plan</th>
              <th class="py-3 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#23272a] text-[14px]">
            <!-- Row 1 -->
            <tr class="hover:bg-[#0a0d3a]/40 transition-colors duration-120">
              <td class="py-3 px-5">
                <div class="font-[600] text-[#ffffff] text-[15px]">Smize Dental Clinic &amp; Implant Center</div>
                <div class="text-[12px] text-[#00b0f4] font-mono">tenant_smize_dental_01</div>
              </td>
              <td class="py-3 px-5 font-mono text-[#ffffff]/80">
                +91 98765 43210
              </td>
              <td class="py-3 px-5">
                <span class="inline-flex items-center gap-1.5 text-[13px] font-[500] text-[#35ed7e]">
                  <span class="w-2 h-2 rounded-full bg-[#35ed7e]"></span>
                  Active
                </span>
              </td>
              <td class="py-3 px-5 font-mono text-[#ffffff]">
                18 scheduled
              </td>
              <td class="py-3 px-5 text-[13px] text-[#ffffff]/80">
                ₹3,000/qtr
              </td>
              <td class="py-3 px-5 text-right">
                <router-link
                  to="/clients/1"
                  class="px-2.5 py-1 rounded-[6px] bg-[#0a0d3a] hover:bg-[#5865f2] text-[#ffffff] text-[12px] font-[500] border border-[#23272a] transition-colors duration-120"
                >
                  Console
                </router-link>
              </td>
            </tr>

            <!-- Row 2 -->
            <tr class="hover:bg-[#0a0d3a]/40 transition-colors duration-120">
              <td class="py-3 px-5">
                <div class="font-[600] text-[#ffffff] text-[15px]">Radiance Skin &amp; Aesthetics Clinic</div>
                <div class="text-[12px] text-[#00b0f4] font-mono">tenant_radiance_skin_02</div>
              </td>
              <td class="py-3 px-5 font-mono text-[#ffffff]/80">
                +91 91234 56789
              </td>
              <td class="py-3 px-5">
                <span class="inline-flex items-center gap-1.5 text-[13px] font-[500] text-amber-400">
                  <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                  Quota Warning
                </span>
              </td>
              <td class="py-3 px-5 font-mono text-[#ffffff]">
                14 scheduled
              </td>
              <td class="py-3 px-5 text-[13px] text-[#ffffff]/80">
                ₹999/mo
              </td>
              <td class="py-3 px-5 text-right">
                <router-link
                  to="/clients/2"
                  class="px-2.5 py-1 rounded-[6px] bg-[#0a0d3a] hover:bg-[#5865f2] text-[#ffffff] text-[12px] font-[500] border border-[#23272a] transition-colors duration-120"
                >
                  Console
                </router-link>
              </td>
            </tr>

            <!-- Row 3 -->
            <tr class="hover:bg-[#0a0d3a]/40 transition-colors duration-120">
              <td class="py-3 px-5">
                <div class="font-[600] text-[#ffffff]/60 text-[15px]">Wellness Physiotherapy &amp; Rehab</div>
                <div class="text-[12px] text-[#ffffff]/40 font-mono">tenant_wellness_physio_03</div>
              </td>
              <td class="py-3 px-5 font-mono text-[#ffffff]/50">
                +91 99887 76655
              </td>
              <td class="py-3 px-5">
                <span class="inline-flex items-center gap-1.5 text-[13px] font-[500] text-[#ffffff]/50">
                  <span class="w-2 h-2 rounded-full bg-[#ffffff]/40"></span>
                  Revoked
                </span>
              </td>
              <td class="py-3 px-5 font-mono text-[#ffffff]/50">
                0
              </td>
              <td class="py-3 px-5 text-[13px] text-[#ffffff]/40">
                ₹999/mo
              </td>
              <td class="py-3 px-5 text-right">
                <router-link
                  to="/clients/3"
                  class="px-2.5 py-1 rounded-[6px] bg-[#0a0d3a] hover:bg-[#5865f2] text-[#ffffff] text-[12px] font-[500] border border-[#23272a] transition-colors duration-120"
                >
                  Console
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import AppLayout from '@/components/AppLayout.vue'
import {
  Sparkles,
  MessageSquare,
  Calendar,
  Activity,
  Plus,
  RotateCw,
  Search,
  Filter
} from 'lucide-vue-next'

function handleCreateTenant() {
  console.log('Onboard clinic clicked')
}
</script>
