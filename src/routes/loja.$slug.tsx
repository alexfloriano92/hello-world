import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { Car, MapPin, Phone, MessageCircle, Sparkles, Search, SlidersHorizontal, X, Send, Loader2, CheckCircle2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { submitLead, trackEvent } from "@/lib/leads.functions";
import { ChatbotWidget } from "@/components/ChatbotWidget";


const SlugInput = z.object({ slug: z.string().min(1) });

const getPublicStore = createServerFn({ method: "GET" })
  .validator((data: unknown) => SlugInput.parse(data))
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const supa = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { data: store, error } = await supa
      .from("stores")
      .select("*")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();

    if (error) throw error;
    if (!store) return null;

    const { data: vehicles } = await supa
      .from("vehicles")
      .select("id,title,brand,model,year,km,price,photos,featured")
      .eq("store_id", store.id)
      .eq("sold", false)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(24);

    return { store, vehicles: vehicles ?? [] };
  });

export const Route = createFileRoute("/loja/$slug")({
  loader: async ({ params }) => {
    const result = await getPublicStore({ data: { slug: params.slug } });
    if (!result) throw notFound();
    return result;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Loja não encontrada" }] };
    const s = loaderData.store as any;
    const title = `${s.name} — Seminovos selecionados`;
    const description = s.tagline ?? s.hero_subheadline ?? `Confira o estoque da ${s.name}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        ...(s.logo_url ? [{ property: "og:image", content: s.logo_url }] : []),
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: PublicStore,
  errorComponent: ({ error }) => (
    <div className="p-10 text-center">Erro ao carregar: {error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center bg-background p-10 text-center">
      <div>
        <h1 className="font-display text-3xl font-bold">Loja não encontrada</h1>
        <p className="mt-2 text-muted-foreground">Essa revenda ainda não publicou seu site.</p>
        <Link to="/" className="mt-6 inline-block rounded-full bg-primary px-5 py-2 text-primary-foreground">Voltar ao início</Link>
      </div>
    </div>
  ),
});

function PublicStore() {
  const { store, vehicles } = Route.useLoaderData() as { store: any; vehicles: any[] };
  const primary = store.primary_color || "#e63946";
  const secondary = store.secondary_color || "#0b2e5e";
  const accent = store.accent_color || "#f4a261";
  const neutral = store.neutral_color || "#0b0f19";

  const style = {
    "--s-primary": primary,
    "--s-secondary": secondary,
    "--s-accent": accent,
    "--s-neutral": neutral,
  } as React.CSSProperties;

  const wa = store.whatsapp?.replace(/\D/g, "");

  const track = useServerFn(trackEvent);
  useEffect(() => {
    track({ data: { store_id: store.id, event_type: "view_store", referrer: document.referrer || null, user_agent: navigator.userAgent } }).catch(() => {});
  }, [store.id, track]);
  const onWaClick = () => {
    track({ data: { store_id: store.id, event_type: "click_whatsapp" } }).catch(() => {});
  };


  return (
    <div style={style} className="min-h-screen bg-white text-neutral-900">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.name} className="h-12 w-12 rounded-lg bg-white object-contain" />
            ) : (
              <div className="grid h-12 w-12 place-items-center rounded-lg" style={{ background: primary }}>
                <Car className="h-6 w-6 text-white" />
              </div>
            )}
            <div>
              <p className="text-lg font-bold" style={{ fontFamily: store.font_display ?? undefined }}>{store.name}</p>
              {store.tagline && <p className="text-xs text-neutral-500">{store.tagline}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {store.phone && (
              <a href={`tel:${store.phone}`} className="hidden items-center gap-1.5 text-sm font-medium md:inline-flex">
                <Phone className="h-4 w-4" /> {store.phone}
              </a>
            )}
            {wa && (
              <a
                href={`https://wa.me/55${wa}`}
                target="_blank"
                rel="noopener"
                onClick={onWaClick}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow"
                style={{ background: accent }}
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)` }}
      >
        <div className="mx-auto max-w-7xl px-6 py-24 text-white md:py-32">
          <div className="max-w-2xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> {store.style_tag ?? "Seminovos"}
            </p>
            <h1 className="text-4xl font-bold leading-tight md:text-6xl">
              {store.hero_headline ?? `${store.name}: seu próximo carro está aqui`}
            </h1>
            <p className="mt-5 text-lg text-white/85 md:text-xl">
              {store.hero_subheadline ?? "Seminovos selecionados, revisados e com garantia."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#estoque"
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-neutral-900 shadow-lg"
                style={{ background: accent }}
              >
                {store.cta_text ?? "Ver estoque"}
              </a>
              {wa && (
                <a
                  href={`https://wa.me/55${wa}`}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/10"
                >
                  Falar no WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Estoque */}
      <StockSection vehicles={vehicles} primary={primary} accent={accent} />

      {/* Contato / Lead */}
      <ContactSection store={store} primary={primary} accent={accent} />

      <ChatbotWidget storeSlug={store.slug} storeName={store.name} />

      {/* Sobre */}
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
                {store.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4" style={{ color: primary }} /> {store.phone}</p>}
                {wa && <p className="flex items-center gap-2"><MessageCircle className="h-4 w-4" style={{ color: primary }} /> WhatsApp: {store.whatsapp}</p>}
                {(store.address || store.city) && (
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: primary }} />
                    <span>{[store.address, store.city, store.state].filter(Boolean).join(", ")}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-8 text-center text-sm text-neutral-500" style={{ background: neutral, color: "#fff" }}>
        <p>© {new Date().getFullYear()} {store.name}. Todos os direitos reservados.</p>
        <p className="mt-1 text-xs opacity-70">Site criado com AutoSite</p>
      </footer>
    </div>
  );
}

function StockSection({ vehicles, primary, accent }: { vehicles: any[]; primary: string; accent: string }) {
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("");
  const [fuel, setFuel] = useState("");
  const [minYear, setMinYear] = useState("");
  const [maxYear, setMaxYear] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const brands = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.brand).filter(Boolean))).sort() as string[],
    [vehicles]
  );
  const fuels = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.fuel).filter(Boolean))).sort() as string[],
    [vehicles]
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const minY = minYear ? parseInt(minYear, 10) : null;
    const maxY = maxYear ? parseInt(maxYear, 10) : null;
    const minP = minPrice ? parseFloat(minPrice.replace(/\./g, "").replace(",", ".")) : null;
    const maxP = maxPrice ? parseFloat(maxPrice.replace(/\./g, "").replace(",", ".")) : null;

    return vehicles.filter((v) => {
      if (term) {
        const hay = [v.title, v.brand, v.model, v.color].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (brand && v.brand !== brand) return false;
      if (fuel && v.fuel !== fuel) return false;
      if (minY != null && (v.year == null || v.year < minY)) return false;
      if (maxY != null && (v.year == null || v.year > maxY)) return false;
      if (minP != null && (v.price == null || Number(v.price) < minP)) return false;
      if (maxP != null && (v.price == null || Number(v.price) > maxP)) return false;
      return true;
    });
  }, [vehicles, q, brand, fuel, minYear, maxYear, minPrice, maxPrice]);

  const anyActive = q || brand || fuel || minYear || maxYear || minPrice || maxPrice;

  const clear = () => {
    setQ(""); setBrand(""); setFuel(""); setMinYear(""); setMaxYear(""); setMinPrice(""); setMaxPrice("");
  };

  const fieldCls = "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400";

  return (
    <section id="estoque" className="mx-auto max-w-7xl px-6 py-20">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold md:text-4xl">Nosso estoque</h2>
          <p className="mt-2 text-neutral-600">
            {filtered.length} de {vehicles.length} veículo(s)
          </p>
        </div>
      </div>

      {/* Search + filter toggle */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por marca, modelo, cor…"
            className="w-full rounded-full border border-neutral-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-neutral-400"
          />
        </div>
        <button
          onClick={() => setShowFilters((s) => !s)}
          className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-neutral-50"
        >
          <SlidersHorizontal className="h-4 w-4" /> Filtros
        </button>
        {anyActive && (
          <button
            onClick={clear}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-neutral-600 hover:text-neutral-900"
          >
            <X className="h-4 w-4" /> Limpar
          </button>
        )}
      </div>

      {showFilters && (
        <div className="mb-8 grid gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Marca</span>
            <select value={brand} onChange={(e) => setBrand(e.target.value)} className={fieldCls}>
              <option value="">Todas</option>
              {brands.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Combustível</span>
            <select value={fuel} onChange={(e) => setFuel(e.target.value)} className={fieldCls}>
              <option value="">Todos</option>
              {fuels.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <div>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Ano</span>
            <div className="flex gap-2">
              <input inputMode="numeric" placeholder="De" value={minYear} onChange={(e) => setMinYear(e.target.value.replace(/\D/g, "").slice(0, 4))} className={fieldCls} />
              <input inputMode="numeric" placeholder="Até" value={maxYear} onChange={(e) => setMaxYear(e.target.value.replace(/\D/g, "").slice(0, 4))} className={fieldCls} />
            </div>
          </div>
          <div>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Preço (R$)</span>
            <div className="flex gap-2">
              <input inputMode="decimal" placeholder="Mín" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className={fieldCls} />
              <input inputMode="decimal" placeholder="Máx" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className={fieldCls} />
            </div>
          </div>
        </div>
      )}

      {vehicles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-16 text-center">
          <p className="text-neutral-600">Nenhum veículo cadastrado ainda. Volte em breve!</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-16 text-center">
          <p className="text-neutral-600">Nenhum veículo encontrado com esses filtros.</p>
          <button onClick={clear} className="mt-4 rounded-full px-5 py-2 text-sm font-semibold text-white" style={{ background: accent }}>
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => {
            const photo = Array.isArray(v.photos) ? v.photos[0] : null;
            return (
              <article key={v.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className="aspect-[4/3] w-full bg-neutral-100">
                  {photo ? (
                    <img src={photo} alt={v.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-neutral-400"><Car className="h-12 w-12" /></div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold">{v.title}</h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    {[v.brand, v.model, v.year, v.fuel].filter(Boolean).join(" • ")}
                  </p>
                  <div className="mt-4 flex items-end justify-between">
                    {v.price != null && (
                      <p className="text-2xl font-bold" style={{ color: primary }}>
                        R$ {Number(v.price).toLocaleString("pt-BR")}
                      </p>
                    )}
                    {v.km != null && <p className="text-xs text-neutral-500">{Number(v.km).toLocaleString("pt-BR")} km</p>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}


function ContactSection({ store, primary, accent }: { store: any; primary: string; accent: string }) {
  const submit = useServerFn(submitLead);
  const track = useServerFn(trackEvent);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return;
    setSending(true);
    try {
      await submit({ data: { store_id: store.id, name: name.trim(), phone: phone || null, email: email || null, message: message || null, source: "site" } });
      track({ data: { store_id: store.id, event_type: "submit_lead" } }).catch(() => {});
      setDone(true);
      setName(""); setPhone(""); setEmail(""); setMessage("");
    } catch (err) {
      alert("Erro ao enviar. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="contato" className="border-t border-neutral-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold md:text-4xl">Fale com a {store.name}</h2>
          <p className="mt-3 text-neutral-600">Envie sua mensagem e nossa equipe entra em contato o quanto antes.</p>
        </div>
        <form onSubmit={onSubmit} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 space-y-3">
          {done ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-12 w-12" style={{ color: primary }} />
              <p className="mt-3 text-lg font-semibold">Mensagem enviada!</p>
              <p className="text-sm text-neutral-600">Retornaremos em breve.</p>
              <button type="button" onClick={() => setDone(false)} className="mt-4 text-sm underline">Enviar outra</button>
            </div>
          ) : (
            <>
              <input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome *" className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefone / WhatsApp" className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm" />
              <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Como podemos ajudar?" className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm" />
              <button disabled={sending} className="inline-flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white disabled:opacity-60" style={{ background: accent }}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? "Enviando…" : "Enviar mensagem"}
              </button>
            </>
          )}
        </form>
      </div>
    </section>
  );
}
