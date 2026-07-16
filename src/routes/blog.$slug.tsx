import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { listPublicPosts } from "@/lib/blog.functions";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const data = await listPublicPosts({ data: { slug: params.slug } });
    if (!data.store) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.store ? `Blog — ${loaderData.store.name}` : "Blog" },
      { name: "description", content: `Novidades e conteúdo da loja ${loaderData?.store?.name ?? ""}` },
    ],
  }),
  component: Page,
  notFoundComponent: () => <div className="min-h-screen grid place-items-center text-muted-foreground">Loja não encontrada</div>,
  errorComponent: () => <div className="min-h-screen grid place-items-center text-muted-foreground">Erro ao carregar</div>,
});

function Page() {
  const { store, posts } = Route.useLoaderData();
  const { slug } = Route.useParams();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface/40">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-6">
          <Link to="/loja/$slug" params={{ slug }} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> {store?.name}</Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="font-display text-4xl font-bold">Blog</h1>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {posts.map((p: { id: string; slug: string; title: string; excerpt: string | null; cover_url: string | null; published_at: string | null }) => (
            <Link key={p.id} to="/blog/$slug/$postSlug" params={{ slug, postSlug: p.slug }} className="rounded-2xl border border-border bg-card overflow-hidden hover:border-primary transition">
              {p.cover_url && <img src={p.cover_url} alt={p.title} className="aspect-video w-full object-cover" />}
              <div className="p-5">
                <h2 className="font-display text-xl font-bold">{p.title}</h2>
                {p.excerpt && <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{p.excerpt}</p>}
                <div className="mt-3 text-xs text-muted-foreground">{p.published_at ? new Date(p.published_at).toLocaleDateString("pt-BR") : ""}</div>
              </div>
            </Link>
          ))}
          {posts.length === 0 && <div className="col-span-full rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">Nenhum post publicado ainda.</div>}
        </div>
      </main>
    </div>
  );
}
