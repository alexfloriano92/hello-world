import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, CheckCircle2, Loader2 } from "lucide-react";
import { acceptInvite, getInviteInfo } from "@/lib/members.functions";

export const Route = createFileRoute("/_authenticated/convite/$token")({
  head: () => ({ meta: [{ title: "Aceitar convite" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function Page() {
  const { token } = Route.useParams();
  const nav = useNavigate();
  const infoFn = useServerFn(getInviteInfo);
  const acceptFn = useServerFn(acceptInvite);
  const q = useQuery({ queryKey: ["invite", token], queryFn: () => infoFn({ data: { token } }) });
  const m = useMutation({
    mutationFn: () => acceptFn({ data: { token } }),
    onSuccess: (mem: any) => { toast.success("Convite aceito!"); nav({ to: "/gerenciar/$id", params: { id: mem.store_id } }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow"><Mail className="h-5 w-5" /></div>
        {q.isLoading ? <Loader2 className="mx-auto mt-6 h-6 w-6 animate-spin text-muted-foreground" /> :
          !q.data ? <p className="mt-4 text-muted-foreground">Convite inválido ou expirado.</p> :
          q.data.accepted_at ? <p className="mt-4 text-muted-foreground">Este convite já foi usado.</p> :
          <>
            <h1 className="mt-4 font-display text-2xl font-bold">Você foi convidado</h1>
            <p className="mt-2 text-muted-foreground">Para gerenciar a loja <span className="font-semibold text-foreground">{q.data.store_name}</span> como <span className="font-semibold text-foreground">{q.data.role}</span>.</p>
            <button onClick={() => m.mutate()} disabled={m.isPending} className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-primary py-2.5 text-sm font-semibold text-primary-foreground">
              {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Aceitar convite
            </button>
          </>}
      </div>
    </div>
  );
}
