import { MessageCircle, Phone, Sparkles } from "lucide-react";
import { LeadForm, StockSearchBar, StoreFooter, VehicleCardGlass, useStockFilters, useTrackView, waUrl, type StoreLike, type VehicleLike } from "./shared";
import { ChatbotWidget } from "@/components/ChatbotWidget";

export function AuroraLayout({ store, vehicles }: { store: StoreLike; vehicles: VehicleLike[] }) {
  const { onWa } = useTrackView(store.id);
  const wa = waUrl(store);
  const filters = useStockFilters(vehicles);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--s-neutral)] text-white" style={{ fontFamily: "var(--s-font-body)" }}>
      {/* Aurora blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 h-[520px] w-[520px] rounded-full opacity-40 blur-3xl motion-safe:animate-pulse" style={{ background: "var(--s-primary)" }} />
        <div className="absolute top-1/3 -right-32 h-[600px] w-[600px] rounded-full opacity-30 blur-3xl" style={{ background: "var(--s-accent)" }} />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full opacity-25 blur-3xl" style={{ background: "var(--s-secondary)" }} />
      </div>

      {/* Floating nav */}
      <header className="sticky top-4 z-30 mx-auto flex max-w-6xl items-center justify-between rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-xl md:top-6 md:px-6 md:py-3">
        <div className="flex items-center gap-3">
          {store.logo_url ? (
            <img src={store.logo_url} alt={store.name} className="h-9 w-9 rounded-full bg-white/10 object-contain" />
          ) : <div className="grid h-9 w-9 place-items-center rounded-full" style={{ background: "var(--s-primary)" }}><Sparkles className="h-4 w-4" /></div>}
          <span className="font-display text-sm font-semibold tracking-wide" style={{ fontFamily: "var(--s-font-display)" }}>{store.name}</span>
        </div>
        <nav className="hidden items-center gap-6 text-xs text-white/70 md:flex">
          <a href="#estoque" className="hover:text-white">Estoque</a>
          <a href="#sobre" className="hover:text-white">Sobre</a>
          <a href="#contato" className="hover:text-white">Contato</a>
        </nav>
        {wa && (
          <a href={wa} target="_blank" rel="noopener" onClick={onWa} className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-black" style={{ background: "var(--s-accent)" }}>
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </a>
        )}
      </header>

      {/* Hero cinematic typographic */}
      <section className="relative mx-auto max-w-6xl px-6 pt-24 pb-32 md:pt-32 md:pb-40">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/80 backdrop-blur"><Sparkles className="h-3 w-3" /> {store.style_tag || "Selecionados"}</p>
        <h1 className="mt-6 font-display text-5xl font-bold leading-[1.02] md:text-7xl lg:text-8xl" style={{ fontFamily: "var(--s-font-display)" }}>
          {store.hero_headline ?? `${store.name}.`}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-white/70 md:text-xl">{store.hero_subheadline ?? "Uma curadoria de seminovos com procedencia, revisao completa e garantia real."}</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <a href="#estoque" className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-black shadow-[0_20px_60px_-15px_var(--s-accent)] transition hover:-translate-y-0.5" style={{ background: "var(--s-accent)" }}>{store.cta_text ?? "Explorar estoque"}</a>
          {wa && <a href={wa} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-7 py-3.5 text-sm font-semibold backdrop-blur hover:bg-white/10">Falar no WhatsApp</a>}
        </div>
      </section>

      {/* Estoque */}
      <section id="estoque" className="relative mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">01 · Estoque</p>
            <h2 className="mt-2 font-display text-4xl font-bold md:text-5xl" style={{ fontFamily: "var(--s-font-display)" }}>Escolha o seu proximo carro</h2>
          </div>
          <p className="text-sm text-white/60">{filters.filtered.length} de {vehicles.length} veiculos</p>
        </div>
        <div className="mb-8"><StockSearchBar theme="dark" {...filters} /></div>
        {filters.filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-16 text-center text-white/70">Nenhum veiculo encontrado.</div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filters.filtered.map((v) => <VehicleCardGlass key={v.id} v={v} />)}
          </div>
        )}
      </section>

      {/* Sobre */}
      {store.about_text && (
        <section id="sobre" className="relative mx-auto max-w-6xl px-6 py-24">
          <div className="grid gap-12 md:grid-cols-[1fr_1.4fr] md:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">02 · Sobre</p>
              <h2 className="mt-2 font-display text-4xl font-bold leading-tight md:text-5xl" style={{ fontFamily: "var(--s-font-display)" }}>Uma marca construida na confianca.</h2>
            </div>
            <p className="text-lg leading-relaxed text-white/70">{store.about_text}</p>
          </div>
        </section>
      )}

      {/* Contato */}
      <section id="contato" className="relative mx-auto max-w-6xl px-6 py-24">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl md:p-12">
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">03 · Contato</p>
              <h2 className="mt-2 font-display text-4xl font-bold leading-tight md:text-5xl" style={{ fontFamily: "var(--s-font-display)" }}>Vamos conversar.</h2>
              <p className="mt-4 text-white/70">Envie sua mensagem — respondemos rapido, sem enrolacao.</p>
              <div className="mt-6 space-y-2 text-sm text-white/75">
                {store.phone && <p className="inline-flex items-center gap-2"><Phone className="h-4 w-4" style={{ color: "var(--s-accent)" }} /> {store.phone}</p>}
                {wa && <p className="inline-flex items-center gap-2"><MessageCircle className="h-4 w-4" style={{ color: "var(--s-accent)" }} /> {store.whatsapp}</p>}
              </div>
            </div>
            <LeadForm store={store} theme="dark" />
          </div>
        </div>
      </section>

      <ChatbotWidget storeSlug={store.slug} storeName={store.name} />
      <StoreFooter store={store} tone="dark" />
    </div>
  );
}