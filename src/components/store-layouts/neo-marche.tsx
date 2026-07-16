import { MessageCircle, Phone, Sparkles, Star } from "lucide-react";
import { LeadForm, StockSearchBar, StoreFooter, VehicleCardNeo, useStockFilters, useTrackView, waUrl, type StoreLike, type VehicleLike } from "./shared";
import { ChatbotWidget } from "@/components/ChatbotWidget";

export function NeoMarcheLayout({ store, vehicles }: { store: StoreLike; vehicles: VehicleLike[] }) {
  const { onWa } = useTrackView(store.id);
  const wa = waUrl(store);
  const filters = useStockFilters(vehicles);
  const rotations = [-1.2, 0.8, -0.6, 1.4, -0.9, 0.5, -1.5, 1.1, -0.4];

  return (
    <div className="min-h-screen bg-[color:var(--s-secondary)] text-neutral-950" style={{ fontFamily: "var(--s-font-body)" }}>
      {/* Header sticker-style */}
      <header className="border-b-[3px] border-neutral-900 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.name} className="h-11 w-11 rounded-xl border-[3px] border-neutral-900 bg-white object-contain" />
            ) : <div className="grid h-11 w-11 place-items-center rounded-xl border-[3px] border-neutral-900" style={{ background: "var(--s-primary)" }}><Sparkles className="h-5 w-5 text-white" /></div>}
            <div>
              <p className="font-display text-xl font-black" style={{ fontFamily: "var(--s-font-display)" }}>{store.name}</p>
              {store.tagline && <p className="text-xs text-neutral-600">{store.tagline}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {store.phone && <a href={`tel:${store.phone}`} className="hidden rounded-full border-[3px] border-neutral-900 bg-white px-3 py-1.5 text-xs font-black md:inline-flex">{store.phone}</a>}
            {wa && <a href={wa} target="_blank" rel="noopener" onClick={onWa} className="inline-flex items-center gap-1.5 rounded-full border-[3px] border-neutral-900 bg-[var(--s-accent)] px-4 py-2 text-xs font-black uppercase tracking-wide shadow-[3px_3px_0_0_theme(colors.neutral.900)]"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</a>}
          </div>
        </div>
      </header>

      {/* Hero pop */}
      <section className="relative overflow-hidden border-b-[3px] border-neutral-900">
        <div aria-hidden className="absolute -top-24 -left-24 h-72 w-72 rounded-full opacity-40" style={{ background: "var(--s-primary)" }} />
        <div aria-hidden className="absolute -bottom-32 right-10 h-96 w-96 rounded-full opacity-30" style={{ background: "var(--s-accent)" }} />
        <div className="relative mx-auto max-w-7xl px-6 py-20 md:py-28">
          <span className="inline-flex -rotate-2 items-center gap-1.5 rounded-lg border-[3px] border-neutral-900 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-widest shadow-[4px_4px_0_0_theme(colors.neutral.900)]"><Star className="h-3.5 w-3.5" style={{ color: "var(--s-primary)" }} /> Revenda queridinha do bairro</span>
          <h1 className="mt-6 max-w-3xl font-display text-6xl font-black leading-[0.95] md:text-8xl" style={{ fontFamily: "var(--s-font-display)" }}>
            {store.hero_headline ?? `Achou. Levou. É da ${store.name}.`}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-neutral-800">{store.hero_subheadline ?? "Seminovos revisados, preco que cabe, negociacao humana."}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#estoque" className="inline-flex items-center gap-2 rounded-full border-[3px] border-neutral-900 bg-neutral-900 px-7 py-3.5 text-sm font-black uppercase tracking-wide text-white shadow-[5px_5px_0_0_var(--s-primary)] transition hover:-translate-y-0.5">{store.cta_text ?? "Ver os carros"}</a>
            {wa && <a href={wa} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-full border-[3px] border-neutral-900 bg-white px-7 py-3.5 text-sm font-black uppercase tracking-wide shadow-[5px_5px_0_0_theme(colors.neutral.900)] hover:-translate-y-0.5">Falar no zap</a>}
          </div>
        </div>
      </section>

      {/* Estoque */}
      <section id="estoque" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-5xl font-black" style={{ fontFamily: "var(--s-font-display)" }}>Nosso estoque</h2>
          <p className="rounded-full border-[3px] border-neutral-900 bg-white px-4 py-1 text-xs font-black">{filters.filtered.length}/{vehicles.length} carros</p>
        </div>
        <div className="mb-10"><StockSearchBar {...filters} /></div>
        {filters.filtered.length === 0 ? (
          <div className="rounded-2xl border-[3px] border-dashed border-neutral-900 bg-white p-16 text-center font-black">Nenhum carro nesses filtros.</div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filters.filtered.map((v, i) => <VehicleCardNeo key={v.id} v={v} rotate={rotations[i % rotations.length]} />)}
          </div>
        )}
      </section>

      {/* Sobre */}
      {store.about_text && (
        <section id="sobre" className="border-y-[3px] border-neutral-900 bg-white">
          <div className="mx-auto max-w-4xl px-6 py-24 text-center">
            <span className="inline-block rotate-1 rounded-lg border-[3px] border-neutral-900 bg-[var(--s-accent)] px-3 py-1 text-[11px] font-black uppercase tracking-widest">Sobre a gente</span>
            <h2 className="mt-6 font-display text-5xl font-black leading-tight md:text-6xl" style={{ fontFamily: "var(--s-font-display)" }}>{store.name}</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-neutral-700">{store.about_text}</p>
          </div>
        </section>
      )}

      {/* Contato */}
      <section id="contato" className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="font-display text-5xl font-black leading-tight md:text-6xl" style={{ fontFamily: "var(--s-font-display)" }}>Chama a gente!</h2>
            <p className="mt-4 text-neutral-700">Manda mensagem, a resposta é rapida.</p>
            <div className="mt-6 space-y-2 text-sm">
              {store.phone && <p className="inline-flex items-center gap-2"><Phone className="h-4 w-4" style={{ color: "var(--s-primary)" }} /> {store.phone}</p>}
              {wa && <p className="inline-flex items-center gap-2"><MessageCircle className="h-4 w-4" style={{ color: "var(--s-primary)" }} /> {store.whatsapp}</p>}
            </div>
          </div>
          <div className="rounded-3xl border-[3px] border-neutral-900 bg-white p-8 shadow-[8px_8px_0_0_var(--s-primary)]">
            <LeadForm store={store} />
          </div>
        </div>
      </section>

      <ChatbotWidget storeSlug={store.slug} storeName={store.name} />
      <StoreFooter store={store} tone="light" />
    </div>
  );
}