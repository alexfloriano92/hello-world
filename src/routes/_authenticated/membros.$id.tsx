import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Users, Trash2, Copy, Mail } from "lucide-react";
import { FeatureGate } from "@/components/FeatureGate";
import { listMembers, inviteMember, revokeInvite, removeMember } from "@/lib/members.functions";

export const Route = createFileRoute("/_authenticated/membros/$id")({
  head: () => ({ meta: [{ title: "Membros da loja" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface/40">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-6">
          <Link to="/gerenciar/$id" params={{ id }} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow"><Users className="h-5 w-5" /></div>
          <div><h1 className="font-display text-3xl font-bold">Múltiplos usuários</h1><p className="text-muted-foreground">Convide sua equipe para gerenciar a loja com você.</p></div>
        </div>
        <FeatureGate feature="multiple_users" title="Múltiplos usuários">
          <MembersPanel id={id} />
        </FeatureGate>
      </main>
    </div>
  );
}

function MembersPanel({ id }: { id: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listMembers);
  const inviteFn = useServerFn(inviteMember);
  const revokeFn = useServerFn(revokeInvite);
  const rmFn = useServerFn(removeMember);
  const q = useQuery({ queryKey: ["members", id], queryFn: () => listFn({ data: { store_id: id } }) });
  const [email, setEmail] = useState(""); const [role, setRole] = useState<"admin"|"editor"|"viewer">("editor");
  const invite = useMutation({
    mutationFn: () => inviteFn({ data: { store_id: id, email, role } }),
    onSuccess: (row) => {
      const url = `${window.location.origin}/convite/${row.token}`;
      navigator.clipboard.writeText(url);
      toast.success("Convite criado — link copiado!");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["members", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-sm font-semibold"><Mail className="h-4 w-4" /> Convidar por e-mail</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" className="flex-1 min-w-[220px] rounded-full border border-border bg-background px-4 py-2 text-sm" />
          <select value={role} onChange={(e) => setRole(e.target.value as any)} className="rounded-full border border-border bg-background px-4 py-2 text-sm">
            <option value="admin">Admin</option><option value="editor">Editor</option><option value="viewer">Visualizador</option>
          </select>
          <button onClick={() => invite.mutate()} disabled={!email || invite.isPending} className="rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">Convidar</button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Um link será copiado para você enviar ao convidado.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-semibold">Equipe</h3>
        <div className="mt-3 divide-y divide-border">
          {q.data?.owner && <Row email={q.data.owner.email ?? q.data.owner.user_id} role="Dono" />}
          {q.data?.members.map((m) => (
            <Row key={m.id} email={m.email ?? m.user_id} role={m.role} onRemove={() => rmFn({ data: { member_id: m.id } }).then(() => qc.invalidateQueries({ queryKey: ["members", id] }))} />
          ))}
        </div>
      </div>

      {(q.data?.invites?.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold">Convites pendentes</h3>
          <div className="mt-3 divide-y divide-border">
            {q.data!.invites.filter((i) => !i.accepted_at).map((i) => (
              <div key={i.id} className="flex items-center gap-3 py-3 text-sm">
                <span className="flex-1 truncate">{i.email} <span className="text-xs text-muted-foreground">({i.role})</span></span>
                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/convite/${i.token}`); toast.success("Link copiado"); }} className="text-muted-foreground hover:text-foreground"><Copy className="h-4 w-4" /></button>
                <button onClick={() => revokeFn({ data: { invite_id: i.id } }).then(() => qc.invalidateQueries({ queryKey: ["members", id] }))} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ email, role, onRemove }: { email: string; role: string; onRemove?: () => void }) {
  return (
    <div className="flex items-center gap-3 py-3 text-sm">
      <span className="flex-1 truncate">{email}</span>
      <span className="rounded-full bg-surface px-2 py-0.5 text-xs">{role}</span>
      {onRemove && <button onClick={onRemove} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></button>}
    </div>
  );
}
