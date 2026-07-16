import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Check, X, Loader2, ShieldCheck, ExternalLink } from "lucide-react";
import {
  amIAdmin,
  listAllPaymentRequests,
  confirmPaymentRequest,
  rejectPaymentRequest,
} from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/admin/pagamentos")({
  head: () => ({ meta: [{ title: "Admin — Pagamentos Pix" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async () => {
    const { isAdmin } = await amIAdmin();
    if (!isAdmin) throw redirect({ to: "/dashboard" });
  },
  component: AdminPayments,
});

type FilterStatus = "pending" | "confirmed" | "rejected" | "all";

function AdminPayments() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const checkAdmin = useServerFn(amIAdmin);
  const list = useServerFn(listAllPaymentRequests);
  const confirmFn = useServerFn(confirmPaymentRequest);
  const rejectFn = useServerFn(rejectPaymentRequest);

  const [filter, setFilter] = useState<FilterStatus>("pending");

  const admin = useQuery({ queryKey: ["am-i-admin"], queryFn: () => checkAdmin() });

  useEffect(() => {
    if (admin.data && !admin.data.isAdmin) {
      toast.error("Acesso restrito a administradores");
      navigate({ to: "/dashboard" });
    }
  }, [admin.data, navigate]);

  const requests = useQuery({
    queryKey: ["admin-payment-requests"],
    queryFn: () => list(),
    enabled: !!admin.data?.isAdmin,
  });

  const confirm = useMutation({
    mutationFn: (id: string) => confirmFn({ data: { request_id: id } }),
    onSuccess: () => { toast.success("Pagamento confirmado. Usuário ativado."); qc.invalidateQueries({ queryKey: ["admin-payment-requests"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => rejectFn({ data: { request_id: id, notes } }),
    onSuccess: () => { toast.success("Pedido recusado"); qc.invalidateQueries({ queryKey: ["admin-payment-requests"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (admin.isLoading || !admin.data) {
    return <div className="grid min-h-screen place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!admin.data.isAdmin) return null;

  const rows = (requests.data ?? []).filter((r) => filter === "all" || r.status === filter);
  const counts = { pending: 0, confirmed: 0, rejected: 0 };
  (requests.data ?? []).forEach((r) => { counts[r.status as keyof typeof counts]++; });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface/40">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Painel
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/admin/assinaturas" className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface">Assinaturas</Link>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> Admin
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-display text-3xl font-bold">Confirmação de pagamentos Pix</h1>
        <p className="mt-1 text-muted-foreground">Confirme os pagamentos recebidos e ative a assinatura do cliente.</p>

        <div className="mt-6 inline-flex rounded-full border border-border bg-card p-1 text-sm">
          {(["pending", "confirmed", "rejected", "all"] as FilterStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-4 py-1.5 font-medium transition ${filter === s ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {s === "pending" && `Aguardando (${counts.pending})`}
              {s === "confirmed" && `Confirmados (${counts.confirmed})`}
              {s === "rejected" && `Recusados (${counts.rejected})`}
              {s === "all" && "Todos"}
            </button>
          ))}
        </div>

        {requests.isLoading ? (
          <div className="mt-16 flex items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…</div>
        ) : rows.length === 0 ? (
          <div className="mt-16 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            Nenhum pedido {filter === "pending" ? "aguardando" : filter === "confirmed" ? "confirmado" : filter === "rejected" ? "recusado" : ""} no momento.
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Plano</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-4">
                      <div className="font-medium text-foreground">{r.user_email ?? r.user_id.slice(0, 8)}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{r.user_id}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold capitalize">{r.plan}</div>
                      <div className="text-xs text-muted-foreground">{r.cycle === "yearly" ? "Anual" : "Mensal"}</div>
                    </td>
                    <td className="px-4 py-4 font-semibold">R$ {Number(r.amount_brl).toFixed(2)}</td>
                    <td className="px-4 py-4 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        r.status === "confirmed" ? "bg-success/15 text-success" :
                        r.status === "rejected" ? "bg-destructive/15 text-destructive" :
                        "bg-primary/15 text-primary"
                      }`}>
                        {r.status === "confirmed" ? "Confirmado" : r.status === "rejected" ? "Recusado" : "Aguardando"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {r.status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => { if (confirm.isPending) return; if (window.confirm(`Confirmar pagamento de R$ ${Number(r.amount_brl).toFixed(2)} e ativar plano ${r.plan}?`)) confirm.mutate(r.id); }}
                            className="inline-flex items-center gap-1 rounded-full bg-success px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50"
                            disabled={confirm.isPending}
                          >
                            <Check className="h-3.5 w-3.5" /> Confirmar
                          </button>
                          <button
                            onClick={() => { const notes = window.prompt("Motivo da recusa (opcional):") ?? ""; if (notes !== null) reject.mutate({ id: r.id, notes }); }}
                            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface disabled:opacity-50"
                            disabled={reject.isPending}
                          >
                            <X className="h-3.5 w-3.5" /> Recusar
                          </button>
                        </div>
                      ) : (
                        <div className="text-right text-xs text-muted-foreground">
                          {r.reviewed_at && new Date(r.reviewed_at).toLocaleDateString("pt-BR")}
                          {r.admin_notes && <div className="mt-1 italic">"{r.admin_notes}"</div>}
                        </div>
                      )}
                      {r.proof_url && (
                        <a href={r.proof_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
                          Comprovante <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
