import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getPublicPost } from "@/lib/blog.functions";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/blog/$slug/$postSlug")({
  loader: async ({ params }) => {
    const data = await getPublicPost({ data: { slug: params.slug, postSlug: params.postSlug } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.post.title} — ${loaderData.store.name}` : "Post" },
      { name: "description", content: loaderData?.post.excerpt ?? loaderData?.post.title ?? "" },
      { property: "og:title", content: loaderData?.post.title ?? "" },
      { property: "og:description", content: loaderData?.post.excerpt ?? "" },
      ...(loaderData?.post.cover_url ? [{ property: "og:image", content: loaderData.post.cover_url }] : []),
    ],
  }),
  component: Page,
  notFoundComponent: () => <div className="min-h-screen grid place-items-center text-muted-foreground">Post não encontrado</div>,
  errorComponent: () => <div className="min-h-screen grid place-items-center text-muted-foreground">Erro ao carregar</div>,
});

function Page() {
  const { store, post } = Route.useLoaderData();
  const { slug } = Route.useParams();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface/40">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-6">
          <Link to="/blog/$slug" params={{ slug }} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Blog de {store.name}</Link>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-6 py-12">
        {post.cover_url && <img src={post.cover_url} alt={post.title} className="mb-8 aspect-video w-full rounded-2xl object-cover" />}
        <h1 className="font-display text-4xl font-bold">{post.title}</h1>
        {post.published_at && <div className="mt-2 text-sm text-muted-foreground">{new Date(post.published_at).toLocaleDateString("pt-BR")}</div>}
        <div className="prose prose-invert mt-8 whitespace-pre-wrap text-base leading-relaxed">{post.content}</div>
      </article>
    </div>
  );
}
