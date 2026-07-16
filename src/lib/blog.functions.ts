import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

function publicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
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
}

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

async function assertFeature(supabase: any, userId: string) {
  const { data } = await supabase.rpc("plan_has_feature", { _user_id: userId, _feature: "blog" });
  if (!data) throw new Error("Blog disponível no plano Pro ou superior");
}

export const listMyPosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ store_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("posts").select("id,slug,title,excerpt,cover_url,published_at,updated_at")
      .eq("store_id", data.store_id).order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("posts").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

const PostInput = z.object({
  id: z.string().uuid().optional(),
  store_id: z.string().uuid(),
  title: z.string().min(2).max(200),
  slug: z.string().min(2).max(120).optional(),
  excerpt: z.string().max(500).nullable().optional(),
  content: z.string().max(50000),
  cover_url: z.string().url().nullable().optional(),
  publish: z.boolean().optional(),
});

export const savePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PostInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertFeature(context.supabase, context.userId);
    const slug = slugify(data.slug || data.title);
    const payload = {
      store_id: data.store_id, title: data.title, slug,
      excerpt: data.excerpt ?? null, content: data.content, cover_url: data.cover_url ?? null,
      author_id: context.userId,
      published_at: data.publish ? new Date().toISOString() : null,
    };
    if (data.id) {
      const { data: row, error } = await context.supabase.from("posts").update(payload).eq("id", data.id).select().single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase.from("posts").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Público (SSR-safe)
export const listPublicPosts = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(80) }).parse(d))
  .handler(async ({ data }) => {
    const sup = publicClient();
    const { data: store } = await sup.from("stores").select("id,name").eq("slug", data.slug).eq("published", true).maybeSingle();
    if (!store) return { store: null, posts: [] };
    const { data: posts } = await sup.from("posts")
      .select("id,slug,title,excerpt,cover_url,published_at")
      .eq("store_id", store.id).not("published_at", "is", null)
      .lte("published_at", new Date().toISOString()).order("published_at", { ascending: false }).limit(50);
    return { store, posts: posts ?? [] };
  });

export const getPublicPost = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ slug: z.string(), postSlug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const sup = publicClient();
    const { data: store } = await sup.from("stores").select("id,name").eq("slug", data.slug).eq("published", true).maybeSingle();
    if (!store) return null;
    const { data: post } = await sup.from("posts").select("*")
      .eq("store_id", store.id).eq("slug", data.postSlug).not("published_at", "is", null).maybeSingle();
    if (!post) return null;
    return { store, post };
  });
