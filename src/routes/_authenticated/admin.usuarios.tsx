import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, ShieldCheck, Trash2, Search } from "lucide-react";
import { amIAdmin } from "@/lib/payments.functions";
import { listAllUsers, adminDeleteUser } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  head: () => ({ meta: [{ title: "Admin — Usuários" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async () => {
    const { isAdmin } = await amIAdmin();
    if (!isAdmin) throw redirect({ to: "/dashboard" });
  },
  component: AdminUsers,
});

function AdminUsers() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAllUsers);
  const delFn = useServerFn(adminDeleteUser);
  const [q, setQ] = useState("");

  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => listFn() });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { user_id: id } }),
    onSuccess: () => { toast.success("Usuário removido"); qc.invalidateQueries({ queryKey: ["admin-users"] }); qc.invalidateQueries({ queryKey: ["admin-overview"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = (users.data ?? []).filter((u) =>
    !q || u.email?.toLowerCase().includes(q.toLowerCase()) || u.full_name?.toLowerCase().includes(q.toLowerCase())
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
        <h1 className="font-display text-3xl font-bold">Usuários do sistema</h1>
        <p className="mt-1 text-muted-foreground">{users.data?.length ?? 0} usuários cadastrados.</p>

        <label className="mt-6 flex max-w-md items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por email ou nome…" className="flex-1 bg-transparent text-sm outline-none" />
        </label>

        {users.isLoading ? (
          <div className="mt-16 flex items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…</div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3">Plano</th>
                  <th className="px-4 py-3">Lojas</th>
                  <th className="px-4 py-3">Veículos</th>
                  <th className="px-4 py-3">Leads</th>
                  <th className="px-4 py-3">Cadastro</th>
                  <th className="px-4 py-3">Último acesso</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-medium">
                        {u.email}
                        {u.is_admin && <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">Admin</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">{u.full_name ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase">{u.plan ?? "free"}</span>
                      <div className="text-[10px] text-muted-foreground">{u.sub_status ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3">{u.stores_count}</td>
                    <td className="px-4 py-3">{u.vehicles_count}</td>
                    <td className="px-4 py-3">{u.leads_count}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {!u.is_admin && (
                        <button
                          onClick={() => { if (window.confirm(`Excluir ${u.email}? Isso remove todas as lojas, veículos e leads.`)) del.mutate(u.id); }}
                          className="inline-flex items-center gap-1 rounded-full border border-destructive/30 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
                          disabled={del.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Excluir
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Nenhum usuário encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
