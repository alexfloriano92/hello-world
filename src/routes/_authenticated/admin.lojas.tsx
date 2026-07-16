import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, ShieldCheck, Trash2, Search, ExternalLink } from "lucide-react";
import { amIAdmin } from "@/lib/payments.functions";
import { listAllStoresAdmin, adminDeleteStore } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/lojas")({
  head: () => ({ meta: [{ title: "Admin — Lojas" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async () => {
    const { isAdmin } = await amIAdmin();
    if (!isAdmin) throw redirect({ to: "/dashboard" });
  },
  component: AdminStores,
});

function AdminStores() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAllStoresAdmin);
  const delFn = useServerFn(adminDeleteStore);
  const [q, setQ] = useState("");

  const stores = useQuery({ queryKey: ["admin-stores"], queryFn: () => listFn() });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { store_id: id } }),
    onSuccess: () => { toast.success("Loja excluída"); qc.invalidateQueries({ queryKey: ["admin-stores"] }); qc.invalidateQueries({ queryKey: ["admin-overview"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = (stores.data ?? []).filter((s) =>
    !q || s.name.toLowerCase().includes(q.toLowerCase()) || s.slug.toLowerCase().includes(q.toLowerCase()) || s.owner_email?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface/40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Painel Admin
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Admin
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="font-display text-3xl font-bold">Lojas do sistema</h1>
        <p className="mt-1 text-muted-foreground">{stores.data?.length ?? 0} lojas cadastradas.</p>

        <label className="mt-6 flex max-w-md items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, slug ou dono…" className="flex-1 bg-transparent text-sm outline-none" />
        </label>

        {stores.isLoading ? (
          <div className="mt-16 flex items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…</div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Loja</th>
                  <th className="px-4 py-3">Dono</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Veículos</th>
                  <th className="px-4 py-3">Leads</th>
                  <th className="px-4 py-3">Criada em</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.name}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{s.slug}</div>
                    </td>
                    <td className="px-4 py-3">{s.owner_email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${s.published ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                        {s.published ? "Publicada" : "Rascunho"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{s.vehicles_count}</td>
                    <td className="px-4 py-3">{s.leads_count}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link to="/loja/$slug" params={{ slug: s.slug }} target="_blank" className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface">
                          Ver <ExternalLink className="h-3 w-3" />
                        </Link>
                        <button
                          onClick={() => { if (window.confirm(`Excluir a loja "${s.name}"? Isso remove todos os veículos e leads.`)) del.mutate(s.id); }}
                          className="inline-flex items-center gap-1 rounded-full border border-destructive/30 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
                          disabled={del.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Nenhuma loja encontrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
