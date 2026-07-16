import { MessageCircle, Phone } from "lucide-react";
import { LeadForm, StockSearchBar, StoreFooter, VehicleCardMono, useStockFilters, useTrackView, waUrl, type StoreLike, type VehicleLike } from "./shared";
import { ChatbotWidget } from "@/components/ChatbotWidget";

export function MonolithLayout({ store, vehicles }: { store: StoreLike; vehicles: VehicleLike[] }) {
  const { onWa } = useTrackView(store.id);
  const wa = waUrl(store);
  const filters = useStockFilters(vehicles);

  return (
    <div className="min-h-screen bg-white text-neutral-950" style={{ fontFamily: "var(--s-font-body)" }}>
      {/* Grid overlay texture */}
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-[size:80px_80px]" />

      {/* Header */}
      <header className="relative border-b border-neutral-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            {store.logo_url && <img src={store.logo_url} alt={store.name} className="h-10 w-10 border border-neutral-900 object-contain" />}
            <p className="font-mono text-[11px] uppercase tracking-[0.3em]">{store.name}</p>
          </div>
          <nav className="hidden gap-8 font-mono text-[10px] uppercase tracking-[0.3em] md:flex">
            <a href="#estoque">01 Estoque</a>
            <a href="#sobre">02 Sobre</a>
            <a href="#contato">03 Contato</a>
          </nav>
          {wa && <a href={wa} target="_blank" rel="noopener" onClick={onWa} className="border-2 border-neutral-900 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-neutral-900 hover:text-white">WhatsApp</a>}
        </div>
      </header>

      {/* Hero typographic monolith */}
      <section className="relative mx-auto max-w-7xl px-6 py-24 md:py-32">
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-neutral-500">{store.style_tag || "Seminovos selecionados"}</p>
        <h1 className="mt-6 font-display text-[16vw] font-black uppercase leading-[0.85] tracking-tight md:text-[10rem]" style={{ fontFamily: "var(--s-font-display)" }}>
          {(store.hero_headline ?? store.name).toUpperCase()}
        </h1>
        <div className="mt-10 grid gap-10 border-t border-neutral-900 pt-10 md:grid-cols-[1fr_2fr]">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">§ Manifesto</p>
          <div>
            <p className="max-w-2xl text-xl leading-relaxed">{store.hero_subheadline ?? "Um estoque enxuto. Carros escolhidos. Nada supérfluo."}</p>
            <a href="#estoque" className="mt-8 inline-flex items-center gap-3 border-2 border-neutral-900 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] hover:bg-neutral-900 hover:text-white">
              <span className="h-2 w-2" style={{ background: "var(--s-accent)" }} /> {store.cta_text ?? "Ver estoque"}
            </a>
          </div>
        </div>
      </section>

      {/* Estoque */}
      <section id="estoque" className="relative border-t border-neutral-900">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-neutral-900 pb-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">§ 01</p>
              <h2 className="mt-2 font-display text-5xl font-black uppercase" style={{ fontFamily: "var(--s-font-display)" }}>Estoque</h2>
            </div>
            <p className="font-mono text-xs uppercase tracking-widest">{String(filters.filtered.length).padStart(2, "0")} / {String(vehicles.length).padStart(2, "0")}</p>
          </div>
          <div className="mb-8"><StockSearchBar radiusClass="rounded-none" {...filters} /></div>
          {filters.filtered.length === 0 ? (
            <div className="border-2 border-dashed border-neutral-400 p-16 text-center font-mono text-sm uppercase tracking-widest">Nenhum veiculo encontrado</div>
          ) : (
            <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-3">
              {filters.filtered.map((v, i) => <div key={v.id} className={`${i % 3 !== 2 ? "lg:-mr-px" : ""} ${i % 2 === 0 ? "sm:-mr-px lg:mr-0" : ""} -mb-px`}><VehicleCardMono v={v} /></div>)}
            </div>
          )}
        </div>
      </section>

      {/* Sobre */}
      {store.about_text && (
        <section id="sobre" className="relative border-t border-neutral-900 bg-neutral-950 text-white">
          <div className="mx-auto grid max-w-7xl gap-16 px-6 py-24 md:grid-cols-[1fr_2fr]">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">§ 02 Sobre</p>
            <div>
              <h2 className="font-display text-5xl font-black uppercase leading-none md:text-6xl" style={{ fontFamily: "var(--s-font-display)" }}>{store.name}</h2>
              <p className="mt-8 max-w-2xl text-xl leading-relaxed text-white/80">{store.about_text}</p>
            </div>
          </div>
        </section>
      )}

      {/* Contato */}
      <section id="contato" className="relative border-t border-neutral-900">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-24 md:grid-cols-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">§ 03 Contato</p>
            <h2 className="mt-2 font-display text-5xl font-black uppercase leading-none" style={{ fontFamily: "var(--s-font-display)" }}>Fale conosco</h2>
            <div className="mt-8 space-y-2 font-mono text-sm">
              {store.phone && <p className="inline-flex items-center gap-2"><Phone className="h-4 w-4" /> {store.phone}</p>}
              {wa && <p className="inline-flex items-center gap-2"><MessageCircle className="h-4 w-4" /> {store.whatsapp}</p>}
            </div>
          </div>
          <div className="border-2 border-neutral-900 p-8">
            <LeadForm store={store} />
          </div>
        </div>
      </section>

      <ChatbotWidget storeSlug={store.slug} storeName={store.name} />
      <StoreFooter store={store} tone="light" />
    </div>
  );
}