import { MessageCircle, Phone } from "lucide-react";
import { LeadForm, StockSearchBar, StoreFooter, VehicleCardShowroom, useStockFilters, useTrackView, waUrl, type StoreLike, type VehicleLike } from "./shared";
import { ChatbotWidget } from "@/components/ChatbotWidget";

export function ShowroomLayout({ store, vehicles }: { store: StoreLike; vehicles: VehicleLike[] }) {
  const { onWa } = useTrackView(store.id);
  const wa = waUrl(store);
  const filters = useStockFilters(vehicles);
  const featured = vehicles.find((v) => Array.isArray(v.photos) && v.photos.length > 0) ?? vehicles[0];
  const featuredPhoto = featured && Array.isArray(featured.photos) ? featured.photos[0] : null;

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: "var(--s-font-body)" }}>
      {/* Hero cinematic */}
      <section className="relative min-h-[92vh] overflow-hidden">
        <div className="absolute inset-0">
          {featuredPhoto ? (
            <img src={featuredPhoto} alt="" className="h-full w-full object-cover opacity-70" />
          ) : (
            <div className="h-full w-full" style={{ background: "radial-gradient(circle at 30% 40%, var(--s-primary) 0%, transparent 55%), radial-gradient(circle at 80% 70%, var(--s-accent) 0%, transparent 45%), #050505" }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black" />
        </div>

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            {store.logo_url && <img src={store.logo_url} alt={store.name} className="h-11 w-11 rounded-full bg-white/10 object-contain" />}
            <div>
              <p className="font-display text-2xl tracking-[0.15em]" style={{ fontFamily: "var(--s-font-display)" }}>{store.name.toUpperCase()}</p>
              {store.tagline && <p className="text-[10px] uppercase tracking-[0.3em] text-white/60">{store.tagline}</p>}
            </div>
          </div>
          <nav className="hidden gap-8 text-xs uppercase tracking-[0.25em] text-white/70 md:flex">
            <a href="#estoque" className="hover:text-white">Colecao</a>
            <a href="#sobre" className="hover:text-white">Historia</a>
            <a href="#contato" className="hover:text-white">Contato</a>
          </nav>
          {wa && <a href={wa} target="_blank" rel="noopener" onClick={onWa} className="rounded-none border border-white/40 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] backdrop-blur hover:bg-white hover:text-black">WhatsApp</a>}
        </header>

        <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-start justify-end px-6 pt-32 pb-20 md:min-h-[70vh]">
          <p className="text-[10px] uppercase tracking-[0.5em] text-white/70">Concessionaria de seminovos premium</p>
          <h1 className="mt-4 max-w-4xl font-display text-6xl leading-[0.95] tracking-tight md:text-8xl" style={{ fontFamily: "var(--s-font-display)" }}>
            {(store.hero_headline ?? "Dirija algo excepcional.").toUpperCase()}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/80">{store.hero_subheadline ?? "Uma selecao rigorosa de veiculos premium. Cada carro, uma escolha."}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a href="#estoque" className="inline-flex items-center gap-2 border-2 border-white bg-white px-8 py-4 text-[11px] font-bold uppercase tracking-[0.3em] text-black transition hover:bg-transparent hover:text-white">{(store.cta_text ?? "Ver colecao")}</a>
            {wa && <a href={wa} target="_blank" rel="noopener" className="inline-flex items-center gap-2 border-2 border-white/40 px-8 py-4 text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-white hover:text-black">Agendar visita</a>}
          </div>
        </div>
      </section>

      {/* Estoque */}
      <section id="estoque" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-white/15 pb-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.5em] text-white/50">Colecao atual</p>
            <h2 className="mt-3 font-display text-5xl uppercase leading-none tracking-wide md:text-6xl" style={{ fontFamily: "var(--s-font-display)" }}>O Estoque</h2>
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">{filters.filtered.length} de {vehicles.length} veiculos</p>
        </div>
        <div className="mb-10"><StockSearchBar theme="dark" {...filters} /></div>
        {filters.filtered.length === 0 ? (
          <div className="border border-white/20 p-16 text-center text-white/70">Nenhum veiculo encontrado.</div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filters.filtered.map((v) => <VehicleCardShowroom key={v.id} v={v} />)}
          </div>
        )}
      </section>

      {/* Sobre */}
      {store.about_text && (
        <section id="sobre" className="border-y border-white/10 bg-neutral-950">
          <div className="mx-auto grid max-w-7xl gap-12 px-6 py-24 md:grid-cols-[1fr_1.6fr] md:gap-20">
            <div>
              <p className="text-[10px] uppercase tracking-[0.5em] text-white/50">Historia</p>
              <h2 className="mt-3 font-display text-5xl uppercase leading-none tracking-wide md:text-6xl" style={{ fontFamily: "var(--s-font-display)" }}>A casa {store.name.toUpperCase()}</h2>
            </div>
            <p className="text-lg leading-relaxed text-white/75">{store.about_text}</p>
          </div>
        </section>
      )}

      {/* Contato */}
      <section id="contato" className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.5em] text-white/50">Contato</p>
            <h2 className="mt-3 font-display text-5xl uppercase leading-none tracking-wide md:text-6xl" style={{ fontFamily: "var(--s-font-display)" }}>Agende sua visita</h2>
            <div className="mt-8 space-y-3 text-sm text-white/80">
              {store.phone && <p className="inline-flex items-center gap-2"><Phone className="h-4 w-4" style={{ color: "var(--s-accent)" }} /> {store.phone}</p>}
              {wa && <p className="inline-flex items-center gap-2"><MessageCircle className="h-4 w-4" style={{ color: "var(--s-accent)" }} /> {store.whatsapp}</p>}
            </div>
          </div>
          <div className="border border-white/20 bg-white/[0.02] p-8">
            <LeadForm store={store} theme="dark" />
          </div>
        </div>
      </section>

      <ChatbotWidget storeSlug={store.slug} storeName={store.name} />
      <StoreFooter store={store} tone="dark" />
    </div>
  );
}