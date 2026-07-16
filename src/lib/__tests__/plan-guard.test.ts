import { describe, it, expect, vi } from "vitest";
import { requireStoreFeature } from "@/lib/plan-guard.server";

function mockCtx(allowed: boolean, error: { message: string } | null = null) {
  const rpc = vi.fn().mockResolvedValue({ data: allowed, error });
  return { ctx: { supabase: { rpc } }, rpc };
}

describe("requireStoreFeature", () => {
  const storeId = "00000000-0000-0000-0000-000000000001";

  for (const feature of ["whatsapp_api", "feeds", "crm"] as const) {
    it(`allows ${feature} when plan includes it`, async () => {
      const { ctx, rpc } = mockCtx(true);
      await expect(requireStoreFeature(ctx, storeId, feature)).resolves.toBeUndefined();
      expect(rpc).toHaveBeenCalledWith("store_owner_has_feature", { _store_id: storeId, _feature: feature });
    });

    it(`throws for ${feature} when plan does not include it (simulates 402/403)`, async () => {
      const { ctx } = mockCtx(false);
      await expect(requireStoreFeature(ctx, storeId, feature)).rejects.toThrow(
        new RegExp(`Recurso "${feature}" não disponível`),
      );
    });
  }

  it("propagates database errors", async () => {
    const { ctx } = mockCtx(false, { message: "db down" });
    await expect(requireStoreFeature(ctx, storeId, "crm")).rejects.toThrow("db down");
  });
});
