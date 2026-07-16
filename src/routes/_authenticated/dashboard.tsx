import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Car, LogOut, Plus, Globe, Palette, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { amIAdmin } from "@/lib/payments.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Painel — AutoSite" }, { name: "robots", content: "noindex" }],
  }),
  component: Dashboard,
});

type Store = {
  id: string;
  name: string;
  slug: string;
  plan?: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  style_tag: string | null;
  published: boolean;
};

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);
  const [email, setEmail] = useState<string>("");
  const checkAdmin = useServerFn(amIAdmin);
  const admin = useQuery({ queryKey: ["am-i-admin"], queryFn: () => checkAdmin() });

  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      setEmail(userRes.user?.email ?? "");
      // Admin doesn't own stores — go straight to the admin panel
      try {
        const res = await checkAdmin();
        if (res?.isAdmin) { navigate({ to: "/admin" }); return; }
      } catch { /* ignore */ }
      const { data, error } = await supabase.from("stores").select("*").order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      setStores(((data as unknown) as Store[]) ?? []);
      setLoading(false);
      if (!error && (!data || data.length === 0)) {
        navigate({ to: "/onboarding" });
      }
    })();
  }, [navigate, checkAdmin]);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface/40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
              <Car className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold">AutoSite</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground md:inline">{email}</span>
            {admin.data?.isAdmin && (
              <>
                <Link to="/admin/assinaturas" className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/25">
                  <ShieldCheck className="h-3.5 w-3.5" /> Assinaturas
                </Link>
                <Link to="/admin/pagamentos" className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/25">
                  <ShieldCheck className="h-3.5 w-3.5" /> Pagamentos
                </Link>
              </>
            )}
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-surface"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Minhas revendas</h1>
            <p className="mt-1 text-muted-foreground">Gerencie os sites das suas lojas.</p>
          </div>
          <Link
            to="/onboarding"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-elegant hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> Nova loja
          </Link>
        </div>

        {loading ? (
          <div className="mt-16 flex items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stores.map((s) => (
              <div key={s.id} className="rounded-2xl border border-border bg-card p-6 shadow-card transition hover:border-primary/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {s.logo_url ? (
                      <img src={s.logo_url} alt={s.name} className="h-12 w-12 rounded-lg bg-white object-contain p-1.5" />
                    ) : (
                      <div className="grid h-12 w-12 place-items-center rounded-lg bg-muted">
                        <Car className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-display text-lg font-semibold">{s.name}</h3>
                      <p className="font-mono text-xs text-muted-foreground">{s.slug}.autosite.com.br</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-primary">{s.plan ?? "FREE"}</span>
                </div>

                <div className="mt-5 flex items-center gap-1.5">
                  {[s.primary_color, s.secondary_color, s.accent_color].filter(Boolean).map((c) => (
                    <div key={c!} className="h-6 w-6 rounded border border-border" style={{ background: c! }} />
                  ))}
                  {s.style_tag && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      <Palette className="mr-1 inline h-3 w-3" /> {s.style_tag}
                    </span>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between text-sm">
                  <button
                    onClick={async () => {
                      const next = !s.published;
                      const { error } = await supabase.from("stores").update({ published: next }).eq("id", s.id);
                      if (error) return toast.error(error.message);
                      setStores((prev) => prev.map((x) => (x.id === s.id ? { ...x, published: next } : x)));
                      toast.success(next ? "Site publicado!" : "Site despublicado");
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                      s.published
                        ? "bg-success/15 text-success hover:bg-success/25"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${s.published ? "bg-success" : "bg-muted-foreground"}`} />
                    {s.published ? "Publicado" : "Publicar"}
                  </button>
                  <Link
                    to="/loja/$slug"
                    params={{ slug: s.slug }}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    Abrir site <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <Link
                  to="/gerenciar/$id"
                  params={{ id: s.id }}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-elegant hover:brightness-110"
                >
                  Gerenciar loja
                </Link>
              </div>
            ))}
          </div>
        )}

        <div className="mt-16 rounded-2xl border border-border bg-card p-8">
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" /> Próximos passos
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>• Cadastrar veículos (fotos, ficha técnica, preço)</li>
            <li>• Personalizar textos e banners</li>
            <li>• Conectar seu domínio próprio</li>
            <li>• Integrar WhatsApp e formulários de contato</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
