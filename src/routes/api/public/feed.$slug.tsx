import { createFileRoute } from "@tanstack/react-router";

type Vehicle = {
  id: string;
  title: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  price_brl: number | null;
  km: number | null;
  color: string | null;
  fuel: string | null;
  transmission: string | null;
  description: string | null;
  photos: string[] | null;
  status: string | null;
};

type Store = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  whatsapp: string | null;
  custom_domain: string | null;
  custom_domain_verified: boolean;
  feeds_enabled: boolean;
  published: boolean;
};

function esc(s: string | number | null | undefined): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function baseUrl(request: Request, store: Store): string {
  const u = new URL(request.url);
  if (store.custom_domain && store.custom_domain_verified) return `https://${store.custom_domain}`;
  return `${u.protocol}//${u.host}`;
}

function itemUrl(base: string, store: Store, v: Vehicle) {
  return `${base}/loja/${store.slug}?v=${v.id}`;
}

// (Facebook Marketplace / Meta Catalog feed removido a pedido do usuário.)

function genericFeed(store: Store, vehicles: Vehicle[], base: string): string {
  const items = vehicles.map((v) => `
  <vehicle>
    <id>${esc(v.id)}</id>
    <title>${esc(v.title)}</title>
    <brand>${esc(v.brand)}</brand>
    <model>${esc(v.model)}</model>
    <year>${esc(v.year)}</year>
    <price>${esc(v.price_brl)}</price>
    <mileage>${esc(v.km)}</mileage>
    <color>${esc(v.color)}</color>
    <fuel>${esc(v.fuel)}</fuel>
    <transmission>${esc(v.transmission)}</transmission>
    <description>${esc(v.description)}</description>
    <url>${esc(itemUrl(base, store, v))}</url>
    ${(v.photos ?? []).slice(0, 20).map((p) => `<photo>${esc(p)}</photo>`).join("\n    ")}
  </vehicle>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<inventory>
  <store>
    <name>${esc(store.name)}</name>
    <city>${esc(store.city)}</city>
    <state>${esc(store.state)}</state>
    <whatsapp>${esc(store.whatsapp)}</whatsapp>
    <url>${esc(base)}/loja/${esc(store.slug)}</url>
  </store>${items}
</inventory>`;
}

export const Route = createFileRoute("/api/public/feed/$slug")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const format = (url.searchParams.get("format") || "generic").toLowerCase();
        const slug = params.slug.replace(/\.xml$/, "");

        const { createClient } = await import("@supabase/supabase-js");
        const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const supa = createClient(process.env.SUPABASE_URL!, key, {
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

        const { data: store } = await supa
          .from("stores")
          .select("id,name,slug,city,state,whatsapp,custom_domain,custom_domain_verified,feeds_enabled,published")
          .eq("slug", slug).maybeSingle();
        if (!store || !store.published) return new Response("Not found", { status: 404 });
        if (!store.feeds_enabled) return new Response("Feed desativado", { status: 403 });

        // Gate por plano: feed XML só é liberado se o dono da loja assinar um plano compatível.
        const { data: allowed } = await supa.rpc("store_owner_has_feature", {
          _store_id: store.id,
          _feature: "feeds",
        });
        if (!allowed) {
          return new Response("Feed XML não incluso no plano desta loja", { status: 402 });
        }


        const { data: vehicles } = await supa
          .from("vehicles")
          .select("id,title,brand,model,year,price_brl,km,color,fuel,transmission,description,photos,status")
          .eq("store_id", store.id)
          .neq("status", "sold")
          .order("created_at", { ascending: false })
          .limit(500);

        const list = (vehicles ?? []) as Vehicle[];
        const base = baseUrl(request, store as Store);
        const body = genericFeed(store as Store, list, base);
        void format;

        return new Response(body, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=600",
          },
        });
      },
    },
  },
});
