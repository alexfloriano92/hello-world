import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, KanbanSquare, Plus, MessageSquare } from "lucide-react";
import { FeatureGate } from "@/components/FeatureGate";
import { listLeadsWithDetails, updateLead, addLeadActivity, listLeadActivities } from "@/lib/crm.functions";

export const Route = createFileRoute("/_authenticated/crm/$id")({
  head: () => ({ meta: [{ title: "CRM" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

const COLS = [
  { id: "novo", label: "Novo", color: "bg-blue-500/20 text-blue-400" },
  { id: "contato", label: "Contato", color: "bg-yellow-500/20 text-yellow-400" },
  { id: "negociacao", label: "Negociação", color: "bg-orange-500/20 text-orange-400" },
  { id: "ganho", label: "Ganho", color: "bg-emerald-500/20 text-emerald-400" },
  { id: "perdido", label: "Perdido", color: "bg-red-500/20 text-red-400" },
] as const;

function Page() {
  const { id } = Route.useParams();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface/40">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-6">
          <Link to="/gerenciar/$id" params={{ id }} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow"><KanbanSquare className="h-5 w-5" /></div>
          <div><h1 className="font-display text-3xl font-bold">CRM</h1><p className="text-muted-foreground">Acompanhe cada lead do primeiro contato ao fechamento.</p></div>
        </div>
        <FeatureGate feature="crm" title="CRM completo">
          <Board id={id} />
        </FeatureGate>
      </main>
    </div>
  );
}

function Board({ id }: { id: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listLeadsWithDetails);
  const updFn = useServerFn(updateLead);
  const q = useQuery({ queryKey: ["crm", id], queryFn: () => listFn({ data: { store_id: id } }) });
  const [openLead, setOpenLead] = useState<string | null>(null);

  const move = (leadId: string, status: string) =>
    updFn({ data: { id: leadId, status: status as any } }).then(() => qc.invalidateQueries({ queryKey: ["crm", id] }));

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-5 md:grid-cols-3 sm:grid-cols-2">
        {COLS.map((c) => {
          const items = (q.data ?? []).filter((l) => l.status === c.id);
          return (
            <div key={c.id} className="rounded-2xl border border-border bg-card p-3 min-h-[300px]">
              <div className="flex items-center justify-between px-1 pb-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.color}`}>{c.label}</span>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((l) => (
                  <button key={l.id} onClick={() => setOpenLead(l.id)} className="w-full rounded-xl bg-surface/60 p-3 text-left text-sm hover:bg-surface">
                    <div className="font-semibold">{l.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{l.phone ?? l.email ?? "—"}</div>
                    {l.next_followup && <div className="mt-1 text-xs text-primary">Retomar {new Date(l.next_followup).toLocaleDateString("pt-BR")}</div>}
                  </button>
                ))}
              </div>
              <select onChange={(e) => { const t = e.target.value; if (t) { const leadId = prompt("Cole o ID do lead a mover pra " + c.label); if (leadId) move(leadId, c.id); e.target.value = ""; } }} className="mt-2 w-full text-xs text-muted-foreground bg-transparent hidden" />
            </div>
          );
        })}
      </div>
      {openLead && <LeadDrawer leadId={openLead} onClose={() => setOpenLead(null)} onChanged={() => qc.invalidateQueries({ queryKey: ["crm", id] })} />}
    </>
  );
}

function LeadDrawer({ leadId, onClose, onChanged }: { leadId: string; onClose: () => void; onChanged: () => void }) {
  const updFn = useServerFn(updateLead);
  const addFn = useServerFn(addLeadActivity);
  const listActFn = useServerFn(listLeadActivities);
  const acts = useQuery({ queryKey: ["activities", leadId], queryFn: () => listActFn({ data: { lead_id: leadId } }) });
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string>("");
  const [followup, setFollowup] = useState("");
  const save = useMutation({
    mutationFn: () => updFn({ data: { id: leadId, ...(status ? { status: status as any } : {}), ...(followup ? { next_followup: followup } : {}) } }),
    onSuccess: () => { toast.success("Atualizado"); onChanged(); },
  });
  const addNote = useMutation({
    mutationFn: () => addFn({ data: { lead_id: leadId, kind: "note", content: note } }),
    onSuccess: () => { setNote(""); acts.refetch(); },
  });
  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">Fechar ✕</button>
        <h2 className="mt-4 font-display text-xl font-bold">Lead</h2>
        <div className="mt-4 space-y-3">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-full border border-border bg-background px-4 py-2 text-sm">
            <option value="">Mudar status…</option>
            {COLS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <input type="datetime-local" value={followup} onChange={(e) => setFollowup(e.target.value)} className="w-full rounded-full border border-border bg-background px-4 py-2 text-sm" />
          <button onClick={() => save.mutate()} className="w-full rounded-full bg-gradient-primary py-2 text-sm font-semibold text-primary-foreground">Salvar mudanças</button>
        </div>
        <div className="mt-6">
          <div className="text-sm font-semibold flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Atividades</div>
          <div className="mt-3 space-y-2">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nova nota…" rows={2} className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm" />
            <button onClick={() => addNote.mutate()} disabled={!note} className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-4 py-1.5 text-xs font-semibold text-primary"><Plus className="h-3 w-3" /> Adicionar</button>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {(acts.data ?? []).map((a) => (
              <div key={a.id} className="rounded-xl border border-border bg-surface/40 p-3">
                <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR")} · {a.kind}</div>
                <div className="mt-1 whitespace-pre-wrap">{a.content}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
