import { Car, MapPin, MessageCircle, Phone, Sparkles } from "lucide-react";
import { LeadForm, StockSearchBar, StoreFooter, useStockFilters, useTrackView, waUrl, fmtBRL, type StoreLike, type VehicleLike } from "./shared";
import { ChatbotWidget } from "@/components/ChatbotWidget";

export function DefaultLayout({ store, vehicles }: { store: StoreLike; vehicles: VehicleLike[] }) {
  const { onWa } = useTrackView(store.id);
  const wa = waUrl(store);
  const filters = useStockFilters(vehicles);

  return (
    <div className="min-h-screen bg-white text-neutral-900" style={{ fontFamily: "var(--s-font-body)" }}>
      <header className="border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            {store.logo_url ? <img src={store.logo_url} alt={store.name} className="h-12 w-12 rounded-lg bg-white object-contain" /> : <div className="grid h-12 w-12 place-items-center rounded-lg" style={{ background: "var(--s-primary)" }}><Car className="h-6 w-6 text-white" /></div>}
            <div>
              <p className="text-lg font-bold" style={{ fontFamily: "var(--s-font-display)" }}>{store.name}</p>
              {store.tagline && <p className="text-xs text-neutral-500">{store.tagline}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {store.phone && <a href={`tel:${store.phone}`} className="hidden items-center gap-1.5 text-sm font-medium md:inline-flex"><Phone className="h-4 w-4" /> {store.phone}</a>}
            {wa && <a href={wa} target="_blank" rel="noopener" onClick={onWa} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow" style={{ background: "var(--s-accent)" }}><MessageCircle className="h-4 w-4" /> WhatsApp</a>}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, var(--s-primary) 0%, var(--s-secondary) 100%)` }}>
        <div className="mx-auto max-w-7xl px-6 py-24 text-white md:py-32">
          <div className="max-w-2xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur"><Sparkles className="h-3.5 w-3.5" /> {store.style_tag ?? "Seminovos"}</p>
            <h1 className="text-4xl font-bold leading-tight md:text-6xl" style={{ fontFamily: "var(--s-font-display)" }}>{store.hero_headline ?? `${store.name}: seu proximo carro esta aqui`}</h1>
            <p className="mt-5 text-lg text-white/85 md:text-xl">{store.hero_subheadline ?? "Seminovos selecionados, revisados e com garantia."}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#estoque" className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-neutral-900 shadow-lg" style={{ background: "var(--s-accent)" }}>{store.cta_text ?? "Ver estoque"}</a>
              {wa && <a href={wa} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/10">Falar no WhatsApp</a>}
            </div>
          </div>
        </div>
      </section>

      <section id="estoque" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold md:text-4xl">Nosso estoque</h2>
            <p className="mt-2 text-neutral-600">{filters.filtered.length} de {vehicles.length} veiculo(s)</p>
          </div>
        </div>
        <div className="mb-6"><StockSearchBar {...filters} /></div>
        {filters.filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-16 text-center"><p className="text-neutral-600">Nenhum veiculo encontrado.</p></div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filters.filtered.map((v) => {
              const photo = Array.isArray(v.photos) ? v.photos[0] : null;
              return (
                <article key={v.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="aspect-[4/3] w-full bg-neutral-100">
                    {photo ? <img src={photo} alt={v.title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-neutral-400"><Car className="h-12 w-12" /></div>}
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-bold">{v.title}</h3>
                    <p className="mt-1 text-sm text-neutral-500">{[v.brand, v.model, v.year, v.fuel].filter(Boolean).join(" · ")}</p>
                    <div className="mt-4 flex items-end justify-between">
                      {v.price != null && <p className="text-2xl font-bold" style={{ color: "var(--s-primary)" }}>{fmtBRL(v.price)}</p>}
                      {v.km != null && <p className="text-xs text-neutral-500">{Number(v.km).toLocaleString("pt-BR")} km</p>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {store.about_text && (
        <section className="border-t border-neutral-200 bg-neutral-50">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold md:text-4xl">Sobre a {store.name}</h2>
              <p className="mt-5 text-lg leading-relaxed text-neutral-700">{store.about_text}</p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Contato</p>
              <div className="mt-4 space-y-3 text-sm">
                {store.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4" style={{ color: "var(--s-primary)" }} /> {store.phone}</p>}
                {wa && <p className="flex items-center gap-2"><MessageCircle className="h-4 w-4" style={{ color: "var(--s-primary)" }} /> {store.whatsapp}</p>}
                {(store.address || store.city) && <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4" style={{ color: "var(--s-primary)" }} /> {[store.address, store.city, store.state].filter(Boolean).join(", ")}</p>}
              </div>
            </div>
          </div>
        </section>
      )}

      <section id="contato" className="border-t border-neutral-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold md:text-4xl">Fale com a {store.name}</h2>
            <p className="mt-3 text-neutral-600">Envie sua mensagem e nossa equipe entra em contato o quanto antes.</p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6"><LeadForm store={store} /></div>
        </div>
      </section>

      <ChatbotWidget storeSlug={store.slug} storeName={store.name} />
      <StoreFooter store={store} tone="invert" />
    </div>
  );
}