/**
 * Garante que o dono da loja possui o recurso no plano assinado.
 * Lança erro se não tiver — usado em server functions para gating de features.
 */
export async function requireStoreFeature(
  ctx: { supabase: any },
  storeId: string,
  feature:
    | "whatsapp_api"
    | "feeds"
    | "crm"
    | "blog"
    | "banners"
    | "chatbot"
    | "custom_domain"
    | "multiple_users"
    | "priority_support",
): Promise<void> {
  const { data, error } = await ctx.supabase.rpc("store_owner_has_feature", {
    _store_id: storeId,
    _feature: feature,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Recurso "${feature}" não disponível no plano desta loja. Faça upgrade para desbloquear.`);
}
