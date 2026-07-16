import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { renderStoreLayout } from "@/components/store-layouts";
import { decodeStyleTag, FONT_PAIRS, VARIANT_DEFAULTS, googleFontsHref, type FontPairId } from "@/lib/store-design";


const SlugInput = z.object({ slug: z.string().min(1) });

const getPublicStore = createServerFn({ method: "GET" })
  .validator((data: unknown) => SlugInput.parse(data))
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const supa = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { data: store, error } = await supa
      .from("stores")
      .select("*")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();

    if (error) throw error;
    if (!store) return null;

    const { data: vehicles } = await supa
      .from("vehicles")
      .select("id,title,brand,model,year,fuel,color,km,price,photos,featured")
      .eq("store_id", store.id)
      .eq("sold", false)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(24);

    return { store, vehicles: vehicles ?? [] };
  });

export const Route = createFileRoute("/loja/$slug")({
  loader: async ({ params }) => {
    const result = await getPublicStore({ data: { slug: params.slug } });
    if (!result) throw notFound();
    return result;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Loja não encontrada" }] };
    const s = loaderData.store as any;
    const title = `${s.name} — Seminovos selecionados`;
    const description = s.tagline ?? s.hero_subheadline ?? `Confira o estoque da ${s.name}.`;
    const { variant } = decodeStyleTag(s.style_tag);
    // Descobre par de fontes: prioriza campos font_display/font_body salvos; senao usa default do variant
    let pairId: FontPairId = VARIANT_DEFAULTS[variant].fontPair;
    if (s.font_display) {
      const match = (Object.entries(FONT_PAIRS) as [FontPairId, typeof FONT_PAIRS[FontPairId]][])
        .find(([, fp]) => fp.display === s.font_display);
      if (match) pairId = match[0];
    }
    const fontsHref = googleFontsHref(pairId);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        ...(s.logo_url ? [{ property: "og:image", content: s.logo_url }] : []),
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        ...(fontsHref ? [{ rel: "stylesheet", href: fontsHref }] : []),
      ],
    };
  },
  component: PublicStore,
  errorComponent: ({ error }) => (
    <div className="p-10 text-center">Erro ao carregar: {error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center bg-background p-10 text-center">
      <div>
        <h1 className="font-display text-3xl font-bold">Loja não encontrada</h1>
        <p className="mt-2 text-muted-foreground">Essa revenda ainda não publicou seu site.</p>
        <Link to="/" className="mt-6 inline-block rounded-full bg-primary px-5 py-2 text-primary-foreground">Voltar ao início</Link>
      </div>
    </div>
  ),
});

function PublicStore() {
  const { store, vehicles } = Route.useLoaderData() as { store: any; vehicles: any[] };
  const { variant, style } = decodeStyleTag(store.style_tag);
  const defs = VARIANT_DEFAULTS[variant];
  const primary = store.primary_color || defs.palette.primary;
  const secondary = store.secondary_color || defs.palette.secondary;
  const accent = store.accent_color || defs.palette.accent;
  const neutral = store.neutral_color || defs.palette.neutral;
  const fontDisplay = store.font_display || FONT_PAIRS[defs.fontPair].display;
  const fontBody = store.font_body || FONT_PAIRS[defs.fontPair].body;
  const cssVars = {
    "--s-primary": primary,
    "--s-secondary": secondary,
    "--s-accent": accent,
    "--s-neutral": neutral,
    "--s-font-display": `"${fontDisplay}", ui-sans-serif, system-ui`,
    "--s-font-body": `"${fontBody}", ui-sans-serif, system-ui`,
  } as React.CSSProperties;
  const enhancedStore = { ...store, style_tag: style || null };
  return (
    <div style={cssVars}>
      {renderStoreLayout(variant, enhancedStore, vehicles)}
    </div>
  );
}

