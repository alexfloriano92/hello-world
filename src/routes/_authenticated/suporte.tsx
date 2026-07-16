import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, LifeBuoy, Plus } from "lucide-react";
import { listMyTickets, createTicket, getTicket, replyTicket, closeTicket } from "@/lib/support.functions";

export const Route = createFileRoute("/_authenticated/suporte")({
  head: () => ({ meta: [{ title: "Suporte" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function Page() {
  const listFn = useServerFn(listMyTickets);
  const createFn = useServerFn(createTicket);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["tickets"], queryFn: () => listFn() });
  const [selected, setSelected] = useState<string | null>(null);
  const [subject, setSubject] = useState(""); const [msg, setMsg] = useState("");
  const create = useMutation({
    mutationFn: () => createFn({ data: { subject, message: msg } }),
    onSuccess: (t) => { setSubject(""); setMsg(""); setSelected(t.id); qc.invalidateQueries({ queryKey: ["tickets"] }); toast.success("Chamado aberto"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface/40">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Painel</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow"><LifeBuoy className="h-5 w-5" /></div>
          <div><h1 className="font-display text-3xl font-bold">Suporte</h1><p className="text-muted-foreground">Falamos com você por aqui. Planos Pro e Premium têm prioridade.</p></div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
              <div className="text-sm font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> Novo chamado</div>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto" className="w-full rounded-full border border-border bg-background px-3 py-2 text-sm" />
              <textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Descreva…" rows={4} className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm" />
              <button onClick={() => create.mutate()} disabled={!subject || !msg} className="w-full rounded-full bg-gradient-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">Abrir chamado</button>
            </div>
            <div className="rounded-2xl border border-border bg-card divide-y divide-border">
              {(q.data?.items ?? []).map((t) => (
                <button key={t.id} onClick={() => setSelected(t.id)} className={`w-full text-left p-4 hover:bg-surface/50 ${selected === t.id ? "bg-surface/70" : ""}`}>
                  <div className="text-sm font-semibold truncate">{t.subject}</div>
                  <div className="text-xs text-muted-foreground flex gap-2"><span>{t.status}</span>·<span>{t.priority}</span>·<span>{new Date(t.updated_at).toLocaleDateString("pt-BR")}</span></div>
                </button>
              ))}
              {(q.data?.items.length ?? 0) === 0 && <div className="p-6 text-sm text-muted-foreground">Nenhum chamado ainda.</div>}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 min-h-[400px]">
            {selected ? <TicketView id={selected} /> : <div className="grid h-full place-items-center text-muted-foreground">Selecione um chamado</div>}
          </div>
        </div>
      </main>
    </div>
  );
}

function TicketView({ id }: { id: string }) {
  const getFn = useServerFn(getTicket); const replyFn = useServerFn(replyTicket); const closeFn = useServerFn(closeTicket);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["ticket", id], queryFn: () => getFn({ data: { id } }) });
  const [text, setText] = useState("");
  const reply = useMutation({
    mutationFn: () => replyFn({ data: { ticket_id: id, content: text } }),
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: ["ticket", id] }); },
  });
  const t = q.data?.ticket; const msgs = q.data?.messages ?? [];
  if (!t) return <div className="text-muted-foreground">Carregando…</div>;
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-bold">{t.subject}</h3>
          <div className="text-xs text-muted-foreground">Prioridade: {t.priority} · Status: {t.status}</div>
        </div>
        {t.status !== "closed" && <button onClick={() => closeFn({ data: { id } }).then(() => qc.invalidateQueries({ queryKey: ["ticket", id] }))} className="text-xs text-muted-foreground hover:text-destructive">Fechar chamado</button>}
      </div>
      <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
        {msgs.map((m) => (
          <div key={m.id} className={`max-w-[85%] rounded-2xl p-3 text-sm ${m.from_admin ? "ml-auto bg-primary/15" : "bg-surface/60"}`}>
            <div className="text-xs text-muted-foreground">{m.from_admin ? "Suporte" : "Você"} · {new Date(m.created_at).toLocaleString("pt-BR")}</div>
            <div className="mt-1 whitespace-pre-wrap">{m.content}</div>
          </div>
        ))}
      </div>
      {t.status !== "closed" && (
        <div className="mt-4 flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && text && reply.mutate()} placeholder="Responder…" className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm" />
          <button onClick={() => reply.mutate()} disabled={!text} className="rounded-full bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">Enviar</button>
        </div>
      )}
    </div>
  );
}
