import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Save, Eye } from "lucide-react";
import { getPost, savePost } from "@/lib/blog.functions";

export const Route = createFileRoute("/_authenticated/blog/$id/$postId")({
  head: () => ({ meta: [{ title: "Editar post" }, { name: "robots", content: "noindex" }] }),
  component: Editor,
});

function Editor() {
  const { id, postId } = Route.useParams();
  const nav = useNavigate();
  const getFn = useServerFn(getPost);
  const saveFn = useServerFn(savePost);
  const q = useQuery({ queryKey: ["post", postId], queryFn: () => getFn({ data: { id: postId } }) });
  const [title, setTitle] = useState(""); const [slug, setSlug] = useState(""); const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState(""); const [cover, setCover] = useState("");

  useEffect(() => {
    if (q.data) { setTitle(q.data.title); setSlug(q.data.slug); setExcerpt(q.data.excerpt ?? ""); setContent(q.data.content); setCover(q.data.cover_url ?? ""); }
  }, [q.data]);

  const save = useMutation({
    mutationFn: (publish: boolean) => saveFn({ data: { id: postId, store_id: id, title, slug: slug || undefined, excerpt: excerpt || null, content, cover_url: cover || null, publish } }),
    onSuccess: (_, publish) => toast.success(publish ? "Publicado!" : "Salvo"),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface/40 sticky top-0 z-10">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-3 px-6">
          <Link to="/blog/$id" params={{ id }} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Posts</Link>
          <div className="flex gap-2">
            <button onClick={() => save.mutate(false)} disabled={save.isPending} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface"><Save className="h-4 w-4" /> Salvar rascunho</button>
            <button onClick={() => save.mutate(true)} disabled={save.isPending} className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Eye className="h-4 w-4" /> Publicar</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10 space-y-4">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" className="w-full bg-transparent font-display text-4xl font-bold outline-none placeholder:text-muted-foreground/40" />
        <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="url-do-post (opcional)" className="w-full rounded-full border border-border bg-card px-4 py-2 text-sm font-mono" />
        <input value={cover} onChange={(e) => setCover(e.target.value)} placeholder="URL da imagem de capa (opcional)" className="w-full rounded-full border border-border bg-card px-4 py-2 text-sm" />
        <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Resumo curto (aparece no card)" rows={2} className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm" />
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Conteúdo (Markdown suportado — em breve rich text)" rows={20} className="w-full rounded-2xl border border-border bg-card px-4 py-3 font-mono text-sm leading-relaxed" />
      </main>
    </div>
  );
}
