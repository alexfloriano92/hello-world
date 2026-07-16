import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { requireStoreFeature } from "@/lib/plan-guard.server";

async function assertAccess(ctx: { supabase: any; userId: string }, storeId: string) {
  const { data } = await ctx.supabase.rpc("has_store_access", { _store_id: storeId, _user_id: ctx.userId });
  if (!data) throw new Error("Sem acesso a esta loja");
  await requireStoreFeature(ctx, storeId, "whatsapp_api");
}

export const getWhatsappConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ store_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAccess(context, data.store_id);
    const { data: s, error } = await context.supabase
      .from("stores")
      .select("whatsapp, whatsapp_api_enabled, whatsapp_phone_id, whatsapp_api_token")
      .eq("id", data.store_id).maybeSingle();
    if (error) throw new Error(error.message);
    return {
      whatsapp: s?.whatsapp ?? "",
      enabled: !!s?.whatsapp_api_enabled,
      phone_id: s?.whatsapp_phone_id ?? "",
      has_token: !!s?.whatsapp_api_token,
    };
  });

const SaveInput = z.object({
  store_id: z.string().uuid(),
  enabled: z.boolean(),
  phone_id: z.string().max(60).optional().nullable(),
  api_token: z.string().max(400).optional().nullable(),
});

export const saveWhatsappConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAccess(context, data.store_id);
    const patch: {
      whatsapp_api_enabled: boolean;
      whatsapp_phone_id: string | null;
      whatsapp_api_token?: string;
    } = {
      whatsapp_api_enabled: data.enabled,
      whatsapp_phone_id: data.phone_id || null,
    };
    if (data.api_token && data.api_token.length > 0) patch.whatsapp_api_token = data.api_token;
    const { error } = await context.supabase.from("stores").update(patch).eq("id", data.store_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const SendInput = z.object({
  store_id: z.string().uuid(),
  to: z.string().min(8).max(20),
  body: z.string().min(1).max(1000),
  lead_id: z.string().uuid().optional().nullable(),
});

export const sendWhatsappMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SendInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAccess(context, data.store_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: s } = await supabaseAdmin
      .from("stores")
      .select("whatsapp_api_enabled, whatsapp_phone_id, whatsapp_api_token")
      .eq("id", data.store_id).maybeSingle();
    if (!s?.whatsapp_api_enabled || !s.whatsapp_phone_id || !s.whatsapp_api_token) {
      throw new Error("WhatsApp Business API não configurado nesta loja");
    }
    const to = data.to.replace(/\D/g, "");
    const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(s.whatsapp_phone_id)}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${s.whatsapp_api_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: data.body },
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      await supabaseAdmin.from("whatsapp_messages").insert({
        store_id: data.store_id, lead_id: data.lead_id ?? null,
        to_phone: to, body: data.body, status: "error",
        error: JSON.stringify(j).slice(0, 500),
      });
      throw new Error(j?.error?.message || `Falha ao enviar (${res.status})`);
    }
    const messageId = j?.messages?.[0]?.id ?? null;
    await supabaseAdmin.from("whatsapp_messages").insert({
      store_id: data.store_id, lead_id: data.lead_id ?? null,
      to_phone: to, body: data.body, status: "sent", provider_message_id: messageId,
    });
    return { ok: true, message_id: messageId };
  });

export const listWhatsappMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ store_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAccess(context, data.store_id);
    const { data: rows, error } = await context.supabase
      .from("whatsapp_messages")
      .select("id, to_phone, body, status, error, created_at")
      .eq("store_id", data.store_id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
