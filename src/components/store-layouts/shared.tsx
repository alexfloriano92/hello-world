import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitLead, trackEvent } from "@/lib/leads.functions";
import { Car, CheckCircle2, Loader2, Search, Send, SlidersHorizontal, X } from "lucide-react";

export type StoreLike = {
  id: string;
  slug: string;
  name: string;
  tagline?: string | null;
  logo_url?: string | null;
  hero_headline?: string | null;
  hero_subheadline?: string | null;
  about_text?: string | null;
  cta_text?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  neutral_color?: string | null;
  font_display?: string | null;
  font_body?: string | null;
  style_tag?: string | null;
};

export type VehicleLike = {
  id: string;
  title: string;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  fuel?: string | null;
  color?: string | null;
  km?: number | null;
  price?: number | string | null;
  photos?: string[] | null;
  sold?: boolean;
};

export function useTrackView(storeId: string) {
  const track = useServerFn(trackEvent);
  useEffect(() => {
    track({ data: { store_id: storeId, event_type: "view_store", referrer: typeof document !== "undefined" ? document.referrer || null : null, user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null } }).catch(() => {});
  }, [storeId, track]);
  return {
    onWa: () => track({ data: { store_id: storeId, event_type: "click_whatsapp" } }).catch(() => {}),
  };
}

export function waUrl(store: StoreLike): string | null {
  const wa = store.whatsapp?.replace(/\D/g, "");
  if (!wa) return null;
  return `https://wa.me/55${wa}`;
}

export function fmtBRL(v: number | string | null | undefined): string | null {
  if (v == null) return null;
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return null;
  return `R$ ${n.toLocaleString("pt-BR")}`;
}

// ==================== StockFilterBar ====================
// Retorna filtros aplicados + UI de filtros. Cada layout embrulha do jeito dele.
export function useStockFilters(vehicles: VehicleLike[]) {
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("");
  const [fuel, setFuel] = useState("");
  const brands = useMemo(() => Array.from(new Set(vehicles.map((v) => v.brand).filter(Boolean))).sort() as string[], [vehicles]);
  const fuels = useMemo(() => Array.from(new Set(vehicles.map((v) => v.fuel).filter(Boolean))).sort() as string[], [vehicles]);
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (term) {
        const hay = [v.title, v.brand, v.model, v.color].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (brand && v.brand !== brand) return false;
      if (fuel && v.fuel !== fuel) return false;
      return true;
    });
  }, [vehicles, q, brand, fuel]);
  const clear = () => { setQ(""); setBrand(""); setFuel(""); };
  const anyActive = !!(q || brand || fuel);
  return { q, setQ, brand, setBrand, fuel, setFuel, brands, fuels, filtered, clear, anyActive };
}

// ==================== VehicleCard variants ====================
export function VehicleCardGlass({ v }: { v: VehicleLike }) {
  const photo = Array.isArray(v.photos) ? v.photos[0] : null;
  return (
    <article className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur transition-all duration-500 hover:-translate-y-1 hover:border-white/25 hover:bg-white/10">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--s-primary)]/20 via-transparent to-[var(--s-accent)]/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/40">
        {photo ? (
          <img src={photo} alt={v.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : <div className="grid h-full place-items-center text-white/30"><Car className="h-12 w-12" /></div>}
      </div>
      <div className="relative p-5 text-white">
        <h3 className="font-display text-lg font-semibold">{v.title}</h3>
        <p className="mt-1 text-xs text-white/60">{[v.brand, v.model, v.year, v.fuel].filter(Boolean).join(" · ")}</p>
        <div className="mt-4 flex items-end justify-between">
          {v.price != null && <p className="text-2xl font-bold text-[var(--s-accent)]">{fmtBRL(v.price)}</p>}
          {v.km != null && <p className="text-[10px] uppercase tracking-widest text-white/50">{Number(v.km).toLocaleString("pt-BR")} km</p>}
        </div>
      </div>
    </article>
  );
}

export function VehicleCardEditorial({ v, index }: { v: VehicleLike; index: number }) {
  const photo = Array.isArray(v.photos) ? v.photos[0] : null;
  return (
    <article className="group grid grid-cols-1 gap-6 border-t border-neutral-900/20 py-8 md:grid-cols-[80px_1fr_1.4fr] md:gap-10">
      <div className="font-display text-4xl italic text-neutral-400 md:text-5xl">{String(index + 1).padStart(2, "0")}</div>
      <div>
        <h3 className="font-display text-2xl italic leading-tight md:text-3xl">{v.title}</h3>
        <p className="mt-2 text-sm text-neutral-600">{[v.brand, v.model, v.year, v.fuel].filter(Boolean).join(" · ")}</p>
        {v.price != null && <p className="mt-4 text-3xl font-bold" style={{ color: "var(--s-primary)" }}>{fmtBRL(v.price)}</p>}
        {v.km != null && <p className="mt-1 text-xs text-neutral-500">{Number(v.km).toLocaleString("pt-BR")} km</p>}
      </div>
      <div className="aspect-[16/10] w-full overflow-hidden bg-neutral-200">
        {photo ? <img src={photo} alt={v.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-neutral-400"><Car className="h-12 w-12" /></div>}
      </div>
    </article>
  );
}

export function VehicleCardMono({ v }: { v: VehicleLike }) {
  const photo = Array.isArray(v.photos) ? v.photos[0] : null;
  return (
    <article className="group border border-neutral-900 bg-white transition-transform hover:-translate-y-0.5">
      <div className="aspect-square w-full overflow-hidden border-b border-neutral-900 bg-neutral-100">
        {photo ? <img src={photo} alt={v.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-neutral-400"><Car className="h-16 w-16" /></div>}
      </div>
      <div className="p-5 font-body">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">{v.brand ?? "—"} / {v.year ?? "—"}</p>
        <h3 className="mt-2 text-xl font-black uppercase leading-tight">{v.title}</h3>
        <div className="mt-4 flex items-end justify-between border-t border-neutral-900 pt-3">
          {v.price != null && <p className="text-2xl font-black">{fmtBRL(v.price)}</p>}
          {v.km != null && <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">{Number(v.km).toLocaleString("pt-BR")}km</p>}
        </div>
      </div>
    </article>
  );
}

export function VehicleCardShowroom({ v }: { v: VehicleLike }) {
  const photo = Array.isArray(v.photos) ? v.photos[0] : null;
  return (
    <article className="group relative overflow-hidden rounded-2xl bg-black transition-all duration-500 hover:shadow-[0_30px_80px_-20px_var(--s-primary)]">
      <div className="relative aspect-[3/2] w-full overflow-hidden">
        {photo ? <img src={photo} alt={v.title} className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110" /> : <div className="grid h-full place-items-center text-white/20"><Car className="h-14 w-14" /></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 text-white">
          <p className="font-display text-3xl tracking-wide">{v.title}</p>
          <p className="mt-1 text-xs text-white/70">{[v.brand, v.year, v.fuel].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      <div className="flex items-center justify-between bg-neutral-950 px-6 py-4 text-white">
        {v.price != null ? <p className="font-display text-2xl" style={{ color: "var(--s-accent)" }}>{fmtBRL(v.price)}</p> : <span />}
        {v.km != null && <p className="text-xs uppercase tracking-[0.2em] text-white/60">{Number(v.km).toLocaleString("pt-BR")} km</p>}
      </div>
    </article>
  );
}

export function VehicleCardNeo({ v, rotate }: { v: VehicleLike; rotate: number }) {
  const photo = Array.isArray(v.photos) ? v.photos[0] : null;
  return (
    <article
      className="group relative rounded-2xl border-[3px] border-neutral-900 bg-white shadow-[6px_6px_0_0_var(--s-neutral)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[10px_10px_0_0_var(--s-neutral)]"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <div className="aspect-[4/3] w-full overflow-hidden rounded-t-xl bg-neutral-100">
        {photo ? <img src={photo} alt={v.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-neutral-400"><Car className="h-12 w-12" /></div>}
      </div>
      <div className="p-5">
        <span className="inline-block -rotate-2 rounded-md border-2 border-neutral-900 bg-[var(--s-accent)] px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-neutral-900">{v.brand ?? "Auto"}</span>
        <h3 className="mt-3 text-xl font-black leading-tight">{v.title}</h3>
        <p className="mt-1 text-xs text-neutral-500">{[v.model, v.year, v.fuel].filter(Boolean).join(" · ")}</p>
        <div className="mt-4 flex items-end justify-between border-t-2 border-dashed border-neutral-900 pt-3">
          {v.price != null && <p className="text-2xl font-black" style={{ color: "var(--s-primary)" }}>{fmtBRL(v.price)}</p>}
          {v.km != null && <p className="text-[10px] font-bold uppercase tracking-widest">{Number(v.km).toLocaleString("pt-BR")}km</p>}
        </div>
      </div>
    </article>
  );
}

export function VehicleCardHud({ v }: { v: VehicleLike }) {
  const photo = Array.isArray(v.photos) ? v.photos[0] : null;
  return (
    <article className="group relative border border-[var(--s-primary)]/40 bg-black/40 backdrop-blur transition-all duration-300 hover:border-[var(--s-primary)] hover:shadow-[0_0_40px_var(--s-primary)]">
      <div className="absolute left-2 top-2 z-10 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--s-accent)]">UNIT · {v.id.slice(0, 6)}</div>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
        {photo ? <img src={photo} alt={v.title} className="h-full w-full object-cover opacity-90 transition-all duration-500 group-hover:opacity-100" /> : <div className="grid h-full place-items-center text-[var(--s-primary)]/40"><Car className="h-12 w-12" /></div>}
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_2px,rgba(255,255,255,0.03)_2px,rgba(255,255,255,0.03)_3px)]" />
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-[var(--s-primary)]/30 p-4 font-mono text-[11px] text-white/80">
        <div><span className="text-white/40">MODEL</span><br/>{v.title}</div>
        <div><span className="text-white/40">YEAR</span><br/>{v.year ?? "—"}</div>
        <div><span className="text-white/40">KM</span><br/>{v.km != null ? Number(v.km).toLocaleString("pt-BR") : "—"}</div>
        <div><span className="text-white/40">PRICE</span><br/><span className="font-bold text-[var(--s-accent)]">{fmtBRL(v.price) ?? "—"}</span></div>
      </div>
    </article>
  );
}

// ==================== StockToolbar (search + filters, agnostic look via className slots) ====================
export function StockSearchBar(props: {
  q: string; setQ: (v: string) => void;
  brands: string[]; brand: string; setBrand: (v: string) => void;
  fuels: string[]; fuel: string; setFuel: (v: string) => void;
  anyActive: boolean; clear: () => void;
  theme?: "light" | "dark";
  radiusClass?: string;
}) {
  const { q, setQ, brands, brand, setBrand, fuels, fuel, setFuel, anyActive, clear, theme = "light", radiusClass = "rounded-full" } = props;
  const [open, setOpen] = useState(false);
  const base = theme === "dark"
    ? "border-white/20 bg-white/5 text-white placeholder:text-white/50"
    : "border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[220px] flex-1">
        <Search className={`pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 ${theme === "dark" ? "text-white/50" : "text-neutral-400"}`} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar marca, modelo, cor…" className={`w-full ${radiusClass} border ${base} py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-[var(--s-accent)]/40`} />
      </div>
      <button onClick={() => setOpen((v) => !v)} className={`inline-flex items-center gap-2 ${radiusClass} border ${base} px-4 py-3 text-sm font-semibold`}>
        <SlidersHorizontal className="h-4 w-4" /> Filtros
      </button>
      {anyActive && (
        <button onClick={clear} className={`inline-flex items-center gap-1.5 ${radiusClass} px-3 py-2 text-sm ${theme === "dark" ? "text-white/70 hover:text-white" : "text-neutral-600 hover:text-neutral-900"}`}>
          <X className="h-4 w-4" /> Limpar
        </button>
      )}
      {open && (
        <div className={`w-full grid gap-3 ${radiusClass === "rounded-none" ? "" : "rounded-2xl"} border ${theme === "dark" ? "border-white/10 bg-white/5" : "border-neutral-200 bg-neutral-50"} p-4 sm:grid-cols-2`}>
          <label className="block">
            <span className={`mb-1 block text-[11px] font-semibold uppercase tracking-wider ${theme === "dark" ? "text-white/60" : "text-neutral-500"}`}>Marca</span>
            <select value={brand} onChange={(e) => setBrand(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${base}`}>
              <option value="">Todas</option>
              {brands.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={`mb-1 block text-[11px] font-semibold uppercase tracking-wider ${theme === "dark" ? "text-white/60" : "text-neutral-500"}`}>Combustivel</span>
            <select value={fuel} onChange={(e) => setFuel(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${base}`}>
              <option value="">Todos</option>
              {fuels.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}

// ==================== LeadForm ====================
export function LeadForm({ store, theme = "light", accent }: { store: StoreLike; theme?: "light" | "dark"; accent?: string }) {
  const submit = useServerFn(submitLead);
  const track = useServerFn(trackEvent);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const dark = theme === "dark";
  const fieldCls = `w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--s-accent)]/40 ${
    dark ? "border-white/15 bg-white/5 text-white placeholder:text-white/50" : "border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400"
  }`;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return;
    setSending(true);
    try {
      await submit({ data: { store_id: store.id, name: name.trim(), phone: phone || null, email: email || null, message: message || null, source: "site" } });
      track({ data: { store_id: store.id, event_type: "submit_lead" } }).catch(() => {});
      setDone(true);
      setName(""); setPhone(""); setEmail(""); setMessage("");
    } catch { alert("Erro ao enviar. Tente novamente."); }
    finally { setSending(false); }
  };

  if (done) return (
    <div className={`flex flex-col items-center justify-center py-8 text-center ${dark ? "text-white" : ""}`}>
      <CheckCircle2 className="h-12 w-12" style={{ color: accent || "var(--s-accent)" }} />
      <p className="mt-3 text-lg font-semibold">Mensagem enviada!</p>
      <p className={dark ? "text-sm text-white/70" : "text-sm text-neutral-600"}>Retornaremos em breve.</p>
      <button type="button" onClick={() => setDone(false)} className="mt-4 text-sm underline">Enviar outra</button>
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome *" className={fieldCls} />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefone / WhatsApp" className={fieldCls} />
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" className={fieldCls} />
      <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Como podemos ajudar?" className={fieldCls} />
      <button disabled={sending} className="inline-flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white disabled:opacity-60" style={{ background: accent || "var(--s-accent)" }}>
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {sending ? "Enviando…" : "Enviar mensagem"}
      </button>
    </form>
  );
}

export function StoreFooter({ store, tone = "dark" }: { store: StoreLike; tone?: "dark" | "light" | "invert" }) {
  const cls = tone === "dark" ? "bg-neutral-950 text-white/70" : tone === "light" ? "bg-neutral-50 text-neutral-500" : "bg-[var(--s-neutral)] text-white/70";
  return (
    <footer className={`${cls} border-t border-white/5 py-10 text-center text-sm`}>
      <p>© {new Date().getFullYear()} {store.name}. Todos os direitos reservados.</p>
      <p className="mt-1 text-xs opacity-60">Site criado com AutoSite · IA de design</p>
    </footer>
  );
}