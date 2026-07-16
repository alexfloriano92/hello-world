import { MessageCircle, Phone } from "lucide-react";
import { LeadForm, StockSearchBar, StoreFooter, VehicleCardHud, useStockFilters, useTrackView, waUrl, type StoreLike, type VehicleLike } from "./shared";
import { ChatbotWidget } from "@/components/ChatbotWidget";

export function ConcourseLayout({ store, vehicles }: { store: StoreLike; vehicles: VehicleLike[] }) {
  const { onWa } = useTrackView(store.id);
  const wa = waUrl(store);
  const filters = useStockFilters(vehicles);
  const total = vehicles.length;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[color:var(--s-neutral)] text-white" style={{ fontFamily: "var(--s-font-body)" }}>
      {/* Scanlines + grid */}
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(255,255,255,0.03)_3px,rgba(255,255,255,0.03)_4px)]" />
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,rgba(var(--s-primary-rgb,16,185,129),0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

      {/* HUD Header */}
      <header className="relative z-10 border-b border-[var(--s-primary)]/30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 font-mono text-[11px] uppercase tracking-[0.25em]">
          <div className="flex items-center gap-6">
            <span className="inline-flex items-center gap-2 text-[var(--s-primary)]"><span className="h-2 w-2 animate-pulse rounded-full bg-[var(--s-primary)] shadow-[0_0_10px_var(--s-primary)]" /> SYS · ONLINE</span>
            <span className="text-white/50 hidden sm:inline">UNIT · {store.slug.slice(0, 12).toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-white/50 md:inline">STOCK · {String(total).padStart(3, "0")}</span>
            {wa && <a href={wa} target="_blank" rel="noopener" onClick={onWa} className="border border-[var(--s-primary)] px-3 py-1 text-[var(--s-primary)] hover:bg-[var(--s-primary)] hover:text-black">WA · LINK</a>}
          </div>
        </div>
      </header>

      {/* Hero HUD */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--s-primary)]">// TARGET LOCKED · {(store.city || "BR").toUpperCase()}</p>
            <h1 className="mt-4 font-display text-6xl uppercase leading-[0.95] tracking-tight md:text-8xl" style={{ fontFamily: "var(--s-font-display)" }}>
              {(store.hero_headline ?? store.name).toUpperCase()}
            </h1>
            <p className="mt-6 max-w-xl text-lg text-white/70">{store.hero_subheadline ?? "Performance selecionada. Cada unidade auditada."}</p>
            <div className="mt-8 flex flex-wrap gap-3 font-mono text-[11px] uppercase tracking-widest">
              <a href="#estoque" className="inline-flex items-center gap-2 border border-[var(--s-primary)] bg-[var(--s-primary)] px-6 py-3 font-bold text-black hover:bg-transparent hover:text-[var(--s-primary)]">▸ {store.cta_text ?? "Acessar estoque"}</a>
              {wa && <a href={wa} target="_blank" rel="noopener" className="inline-flex items-center gap-2 border border-white/30 px-6 py-3 font-bold hover:border-white">▸ Contato direto</a>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 self-start font-mono text-[11px] uppercase tracking-widest">
            {[
              { k: "Unidades", v: String(total).padStart(3, "0") },
              { k: "Cidade", v: store.city || "—" },
              { k: "Marcas", v: String(new Set(vehicles.map((v) => v.brand)).size) },
              { k: "Status", v: "ATIVO" },
            ].map((s, i) => (
              <div key={i} className="border border-[var(--s-primary)]/40 bg-black/30 p-4 backdrop-blur">
                <p className="text-[10px] text-white/50">{s.k}</p>
                <p className="mt-2 text-2xl text-[var(--s-primary)]">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Estoque */}
      <section id="estoque" className="relative z-10 border-t border-[var(--s-primary)]/30 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--s-primary)]">// INVENTORY</p>
              <h2 className="mt-2 font-display text-5xl uppercase leading-none tracking-wide md:text-6xl" style={{ fontFamily: "var(--s-font-display)" }}>Estoque</h2>
            </div>
            <p className="font-mono text-xs text-white/60">{filters.filtered.length}/{total} unidades</p>
          </div>
          <div className="mb-10"><StockSearchBar theme="dark" radiusClass="rounded-none" {...filters} /></div>
          {filters.filtered.length === 0 ? (
            <div className="border border-dashed border-[var(--s-primary)]/40 p-16 text-center font-mono uppercase tracking-widest text-white/60">// NO RESULTS</div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filters.filtered.map((v) => <VehicleCardHud key={v.id} v={v} />)}
            </div>
          )}
        </div>
      </section>

      {/* Sobre */}
      {store.about_text && (
        <section id="sobre" className="relative z-10 border-t border-[var(--s-primary)]/30 py-24">
          <div className="mx-auto max-w-5xl px-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--s-primary)]">// LOG · ABOUT</p>
            <h2 className="mt-3 font-display text-5xl uppercase leading-tight md:text-6xl" style={{ fontFamily: "var(--s-font-display)" }}>{store.name.toUpperCase()}</h2>
            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-white/70">{store.about_text}</p>
          </div>
        </section>
      )}

      {/* Contato */}
      <section id="contato" className="relative z-10 border-t border-[var(--s-primary)]/30 py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 md:grid-cols-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--s-primary)]">// UPLINK</p>
            <h2 className="mt-3 font-display text-5xl uppercase leading-tight md:text-6xl" style={{ fontFamily: "var(--s-font-display)" }}>Contato</h2>
            <div className="mt-6 space-y-2 font-mono text-sm text-white/80">
              {store.phone && <p className="inline-flex items-center gap-2"><Phone className="h-4 w-4" style={{ color: "var(--s-primary)" }} /> {store.phone}</p>}
              {wa && <p className="inline-flex items-center gap-2"><MessageCircle className="h-4 w-4" style={{ color: "var(--s-primary)" }} /> {store.whatsapp}</p>}
            </div>
          </div>
          <div className="border border-[var(--s-primary)]/40 bg-black/40 p-8 backdrop-blur">
            <LeadForm store={store} theme="dark" />
          </div>
        </div>
      </section>

      <ChatbotWidget storeSlug={store.slug} storeName={store.name} />
      <StoreFooter store={store} tone="dark" />
    </div>
  );
}