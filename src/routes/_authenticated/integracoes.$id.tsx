import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, MessageCircle, Copy, Rss } from "lucide-react";
import {
  getWhatsappConfig,
  saveWhatsappConfig,
  sendWhatsappMessage,
  listWhatsappMessages,
} from "@/lib/whatsapp.functions";

export const Route = createFileRoute("/_authenticated/integracoes/$id")({
  head: () => ({ meta: [{ title: "Integrações" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface/40">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-6">
          <Link to="/gerenciar/$id" params={{ id }} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10 space-y-10">
        <section>
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">WhatsApp Business API</h1>
              <p className="text-sm text-muted-foreground">Envie mensagens diretamente da plataforma usando sua conta oficial da Meta.</p>
            </div>
          </div>
          <WhatsappPanel storeId={id} />
        </section>

        <section>
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
              <Rss className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Feeds de estoque (XML)</h1>
              <p className="text-sm text-muted-foreground">URLs públicas para publicar seus veículos em OLX, Webmotors e iCarros.</p>
            </div>
          </div>
          <FeedsPanel storeId={id} />
        </section>
      </main>
    </div>
  );
}

function WhatsappPanel({ storeId }: { storeId: string }) {
  const qc = useQueryClient();
  const getFn = useServerFn(getWhatsappConfig);
  const saveFn = useServerFn(saveWhatsappConfig);
  const sendFn = useServerFn(sendWhatsappMessage);
  const listFn = useServerFn(listWhatsappMessages);

  const cfg = useQuery({
    queryKey: ["wa-cfg", storeId],
    queryFn: () => getFn({ data: { store_id: storeId } }),
  });
  const msgs = useQuery({
    queryKey: ["wa-msgs", storeId],
    queryFn: () => listFn({ data: { store_id: storeId } }),
  });

  const [phoneId, setPhoneId] = useState("");
  const [token, setToken] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");

  const c = cfg.data;
  const currentEnabled = c ? (enabled || c.enabled) : enabled;
  const currentPhone = phoneId || c?.phone_id || "";

  const save = useMutation({
    mutationFn: () => saveFn({
      data: {
        store_id: storeId,
        enabled: enabled || !!c?.enabled,
        phone_id: currentPhone || null,
        api_token: token || null,
      },
    }),
    onSuccess: () => { toast.success("Configuração salva"); setToken(""); qc.invalidateQueries({ queryKey: ["wa-cfg", storeId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const send = useMutation({
    mutationFn: () => sendFn({ data: { store_id: storeId, to, body } }),
    onSuccess: () => { toast.success("Mensagem enviada"); setBody(""); qc.invalidateQueries({ queryKey: ["wa-msgs", storeId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={currentEnabled} onChange={(e) => setEnabled(e.target.checked)} />
          Ativar envio via API oficial
        </label>
        <div>
          <label className="text-xs font-semibold text-muted-foreground">Phone Number ID</label>
          <input value={currentPhone} onChange={(e) => setPhoneId(e.target.value)} placeholder="123456789012345" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground">Access Token permanente</label>
          <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder={c?.has_token ? "•••••••• (deixe vazio para manter)" : "EAAG..."} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <p className="mt-1 text-xs text-muted-foreground">Obtenha no painel de desenvolvedores da Meta (WhatsApp Cloud API → API Setup).</p>
        </div>
        <button onClick={() => save.mutate()} disabled={save.isPending} className="rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">
          {save.isPending ? "Salvando…" : "Salvar configuração"}
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <h3 className="font-semibold">Enviar mensagem de teste</h3>
        <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="5511999999999" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Sua mensagem" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <button onClick={() => send.mutate()} disabled={send.isPending || !to || !body} className="rounded-full border border-primary bg-primary/10 px-5 py-2 text-sm font-semibold text-primary disabled:opacity-40">
          {send.isPending ? "Enviando…" : "Enviar"}
        </button>
        <p className="text-xs text-muted-foreground">A operadora exige que o destinatário tenha iniciado a conversa nas últimas 24h ou que você use um template aprovado.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-3 font-semibold">Últimas mensagens</h3>
        {(msgs.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma mensagem enviada ainda.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {(msgs.data ?? []).map((m) => (
              <li key={m.id} className="py-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{m.to_phone}</span>
                  <span className={m.status === "sent" ? "text-primary" : "text-destructive"}>{m.status}</span>
                </div>
                <div className="mt-1 line-clamp-2">{m.body}</div>
                {m.error && <div className="mt-1 text-xs text-destructive">{m.error}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FeedsPanel({ storeId }: { storeId: string }) {
  const slugQ = useQuery({
    queryKey: ["store-slug", storeId],
    queryFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      return (await supabase.from("stores").select("slug").eq("id", storeId).single()).data;
    },
  });
  const slug = slugQ.data?.slug;
  if (!slug) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const feeds = [
    { label: "OLX / Webmotors / iCarros (genérico)", url: `${origin}/api/public/feed/${slug}.xml`, note: "Envie esta URL para o gerente comercial do portal — cada portal precisa aprovar seu cadastro B2B." },
  ];
  return (
    <div className="space-y-3">
      {feeds.map((f) => (
        <div key={f.label} className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 text-sm font-semibold">{f.label}</div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface/40 p-2 font-mono text-xs">
            <span className="flex-1 truncate">{f.url}</span>
            <button onClick={() => { navigator.clipboard.writeText(f.url); toast.success("Copiado"); }} className="text-muted-foreground hover:text-foreground"><Copy className="h-3 w-3" /></button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{f.note}</p>
        </div>
      ))}
    </div>
  );
}
