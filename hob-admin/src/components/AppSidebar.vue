<template>
  <!-- Sidebar Container: Desktop fixed & Mobile slide-in drawer -->
  <div>
    <!-- Mobile backdrop overlay -->
    <div
      v-if="isOpen"
      class="fixed inset-0 z-40 bg-[#000000]/70 md:hidden"
      @click="$emit('close')"
    />

    <!-- Aside Sidebar element -->
    <aside
      :class="[
        'fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#1e2353] border-r border-[#23272a] flex flex-col justify-between transition-transform duration-200 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      ]"
    >
      <!-- Top Section: Brand & Nav Links -->
      <div class="flex flex-col flex-1 overflow-y-auto">
        <!-- Logo Area -->
        <div class="h-16 px-5 border-b border-[#23272a] flex items-center justify-between shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-[6px] bg-[#5865f2] flex items-center justify-center text-[#ffffff]">
              <Layers :size="16" :stroke-width="2" />
            </div>
            <div class="text-[18px] font-[800] tracking-tight uppercase font-display text-[#ffffff]">
              HOB ADMIN
            </div>
          </div>

          <!-- Mobile close button -->
          <button
            class="md:hidden w-8 h-8 rounded-full hover:bg-[#23272a] text-[#ffffff]/70 hover:text-[#ffffff] flex items-center justify-center cursor-pointer transition-colors duration-120"
            @click="$emit('close')"
          >
            <X :size="18" :stroke-width="1.75" />
          </button>
        </div>

        <!-- Navigation Group -->
        <div class="p-3 space-y-6">
          <!-- Main Menu -->
          <div class="space-y-1">
            <div class="px-3 py-1 text-[11px] font-[700] uppercase tracking-wider text-[#ffffff]/40 font-display">
              Management
            </div>

            <nav class="space-y-1">
              <router-link
                v-for="item in navItems"
                :key="item.to"
                :to="item.to"
                @click="$emit('close')"
                class="group relative flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-[14px] font-[500] leading-[1.4] transition-colors duration-120"
                :class="[
                  $route.path === item.to
                    ? 'bg-[#0a0d3a] text-[#ffffff] font-[600]'
                    : 'text-[#ffffff]/80 hover:bg-[#23272a]/60 hover:text-[#ffffff]'
                ]"
              >
                <!-- Left-accent active indicator bar -->
                <span
                  v-if="$route.path === item.to"
                  class="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-[2px] bg-[#5865f2]"
                />

                <!-- Icon -->
                <component
                  :is="item.icon"
                  :size="18"
                  :stroke-width="1.75"
                  :class="[
                    $route.path === item.to
                      ? 'text-[#5865f2]'
                      : 'text-[#ffffff] group-hover:text-[#ffffff]'
                  ]"
                />

                <span class="flex-1">{{ item.label }}</span>

                <!-- Badge if present -->
                <span
                  v-if="item.badge"
                  class="px-2 py-0.5 rounded-[50px] bg-[#ec48bd] text-[#ffffff] text-[11px] font-[700] font-sans"
                >
                  {{ item.badge }}
                </span>
              </router-link>
            </nav>
          </div>

          <!-- System / Developer Menu -->
          <div class="space-y-1">
            <div class="px-3 py-1 text-[11px] font-[700] uppercase tracking-wider text-[#ffffff]/40 font-display">
              Platform &amp; System
            </div>

            <nav class="space-y-1">
              <router-link
                to="/styleguide"
                @click="$emit('close')"
                class="group relative flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-[14px] font-[500] leading-[1.4] transition-colors duration-120"
                :class="[
                  $route.path === '/styleguide'
                    ? 'bg-[#0a0d3a] text-[#ffffff] font-[600]'
                    : 'text-[#ffffff]/80 hover:bg-[#23272a]/60 hover:text-[#ffffff]'
                ]"
              >
                <!-- Left-accent active indicator bar -->
                <span
                  v-if="$route.path === '/styleguide'"
                  class="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-[2px] bg-[#5865f2]"
                />

                <Sparkles
                  :size="18"
                  :stroke-width="1.75"
                  :class="$route.path === '/styleguide' ? 'text-[#5865f2]' : 'text-[#ffffff]'"
                />
                <span class="flex-1">UI Style Guide</span>
                <span class="px-2 py-0.5 rounded-[50px] bg-[#5865f2]/30 text-[#00b0f4] text-[11px] font-[600]">
                  Dev
                </span>
              </router-link>
            </nav>
          </div>
        </div>
      </div>

      <!-- Bottom Operator Profile Bar -->
      <div class="p-3 border-t border-[#23272a] bg-[#1e2353]/90 shrink-0">
        <div class="flex items-center justify-between p-2 rounded-[6px] bg-[#0a0d3a]/60 border border-[#23272a]">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 rounded-full bg-[#5865f2] flex items-center justify-center text-[#ffffff] font-[700] text-[13px] font-display shrink-0">
              OP
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-[13px] font-[600] text-[#ffffff] truncate">Admin Operator</div>
              <div class="text-[11px] text-[#35ed7e] flex items-center gap-1 font-mono">
                <span class="w-1.5 h-1.5 rounded-full bg-[#35ed7e]"></span>
                Connected
              </div>
            </div>
          </div>
          <button
            title="Log out"
            class="w-7 h-7 rounded-full hover:bg-[#23272a] text-[#ffffff]/60 hover:text-[#ffffff] flex items-center justify-center transition-colors duration-120 cursor-pointer"
          >
            <LogOut :size="15" :stroke-width="1.75" />
          </button>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup>
import {
  Layers,
  LayoutDashboard,
  Stethoscope,
  MessageSquareCode,
  CalendarCheck,
  ShieldCheck,
  Sparkles,
  LogOut,
  X
} from 'lucide-vue-next'

defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

defineEmits(['close'])

const navItems = [
  {
    label: 'Overview & Stats',
    to: '/',
    icon: LayoutDashboard
  },
  {
    label: 'Clinic Clients',
    to: '/clients',
    icon: Stethoscope,
    badge: '32'
  },
  {
    label: 'WhatsApp Sessions',
    to: '/sessions',
    icon: MessageSquareCode
  },
  {
    label: 'Appointments',
    to: '/bookings',
    icon: CalendarCheck
  },
  {
    label: 'API Keys & Secrets',
    to: '/security',
    icon: ShieldCheck
  }
]
</script>
