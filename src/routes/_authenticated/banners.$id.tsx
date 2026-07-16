import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Download, Trash2, Loader2 } from "lucide-react";
import { FeatureGate } from "@/components/FeatureGate";
import { generateBanner, listBanners, deleteBanner } from "@/lib/banners.functions";

export const Route = createFileRoute("/_authenticated/banners/$id")({
  head: () => ({ meta: [{ title: "Banners automáticos" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

const TEMPLATES = [
  { id: "oferta", label: "Oferta" },
  { id: "chegou", label: "Chegou!" },
  { id: "recem-chegados", label: "Recém-chegados" },
  { id: "destaque", label: "Destaque" },
] as const;

function Page() {
  const { id } = Route.useParams();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface/40">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-6">
          <Link to="/gerenciar/$id" params={{ id }} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow"><Sparkles className="h-5 w-5" /></div>
          <div><h1 className="font-display text-3xl font-bold">Banners automáticos</h1><p className="text-muted-foreground">Gere imagens promocionais com IA em segundos.</p></div>
        </div>
        <FeatureGate feature="banners" title="Banners automáticos">
          <BannersPanel id={id} />
        </FeatureGate>
      </main>
    </div>
  );
}

function BannersPanel({ id }: { id: string }) {
  const qc = useQueryClient();
  const genFn = useServerFn(generateBanner);
  const listFn = useServerFn(listBanners);
  const delFn = useServerFn(deleteBanner);
  const q = useQuery({ queryKey: ["banners", id], queryFn: () => listFn({ data: { store_id: id } }) });
  const [title, setTitle] = useState(""); const [template, setTemplate] = useState<typeof TEMPLATES[number]["id"]>("oferta"); const [extra, setExtra] = useState("");
  const gen = useMutation({
    mutationFn: () => genFn({ data: { store_id: id, title, template, extra_prompt: extra || undefined } }),
    onSuccess: () => { toast.success("Banner gerado!"); setTitle(""); setExtra(""); qc.invalidateQueries({ queryKey: ["banners", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título (ex: Honda Civic 2020)" className="rounded-full border border-border bg-background px-4 py-2 text-sm" />
          <select value={template} onChange={(e) => setTemplate(e.target.value as any)} className="rounded-full border border-border bg-background px-4 py-2 text-sm">
            {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <textarea value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Instruções extras (opcional)" rows={2} className="w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm" />
        <button onClick={() => gen.mutate()} disabled={!title || gen.isPending} className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">
          {gen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar banner
        </button>
        <p className="text-xs text-muted-foreground">A geração leva ~10-30 segundos.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(q.data ?? []).map((b) => (
          <div key={b.id} className="rounded-2xl border border-border bg-card overflow-hidden">
            <img src={b.image_url} alt={b.title} className="aspect-square w-full object-cover" />
            <div className="p-3 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{b.title}</div>
                <div className="text-xs text-muted-foreground">{b.template}</div>
              </div>
              <a href={b.image_url} download={`${b.title}.png`} className="text-muted-foreground hover:text-foreground"><Download className="h-4 w-4" /></a>
              <button onClick={() => { if (confirm("Excluir?")) delFn({ data: { id: b.id } }).then(() => qc.invalidateQueries({ queryKey: ["banners", id] })); }} className="text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {(q.data?.length ?? 0) === 0 && <div className="col-span-full rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">Nenhum banner gerado ainda.</div>}
      </div>
    </div>
  );
}
