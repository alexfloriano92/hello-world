import { MapPin, MessageCircle, Phone } from "lucide-react";
import { LeadForm, StockSearchBar, StoreFooter, VehicleCardEditorial, useStockFilters, useTrackView, waUrl, type StoreLike, type VehicleLike } from "./shared";
import { ChatbotWidget } from "@/components/ChatbotWidget";

export function EditorialLayout({ store, vehicles }: { store: StoreLike; vehicles: VehicleLike[] }) {
  const { onWa } = useTrackView(store.id);
  const wa = waUrl(store);
  const filters = useStockFilters(vehicles);

  return (
    <div className="min-h-screen bg-[color:var(--s-secondary)]" style={{ fontFamily: "var(--s-font-body)", color: "var(--s-primary)" }}>
      {/* Masthead */}
      <header className="border-b-2 border-current">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-70">Ed. {new Date().getFullYear()} · {[store.city, store.state].filter(Boolean).join(", ") || "Brasil"}</p>
          <nav className="hidden gap-8 text-xs uppercase tracking-widest md:flex">
            <a href="#estoque">Colecao</a>
            <a href="#sobre">Sobre</a>
            <a href="#contato">Contato</a>
          </nav>
          {wa && <a href={wa} target="_blank" rel="noopener" onClick={onWa} className="text-xs font-semibold uppercase tracking-widest underline underline-offset-4">WhatsApp →</a>}
        </div>
        <div className="mx-auto max-w-7xl px-6 py-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.5em] opacity-60">A revenda como obra de curadoria</p>
          <h1 className="mt-4 font-display text-[14vw] font-bold leading-[0.85] tracking-tight md:text-[8rem]" style={{ fontFamily: "var(--s-font-display)" }}>
            <span className="italic">{store.name}</span>
          </h1>
          {store.tagline && <p className="mt-4 font-display text-xl italic opacity-80" style={{ fontFamily: "var(--s-font-display)" }}>{store.tagline}</p>}
        </div>
      </header>

      {/* Cover / Hero split */}
      <section className="border-b border-current/20">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-[1.4fr_1fr] md:gap-16">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-70">Editorial nº 01 — Manifesto</p>
            <h2 className="mt-4 font-display text-5xl leading-[1.05] md:text-6xl" style={{ fontFamily: "var(--s-font-display)" }}>
              {store.hero_headline ?? `Cada carro tem uma historia. A gente conta a certa.`}
            </h2>
          </div>
          <div className="border-l border-current/20 pl-8">
            <p className="text-lg leading-relaxed opacity-80">{store.hero_subheadline ?? "Curamos seminovos com procedencia, historico e sensibilidade — para quem quer mais do que um simples carro."}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#estoque" className="inline-flex items-center gap-2 border-2 border-current px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-current hover:text-[color:var(--s-secondary)]">{store.cta_text ?? "Ver colecao"}</a>
            </div>
          </div>
        </div>
      </section>

      {/* Estoque */}
      <section id="estoque" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-60">Colecao aberta</p>
            <h2 className="mt-2 font-display text-4xl italic md:text-5xl" style={{ fontFamily: "var(--s-font-display)" }}>Do galpao ao seu nome</h2>
          </div>
          <p className="text-sm opacity-70">{filters.filtered.length} de {vehicles.length}</p>
        </div>
        <div className="mb-10"><StockSearchBar {...filters} /></div>
        {filters.filtered.length === 0 ? (
          <div className="border-2 border-dashed border-current/30 p-16 text-center opacity-70">Nenhum veiculo encontrado.</div>
        ) : (
          <div className="divide-y-2 divide-current/10">
            {filters.filtered.map((v, i) => <VehicleCardEditorial key={v.id} v={v} index={i} />)}
          </div>
        )}
      </section>

      {/* Sobre */}
      {store.about_text && (
        <section id="sobre" className="border-y border-current/20 bg-[color:var(--s-secondary)]">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-24 md:grid-cols-[1fr_2fr] md:gap-16">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-60">Ensaio</p>
            <div>
              <h2 className="font-display text-4xl italic leading-tight md:text-5xl" style={{ fontFamily: "var(--s-font-display)" }}>Sobre a {store.name}</h2>
              <p className="mt-6 text-lg leading-relaxed opacity-80">{store.about_text}</p>
            </div>
          </div>
        </section>
      )}

      {/* Contato */}
      <section id="contato" className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-60">Contato</p>
            <h2 className="mt-2 font-display text-5xl italic leading-tight md:text-6xl" style={{ fontFamily: "var(--s-font-display)" }}>Escreva para {store.name}.</h2>
            <div className="mt-8 space-y-2 text-sm">
              {store.phone && <p className="inline-flex items-center gap-2"><Phone className="h-4 w-4" /> {store.phone}</p>}
              {wa && <p className="inline-flex items-center gap-2"><MessageCircle className="h-4 w-4" /> {store.whatsapp}</p>}
              {(store.address || store.city) && <p className="inline-flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4" />{[store.address, store.city, store.state].filter(Boolean).join(", ")}</p>}
            </div>
          </div>
          <div className="border-2 border-current p-8">
            <LeadForm store={store} />
          </div>
        </div>
      </section>

      <ChatbotWidget storeSlug={store.slug} storeName={store.name} />
      <StoreFooter store={store} tone="light" />
    </div>
  );
}