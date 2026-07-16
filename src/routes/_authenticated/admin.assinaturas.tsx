import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2, ShieldCheck, Save, Search, CreditCard } from "lucide-react";
import { amIAdmin } from "@/lib/payments.functions";
import { listAllSubscriptions, updateSubscription } from "@/lib/subscriptions.functions";

export const Route = createFileRoute("/_authenticated/admin/assinaturas")({
  head: () => ({ meta: [{ title: "Admin — Assinaturas" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async () => {
    const { isAdmin } = await amIAdmin();
    if (!isAdmin) throw redirect({ to: "/dashboard" });
  },
  component: AdminSubscriptions,
});

const PLANS = ["free", "starter", "pro", "premium"] as const;
const STATUSES = ["active", "trialing", "past_due", "canceled"] as const;
const DEFAULT_LIMITS: Record<(typeof PLANS)[number], number> = {
  free: 5, starter: 25, pro: 50, premium: 100000,
};

type Row = {
  id: string;
  user_id: string;
  user_email: string | null;
  plan: (typeof PLANS)[number];
  status: (typeof STATUSES)[number];
  vehicle_limit: number;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

function toDateInput(v: string | null): string {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function AdminSubscriptions() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const checkAdmin = useServerFn(amIAdmin);
  const list = useServerFn(listAllSubscriptions);
  const update = useServerFn(updateSubscription);

  const admin = useQuery({ queryKey: ["am-i-admin"], queryFn: () => checkAdmin() });
  useEffect(() => {
    if (admin.data && !admin.data.isAdmin) {
      toast.error("Acesso restrito a administradores");
      navigate({ to: "/dashboard" });
    }
  }, [admin.data, navigate]);

  const q = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: () => list() as Promise<Row[]>,
    enabled: !!admin.data?.isAdmin,
  });

  const [edits, setEdits] = useState<Record<string, Partial<Row>>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const mut = useMutation({
    mutationFn: (r: Row) => update({ data: {
      user_id: r.user_id,
      plan: r.plan,
      status: r.status,
      vehicle_limit: r.vehicle_limit,
      current_period_end: r.current_period_end,
    } }),
    onSuccess: () => {
      toast.success("Assinatura atualizada");
      qc.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => {
    const src = q.data ?? [];
    const s = search.trim().toLowerCase();
    return src.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!s) return true;
      return (r.user_email ?? "").toLowerCase().includes(s) || r.user_id.includes(s);
    });
  }, [q.data, search, statusFilter]);

  if (admin.isLoading || !admin.data) {
    return <div className="grid min-h-screen place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!admin.data.isAdmin) return null;

  const merged = (r: Row): Row => ({ ...r, ...(edits[r.id] ?? {}) } as Row);
  const setField = (id: string, patch: Partial<Row>) => setEdits((e) => ({ ...e, [id]: { ...e[id], ...patch } }));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface/40">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Painel
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/admin/pagamentos" className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface">Pagamentos</Link>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> Admin
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow"><CreditCard className="h-5 w-5" /></div>
          <div>
            <h1 className="font-display text-3xl font-bold">Gerenciar assinaturas</h1>
            <p className="text-muted-foreground">Ajuste plano, status, limite e validade de qualquer conta.</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por e-mail ou ID…" className="w-full rounded-full border border-border bg-card px-9 py-2 text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-full border border-border bg-card px-4 py-2 text-sm">
            <option value="all">Todos os status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {q.isLoading ? (
          <div className="mt-16 flex items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…</div>
        ) : rows.length === 0 ? (
          <div className="mt-16 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">Nenhuma assinatura encontrada.</div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-border bg-surface/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Plano</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Limite</th>
                  <th className="px-4 py-3">Expira em</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((orig) => {
                  const r = merged(orig);
                  const dirty = !!edits[orig.id];
                  return (
                    <tr key={orig.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.user_email ?? "—"}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">{r.user_id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <select value={r.plan} onChange={(e) => {
                          const plan = e.target.value as Row["plan"];
                          setField(orig.id, { plan, vehicle_limit: DEFAULT_LIMITS[plan] });
                        }} className="rounded-md border border-border bg-background px-2 py-1 text-xs">
                          {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select value={r.status} onChange={(e) => setField(orig.id, { status: e.target.value as Row["status"] })} className="rounded-md border border-border bg-background px-2 py-1 text-xs">
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input type="number" min={0} value={r.vehicle_limit} onChange={(e) => setField(orig.id, { vehicle_limit: parseInt(e.target.value || "0", 10) })} className="w-20 rounded-md border border-border bg-background px-2 py-1 text-xs" />
                      </td>
                      <td className="px-4 py-3">
                        <input type="date" value={toDateInput(r.current_period_end)} onChange={(e) => setField(orig.id, { current_period_end: e.target.value ? new Date(e.target.value).toISOString() : null })} className="rounded-md border border-border bg-background px-2 py-1 text-xs" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          disabled={!dirty || mut.isPending}
                          onClick={() => { mut.mutate(r); setEdits((e) => { const n = { ...e }; delete n[orig.id]; return n; }); }}
                          className="inline-flex items-center gap-1 rounded-full bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
                        >
                          <Save className="h-3.5 w-3.5" /> Salvar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
