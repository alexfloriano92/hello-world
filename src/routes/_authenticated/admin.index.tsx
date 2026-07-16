import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import {
  Users, Store as StoreIcon, Car, MessageSquare, DollarSign, ShieldCheck,
  CreditCard, TrendingUp, Loader2, LogOut, Activity, Sparkles,
} from "lucide-react";
import { amIAdmin } from "@/lib/payments.functions";
import { getAdminOverview } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin — Painel Geral" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async () => {
    const { isAdmin } = await amIAdmin();
    if (!isAdmin) throw redirect({ to: "/dashboard" });
  },
  component: AdminHome,
});

function brl(n: number | undefined | null) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n ?? 0));
}

function AdminHome() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const overviewFn = useServerFn(getAdminOverview);
  const { data, isLoading } = useQuery({ queryKey: ["admin-overview"], queryFn: () => overviewFn() });

  const signOut = async () => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface/40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
              <ShieldCheck className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-display text-lg font-bold leading-none">AutoSite Admin</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Painel geral do sistema</div>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <AdminNav to="/admin" label="Visão geral" />
            <AdminNav to="/admin/usuarios" label="Usuários" />
            <AdminNav to="/admin/lojas" label="Lojas" />
            <AdminNav to="/admin/pagamentos" label="Pagamentos" />
            <AdminNav to="/admin/assinaturas" label="Assinaturas" />
            <AdminNav to="/admin/auditoria" label="Auditoria" />
          </nav>
          <button onClick={signOut} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-surface">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Visão geral</h1>
            <p className="mt-1 text-muted-foreground">Panorama completo do SaaS em tempo real.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Administrador único
          </div>
        </div>

        {isLoading || !data ? (
          <div className="mt-16 flex items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando métricas…
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat icon={<Users className="h-5 w-5" />} label="Usuários" value={data.total_users} hint={`+${data.users_last_30d} nos últimos 30 dias`} />
              <Stat icon={<StoreIcon className="h-5 w-5" />} label="Lojas" value={data.total_stores} hint={`${data.published_stores} publicadas`} />
              <Stat icon={<Car className="h-5 w-5" />} label="Veículos" value={data.total_vehicles} hint={`${data.available_vehicles} disponíveis`} />
              <Stat icon={<MessageSquare className="h-5 w-5" />} label="Leads" value={data.total_leads} hint={`+${data.leads_last_30d} nos últimos 30 dias`} />
              <Stat icon={<CreditCard className="h-5 w-5" />} label="Assinaturas ativas" value={data.active_subs} hint="Todos os planos" />
              <Stat icon={<DollarSign className="h-5 w-5" />} label="Receita confirmada" value={brl(data.confirmed_revenue_brl)} hint="Pix confirmados" isMoney />
              <Stat icon={<TrendingUp className="h-5 w-5" />} label="Pagamentos pendentes" value={data.pending_payments} hint="Aguardando confirmação" accent={data.pending_payments > 0} />
              <Stat icon={<Activity className="h-5 w-5" />} label="Distribuição de planos" value={Object.keys(data.plan_breakdown ?? {}).length + " planos"} hint={Object.entries(data.plan_breakdown ?? {}).map(([k, v]) => `${k}: ${v}`).join(" · ")} />
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <Card title="Últimos cadastros" icon={<Users className="h-4 w-4" />}>
                <ul className="divide-y divide-border/60 text-sm">
                  {(data.recent_signups ?? []).map((u) => (
                    <li key={u.id} className="flex items-center justify-between py-2.5">
                      <span className="truncate">{u.email}</span>
                      <span className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString("pt-BR")}</span>
                    </li>
                  ))}
                  {(data.recent_signups ?? []).length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Nenhum usuário ainda.</li>}
                </ul>
              </Card>

              <Card title="Últimos leads" icon={<MessageSquare className="h-4 w-4" />}>
                <ul className="divide-y divide-border/60 text-sm">
                  {(data.recent_leads ?? []).map((l) => (
                    <li key={l.id} className="flex items-center justify-between py-2.5">
                      <span className="truncate">{l.name ?? "Sem nome"} · <span className="text-muted-foreground">{l.phone ?? l.email ?? "—"}</span></span>
                      <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString("pt-BR")}</span>
                    </li>
                  ))}
                  {(data.recent_leads ?? []).length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Nenhum lead ainda.</li>}
                </ul>
              </Card>

              <Card title="Atividade recente" icon={<Activity className="h-4 w-4" />} className="lg:col-span-2">
                <ul className="divide-y divide-border/60 text-sm">
                  {(data.recent_audit ?? []).map((a) => (
                    <li key={a.id} className="flex items-center justify-between py-2.5">
                      <div className="min-w-0">
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">{a.entity} · {a.action}</span>
                        <span className="ml-2 truncate">{a.summary}</span>
                      </div>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">{a.actor_name ?? "—"} · {new Date(a.created_at).toLocaleString("pt-BR")}</span>
                    </li>
                  ))}
                  {(data.recent_audit ?? []).length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Sem atividade registrada.</li>}
                </ul>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function AdminNav({ to, label }: { to: "/admin" | "/admin/usuarios" | "/admin/lojas" | "/admin/pagamentos" | "/admin/assinaturas" | "/admin/auditoria"; label: string }) {
  return (
    <Link to={to} activeOptions={{ exact: to === "/admin" }} className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-surface hover:text-foreground [&.active]:bg-primary/15 [&.active]:text-primary">
      {label}
    </Link>
  );
}

function Stat({ icon, label, value, hint, isMoney, accent }: { icon: React.ReactNode; label: string; value: React.ReactNode; hint?: string; isMoney?: boolean; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border ${accent ? "border-primary/40 bg-primary/5" : "border-border bg-card"} p-5 shadow-card`}>
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
        <span className="text-primary">{icon}</span>
      </div>
      <div className={`mt-2 font-display font-bold ${isMoney ? "text-2xl" : "text-3xl"}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Card({ title, icon, children, className = "" }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-border bg-card p-6 shadow-card ${className}`}>
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold"><span className="text-primary">{icon}</span> {title}</h2>
      {children}
    </section>
  );
}
