import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GenInput = z.object({
  store_id: z.string().uuid(),
  vehicle_id: z.string().uuid().nullable().optional(),
  title: z.string().min(2).max(120),
  template: z.enum(["chegou", "oferta", "recem-chegados", "destaque"]).default("oferta"),
  extra_prompt: z.string().max(500).optional(),
});

const TEMPLATES: Record<string, (title: string, extra?: string) => string> = {
  chegou: (t, e) => `Cinematic automotive banner announcing "${t}". Bold text 'CHEGOU!' at top. Modern car dealership marketing style, dramatic lighting, professional photography, high contrast, vibrant colors. ${e ?? ""}`,
  oferta: (t, e) => `Bold sale/promo automotive banner for "${t}". Big 'OFERTA' text, discount vibes, luxurious car showroom background, glowing accents, gold and red palette, premium dealership marketing. ${e ?? ""}`,
  "recem-chegados": (t, e) => `Fresh arrivals banner for car dealership featuring "${t}". Clean modern design with 'RECÉM-CHEGADOS' text, minimalist showroom setting, natural lighting, professional automotive photography. ${e ?? ""}`,
  destaque: (t, e) => `Premium spotlight banner highlighting "${t}". Dramatic dark background with rim lighting on the vehicle, elegant typography, luxury feel, black and gold accents. ${e ?? ""}`,
};

export const generateBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GenInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: has } = await context.supabase.rpc("plan_has_feature", { _user_id: context.userId, _feature: "banners" });
    if (!has) throw new Error("Recurso disponível no plano Pro ou superior");
    const prompt = TEMPLATES[data.template](data.title, data.extra_prompt);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY não configurada");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Falha na geração de imagem [${res.status}]: ${body}`);
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }> };
    const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!url) throw new Error("Nenhuma imagem retornada pelo modelo");
    const { data: row, error } = await context.supabase.from("banners").insert({
      store_id: data.store_id, vehicle_id: data.vehicle_id ?? null,
      title: data.title, template: data.template, prompt,
      image_url: url, created_by: context.userId,
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listBanners = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ store_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("banners").select("id,title,template,image_url,created_at,vehicle_id")
      .eq("store_id", data.store_id).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const deleteBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("banners").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
