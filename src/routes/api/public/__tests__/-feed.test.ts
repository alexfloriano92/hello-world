import { describe, it, expect, vi, beforeEach } from "vitest";

const stores = new Map<string, any>();
const rpcMock = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (_table: string) => ({
      select: () => ({
        eq: (_col: string, val: string) => ({
          maybeSingle: async () => ({ data: stores.get(val) ?? null }),
          neq: () => ({ order: () => ({ limit: async () => ({ data: [] }) }) }),
        }),
      }),
    }),
    rpc: rpcMock,
  }),
}));

const { Route } = await import("@/routes/api/public/feed.$slug");
const GET = (Route.options as any).server.handlers.GET;

beforeEach(() => {
  stores.clear();
  rpcMock.mockReset();
  process.env.SUPABASE_URL = "http://x";
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
});

const publishedStore = {
  id: "s1", name: "Loja", slug: "loja1", city: null, state: null, whatsapp: null,
  custom_domain: null, custom_domain_verified: false, feeds_enabled: true, published: true,
};

describe("feed XML route plan gating", () => {
  it("returns 402 when store owner plan lacks 'feeds'", async () => {
    stores.set("loja1", publishedStore);
    rpcMock.mockResolvedValue({ data: false });
    const res = await GET({ request: new Request("http://x/api/public/feed/loja1"), params: { slug: "loja1" } });
    expect(res.status).toBe(402);
  });

  it("returns 200 XML when plan includes 'feeds'", async () => {
    stores.set("loja1", publishedStore);
    rpcMock.mockResolvedValue({ data: true });
    const res = await GET({ request: new Request("http://x/api/public/feed/loja1"), params: { slug: "loja1" } });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("xml");
  });

  it("returns 403 when feed disabled on store", async () => {
    stores.set("loja1", { ...publishedStore, feeds_enabled: false });
    const res = await GET({ request: new Request("http://x/api/public/feed/loja1"), params: { slug: "loja1" } });
    expect(res.status).toBe(403);
  });

  it("returns 404 when store not published", async () => {
    stores.set("loja1", { ...publishedStore, published: false });
    const res = await GET({ request: new Request("http://x/api/public/feed/loja1"), params: { slug: "loja1" } });
    expect(res.status).toBe(404);
  });
});
