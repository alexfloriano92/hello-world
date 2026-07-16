import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Car, ExternalLink, Loader2, Plus, Save, Trash2, Upload, X, Star, CheckCircle2,
  History, FileUp, Download, GripVertical,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type StoreRow = Database["public"]["Tables"]["stores"]["Row"];
type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"];
type AuditRow = {
  id: string;
  store_id: string;
  entity: string;
  entity_id: string;
  action: string;
  actor_id: string | null;
  actor_name: string | null;
  summary: string | null;
  changes: Record<string, { from: unknown; to: unknown }>;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/gerenciar/$id")({
  head: () => ({
    meta: [{ title: "Gerenciar loja — AutoSite" }, { name: "robots", content: "noindex" }],
  }),
  component: Manage,
});

const FUELS = ["Flex", "Gasolina", "Diesel", "Etanol", "Híbrido", "Elétrico"] as const;
const TRANSMISSIONS = ["Automático", "Manual", "CVT", "Automatizado"] as const;

function Manage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [store, setStore] = useState<StoreRow | null>(null);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingStore, setSavingStore] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [tab, setTab] = useState<"info" | "textos" | "veiculos" | "leads" | "analytics" | "historico">("info");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<VehicleRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VehicleRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: s, error: sErr } = await supabase.from("stores").select("*").eq("id", id).maybeSingle();
      if (sErr || !s) {
        toast.error(sErr?.message || "Loja não encontrada");
        navigate({ to: "/dashboard" });
        return;
      }
      setStore(s);
      const { data: vs } = await supabase.from("vehicles").select("*").eq("store_id", id).order("created_at", { ascending: false });
      setVehicles((vs as VehicleRow[]) ?? []);
      setLoading(false);
    })();
  }, [id, navigate]);

  const reloadVehicles = async () => {
    const { data: vs } = await supabase.from("vehicles").select("*").eq("store_id", id).order("created_at", { ascending: false });
    setVehicles((vs as VehicleRow[]) ?? []);
  };

  const saveStore = async (patch: Partial<StoreRow>): Promise<void> => {
    if (!store) return;
    setSavingStore(true);
    const { data, error } = await supabase.from("stores").update(patch).eq("id", store.id).select("*").maybeSingle();
    setSavingStore(false);
    if (error) { toast.error(error.message); return; }
    if (data) setStore(data as StoreRow);
    toast.success("Alterações salvas");
  };

  const togglePublish = async () => {
    if (!store) return;
    setPublishing(true);
    const next = !store.published;
    const { error } = await supabase.from("stores").update({ published: next }).eq("id", store.id);
    setPublishing(false);
    if (error) return toast.error(error.message);
    setStore({ ...store, published: next });
    toast.success(next ? "Site publicado!" : "Site despublicado");
  };

  const onVehicleSaved = (v: VehicleRow, isNew: boolean) => {
    setVehicles((prev) => isNew ? [v, ...prev] : prev.map((x) => x.id === v.id ? v : x));
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("vehicles").delete().eq("id", deleteTarget.id);
    if (error) return toast.error(error.message);
    setVehicles((prev) => prev.filter((x) => x.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast.success("Veículo removido");
  };

  if (loading || !store) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-muted-foreground">
        <div className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface/40">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar ao painel
          </Link>
          <div className="flex items-center gap-3">
            <a
              href={`/loja/${store.slug}`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              Abrir site <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              onClick={togglePublish}
              disabled={publishing}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                store.published
                  ? "bg-success/15 text-success hover:bg-success/25"
                  : "bg-gradient-primary text-primary-foreground hover:brightness-110"
              }`}
            >
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <span className={`h-2 w-2 rounded-full ${store.published ? "bg-success" : "bg-primary-foreground"}`} />
              )}
              {store.published ? "Publicado" : "Publicar site"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">{store.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{store.slug}.autosite.com.br</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
          {[
            { href: `/dominio/${store.id}`, label: "Domínio", icon: "🌐" },
            { href: `/membros/${store.id}`, label: "Equipe", icon: "👥" },
            { href: `/blog/${store.id}`, label: "Blog", icon: "📝" },
            { href: `/banners/${store.id}`, label: "Banners IA", icon: "✨" },
            { href: `/crm/${store.id}`, label: "CRM", icon: "📊" },
            { href: `/integracoes/${store.id}`, label: "Integrações", icon: "🔌" },
            { href: `/suporte`, label: "Suporte", icon: "💬" },
          ].map((r) => (
            <a key={r.label} href={r.href} className="rounded-2xl border border-border bg-card p-3 text-center hover:border-primary transition">
              <div className="text-2xl">{r.icon}</div>
              <div className="mt-1 text-xs font-semibold">{r.label}</div>
            </a>
          ))}
        </div>



        <div className="mt-6 flex gap-1 border-b border-border overflow-x-auto">
          {([
            ["info", "Informações"],
            ["textos", "Textos"],
            ["veiculos", `Veículos (${vehicles.length})`],
            ["leads", "Leads"],
            ["analytics", "Analytics"],
            ["historico", "Histórico"],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === k ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "info" && <InfoTab store={store} onSave={saveStore} saving={savingStore} />}
          {tab === "textos" && <CopyTab store={store} onSave={saveStore} saving={savingStore} />}
          {tab === "veiculos" && (
            <VehiclesTab
              vehicles={vehicles}
              onAdd={() => { setEditing(null); setDialogOpen(true); }}
              onEdit={(v) => { setEditing(v); setDialogOpen(true); }}
              onDelete={(v) => setDeleteTarget(v)}
              onImport={() => setImportOpen(true)}
            />
          )}
          {tab === "leads" && <LeadsTab storeId={store.id} />}
          {tab === "analytics" && <AnalyticsTab storeId={store.id} />}
          {tab === "historico" && <HistoryTab storeId={store.id} />}
        </div>
      </main>

      {dialogOpen && (
        <VehicleDialog
          storeId={store.id}
          existing={editing}
          onClose={() => setDialogOpen(false)}
          onSaved={onVehicleSaved}
        />
      )}

      {importOpen && (
        <ImportCsvDialog
          storeId={store.id}
          onClose={() => setImportOpen(false)}
          onDone={async () => { setImportOpen(false); await reloadVehicles(); }}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover este veículo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O veículo será excluído permanentemente do seu estoque.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sim, remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------------- INFO TAB ---------------- */
function InfoTab({ store, onSave, saving }: { store: StoreRow; onSave: (p: Partial<StoreRow>) => Promise<void>; saving: boolean }) {
  const [name, setName] = useState(store.name);
  const [phone, setPhone] = useState(store.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(store.whatsapp ?? "");
  const [address, setAddress] = useState(store.address ?? "");
  const [city, setCity] = useState(store.city ?? "");
  const [stateUf, setStateUf] = useState(store.state ?? "");

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl font-bold">Informações da loja</h2>
      <p className="mt-1 text-sm text-muted-foreground">Dados de contato exibidos no site público.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Field label="Nome da loja"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Telefone"><input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 3000-0000" /></Field>
        <Field label="WhatsApp"><input className={inputCls} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(11) 90000-0000" /></Field>
        <Field label="Endereço" className="md:col-span-2"><input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
        <Field label="Cidade"><input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} /></Field>
        <Field label="Estado"><input className={inputCls} value={stateUf} onChange={(e) => setStateUf(e.target.value)} placeholder="SP" maxLength={2} /></Field>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => onSave({ name, phone, whatsapp, address, city, state: stateUf })}
          disabled={saving || !name.trim()}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-elegant hover:brightness-110 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
        </button>
      </div>
    </div>
  );
}

/* ---------------- COPY TAB ---------------- */
function CopyTab({ store, onSave, saving }: { store: StoreRow; onSave: (p: Partial<StoreRow>) => Promise<void>; saving: boolean }) {
  const [hero, setHero] = useState(store.hero_headline ?? "");
  const [sub, setSub] = useState(store.hero_subheadline ?? "");
  const [tag, setTag] = useState(store.tagline ?? "");
  const [about, setAbout] = useState(store.about_text ?? "");
  const [cta, setCta] = useState(store.cta_text ?? "");

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl font-bold">Textos do site</h2>
      <p className="mt-1 text-sm text-muted-foreground">Edite os textos gerados pela IA a qualquer momento.</p>

      <div className="mt-6 space-y-4">
        <Field label="Título principal (hero)"><input className={inputCls} value={hero} onChange={(e) => setHero(e.target.value)} maxLength={80} /></Field>
        <Field label="Subtítulo"><textarea className={inputCls} rows={2} value={sub} onChange={(e) => setSub(e.target.value)} maxLength={200} /></Field>
        <Field label="Slogan"><input className={inputCls} value={tag} onChange={(e) => setTag(e.target.value)} maxLength={60} /></Field>
        <Field label="Texto sobre a loja"><textarea className={inputCls} rows={5} value={about} onChange={(e) => setAbout(e.target.value)} maxLength={600} /></Field>
        <Field label="Texto do botão principal (CTA)"><input className={inputCls} value={cta} onChange={(e) => setCta(e.target.value)} maxLength={30} /></Field>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => onSave({ hero_headline: hero, hero_subheadline: sub, tagline: tag, about_text: about, cta_text: cta })}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-elegant hover:brightness-110 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar textos
        </button>
      </div>
    </div>
  );
}

/* ---------------- VEHICLES TAB ---------------- */
function VehiclesTab({
  vehicles, onAdd, onEdit, onDelete, onImport,
}: {
  vehicles: VehicleRow[];
  onAdd: () => void;
  onEdit: (v: VehicleRow) => void;
  onDelete: (v: VehicleRow) => void;
  onImport: () => void;
}) {
  const exportCsv = () => {
    if (vehicles.length === 0) {
      toast.info("Nenhum veículo para exportar.");
      return;
    }
    const csv = buildVehiclesCsv(vehicles);
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `veiculos-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${vehicles.length} veículo(s) exportado(s)`);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Estoque de veículos</h2>
          <p className="mt-1 text-sm text-muted-foreground">Cadastre e gerencie os carros exibidos no seu site.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-semibold hover:bg-surface/70"
            title="Baixar todos os veículos em CSV — edite e reimporte para atualizar em massa"
          >
            <Download className="h-4 w-4" /> Exportar CSV
          </button>
          <button
            onClick={onImport}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-semibold hover:bg-surface/70"
          >
            <FileUp className="h-4 w-4" /> Importar CSV
          </button>
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-elegant hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> Novo veículo
          </button>
        </div>
      </div>


      {vehicles.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-surface/30 p-10 text-center">
          <Car className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-semibold">Nenhum veículo cadastrado</p>
          <p className="mt-1 text-sm text-muted-foreground">Clique em "Novo veículo" ou "Importar CSV" para começar seu estoque.</p>
        </div>
      ) : (
        <div className="mt-6 divide-y divide-border">
          {vehicles.map((v) => {
            const photo = Array.isArray(v.photos) && v.photos.length > 0 ? String(v.photos[0]) : null;
            return (
              <div key={v.id} className="flex items-center gap-4 py-4">
                <div className="h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                  {photo ? (
                    <img src={photo} alt={v.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-muted-foreground"><Car className="h-6 w-6" /></div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">{v.title}</p>
                    {v.featured && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                        <Star className="h-3 w-3" /> Destaque
                      </span>
                    )}
                    {v.sold && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">Vendido</span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {[v.brand, v.model, v.year, v.km ? `${Number(v.km).toLocaleString("pt-BR")} km` : null].filter(Boolean).join(" • ")}
                  </p>
                </div>
                <div className="text-right">
                  {v.price != null && (
                    <p className="font-display text-lg font-bold text-primary">
                      R$ {Number(v.price).toLocaleString("pt-BR")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => onEdit(v)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface">Editar</button>
                  <button onClick={() => onDelete(v)} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:border-destructive hover:text-destructive" title="Remover">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- HISTORY TAB ---------------- */
function HistoryTab({ storeId }: { storeId: string }) {
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [filter, setFilter] = useState<"all" | "store" | "vehicle">("all");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("audit_logs" as never)
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) { toast.error(error.message); setRows([]); return; }
      setRows((data as unknown as AuditRow[]) ?? []);
    })();
  }, [storeId]);

  const filtered = useMemo(
    () => (rows ?? []).filter((r) => filter === "all" || r.entity === filter),
    [rows, filter]
  );

  const actionLabel = (a: string) =>
    a === "created" ? "Criado" : a === "updated" ? "Atualizado" : a === "deleted" ? "Removido" : a;
  const actionColor = (a: string) =>
    a === "created" ? "bg-success/15 text-success" :
    a === "deleted" ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary";

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <History className="h-5 w-5" /> Histórico de alterações
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Registros das últimas 200 mudanças (quem alterou e quando).</p>
        </div>
        <div className="flex gap-1 rounded-full border border-border bg-surface p-1 text-xs">
          {(["all","store","vehicle"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`rounded-full px-3 py-1.5 font-medium ${filter === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {k === "all" ? "Tudo" : k === "store" ? "Loja" : "Veículos"}
            </button>
          ))}
        </div>
      </div>

      {rows === null ? (
        <div className="mt-6 flex justify-center py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-surface/30 p-10 text-center text-sm text-muted-foreground">
          Nenhum registro ainda.
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border">
          {filtered.map((r) => {
            const date = new Date(r.created_at);
            const changeKeys = r.changes ? Object.keys(r.changes) : [];
            return (
              <li key={r.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${actionColor(r.action)}`}>
                    {actionLabel(r.action)}
                  </span>
                  <span className="font-medium">{r.summary ?? `${r.entity} ${r.action}`}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {r.actor_name ?? "Sistema"} · {date.toLocaleString("pt-BR")}
                  </span>
                </div>
                {r.action === "updated" && changeKeys.length > 0 && (
                  <details className="mt-1.5 text-xs text-muted-foreground">
                    <summary className="cursor-pointer">Ver {changeKeys.length} alteração(ões)</summary>
                    <ul className="mt-2 space-y-1 rounded-lg bg-surface/40 p-3 font-mono">
                      {changeKeys.slice(0, 12).map((k) => (
                        <li key={k}>
                          <span className="font-semibold text-foreground">{k}:</span>{" "}
                          <span className="text-destructive line-through">{fmtVal(r.changes[k]?.from)}</span>{" → "}
                          <span className="text-success">{fmtVal(r.changes[k]?.to)}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v.length > 60 ? v.slice(0, 60) + "…" : v;
  if (typeof v === "object") return JSON.stringify(v).slice(0, 60);
  return String(v);
}

/* ---------------- CSV IMPORT DIALOG ---------------- */
const CSV_TEMPLATE =
  "title,brand,model,year,km,price,fuel,transmission,color,description,featured,sold\n" +
  "Honda Civic EXL 2020 Automático,Honda,Civic,2020,45000,99900,Flex,Automático,Preto,Único dono,true,false\n";

const CSV_COLUMNS = ["title","brand","model","year","km","price","fuel","transmission","color","description","featured","sold"] as const;

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildVehiclesCsv(rows: VehicleRow[]): string {
  const header = CSV_COLUMNS.join(",");
  const body = rows.map((v) =>
    CSV_COLUMNS.map((col) => csvEscape((v as unknown as Record<string, unknown>)[col])).join(",")
  ).join("\n");
  return header + "\n" + body + "\n";
}



type CsvRow = Record<string, string>;
type RowError = { line: number; message: string };

function validateRows(rows: CsvRow[]): { errors: RowError[]; invalidIdx: Set<number>; validTitles: string[] } {
  const errors: RowError[] = [];
  const invalidIdx = new Set<number>();
  const validTitles: string[] = [];
  const seenTitles = new Map<string, number>();
  rows.forEach((r, i) => {
    const line = i + 2;
    const title = (r.title ?? "").trim();
    if (!title) {
      errors.push({ line, message: "Título vazio" });
      invalidIdx.add(i);
      return;
    }
    if (r.year && String(r.year).trim() && !/^\d{2,4}$/.test(String(r.year).trim())) {
      errors.push({ line, message: `Ano inválido: "${r.year}"` });
      invalidIdx.add(i);
      return;
    }
    if (r.price && String(r.price).trim()) {
      const p = parseFloat(String(r.price).replace(/\./g, "").replace(",", "."));
      if (Number.isNaN(p)) {
        errors.push({ line, message: `Preço inválido: "${r.price}"` });
        invalidIdx.add(i);
        return;
      }
    }
    if (r.km && String(r.km).trim() && !/^\d[\d.\s]*$/.test(String(r.km).trim())) {
      errors.push({ line, message: `KM inválido: "${r.km}"` });
      invalidIdx.add(i);
      return;
    }
    const prev = seenTitles.get(title);
    if (prev !== undefined) {
      errors.push({ line, message: `Título duplicado no arquivo (também na linha ${prev + 2})` });
      invalidIdx.add(i);
      return;
    }
    seenTitles.set(title, i);
    validTitles.push(title);
  });
  return { errors, invalidIdx, validTitles };
}

function ImportCsvDialog({
  storeId, onClose, onDone,
}: { storeId: string; onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [invalidIdx, setInvalidIdx] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [stats, setStats] = useState<{ total: number; valid: number; toInsert: number; toUpdate: number; invalid: number } | null>(null);
  const [mergeInfo, setMergeInfo] = useState<{ reused: number; changed: number; added: number; fileName: string } | null>(null);
  const mergeInputRef = useRef<HTMLInputElement | null>(null);

  const serializeRow = (r: CsvRow) =>
    CSV_COLUMNS.map((c) => (r[c] ?? "").toString().trim()).join("\u0001");

  const analyze = async (currentRows: CsvRow[]) => {
    setAnalyzing(true);
    try {
      const { errors: errs, invalidIdx: idxSet, validTitles } = validateRows(currentRows);
      setErrors(errs);
      setInvalidIdx(idxSet);

      let existingSet = new Set<string>();
      if (validTitles.length > 0) {
        const { data: existing } = await supabase
          .from("vehicles").select("title").eq("store_id", storeId).in("title", validTitles);
        existingSet = new Set((existing ?? []).map((e) => e.title));
      }
      const toUpdate = validTitles.filter((t) => existingSet.has(t)).length;
      const toInsert = validTitles.length - toUpdate;
      setStats({
        total: currentRows.length,
        valid: validTitles.length,
        toInsert,
        toUpdate,
        invalid: idxSet.size,
      });
      setDirty(false);
    } finally {
      setAnalyzing(false);
    }
  };

  const parseFile = async (f: File) => {
    setFile(f);
    setStats(null);
    setErrors([]);
    setInvalidIdx(new Set());
    setRows([]);
    setMergeInfo(null);
    const text = await f.text();
    const parsed = parseCsv(text) as CsvRow[];
    if (parsed.length === 0) {
      setErrors([{ line: 1, message: "Arquivo vazio." }]);
      return;
    }
    setRows(parsed);
    await analyze(parsed);
  };

  const mergeFile = async (f: File) => {
    if (rows.length === 0) { await parseFile(f); return; }
    const text = await f.text();
    const parsed = parseCsv(text) as CsvRow[];
    if (parsed.length === 0) { toast.error("Arquivo vazio."); return; }

    const idxByTitle = new Map<string, number>();
    rows.forEach((r, i) => {
      const t = (r.title ?? "").trim();
      if (t) idxByTitle.set(t, i);
    });

    const merged = rows.slice();
    let reused = 0, changed = 0, added = 0;
    for (const nr of parsed) {
      const t = (nr.title ?? "").trim();
      if (!t) { merged.push(nr); added++; continue; }
      const existingIdx = idxByTitle.get(t);
      if (existingIdx !== undefined) {
        const before = serializeRow(merged[existingIdx]);
        const after = serializeRow(nr);
        if (before === after) {
          reused++;
        } else {
          merged[existingIdx] = nr;
          changed++;
        }
      } else {
        merged.push(nr);
        idxByTitle.set(t, merged.length - 1);
        added++;
      }
    }

    setRows(merged);
    setMergeInfo({ reused, changed, added, fileName: f.name });
    toast.success(`Mesclado: ${reused} reaproveitada(s), ${changed} atualizada(s), ${added} nova(s)`);
    await analyze(merged);
  };

  const updateCell = (idx: number, col: string, val: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [col]: val } : r)));
    setDirty(true);
  };

  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
    setDirty(true);
  };

  const doImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    try {
      const { invalidIdx: idxSet } = validateRows(rows);
      const payload = rows
        .filter((_, i) => !idxSet.has(i))
        .map((r) => ({
          store_id: storeId,
          title: r.title.trim(),
          brand: r.brand?.trim() || null,
          model: r.model?.trim() || null,
          year: r.year ? parseInt(String(r.year).replace(/\D/g, ""), 10) || null : null,
          km: r.km ? parseInt(String(r.km).replace(/\D/g, ""), 10) || null : null,
          price: r.price ? parseFloat(String(r.price).replace(/\./g, "").replace(",", ".")) || null : null,
          fuel: r.fuel?.trim() || null,
          transmission: r.transmission?.trim() || null,
          color: r.color?.trim() || null,
          description: r.description?.trim() || null,
          featured: parseBool(r.featured),
          sold: parseBool(r.sold),
          photos: [] as unknown as Database["public"]["Tables"]["vehicles"]["Insert"]["photos"],
        }));

      if (payload.length === 0) { toast.error("Nenhuma linha válida."); return; }

      const titles = payload.map((p) => p.title);
      const { data: existing } = await supabase
        .from("vehicles").select("id,title").eq("store_id", storeId).in("title", titles);
      const map = new Map((existing ?? []).map((e) => [e.title, e.id]));

      let inserted = 0, updated = 0;
      for (const p of payload) {
        const id = map.get(p.title);
        if (id) {
          const { error } = await supabase.from("vehicles").update(p).eq("id", id);
          if (error) throw error;
          updated++;
        } else {
          const { error } = await supabase.from("vehicles").insert(p);
          if (error) throw error;
          inserted++;
        }
      }
      toast.success(`Importação concluída: ${inserted} novo(s), ${updated} atualizado(s)`);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao importar CSV");
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "modelo-veiculos.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadInvalid = () => {
    const invalidRows = rows.filter((_, i) => invalidIdx.has(i));
    if (invalidRows.length === 0) return;
    const header = [...CSV_COLUMNS, "_erro"].join(",");
    const errByIdx = new Map(errors.map((e) => [e.line - 2, e.message] as const));
    const body = Array.from(invalidIdx).sort((a, b) => a - b).map((i) => {
      const r = rows[i];
      const cells = CSV_COLUMNS.map((c) => csvEscape(r[c])).concat(csvEscape(errByIdx.get(i) ?? ""));
      return cells.join(",");
    }).join("\n");
    const blob = new Blob([header + "\n" + body + "\n"], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "linhas-invalidas.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const validPreview = rows.filter((_, i) => !invalidIdx.has(i)).slice(0, 20);
  const invalidList = Array.from(invalidIdx).sort((a, b) => a - b);
  const errByIdx = new Map(errors.map((e) => [e.line - 2, e.message] as const));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar veículos via CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface/40 p-4 text-sm">
            <p className="font-semibold">Colunas aceitas</p>
            <p className="mt-1 text-xs text-muted-foreground">
              <code>title, brand, model, year, km, price, fuel, transmission, color, description, featured, sold</code>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Linhas com o mesmo <b>title</b> de um veículo existente serão atualizadas; as demais serão adicionadas.
              Fotos devem ser adicionadas depois, editando cada veículo.
            </p>
            <button onClick={downloadTemplate} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline">
              <Download className="h-3.5 w-3.5" /> Baixar modelo de CSV
            </button>
          </div>

          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => e.target.files && e.target.files[0] && parseFile(e.target.files[0])}
            className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground"
          />

          {rows.length > 0 && (
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">Reenviar CSV corrigido (mesclar)</p>
                  <p className="text-muted-foreground">
                    Linhas com o mesmo <b>title</b> substituem as atuais; as demais são adicionadas. Linhas já válidas permanecem na sessão.
                  </p>
                </div>
                <button
                  onClick={() => mergeInputRef.current?.click()}
                  disabled={analyzing || importing}
                  className="inline-flex items-center gap-2 rounded-full border border-sky-500/50 bg-sky-500/10 px-3 py-1.5 font-semibold text-sky-700 hover:bg-sky-500/20 disabled:opacity-50 dark:text-sky-300"
                >
                  <FileUp className="h-3.5 w-3.5" /> Reenviar corrigido
                </button>
                <input
                  ref={mergeInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) mergeFile(f);
                    e.target.value = "";
                  }}
                />
              </div>
              {mergeInfo && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Última mesclagem de <b>{mergeInfo.fileName}</b>: {mergeInfo.reused} reaproveitada(s) · {mergeInfo.changed} atualizada(s) · {mergeInfo.added} nova(s).
                </p>
              )}
            </div>
          )}

          {analyzing && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analisando arquivo…
            </div>
          )}

          {stats && !analyzing && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatCard label="Linhas no arquivo" value={stats.total} />
              <StatCard label="Serão inseridas" value={stats.toInsert} tone="success" />
              <StatCard label="Serão atualizadas" value={stats.toUpdate} tone="info" />
              <StatCard label="Ignoradas (inválidas)" value={stats.invalid} tone={stats.invalid > 0 ? "warn" : undefined} />
            </div>
          )}

          {dirty && rows.length > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              <span>Você editou linhas. Revalide para atualizar as contagens.</span>
              <button
                onClick={() => analyze(rows)}
                disabled={analyzing}
                className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50"
              >
                Revalidar
              </button>
            </div>
          )}

          {invalidList.length > 0 && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-destructive">
                  {invalidList.length} linha(s) ignorada(s) — corrija abaixo e revalide
                </p>
                <button
                  onClick={downloadInvalid}
                  className="inline-flex items-center gap-1 rounded-full border border-destructive/40 px-3 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10"
                >
                  <Download className="h-3 w-3" /> Baixar inválidas
                </button>
              </div>
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {invalidList.map((idx) => {
                  const r = rows[idx];
                  const msg = errByIdx.get(idx) ?? "Linha inválida";
                  return (
                    <div key={idx} className="rounded-lg border border-destructive/30 bg-background/60 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-destructive">
                          Linha {idx + 2} · {msg}
                        </span>
                        <button
                          onClick={() => removeRow(idx)}
                          className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-surface"
                        >
                          Remover linha
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {(["title","brand","model","year","km","price","fuel","transmission"] as const).map((col) => (
                          <label key={col} className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                            <span className="uppercase tracking-wide">{col}</span>
                            <input
                              value={r[col] ?? ""}
                              onChange={(e) => updateCell(idx, col, e.target.value)}
                              className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {validPreview.length > 0 && (
            <div className="max-h-64 overflow-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-surface text-left">
                  <tr>
                    <th className="p-2">Título</th><th className="p-2">Marca</th><th className="p-2">Modelo</th>
                    <th className="p-2">Ano</th><th className="p-2">Preço</th>
                  </tr>
                </thead>
                <tbody>
                  {validPreview.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="p-2">{r.title}</td>
                      <td className="p-2">{r.brand}</td>
                      <td className="p-2">{r.model}</td>
                      <td className="p-2">{r.year}</td>
                      <td className="p-2">{r.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-border p-2 text-[11px] text-muted-foreground">
                Mostrando {validPreview.length} linha(s) válida(s) de pré-visualização.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <button onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-surface">Cancelar</button>
          <button
            onClick={doImport}
            disabled={!file || importing || analyzing || dirty || !stats || stats.valid === 0}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-elegant hover:brightness-110 disabled:opacity-50"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            {dirty
              ? "Revalide antes de importar"
              : stats && stats.valid > 0
                ? `Confirmar (${stats.toInsert} nova(s), ${stats.toUpdate} atualização(ões))`
                : "Importar"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function StatCard({ label, value, tone }: { label: string; value: number; tone?: "success" | "info" | "warn" }) {
  const toneClass =
    tone === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    : tone === "info" ? "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400"
    : tone === "warn" ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
    : "border-border bg-surface/60 text-foreground";
  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <div className="text-[10px] font-medium uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}



function parseBool(v: unknown): boolean {
  const s = String(v ?? "").toLowerCase().trim();
  return s === "true" || s === "1" || s === "sim" || s === "yes" || s === "x";
}

/** Minimal CSV parser: quoted fields, escaped quotes, commas, CRLF. */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).filter((r) => r.some((v) => v.trim() !== "")).map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, idx) => { obj[h] = (r[idx] ?? "").trim(); });
    return obj;
  });
}

/* ---------------- VEHICLE DIALOG ---------------- */
function VehicleDialog({
  storeId, existing, onClose, onSaved,
}: {
  storeId: string;
  existing: VehicleRow | null;
  onClose: () => void;
  onSaved: (v: VehicleRow, isNew: boolean) => void;
}) {
  const [title, setTitle] = useState(existing?.title ?? "");
  const [brand, setBrand] = useState(existing?.brand ?? "");
  const [model, setModel] = useState(existing?.model ?? "");
  const [year, setYear] = useState<string>(existing?.year?.toString() ?? "");
  const [km, setKm] = useState<string>(existing?.km?.toString() ?? "");
  const [price, setPrice] = useState<string>(existing?.price?.toString() ?? "");
  const [fuel, setFuel] = useState(existing?.fuel ?? "");
  const [transmission, setTransmission] = useState(existing?.transmission ?? "");
  const [color, setColor] = useState(existing?.color ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [featured, setFeatured] = useState(!!existing?.featured);
  const [sold, setSold] = useState(!!existing?.sold);
  const [photos, setPhotos] = useState<string[]>(
    Array.isArray(existing?.photos) ? (existing!.photos as unknown[]).map(String) : []
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadPhotos = async (files: FileList) => {
    setUploading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Sessão expirada");
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${uid}/${storeId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("vehicle-photos").upload(path, file, { upsert: false, contentType: file.type });
        if (upErr) throw upErr;
        const { data: signed, error: sErr } = await supabase.storage.from("vehicle-photos").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
        if (sErr) throw sErr;
        uploaded.push(signed.signedUrl);
      }
      setPhotos((prev) => [...prev, ...uploaded]);
      toast.success(`${uploaded.length} foto(s) enviada(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar fotos");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (idx: number) => setPhotos((prev) => prev.filter((_, i) => i !== idx));

  const movePhoto = (from: number, to: number) => {
    if (from === to) return;
    setPhotos((prev) => {
      const next = prev.slice();
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });
  };

  const save = async () => {
    if (!title.trim()) return toast.error("Informe o título do anúncio");
    setSaving(true);
    const payload = {
      store_id: storeId,
      title: title.trim(),
      brand: brand.trim() || null,
      model: model.trim() || null,
      year: year ? parseInt(year, 10) : null,
      km: km ? parseInt(km.replace(/\D/g, ""), 10) : null,
      price: price ? parseFloat(price.replace(/\./g, "").replace(",", ".")) : null,
      fuel: fuel || null,
      transmission: transmission || null,
      color: color.trim() || null,
      description: description.trim() || null,
      featured,
      sold,
      photos: photos as unknown as Database["public"]["Tables"]["vehicles"]["Insert"]["photos"],
    };
    if (existing) {
      const { data, error } = await supabase.from("vehicles").update(payload).eq("id", existing.id).select("*").maybeSingle();
      setSaving(false);
      if (error) return toast.error(error.message);
      if (data) { onSaved(data as VehicleRow, false); toast.success("Veículo atualizado"); onClose(); }
    } else {
      const { data, error } = await supabase.from("vehicles").insert(payload).select("*").maybeSingle();
      setSaving(false);
      if (error) return toast.error(error.message);
      if (data) { onSaved(data as VehicleRow, true); toast.success("Veículo adicionado"); onClose(); }
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? "Editar veículo" : "Novo veículo"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Título do anúncio" className="md:col-span-2">
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Honda Civic EXL 2020 Automático" />
          </Field>
          <Field label="Marca"><input className={inputCls} value={brand} onChange={(e) => setBrand(e.target.value)} /></Field>
          <Field label="Modelo"><input className={inputCls} value={model} onChange={(e) => setModel(e.target.value)} /></Field>
          <Field label="Ano"><input className={inputCls} value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" /></Field>
          <Field label="Quilometragem"><input className={inputCls} value={km} onChange={(e) => setKm(e.target.value)} inputMode="numeric" placeholder="45000" /></Field>
          <Field label="Preço (R$)"><input className={inputCls} value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="89900" /></Field>
          <Field label="Cor"><input className={inputCls} value={color} onChange={(e) => setColor(e.target.value)} /></Field>
          <Field label="Combustível">
            <select className={inputCls} value={fuel} onChange={(e) => setFuel(e.target.value)}>
              <option value="">Selecione…</option>
              {FUELS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Câmbio">
            <select className={inputCls} value={transmission} onChange={(e) => setTransmission(e.target.value)}>
              <option value="">Selecione…</option>
              {TRANSMISSIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Descrição" className="md:col-span-2">
            <textarea className={inputCls} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={800} />
          </Field>
        </div>

        <div className="mt-2">
          <p className="text-sm font-medium">Fotos</p>
          <p className="text-xs text-muted-foreground">Arraste para reordenar. A primeira foto é usada como capa no site.</p>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((url, i) => (
              <div
                key={url + i}
                draggable
                onDragStart={() => setDragIdx(i)}
                onDragOver={(e) => { e.preventDefault(); setDragOver(i); }}
                onDragLeave={() => setDragOver((prev) => (prev === i ? null : prev))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIdx !== null) movePhoto(dragIdx, i);
                  setDragIdx(null); setDragOver(null);
                }}
                onDragEnd={() => { setDragIdx(null); setDragOver(null); }}
                className={`group relative aspect-[4/3] cursor-grab overflow-hidden rounded-lg border-2 bg-muted transition ${
                  dragOver === i ? "border-primary ring-2 ring-primary/30" : "border-border"
                } ${dragIdx === i ? "opacity-40" : ""}`}
              >
                <img src={url} alt="" className="pointer-events-none h-full w-full object-cover" draggable={false} />
                {i === 0 && <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary-foreground">Capa</span>}
                <span className="absolute bottom-1 left-1 rounded bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100">
                  <GripVertical className="h-3 w-3" />
                </span>
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                  aria-label="Remover foto"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="grid aspect-[4/3] place-items-center rounded-lg border-2 border-dashed border-border text-muted-foreground transition hover:border-primary hover:text-primary disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <div className="text-center">
                  <Upload className="mx-auto h-5 w-5" />
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-wider">Adicionar</p>
                </div>
              )}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && uploadPhotos(e.target.files)}
          />
        </div>

        <div className="mt-2 flex flex-wrap gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="h-4 w-4 rounded border-border" />
            Destacar no topo do estoque
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sold} onChange={(e) => setSold(e.target.checked)} className="h-4 w-4 rounded border-border" />
            Marcar como vendido (oculta do site)
          </label>
        </div>

        <DialogFooter>
          <button onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-surface">Cancelar</button>
          <button
            onClick={save}
            disabled={saving || uploading}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-elegant hover:brightness-110 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {existing ? "Salvar alterações" : "Adicionar veículo"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- utils ---------------- */
const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

/* ---------------- LEADS TAB ---------------- */
type LeadRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  message: string | null;
  source: string;
  status: string;
  notes: string | null;
  vehicle_id: string | null;
  created_at: string;
};

function LeadsTab({ storeId }: { storeId: string }) {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("todos");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("leads")
        .select("id,name,phone,email,message,source,status,notes,vehicle_id,created_at")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      setLeads((data as LeadRow[]) ?? []);
      setLoading(false);
    })();
  }, [storeId]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("leads").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    toast.success("Status atualizado");
  };

  const removeLead = async (id: string) => {
    if (!confirm("Remover este lead?")) return;
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setLeads((prev) => prev.filter((l) => l.id !== id));
  };

  const shown = filter === "todos" ? leads : leads.filter((l) => l.status === filter);
  const counts = {
    todos: leads.length,
    novo: leads.filter((l) => l.status === "novo").length,
    contatado: leads.filter((l) => l.status === "contatado").length,
    negociando: leads.filter((l) => l.status === "negociando").length,
    fechado: leads.filter((l) => l.status === "fechado").length,
    perdido: leads.filter((l) => l.status === "perdido").length,
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Leads recebidos</h2>
          <p className="mt-1 text-sm text-muted-foreground">Contatos enviados pelo formulário do seu site.</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(["todos", "novo", "contatado", "negociando", "fechado", "perdido"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${
              filter === k ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {k} ({counts[k as keyof typeof counts]})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-8 flex justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : shown.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-surface/30 p-10 text-center">
          <p className="font-semibold">Nenhum lead {filter !== "todos" ? `com status "${filter}"` : "ainda"}.</p>
          <p className="mt-1 text-sm text-muted-foreground">Quando alguém preencher o formulário no seu site, aparecerá aqui.</p>
        </div>
      ) : (
        <div className="mt-6 divide-y divide-border">
          {shown.map((l) => (
            <div key={l.id} className="py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{l.name}</p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">{l.source}</span>
                    <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {l.phone && <a href={`tel:${l.phone}`} className="hover:text-foreground">📞 {l.phone}</a>}
                    {l.phone && <a href={`https://wa.me/55${l.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener" className="text-success hover:underline">WhatsApp</a>}
                    {l.email && <a href={`mailto:${l.email}`} className="hover:text-foreground">✉️ {l.email}</a>}
                  </div>
                  {l.message && <p className="mt-2 whitespace-pre-wrap text-sm">{l.message}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={l.status}
                    onChange={(e) => updateStatus(l.id, e.target.value)}
                    className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
                  >
                    <option value="novo">Novo</option>
                    <option value="contatado">Contatado</option>
                    <option value="negociando">Negociando</option>
                    <option value="fechado">Fechado</option>
                    <option value="perdido">Perdido</option>
                  </select>
                  <button onClick={() => removeLead(l.id)} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- ANALYTICS TAB ---------------- */
type EventRow = { event_type: string; created_at: string; vehicle_id: string | null };

function AnalyticsTab({ storeId }: { storeId: string }) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [leadsCount, setLeadsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const [{ data: ev }, { count }] = await Promise.all([
        supabase.from("analytics_events").select("event_type,created_at,vehicle_id").eq("store_id", storeId).gte("created_at", since).order("created_at", { ascending: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("store_id", storeId).gte("created_at", since),
      ]);
      setEvents((ev as EventRow[]) ?? []);
      setLeadsCount(count ?? 0);
      setLoading(false);
    })();
  }, [storeId, days]);

  const counts = useMemo(() => {
    const c = { view_store: 0, view_vehicle: 0, click_whatsapp: 0, submit_lead: 0 };
    for (const e of events) {
      if (e.event_type in c) (c as any)[e.event_type]++;
    }
    return c;
  }, [events]);

  const byDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of events) {
      if (e.event_type !== "view_store") continue;
      const d = e.created_at.slice(0, 10);
      m.set(d, (m.get(d) ?? 0) + 1);
    }
    const arr: { d: string; n: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      arr.push({ d, n: m.get(d) ?? 0 });
    }
    return arr;
  }, [events, days]);

  const maxDay = Math.max(1, ...byDay.map((x) => x.n));
  const conv = counts.view_store > 0 ? ((counts.submit_lead / counts.view_store) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Analytics do site</h2>
          <p className="mt-1 text-sm text-muted-foreground">Últimos {days} dias.</p>
        </div>
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${days === d ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground hover:text-foreground"}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Visitas ao site" value={counts.view_store} />
            <StatCard label="Visualizações de veículo" value={counts.view_vehicle} />
            <StatCard label="Cliques no WhatsApp" value={counts.click_whatsapp} />
            <StatCard label="Leads recebidos" value={leadsCount} />
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Visitas por dia</h3>
              <span className="text-xs text-muted-foreground">Conversão: {conv}%</span>
            </div>
            <div className="mt-6 flex items-end gap-1 h-40">
              {byDay.map(({ d, n }) => (
                <div key={d} className="flex-1 group relative">
                  <div className="w-full rounded-t bg-primary/70 hover:bg-primary transition" style={{ height: `${(n / maxDay) * 100}%`, minHeight: n > 0 ? 4 : 1 }} />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-[10px] text-background opacity-0 group-hover:opacity-100 transition">
                    {d.slice(5)}: {n}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
              <span>{byDay[0]?.d.slice(5)}</span>
              <span>{byDay[byDay.length - 1]?.d.slice(5)}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold">Funil de conversão</h3>
            <div className="mt-4 space-y-3">
              {[
                { label: "Visitas ao site", n: counts.view_store, base: counts.view_store },
                { label: "Visualizações de veículo", n: counts.view_vehicle, base: counts.view_store },
                { label: "Cliques no WhatsApp", n: counts.click_whatsapp, base: counts.view_store },
                { label: "Leads enviados", n: leadsCount, base: counts.view_store },
              ].map((row) => {
                const pct = row.base > 0 ? Math.min(100, (row.n / row.base) * 100) : 0;
                return (
                  <div key={row.label}>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-semibold">{row.n}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

