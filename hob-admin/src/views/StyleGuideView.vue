<template>
  <div class="min-h-screen bg-[#0a0d3a] text-[#ffffff] pb-24 font-sans selection:bg-[#ec48bd]/30 selection:text-[#ffffff]">
    <!-- Top Navigation Bar -->
    <header class="sticky top-0 z-40 border-b border-[#23272a] bg-[#0a0d3a]/95 px-6 py-4 backdrop-blur-none">
      <div class="max-w-6xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-[#5865f2] flex items-center justify-center text-[#ffffff] shadow-[0_3px_24px_rgba(88,101,242,0.35)]">
            <Radio :size="18" :stroke-width="1.75" />
          </div>
          <div>
            <h1 class="text-[18px] font-[700] text-[#ffffff] font-display uppercase tracking-tight">HOB Admin Design System</h1>
            <p class="text-[12px] text-[#ffffff]/60 font-sans">Discord-inspired gaming-native visual language for dense internal tools</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-[50px] bg-[#1e2353] border border-[#23272a] text-[13px] font-[500] text-[#00b0f4]">
            <Sparkles :size="14" :stroke-width="1.75" />
            Route: /styleguide
          </span>
        </div>
      </div>
    </header>

    <main class="max-w-6xl mx-auto px-6 py-8 space-y-14">
      <!-- Note & Palette Option Banner -->
      <div class="rounded-[16px] border border-[#23272a] bg-[#1e2353] p-4 text-[14px] leading-[1.4] text-[#ffffff]/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div class="flex items-start gap-2.5">
          <Info :size="18" :stroke-width="1.75" class="text-[#00b0f4] shrink-0 mt-0.5" />
          <div>
            <span class="font-[700] font-display text-[#ffffff]">Definitive Design System active:</span>
            Blurple (<span class="font-mono text-[#5865f2]">#5865f2</span>) + Green (<span class="font-mono text-[#35ed7e]">#35ed7e</span>, high-intent action only) + Magenta (<span class="font-mono text-[#ec48bd]">#ec48bd</span>, badges &amp; highlight cards).
            <span class="text-[#ffffff]/60 block text-[12px] mt-0.5">
              Note: Font loaded as heavy geometric display ("Space Grotesk" / "Plus Jakarta Sans" 700-800 for ABC Ginto Nord substitute, "Inter" for ggsans).
              Amber swap option available if preferred (<span class="font-mono text-amber-400">#D97706</span> / rose <span class="font-mono text-pink-400">#E85D9E</span>).
            </span>
          </div>
        </div>
      </div>

      <!-- Section 1: Color Swatches -->
      <section class="space-y-4">
        <div class="border-b border-[#23272a] pb-2 flex items-baseline justify-between">
          <div>
            <h2 class="text-[22px] font-[700] text-[#ffffff] font-display">1. Color Palette &amp; Surfaces</h2>
            <p class="text-[14px] text-[#ffffff]/60">Non-negotiable chord: Deep canvas #0a0d3a, raised surface-indigo #1e2353, Blurple #5865f2, Electric Green #35ed7e, Magenta #ec48bd.</p>
          </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          <!-- Primary: Blurple -->
          <div class="rounded-[16px] border border-[#23272a] bg-[#1e2353] p-3.5 space-y-2.5">
            <div class="h-12 rounded-[12px] bg-[#5865f2] flex items-center justify-center text-[#ffffff] font-[700] font-display text-[14px] shadow-[0_3px_24px_rgba(88,101,242,0.3)]">
              primary
            </div>
            <div class="text-[12px] space-y-0.5">
              <div class="flex justify-between font-[500] text-[#ffffff]">
                <span>Blurple</span>
                <span class="font-mono">#5865F2</span>
              </div>
              <p class="text-[#ffffff]/60 text-[11px]">Primary CTAs, marquee/CTA bands, stat cards</p>
            </div>
          </div>

          <!-- High-Intent: Green -->
          <div class="rounded-[16px] border border-[#23272a] bg-[#1e2353] p-3.5 space-y-2.5">
            <div class="h-12 rounded-[12px] bg-[#35ed7e] flex items-center justify-center text-[#000000] font-[700] font-display text-[14px]">
              green (reserved)
            </div>
            <div class="text-[12px] space-y-0.5">
              <div class="flex justify-between font-[500] text-[#ffffff]">
                <span>Electric Green</span>
                <span class="font-mono text-[#35ed7e]">#35ED7E</span>
              </div>
              <p class="text-[#ffffff]/60 text-[11px]">Single highest-intent action per screen only</p>
            </div>
          </div>

          <!-- Magenta -->
          <div class="rounded-[16px] border border-[#23272a] bg-[#1e2353] p-3.5 space-y-2.5">
            <div class="h-12 rounded-[12px] bg-[#ec48bd] flex items-center justify-center text-[#ffffff] font-[700] font-display text-[14px] shadow-[0_3px_24px_rgba(236,72,189,0.3)]">
              magenta
            </div>
            <div class="text-[12px] space-y-0.5">
              <div class="flex justify-between font-[500] text-[#ffffff]">
                <span>Vibrant Magenta</span>
                <span class="font-mono text-[#ec48bd]">#EC48BD</span>
              </div>
              <p class="text-[#ffffff]/60 text-[11px]">Badges, feature gradient panels, highlight tags</p>
            </div>
          </div>

          <!-- Link: Cyan -->
          <div class="rounded-[16px] border border-[#23272a] bg-[#1e2353] p-3.5 space-y-2.5">
            <div class="h-12 rounded-[12px] bg-[#00b0f4] flex items-center justify-center text-[#000000] font-[700] font-display text-[14px]">
              link
            </div>
            <div class="text-[12px] space-y-0.5">
              <div class="flex justify-between font-[500] text-[#ffffff]">
                <span>Link Cyan</span>
                <span class="font-mono text-[#00b0f4]">#00B0F4</span>
              </div>
              <p class="text-[#ffffff]/60 text-[11px]">Inline text links on dark surfaces</p>
            </div>
          </div>

          <!-- Canvas -->
          <div class="rounded-[16px] border border-[#23272a] bg-[#1e2353] p-3.5 space-y-2.5">
            <div class="h-12 rounded-[12px] bg-[#0a0d3a] border border-[#23272a] flex items-center justify-center text-[#ffffff] font-[700] font-display text-[14px]">
              canvas
            </div>
            <div class="text-[12px] space-y-0.5">
              <div class="flex justify-between font-[500] text-[#ffffff]">
                <span>Indigo Canvas</span>
                <span class="font-mono text-[#ffffff]/60">#0A0D3A</span>
              </div>
              <p class="text-[#ffffff]/60 text-[11px]">Main app background</p>
            </div>
          </div>

          <!-- Surface Indigo -->
          <div class="rounded-[16px] border border-[#23272a] bg-[#1e2353] p-3.5 space-y-2.5">
            <div class="h-12 rounded-[12px] bg-[#1e2353] border border-[#23272a] flex items-center justify-center text-[#ffffff] font-[700] font-display text-[14px]">
              surface-indigo
            </div>
            <div class="text-[12px] space-y-0.5">
              <div class="flex justify-between font-[500] text-[#ffffff]">
                <span>Raised Indigo</span>
                <span class="font-mono text-[#ffffff]/60">#1E2353</span>
              </div>
              <p class="text-[#ffffff]/60 text-[11px]">Raised cards, sidebar, table headers, panels</p>
            </div>
          </div>

          <!-- Surface Onyx / Hairline -->
          <div class="rounded-[16px] border border-[#23272a] bg-[#1e2353] p-3.5 space-y-2.5">
            <div class="h-12 rounded-[12px] bg-[#23272a] flex items-center justify-center text-[#ffffff] font-[700] font-display text-[14px]">
              surface-onyx / hairline
            </div>
            <div class="text-[12px] space-y-0.5">
              <div class="flex justify-between font-[500] text-[#ffffff]">
                <span>Onyx / Hairline</span>
                <span class="font-mono text-[#ffffff]/60">#23272A</span>
              </div>
              <p class="text-[#ffffff]/60 text-[11px]">1px borders, subtle container frames</p>
            </div>
          </div>

          <!-- Surface Black -->
          <div class="rounded-[16px] border border-[#23272a] bg-[#1e2353] p-3.5 space-y-2.5">
            <div class="h-12 rounded-[12px] bg-[#000000] border border-[#23272a] flex items-center justify-center text-[#ffffff] font-[700] font-display text-[14px]">
              surface-black
            </div>
            <div class="text-[12px] space-y-0.5">
              <div class="flex justify-between font-[500] text-[#ffffff]">
                <span>Black</span>
                <span class="font-mono text-[#ffffff]/60">#000000</span>
              </div>
              <p class="text-[#ffffff]/60 text-[11px]">Reserved for 1 showcase section only</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Section 2: Typography Scale -->
      <section class="space-y-4">
        <div class="border-b border-[#23272a] pb-2">
          <h2 class="text-[22px] font-[700] text-[#ffffff] font-display">2. Typography Scale</h2>
          <p class="text-[14px] text-[#ffffff]/60">Display type in ABC Ginto Nord substitute (Space Grotesk / Plus Jakarta Sans 700-800) and body in ggsans substitute (Inter 400-500).</p>
        </div>

        <div class="border border-[#23272a] rounded-[16px] bg-[#1e2353] divide-y divide-[#23272a]">
          <!-- display-xl -->
          <div class="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div class="space-y-1">
              <div class="text-[82px] font-[800] leading-[1.0] text-[#ffffff] font-display tracking-tight uppercase">
                WHATSAPP PLATFORM
              </div>
              <div class="text-[13px] text-[#ffffff]/60">Reserved for login title and full-bleed hero-style empty states only</div>
            </div>
            <div class="font-mono text-[12px] text-[#00b0f4] bg-[#0a0d3a] px-3 py-1.5 rounded-[6px] border border-[#23272a] self-start shrink-0">
              display-xl: 82px / 800 / 1.0
            </div>
          </div>

          <!-- display-lg -->
          <div class="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div class="space-y-1">
              <div class="text-[62px] font-[800] leading-[1.05] text-[#ffffff] font-display uppercase tracking-tight">
                CLIENT CONSOLE
              </div>
              <div class="text-[13px] text-[#ffffff]/60">Marquee band, major announcement banners</div>
            </div>
            <div class="font-mono text-[12px] text-[#00b0f4] bg-[#0a0d3a] px-3 py-1.5 rounded-[6px] border border-[#23272a] self-start shrink-0">
              display-lg: 62px / 800 / 1.05
            </div>
          </div>

          <!-- display-md -->
          <div class="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div class="space-y-1">
              <div class="text-[56px] font-[700] leading-[1.05] text-[#ffffff] font-display uppercase tracking-tight">
                142 ACTIVE SESSIONS
              </div>
              <div class="text-[13px] text-[#ffffff]/60">Big-number stat cards and major CTA band headers</div>
            </div>
            <div class="font-mono text-[12px] text-[#00b0f4] bg-[#0a0d3a] px-3 py-1.5 rounded-[6px] border border-[#23272a] self-start shrink-0">
              display-md: 56px / 700 / 1.05
            </div>
          </div>

          <!-- heading-lg -->
          <div class="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div class="space-y-1">
              <div class="text-[48px] font-[700] leading-[1.1] text-[#ffffff] font-display uppercase">
                TENANT ARCHITECTURE
              </div>
              <div class="text-[13px] text-[#ffffff]/60">Sub-section major headings</div>
            </div>
            <div class="font-mono text-[12px] text-[#00b0f4] bg-[#0a0d3a] px-3 py-1.5 rounded-[6px] border border-[#23272a] self-start shrink-0">
              heading-lg: 48px / 700 / 1.1
            </div>
          </div>

          <!-- heading-sm (Default Card / Section Header) -->
          <div class="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div class="space-y-1">
              <div class="text-[22px] font-[700] leading-[1.2] text-[#ffffff] font-display">
                Heading-sm — Default Card &amp; Section Header
              </div>
              <div class="text-[13px] text-[#ffffff]/60">This is your default section and card header size in the actual app UI</div>
            </div>
            <div class="font-mono text-[12px] text-[#35ed7e] bg-[#0a0d3a] px-3 py-1.5 rounded-[6px] border border-[#23272a] self-start shrink-0">
              heading-sm: 22px / 700 / 1.2 (Default App Heading)
            </div>
          </div>

          <!-- body-lg -->
          <div class="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div class="space-y-1">
              <p class="text-[20px] font-[500] leading-[1.4] text-[#ffffff]">
                Body-lg: Lead paragraphs and featured summary descriptions.
              </p>
            </div>
            <div class="font-mono text-[12px] text-[#00b0f4] bg-[#0a0d3a] px-3 py-1.5 rounded-[6px] border border-[#23272a] self-start shrink-0">
              body-lg: 20px / 500 / 1.4
            </div>
          </div>

          <!-- link-lg (Button Label Size) -->
          <div class="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div class="space-y-1">
              <p class="text-[18px] font-[500] leading-[1.4] text-[#ffffff]">
                Link-lg: Primary and High-Intent Action Button Labels (Save Changes, Connect Tenant)
              </p>
            </div>
            <div class="font-mono text-[12px] text-[#00b0f4] bg-[#0a0d3a] px-3 py-1.5 rounded-[6px] border border-[#23272a] self-start shrink-0">
              link-lg: 18px / 500 / 1.4 (Button Labels)
            </div>
          </div>

          <!-- body (Default table & form text) -->
          <div class="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div class="space-y-1">
              <p class="text-[16px] font-[400] leading-[1.5] text-[#ffffff]">
                Body: Default table &amp; form text. Spice Factory Rooftop webhook payload processed at 11:42 UTC.
              </p>
            </div>
            <div class="font-mono text-[12px] text-[#35ed7e] bg-[#0a0d3a] px-3 py-1.5 rounded-[6px] border border-[#23272a] self-start shrink-0">
              body: 16px / 400 / 1.5 (Default Table/Form Text)
            </div>
          </div>

          <!-- link -->
          <div class="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div class="space-y-1">
              <a href="javascript:void(0)" class="text-[16px] font-[500] leading-[1.4] text-[#00b0f4] hover:underline">
                Link: Standard navigation links and secondary button labels
              </a>
            </div>
            <div class="font-mono text-[12px] text-[#00b0f4] bg-[#0a0d3a] px-3 py-1.5 rounded-[6px] border border-[#23272a] self-start shrink-0">
              link: 16px / 500 / 1.4
            </div>
          </div>

          <!-- link-sm (Table cell / metadata size) -->
          <div class="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div class="space-y-1">
              <p class="text-[14px] font-[500] leading-[1.4] text-[#ffffff]/80">
                Link-sm: Dense table cells, badge text, and operator metadata tags (+91 98765 43210 · verified)
              </p>
            </div>
            <div class="font-mono text-[12px] text-[#35ed7e] bg-[#0a0d3a] px-3 py-1.5 rounded-[6px] border border-[#23272a] self-start shrink-0">
              link-sm: 14px / 500 / 1.4 (Table Cells &amp; Meta)
            </div>
          </div>
        </div>
      </section>

      <!-- Section 3: Buttons -->
      <section class="space-y-4">
        <div class="border-b border-[#23272a] pb-2">
          <h2 class="text-[22px] font-[700] text-[#ffffff] font-display">3. Buttons &amp; Action Triggers</h2>
          <p class="text-[14px] text-[#ffffff]/60">button-primary (Blurple, rounded.sm 12px), button-green (reserved-use only, rounded.sm 12px), button-ghost (surface-indigo, rounded.lg 16px), button-white, icon buttons.</p>
        </div>

        <div class="border border-[#23272a] rounded-[16px] bg-[#1e2353] p-6 space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- button-primary -->
            <div class="space-y-2">
              <div class="text-[12px] font-[700] uppercase tracking-wider text-[#ffffff]/60 font-display">button-primary (Blurple)</div>
              <button class="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-[12px] bg-[#5865f2] hover:bg-[#4752c4] active:bg-[#3c45a5] text-[#ffffff] text-[18px] font-[500] leading-[1.4] transition-colors duration-120 focus:outline-none focus:ring-2 focus:ring-[#5865f2] cursor-pointer">
                <Plus :size="18" :stroke-width="1.75" />
                <span>Create Client</span>
              </button>
              <p class="text-[11px] text-[#ffffff]/50">padding: 20px 24px (or compact in tables), rounded.sm (12px), link-lg</p>
            </div>

            <!-- button-green (reserved-use only) -->
            <div class="space-y-2">
              <div class="text-[12px] font-[700] uppercase tracking-wider text-[#35ed7e] font-display flex items-center justify-between">
                <span>button-green (High-Intent Only)</span>
                <span class="text-[10px] bg-[#35ed7e]/20 px-1.5 py-0.5 rounded-[4px] text-[#35ed7e]">1 per screen max</span>
              </div>
              <button class="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-[12px] bg-[#35ed7e] hover:bg-[#2ed66f] active:bg-[#26b85e] text-[#000000] text-[18px] font-[700] leading-[1.4] transition-colors duration-120 focus:outline-none focus:ring-2 focus:ring-[#35ed7e] cursor-pointer">
                <Check :size="18" :stroke-width="2" />
                <span>Save Client Config</span>
              </button>
              <p class="text-[11px] text-[#ffffff]/50">Reserved for highest-intent action (e.g. Save Client / Deploy Changes)</p>
            </div>

            <!-- button-ghost -->
            <div class="space-y-2">
              <div class="text-[12px] font-[700] uppercase tracking-wider text-[#ffffff]/60 font-display">button-ghost (surface-indigo)</div>
              <button class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[16px] bg-[#0a0d3a] hover:bg-[#23272a] text-[#ffffff] text-[16px] font-[500] leading-[1.4] border border-[#23272a] transition-colors duration-120 focus:outline-none focus:ring-2 focus:ring-[#5865f2] cursor-pointer">
                <RotateCw :size="18" :stroke-width="1.75" />
                <span>Sync Webhooks</span>
              </button>
              <p class="text-[11px] text-[#ffffff]/50">surface-indigo / canvas fill, rounded.lg (16px), link (16px)</p>
            </div>

            <!-- button-white -->
            <div class="space-y-2">
              <div class="text-[12px] font-[700] uppercase tracking-wider text-[#ffffff]/60 font-display">button-white (outline / high contrast)</div>
              <button class="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-[16px] bg-[#ffffff] hover:bg-[#ffffff]/90 text-[#000000] text-[16px] font-[500] leading-[1.4] transition-colors duration-120 focus:outline-none cursor-pointer">
                <Download :size="18" :stroke-width="1.75" />
                <span>Export JSON Payload</span>
              </button>
              <p class="text-[11px] text-[#ffffff]/50">ink background (#ffffff), text ink-dark (#000000), rounded.lg</p>
            </div>

            <!-- button-ghost-sm (compact chips) -->
            <div class="space-y-2">
              <div class="text-[12px] font-[700] uppercase tracking-wider text-[#ffffff]/60 font-display">button-ghost-sm (compact)</div>
              <button class="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-[6px] bg-[#0a0d3a] hover:bg-[#23272a] text-[#ffffff] text-[14px] font-[500] leading-[1.4] border border-[#23272a] transition-colors duration-120 cursor-pointer">
                <Key :size="16" :stroke-width="1.75" />
                <span>Rotate Secret Key</span>
              </button>
              <p class="text-[11px] text-[#ffffff]/50">rounded.xs (6px), link-sm (14px)</p>
            </div>

            <!-- Icon-only buttons -->
            <div class="space-y-2">
              <div class="text-[12px] font-[700] uppercase tracking-wider text-[#ffffff]/60 font-display">Icon-Only Controls (rounded-full 9999px)</div>
              <div class="flex items-center gap-3 pt-1">
                <button title="Settings" class="w-10 h-10 rounded-full bg-[#0a0d3a] hover:bg-[#5865f2] hover:text-[#ffffff] text-[#ffffff]/80 flex items-center justify-center border border-[#23272a] transition-colors duration-120 cursor-pointer">
                  <Settings :size="18" :stroke-width="1.75" />
                </button>
                <button title="Copy Tenant ID" class="w-10 h-10 rounded-full bg-[#0a0d3a] hover:bg-[#5865f2] hover:text-[#ffffff] text-[#ffffff]/80 flex items-center justify-center border border-[#23272a] transition-colors duration-120 cursor-pointer">
                  <Copy :size="18" :stroke-width="1.75" />
                </button>
                <button title="View Audit Logs" class="w-10 h-10 rounded-full bg-[#0a0d3a] hover:bg-[#5865f2] hover:text-[#ffffff] text-[#ffffff]/80 flex items-center justify-center border border-[#23272a] transition-colors duration-120 cursor-pointer">
                  <ExternalLink :size="18" :stroke-width="1.75" />
                </button>
                <button disabled title="Disabled Action" class="w-10 h-10 rounded-full bg-[#0a0d3a]/50 text-[#ffffff]/30 flex items-center justify-center border border-[#23272a] cursor-not-allowed">
                  <Lock :size="18" :stroke-width="1.75" />
                </button>
              </div>
              <p class="text-[11px] text-[#ffffff]/50">Full circular radius for avatars &amp; quick actions</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Section 4: Status Badges & Pills -->
      <section class="space-y-4">
        <div class="border-b border-[#23272a] pb-2">
          <h2 class="text-[22px] font-[700] text-[#ffffff] font-display">4. Badges &amp; Status Pills</h2>
          <p class="text-[14px] text-[#ffffff]/60">Pill radius (rounded.pill 50px) with link-sm typography. Magenta fill by default, plus green-tinted and gray-muted variants.</p>
        </div>

        <div class="border border-[#23272a] rounded-[16px] bg-[#1e2353] p-5">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <!-- Magenta Default Badge -->
            <div class="rounded-[12px] bg-[#0a0d3a] border border-[#23272a] p-3.5 space-y-2">
              <span class="text-[11px] uppercase tracking-wider text-[#ffffff]/50 font-display block">Default / Featured</span>
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-[50px] bg-[#ec48bd] text-[#ffffff] text-[13px] font-[600] font-sans">
                <Sparkles :size="13" :stroke-width="2" />
                PRIMARY / PRO
              </span>
            </div>

            <!-- Green Tinted (Active) -->
            <div class="rounded-[12px] bg-[#0a0d3a] border border-[#23272a] p-3.5 space-y-2">
              <span class="text-[11px] uppercase tracking-wider text-[#ffffff]/50 font-display block">Active State</span>
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-[50px] bg-[#35ed7e]/20 border border-[#35ed7e]/40 text-[#35ed7e] text-[13px] font-[600] font-sans">
                <span class="w-2 h-2 rounded-full bg-[#35ed7e]"></span>
                Active (200 OK)
              </span>
            </div>

            <!-- Gray Muted (Revoked) -->
            <div class="rounded-[12px] bg-[#0a0d3a] border border-[#23272a] p-3.5 space-y-2">
              <span class="text-[11px] uppercase tracking-wider text-[#ffffff]/50 font-display block">Revoked / Inactive</span>
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-[50px] bg-[#23272a] border border-[#333333] text-[#ffffff]/60 text-[13px] font-[500] font-sans">
                <span class="w-2 h-2 rounded-full bg-[#ffffff]/40"></span>
                Revoked / Stale
              </span>
            </div>

            <!-- Amber Tinted (Warning) -->
            <div class="rounded-[12px] bg-[#0a0d3a] border border-[#23272a] p-3.5 space-y-2">
              <span class="text-[11px] uppercase tracking-wider text-[#ffffff]/50 font-display block">Quota Warning</span>
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-[50px] bg-[#5865f2]/20 border border-[#5865f2]/50 text-[#00b0f4] text-[13px] font-[600] font-sans">
                <AlertTriangle :size="13" :stroke-width="2" />
                89% Quota Used
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Section 5: Feature Cards (Spotlight Only vs Standard Dark) -->
      <section class="space-y-4">
        <div class="border-b border-[#23272a] pb-2">
          <h2 class="text-[22px] font-[700] text-[#ffffff] font-display">5. Spotlight Cards vs. Standard Dark Panels</h2>
          <p class="text-[14px] text-[#ffffff]/60">
            <span class="text-[#ec48bd] font-[600]">Density Rule:</span> Reserve feature-card-gradient (magenta) and diffuse glow for 1 genuinely special element per screen (e.g. MRR or hero stat). Everything else uses flat surface-indigo with hairline borders.
          </p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- feature-card-gradient (Spotlight stat only) -->
          <div class="rounded-[40px] bg-gradient-to-br from-[#ec48bd] via-[#b32b8a] to-[#5865f2] p-8 text-[#ffffff] shadow-[0_3px_68px_rgba(236,72,189,0.22)] relative overflow-hidden flex flex-col justify-between">
            <div class="flex items-center justify-between">
              <span class="px-3 py-1 rounded-[50px] bg-[#000000]/30 backdrop-blur-none text-[12px] font-[700] uppercase tracking-wider font-display">
                Spotlight Stat · 1 Per Page Max
              </span>
              <Activity :size="22" :stroke-width="1.75" />
            </div>
            <div class="my-6">
              <div class="text-[14px] uppercase tracking-wider font-[700] font-display text-[#ffffff]/80">Total Monthly WhatsApp Conversations</div>
              <div class="text-[56px] font-[700] font-display leading-[1.05] tracking-tight mt-1">42,890</div>
              <p class="text-[14px] text-[#ffffff]/90 mt-2 font-[500]">+18.4% growth across 32 active restaurant tenants</p>
            </div>
            <div class="flex items-center justify-between text-[13px] border-t border-[#ffffff]/20 pt-4">
              <span>Token: <span class="font-mono">feature-card-gradient</span></span>
              <span>rounded.xl (40px) + diffuse glow</span>
            </div>
          </div>

          <!-- feature-card-dark (Standard raised surface) -->
          <div class="rounded-[40px] bg-[#1e2353] border border-[#23272a] p-8 text-[#ffffff] flex flex-col justify-between">
            <div class="flex items-center justify-between">
              <span class="px-3 py-1 rounded-[50px] bg-[#0a0d3a] text-[12px] font-[700] uppercase tracking-wider font-display text-[#00b0f4] border border-[#23272a]">
                Standard Feature Surface
              </span>
              <Layers :size="22" :stroke-width="1.75" class="text-[#5865f2]" />
            </div>
            <div class="my-6 space-y-2">
              <h3 class="text-[22px] font-[700] font-display leading-[1.2]">Webhook Ingestion Health</h3>
              <p class="text-[16px] text-[#ffffff]/80 font-sans leading-[1.5]">
                Meta Graph API v21.0 webhook listeners running on 4 workers. Average acknowledgment latency is 82ms.
              </p>
              <div class="pt-2 flex items-center gap-4 text-[14px] font-mono text-[#35ed7e]">
                <span>● 99.98% delivery rate</span>
                <span>● 0 retry backlog</span>
              </div>
            </div>
            <div class="flex items-center justify-between text-[13px] border-t border-[#23272a] pt-4 text-[#ffffff]/60">
              <span>Token: <span class="font-mono">feature-card-dark</span></span>
              <span>rounded.xl (40px)</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Section 6: Data Table Spec -->
      <section class="space-y-4">
        <div class="border-b border-[#23272a] pb-2">
          <h2 class="text-[22px] font-[700] text-[#ffffff] font-display">6. Data Table Spec (Operator Density)</h2>
          <p class="text-[14px] text-[#ffffff]/60">Header in surface-indigo with uppercase tracked link-sm labels; body rows in body/link-sm text; hairline (#23272a) row dividers; no zebra striping; rounded.sm (12px) container.</p>
        </div>

        <div class="border border-[#23272a] rounded-[12px] bg-[#0a0d3a] overflow-hidden">
          <table class="w-full text-left border-collapse font-sans">
            <thead>
              <tr class="bg-[#1e2353] border-b border-[#23272a] text-[14px] font-[600] uppercase tracking-wider text-[#ffffff]/80">
                <th class="py-3 px-4">Client / Tenant</th>
                <th class="py-3 px-4">WhatsApp Phone ID</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4">Today's Bookings</th>
                <th class="py-3 px-4">API Latency</th>
                <th class="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#23272a] text-[14px]">
              <!-- Row 1 -->
              <tr class="hover:bg-[#1e2353]/60 transition-colors duration-120 group">
                <td class="py-3 px-4">
                  <div class="font-[600] text-[#ffffff] text-[16px]">Spice Factory Rooftop</div>
                  <div class="text-[13px] text-[#00b0f4] font-mono">sf-rooftop-01</div>
                </td>
                <td class="py-3 px-4 font-mono text-[#ffffff]/80 text-[14px]">
                  +91 98765 43210
                </td>
                <td class="py-3 px-4">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[50px] bg-[#35ed7e]/20 border border-[#35ed7e]/40 text-[#35ed7e] text-[12px] font-[600]">
                    <span class="w-1.5 h-1.5 rounded-full bg-[#35ed7e]"></span>
                    Active
                  </span>
                </td>
                <td class="py-3 px-4 font-mono text-[#ffffff] text-[14px]">
                  34 confirmed
                </td>
                <td class="py-3 px-4 font-mono text-[#ffffff]/70 text-[13px]">
                  64ms
                </td>
                <td class="py-3 px-4 text-right">
                  <div class="inline-flex items-center justify-end gap-2">
                    <button class="px-2.5 py-1 rounded-[6px] bg-[#1e2353] hover:bg-[#5865f2] text-[#ffffff] text-[12px] font-[500] border border-[#23272a] transition-colors duration-120 cursor-pointer">
                      Manage
                    </button>
                    <button class="w-7 h-7 rounded-full hover:bg-[#23272a] text-[#ffffff]/70 hover:text-[#ffffff] flex items-center justify-center transition-colors duration-120 cursor-pointer">
                      <MoreVertical :size="16" :stroke-width="1.75" />
                    </button>
                  </div>
                </td>
              </tr>

              <!-- Row 2 -->
              <tr class="hover:bg-[#1e2353]/60 transition-colors duration-120 group">
                <td class="py-3 px-4">
                  <div class="font-[600] text-[#ffffff] text-[16px]">The Bombay Courtyard</div>
                  <div class="text-[13px] text-[#00b0f4] font-mono">bc-mumbai-02</div>
                </td>
                <td class="py-3 px-4 font-mono text-[#ffffff]/80 text-[14px]">
                  +91 91234 56789
                </td>
                <td class="py-3 px-4">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[50px] bg-[#5865f2]/20 border border-[#5865f2]/50 text-[#00b0f4] text-[12px] font-[600]">
                    <span class="w-1.5 h-1.5 rounded-full bg-[#00b0f4]"></span>
                    Quota 89%
                  </span>
                </td>
                <td class="py-3 px-4 font-mono text-[#ffffff] text-[14px]">
                  19 confirmed
                </td>
                <td class="py-3 px-4 font-mono text-[#ffffff]/70 text-[13px]">
                  110ms
                </td>
                <td class="py-3 px-4 text-right">
                  <div class="inline-flex items-center justify-end gap-2">
                    <button class="px-2.5 py-1 rounded-[6px] bg-[#1e2353] hover:bg-[#5865f2] text-[#ffffff] text-[12px] font-[500] border border-[#23272a] transition-colors duration-120 cursor-pointer">
                      Manage
                    </button>
                    <button class="w-7 h-7 rounded-full hover:bg-[#23272a] text-[#ffffff]/70 hover:text-[#ffffff] flex items-center justify-center transition-colors duration-120 cursor-pointer">
                      <MoreVertical :size="16" :stroke-width="1.75" />
                    </button>
                  </div>
                </td>
              </tr>

              <!-- Row 3 -->
              <tr class="hover:bg-[#1e2353]/60 transition-colors duration-120 group">
                <td class="py-3 px-4">
                  <div class="font-[600] text-[#ffffff]/60 text-[16px]">Heritage Bistro Old Town</div>
                  <div class="text-[13px] text-[#ffffff]/40 font-mono">hb-delhi-09</div>
                </td>
                <td class="py-3 px-4 font-mono text-[#ffffff]/50 text-[14px]">
                  +91 99887 76655
                </td>
                <td class="py-3 px-4">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[50px] bg-[#23272a] border border-[#333333] text-[#ffffff]/50 text-[12px] font-[500]">
                    <span class="w-1.5 h-1.5 rounded-full bg-[#ffffff]/30"></span>
                    Revoked
                  </span>
                </td>
                <td class="py-3 px-4 font-mono text-[#ffffff]/50 text-[14px]">
                  0
                </td>
                <td class="py-3 px-4 font-mono text-[#ffffff]/40 text-[13px]">
                  -
                </td>
                <td class="py-3 px-4 text-right">
                  <div class="inline-flex items-center justify-end gap-2">
                    <button class="px-2.5 py-1 rounded-[6px] bg-[#1e2353] hover:bg-[#5865f2] text-[#ffffff] text-[12px] font-[500] border border-[#23272a] transition-colors duration-120 cursor-pointer">
                      Re-enable
                    </button>
                    <button class="w-7 h-7 rounded-full hover:bg-[#23272a] text-[#ffffff]/70 hover:text-[#ffffff] flex items-center justify-center transition-colors duration-120 cursor-pointer">
                      <MoreVertical :size="16" :stroke-width="1.75" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Section 7: Form Inputs & Controls -->
      <section class="space-y-4">
        <div class="border-b border-[#23272a] pb-2">
          <h2 class="text-[22px] font-[700] text-[#ffffff] font-display">7. Form Inputs &amp; Controls</h2>
          <p class="text-[14px] text-[#ffffff]/60">surface-indigo (#1e2353) fill, hairline (#23272a) border, link/link-sm text, 2px Blurple (#5865f2) focus ring.</p>
        </div>

        <div class="border border-[#23272a] rounded-[16px] bg-[#1e2353] p-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Text Input -->
            <div class="space-y-2">
              <label class="block text-[14px] font-[500] text-[#ffffff]">Client Display Name</label>
              <input
                type="text"
                value="Spice Factory Rooftop"
                class="w-full rounded-[12px] border border-[#23272a] bg-[#0a0d3a] px-4 py-2.5 text-[16px] text-[#ffffff] placeholder-[#ffffff]/40 transition-colors duration-120 focus:border-[#5865f2] focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
                placeholder="Enter client name"
              />
              <p class="text-[13px] text-[#ffffff]/60">Default input with 2px Blurple focus ring</p>
            </div>

            <!-- Select Dropdown -->
            <div class="space-y-2">
              <label class="block text-[14px] font-[500] text-[#ffffff]">Webhook Dispatch Policy</label>
              <select class="w-full rounded-[12px] border border-[#23272a] bg-[#0a0d3a] px-4 py-2.5 text-[16px] text-[#ffffff] transition-colors duration-120 focus:border-[#5865f2] focus:outline-none focus:ring-2 focus:ring-[#5865f2] cursor-pointer">
                <option value="immediate">Immediate Dispatch (Standard)</option>
                <option value="batched">Batched (Every 30s)</option>
                <option value="paused">Paused / Maintenance</option>
              </select>
              <p class="text-[13px] text-[#ffffff]/60">Select control matching surface-indigo chrome</p>
            </div>

            <!-- Textarea -->
            <div class="space-y-2">
              <label class="block text-[14px] font-[500] text-[#ffffff]">System Prompt Guardrail</label>
              <textarea
                rows="2"
                class="w-full rounded-[12px] border border-[#23272a] bg-[#0a0d3a] px-4 py-2 text-[14px] text-[#ffffff] placeholder-[#ffffff]/40 transition-colors duration-120 focus:border-[#5865f2] focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
              >Strictly enforce a max table size of 8 guests for rooftop booking slots.</textarea>
            </div>

            <!-- Toggles & Checkbox -->
            <div class="md:col-span-3 flex flex-wrap items-center gap-8 pt-2 border-t border-[#23272a]">
              <!-- Toggle -->
              <label class="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  @click="toggleActive = !toggleActive"
                  :class="toggleActive ? 'bg-[#5865f2]' : 'bg-[#23272a]'"
                  class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-120 focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
                >
                  <span
                    :class="toggleActive ? 'translate-x-5' : 'translate-x-0'"
                    class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#ffffff] transition duration-120"
                  />
                </button>
                <span class="text-[14px] font-[500] text-[#ffffff]">Auto-confirm WhatsApp Reservations</span>
              </label>

              <!-- Checkbox -->
              <label class="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked
                  class="h-4 w-4 rounded-[4px] border-[#23272a] bg-[#0a0d3a] text-[#5865f2] accent-[#5865f2] focus:ring-2 focus:ring-[#5865f2]"
                />
                <span class="text-[14px] font-[500] text-[#ffffff]">Alert operator on high-traffic throttle</span>
              </label>
            </div>
          </div>
        </div>
      </section>

      <!-- Section 8 & 9: Toast & Modal Dialog -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Section 8: Modal Dialog Shell -->
        <section class="space-y-4">
          <div class="border-b border-[#23272a] pb-2">
            <h2 class="text-[22px] font-[700] text-[#ffffff] font-display">8. Modal / Dialog Shell</h2>
            <p class="text-[14px] text-[#ffffff]/60">feature-card chrome (surface-indigo, rounded.lg 16px) with elevated diffuse shadow.</p>
          </div>

          <div class="border border-[#23272a] rounded-[16px] bg-[#1e2353] divide-y divide-[#23272a] shadow-[0_3px_68px_rgba(88,101,242,0.18)]">
            <!-- Modal Header -->
            <div class="px-6 py-4 flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-full bg-[#5865f2]/20 border border-[#5865f2]/40 flex items-center justify-center text-[#5865f2]">
                  <Key :size="16" :stroke-width="1.75" />
                </div>
                <h3 class="text-[18px] font-[700] font-display text-[#ffffff]">Rotate WhatsApp Client Secret</h3>
              </div>
              <button class="w-8 h-8 rounded-full hover:bg-[#23272a] text-[#ffffff]/60 hover:text-[#ffffff] flex items-center justify-center transition-colors duration-120 cursor-pointer">
                <X :size="18" :stroke-width="1.75" />
              </button>
            </div>

            <!-- Modal Body -->
            <div class="p-6 space-y-4 text-[14px] leading-[1.5] text-[#ffffff]/80">
              <p>
                Rotating the secret key will immediately invalidate webhook validation tokens for
                <span class="font-[600] text-[#ffffff] font-mono">Spice Factory Rooftop</span>.
              </p>
              <div class="rounded-[12px] bg-[#0a0d3a] border border-[#23272a] p-3 text-[13px] text-[#00b0f4] flex items-start gap-2.5">
                <Info :size="16" :stroke-width="1.75" class="shrink-0 mt-0.5 text-[#00b0f4]" />
                <span>Active incoming webhook deliveries will resume after you update the Meta webhook endpoint configuration.</span>
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="px-6 py-3.5 bg-[#0a0d3a]/60 flex items-center justify-end gap-3">
              <button class="px-4 py-2 rounded-[12px] border border-[#23272a] bg-[#1e2353] hover:bg-[#23272a] text-[#ffffff] text-[14px] font-[500] transition-colors duration-120 cursor-pointer">
                Cancel
              </button>
              <button class="px-4 py-2 rounded-[12px] bg-[#5865f2] hover:bg-[#4752c4] text-[#ffffff] text-[14px] font-[500] transition-colors duration-120 cursor-pointer">
                Confirm &amp; Rotate
              </button>
            </div>
          </div>
        </section>

        <!-- Section 9: Toast Notifications -->
        <section class="space-y-4">
          <div class="border-b border-[#23272a] pb-2">
            <h2 class="text-[22px] font-[700] text-[#ffffff] font-display">9. Toast Notification Shell</h2>
            <p class="text-[14px] text-[#ffffff]/60">feature-card chrome (rounded.lg 16px, medium shadow) with auto-dismiss feel.</p>
          </div>

          <div class="border border-[#23272a] rounded-[16px] bg-[#1e2353] p-6 space-y-4">
            <!-- Toast 1: Success / Green -->
            <div class="rounded-[16px] bg-[#0a0d3a] border border-[#35ed7e]/40 p-4 flex items-start gap-3.5 shadow-[0_3px_24px_rgba(53,237,126,0.15)]">
              <div class="w-7 h-7 rounded-full bg-[#35ed7e]/20 border border-[#35ed7e]/50 flex items-center justify-center text-[#35ed7e] shrink-0 mt-0.5">
                <Check :size="16" :stroke-width="2" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-[14px] font-[700] text-[#ffffff] font-display">Client Config Saved</div>
                <p class="text-[13px] text-[#ffffff]/70 mt-0.5">WhatsApp Webhook parameters synchronized successfully with Meta Graph API.</p>
              </div>
              <button class="text-[#ffffff]/50 hover:text-[#ffffff] transition-colors duration-120 cursor-pointer">
                <X :size="16" :stroke-width="1.75" />
              </button>
            </div>

            <!-- Toast 2: Primary / Magenta Info -->
            <div class="rounded-[16px] bg-[#0a0d3a] border border-[#ec48bd]/40 p-4 flex items-start gap-3.5 shadow-[0_3px_24px_rgba(236,72,189,0.15)]">
              <div class="w-7 h-7 rounded-full bg-[#ec48bd]/20 border border-[#ec48bd]/50 flex items-center justify-center text-[#ec48bd] shrink-0 mt-0.5">
                <Sparkles :size="16" :stroke-width="2" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-[14px] font-[700] text-[#ffffff] font-display">New Tenant Provisioned</div>
                <p class="text-[13px] text-[#ffffff]/70 mt-0.5">Spice Factory Rooftop is ready to accept WhatsApp inbound sessions.</p>
              </div>
              <button class="text-[#ffffff]/50 hover:text-[#ffffff] transition-colors duration-120 cursor-pointer">
                <X :size="16" :stroke-width="1.75" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  Radio,
  Sparkles,
  Info,
  Plus,
  Check,
  RotateCw,
  Download,
  Key,
  Settings,
  Copy,
  ExternalLink,
  Lock,
  AlertTriangle,
  Activity,
  Layers,
  MoreVertical,
  X
} from 'lucide-vue-next'

const toggleActive = ref(true)
</script>
