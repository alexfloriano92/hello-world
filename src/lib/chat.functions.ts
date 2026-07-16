import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

function pub() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const h = new Headers(init?.headers);
      if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
      h.set("apikey", key);
      return fetch(input, { ...init, headers: h });
    } },
  });
}

const Input = z.object({
  store_slug: z.string().min(1).max(80),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(2000),
  })).max(30),
  message: z.string().min(1).max(1000),
});

export const chatWithStore = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const sup = pub();
    const { data: store } = await sup.from("stores").select("id,name,whatsapp,phone,address,city,state,about_text").eq("slug", data.store_slug).eq("published", true).maybeSingle();
    if (!store) return { reply: "Loja não encontrada." };

    // Verifica feature no plano do dono
    const { data: hasFeature } = await sup.rpc("plan_has_feature", {
      _user_id: (await sup.from("stores").select("owner_id").eq("id", store.id).maybeSingle()).data?.owner_id ?? "",
      _feature: "chatbot",
    });
    if (!hasFeature) return { reply: "Chatbot indisponível para esta loja." };

    const { data: vehicles } = await sup.from("vehicles")
      .select("title,brand,model,year,km,price,fuel,transmission,color").eq("store_id", store.id).eq("sold", false).limit(30);

    const context = [
      `Você é o assistente virtual da loja "${store.name}".`,
      store.about_text ? `Sobre a loja: ${store.about_text}` : "",
      store.whatsapp ? `WhatsApp: ${store.whatsapp}` : "",
      store.phone ? `Telefone: ${store.phone}` : "",
      store.address ? `Endereço: ${store.address}, ${store.city ?? ""} ${store.state ?? ""}` : "",
      "",
      "Estoque atual:",
      ...(vehicles ?? []).map((v) => `- ${v.title} (${v.brand ?? "?"} ${v.model ?? ""} ${v.year ?? ""}) — R$ ${v.price ?? "consulte"}, ${v.km ?? "?"}km, ${v.fuel ?? ""} ${v.transmission ?? ""}`),
      "",
      "Regras: responda em português, curto e direto. Se perguntarem por veículo fora do estoque, sugira alternativas parecidas. Sempre incentive o WhatsApp para negociar. Nunca invente preço, ano ou km.",
    ].filter(Boolean).join("\n");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { reply: "Chat temporariamente indisponível." };
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: context },
          ...data.history,
          { role: "user", content: data.message },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`chat gateway [${res.status}]`, body);
      return { reply: "Estou com dificuldade para responder agora. Tente novamente em instantes." };
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return { reply: json.choices?.[0]?.message?.content ?? "Não consegui gerar uma resposta." };
  });
