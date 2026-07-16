import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const DomainInput = z.object({
  store_id: z.string().uuid(),
  domain: z.string().min(4).max(200).transform((s) => s.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")),
});

function randomToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const setCustomDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DomainInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: has } = await context.supabase.rpc("plan_has_feature", { _user_id: context.userId, _feature: "custom_domain" });
    if (!has) throw new Error("Recurso disponível no plano Start ou superior");
    const { data: store } = await context.supabase.from("stores").select("id,owner_id,custom_domain_token").eq("id", data.store_id).maybeSingle();
    if (!store || store.owner_id !== context.userId) throw new Error("Loja não encontrada");
    const token = store.custom_domain_token ?? `autosite-verify=${randomToken()}`;
    const { error } = await context.supabase.from("stores").update({
      custom_domain: data.domain,
      custom_domain_token: token,
      custom_domain_verified: false,
    }).eq("id", data.store_id);
    if (error) throw new Error(error.message);
    return { domain: data.domain, token };
  });

export const verifyCustomDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ store_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: store } = await context.supabase.from("stores").select("id,owner_id,custom_domain,custom_domain_token").eq("id", data.store_id).maybeSingle();
    if (!store || store.owner_id !== context.userId) throw new Error("Loja não encontrada");
    if (!store.custom_domain || !store.custom_domain_token) throw new Error("Configure um domínio primeiro");
    // DNS-over-HTTPS via Cloudflare (funciona em Worker runtime)
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=_autosite.${encodeURIComponent(store.custom_domain)}&type=TXT`, {
      headers: { Accept: "application/dns-json" },
    });
    const j = (await res.json()) as { Answer?: Array<{ data?: string }> };
    const answers = (j.Answer ?? []).map((a) => (a.data ?? "").replace(/^"|"$/g, ""));
    const ok = answers.some((a) => a.includes(store.custom_domain_token!));
    if (!ok) throw new Error("Registro TXT ainda não encontrado. Aguarde propagação DNS (até 24h) e tente novamente.");
    const { error } = await context.supabase.from("stores").update({ custom_domain_verified: true }).eq("id", data.store_id);
    if (error) throw new Error(error.message);
    return { verified: true };
  });

export const removeCustomDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ store_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("stores").update({
      custom_domain: null, custom_domain_token: null, custom_domain_verified: false,
    }).eq("id", data.store_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
