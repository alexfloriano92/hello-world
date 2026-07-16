import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Globe, CheckCircle2, Copy, Loader2, Trash2 } from "lucide-react";
import { FeatureGate } from "@/components/FeatureGate";
import { setCustomDomain, verifyCustomDomain, removeCustomDomain } from "@/lib/domain.functions";

export const Route = createFileRoute("/_authenticated/dominio/$id")({
  head: () => ({ meta: [{ title: "Domínio personalizado" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface/40">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-6">
          <Link to="/gerenciar/$id" params={{ id }} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow"><Globe className="h-5 w-5" /></div>
          <div><h1 className="font-display text-3xl font-bold">Domínio personalizado</h1><p className="text-muted-foreground">Use seu próprio domínio como endereço da loja.</p></div>
        </div>
        <FeatureGate feature="custom_domain" title="Domínio personalizado">
          <DomainForm id={id} />
        </FeatureGate>
      </main>
    </div>
  );
}

function DomainForm({ id }: { id: string }) {
  const qc = useQueryClient();
  const [domain, setDomain] = useState("");
  const setFn = useServerFn(setCustomDomain);
  const verifyFn = useServerFn(verifyCustomDomain);
  const removeFn = useServerFn(removeCustomDomain);
  const store = useQuery({
    queryKey: ["store-domain", id],
    queryFn: async () => (await supabase.from("stores").select("custom_domain,custom_domain_verified,custom_domain_token").eq("id", id).single()).data,
  });
  const save = useMutation({
    mutationFn: () => setFn({ data: { store_id: id, domain } }),
    onSuccess: () => { toast.success("Domínio configurado"); qc.invalidateQueries({ queryKey: ["store-domain", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const verify = useMutation({
    mutationFn: () => verifyFn({ data: { store_id: id } }),
    onSuccess: () => { toast.success("Domínio verificado!"); qc.invalidateQueries({ queryKey: ["store-domain", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: () => removeFn({ data: { store_id: id } }),
    onSuccess: () => { toast.success("Removido"); setDomain(""); qc.invalidateQueries({ queryKey: ["store-domain", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const s = store.data;
  const active = s?.custom_domain && s?.custom_domain_verified;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <label className="text-sm font-semibold">Seu domínio</label>
        <div className="mt-2 flex gap-2">
          <input value={domain || s?.custom_domain || ""} onChange={(e) => setDomain(e.target.value)} placeholder="exemplo.com.br" className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm" />
          <button onClick={() => save.mutate()} disabled={save.isPending || !domain} className="rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">Salvar</button>
        </div>
      </div>

      {s?.custom_domain && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {active ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
              <span className="font-semibold">{s.custom_domain}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-primary/15 text-primary" : "bg-surface text-muted-foreground"}`}>
                {active ? "Ativo" : "Pendente"}
              </span>
            </div>
            <button onClick={() => remove.mutate()} className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"><Trash2 className="h-3 w-3" /> remover</button>
          </div>

          {!active && (
            <>
              <p className="text-sm text-muted-foreground">Configure estes registros DNS no seu provedor (Registro.br, GoDaddy, Hostgator, Cloudflare etc):</p>
              <div className="space-y-2">
                <DnsRow type="A" name="@" value="185.158.133.1" />
                <DnsRow type="A" name="www" value="185.158.133.1" />
                <DnsRow type="TXT" name={`_autosite.${s.custom_domain}`} value={s.custom_domain_token ?? ""} />
              </div>
              <button onClick={() => verify.mutate()} disabled={verify.isPending} className="w-full rounded-full border border-primary bg-primary/10 py-2 text-sm font-semibold text-primary hover:bg-primary/20">
                {verify.isPending ? "Verificando…" : "Verificar DNS"}
              </button>
              <p className="text-xs text-muted-foreground">A propagação DNS pode levar de alguns minutos até 24h.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DnsRow({ type, name, value }: { type: string; name: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface/40 p-3 font-mono text-xs">
      <span className="rounded bg-primary/15 px-2 py-0.5 text-primary">{type}</span>
      <span className="text-muted-foreground">{name}</span>
      <span className="flex-1 truncate">{value}</span>
      <button onClick={() => { navigator.clipboard.writeText(value); toast.success("Copiado"); }} className="text-muted-foreground hover:text-foreground"><Copy className="h-3 w-3" /></button>
    </div>
  );
}
