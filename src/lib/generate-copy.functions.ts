import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  storeName: z.string().min(2),
  style: z.string().min(2),
  city: z.string().optional(),
});

const Output = z.object({
  hero_headline: z.string(),
  hero_subheadline: z.string(),
  tagline: z.string(),
  about_text: z.string(),
  cta_text: z.string(),
});

export type GeneratedCopy = z.infer<typeof Output>;

const SYSTEM = `Você é um copywriter especialista em revendas de veículos no Brasil.
Escreva textos curtos, diretos, persuasivos e profissionais em português brasileiro.
NUNCA use emojis. NUNCA use aspas dentro dos textos. Fale como uma marca confiável.`;

function fallback(name: string, style: string): GeneratedCopy {
  return {
    hero_headline: `${name}: seu próximo carro está aqui`,
    hero_subheadline: `Seminovos selecionados, revisados e com garantia. Atendimento ${style || "profissional"} do início ao fim.`,
    tagline: "Confiança que anda com você",
    about_text: `A ${name} é uma revenda especializada em veículos seminovos de qualidade. Cada carro passa por inspeção técnica antes de ser oferecido, garantindo procedência, segurança e o melhor negócio para você.`,
    cta_text: "Ver estoque completo",
  };
}

export const generateStoreCopy = createServerFn({ method: "POST" })
  .validator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<GeneratedCopy> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return fallback(data.storeName, data.style);

    const prompt = `Gere textos de marketing para a revenda de veículos "${data.storeName}"${
      data.city ? ` localizada em ${data.city}` : ""
    }. Estilo da marca: ${data.style}.

Retorne EXCLUSIVAMENTE um JSON válido com as chaves:
- hero_headline: título principal impactante, máximo 60 caracteres
- hero_subheadline: subtítulo, máximo 140 caracteres
- tagline: slogan curto, máximo 40 caracteres
- about_text: parágrafo sobre a loja, 2 a 3 frases
- cta_text: texto para botão de ação principal, máximo 25 caracteres`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": key,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        console.error("AI gateway error", res.status, await res.text());
        return fallback(data.storeName, data.style);
      }

      const json = await res.json();
      const content = json?.choices?.[0]?.message?.content;
      if (!content) return fallback(data.storeName, data.style);

      const parsed = Output.safeParse(JSON.parse(content));
      if (!parsed.success) return fallback(data.storeName, data.style);
      return parsed.data;
    } catch (err) {
      console.error("generateStoreCopy failed", err);
      return fallback(data.storeName, data.style);
    }
  });
