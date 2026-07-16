import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, FileText, Plus, ExternalLink, Trash2 } from "lucide-react";
import { FeatureGate } from "@/components/FeatureGate";
import { listMyPosts, savePost, deletePost } from "@/lib/blog.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/blog/$id")({
  head: () => ({ meta: [{ title: "Blog da loja" }, { name: "robots", content: "noindex" }] }),
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
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow"><FileText className="h-5 w-5" /></div>
          <div><h1 className="font-display text-3xl font-bold">Blog</h1><p className="text-muted-foreground">Publique conteúdo para atrair clientes e ranquear no Google.</p></div>
        </div>
        <FeatureGate feature="blog" title="Blog">
          <PostList storeId={id} />
        </FeatureGate>
      </main>
    </div>
  );
}

function PostList({ storeId }: { storeId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyPosts);
  const saveFn = useServerFn(savePost);
  const delFn = useServerFn(deletePost);
  const q = useQuery({ queryKey: ["posts", storeId], queryFn: () => listFn({ data: { store_id: storeId } }) });
  const nav = useNavigate();
  const [creating, setCreating] = useState(false);
  const create = useMutation({
    mutationFn: () => saveFn({ data: { store_id: storeId, title: "Novo post", content: "" } }),
    onSuccess: (row) => nav({ to: "/blog/$id/$postId", params: { id: storeId, postId: row.id } }),
    onError: (e: Error) => toast.error(e.message),
  });
  const [slug, setSlug] = useState<string | null>(null);
  useEffect(() => { supabase.from("stores").select("slug").eq("id", storeId).maybeSingle().then((r) => setSlug(r.data?.slug ?? null)); }, [storeId]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{q.data?.length ?? 0} posts</div>
        <button onClick={() => { setCreating(true); create.mutate(); }} disabled={creating} className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> Novo post</button>
      </div>
      <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card">
        {(q.data ?? []).map((p) => (
          <div key={p.id} className="flex items-center gap-4 p-4">
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{p.title}</div>
              <div className="text-xs text-muted-foreground">{p.published_at ? `Publicado em ${new Date(p.published_at).toLocaleDateString("pt-BR")}` : "Rascunho"} · /{p.slug}</div>
            </div>
            {p.published_at && slug && (
              <a href={`/blog/${slug}/${p.slug}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground"><ExternalLink className="h-4 w-4" /></a>
            )}
            <Link to="/blog/$id/$postId" params={{ id: storeId, postId: p.id }} className="text-sm text-primary hover:underline">Editar</Link>
            <button onClick={() => { if (confirm("Excluir post?")) delFn({ data: { id: p.id } }).then(() => qc.invalidateQueries({ queryKey: ["posts", storeId] })); }} className="text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {(q.data?.length ?? 0) === 0 && <div className="p-10 text-center text-muted-foreground">Nenhum post ainda.</div>}
      </div>
    </div>
  );
}
