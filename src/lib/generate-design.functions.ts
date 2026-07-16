import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  FONT_PAIRS,
  LAYOUT_VARIANTS,
  VARIANT_DEFAULTS,
  pickDesignDeterministic,
  type FontPairId,
  type LayoutVariant,
  type StoreDesign,
} from "./store-design";

const Input = z.object({
  storeName: z.string().min(2),
  city: z.string().optional(),
  styleHint: z.string().optional(),
  seedColor: z.string().optional(),
});

const hex = z.string().regex(/^#?[0-9a-fA-F]{6}$/).transform((v) => (v.startsWith("#") ? v : `#${v}`));

const AiOutput = z.object({
  layout_variant: z.enum(LAYOUT_VARIANTS.filter((v) => v !== "default") as [string, ...string[]]),
  palette: z.object({ primary: hex, secondary: hex, accent: hex, neutral: hex }),
  font_pair_id: z.string(),
  hero_style: z.enum(["cinematic", "typographic", "split", "collage", "hud"]),
  motion: z.enum(["soft", "sharp", "playful", "still"]),
  radius: z.enum(["sharp", "soft", "pill"]),
  texture: z.enum(["none", "grain", "grid", "scanlines"]),
  tone_note: z.string().max(120),
});

const SYSTEM = `Voce e diretor de arte especializado em sites premium para revendas de veiculos no Brasil.
Sua tarefa: escolher UM layout arquitetonico distintivo, uma paleta harmonica e um par tipografico para uma loja especifica.
Nao repita combinacoes obvias. Case a decisao com o nome, a cidade e o estilo declarado. Evite estetica generica de IA (roxo em fundo branco, gradientes indigo pastel).`;

const PROMPT_LAYOUTS = `Layouts disponiveis (escolha exatamente UM):
- aurora: noturno, glassmorphism, blobs iridescentes, nav flutuante. Vibe: startup premium/tech.
- editorial: capa de revista, serif oversized, grid assimetrico 60/40, numeracao. Vibe: curadoria/boutique.
- monolith: Swiss minimalista, tipografia gigante preto/branco, grid rigido, um unico destaque. Vibe: arquitetonico, serio.
- showroom: luxo escuro cinematografico, hero full-bleed, spotlight nos cards. Vibe: premium tradicional (BMW/Porsche).
- neo-marche: pop tatil, bordas grossas, shadow offset, adesivos, cores saturadas. Vibe: revenda de bairro moderna.
- concourse: retrofuturista, mono/terminal, scanlines, badges HUD. Vibe: garagem esportiva/performance.`;

const PROMPT_FONTS = `Pares tipograficos disponiveis (font_pair_id):
- space-inter, playfair-inter, syne-manrope, bebas-inter, dm-serif-work, archivo-mono, instrument-work, urbanist-figtree.`;

function toDesign(ai: z.infer<typeof AiOutput>, fallback: StoreDesign): StoreDesign {
  const variant = ai.layout_variant as LayoutVariant;
  const pairId = (FONT_PAIRS[ai.font_pair_id as FontPairId] ? ai.font_pair_id : VARIANT_DEFAULTS[variant].fontPair) as FontPairId;
  const fp = FONT_PAIRS[pairId];
  return {
    layout_variant: variant,
    palette: ai.palette,
    fonts: { pairId, display: fp.display, body: fp.body },
    design_meta: {
      hero_style: ai.hero_style,
      motion: ai.motion,
      radius: ai.radius,
      texture: ai.texture,
      tone_note: ai.tone_note || fallback.design_meta.tone_note,
    },
  };
}

export const generateStoreDesign = createServerFn({ method: "POST" })
  .validator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<StoreDesign> => {
    const fallback = pickDesignDeterministic(data.storeName + (data.city ?? ""), data.seedColor ? { primary: data.seedColor } : undefined);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return fallback;

    const prompt = `Loja: "${data.storeName}"${data.city ? ` em ${data.city}` : ""}.
Estilo declarado pelo lojista: ${data.styleHint || "nao especificado"}.
${data.seedColor ? `Cor extraida do logo: ${data.seedColor}. Use como base ou complemento harmonico.` : ""}

${PROMPT_LAYOUTS}

${PROMPT_FONTS}

Retorne EXCLUSIVAMENTE JSON valido com as chaves:
layout_variant, palette{primary,secondary,accent,neutral}, font_pair_id,
hero_style, motion, radius, texture, tone_note.

Regras:
- Cores em hexadecimal 6 digitos com # (ex: #0b0f19).
- Paleta harmonica com bom contraste: primary vibrante, secondary escura ou clara para fundo, accent complementar, neutral base.
- Evite combinar "monolith" com fontes serifadas.
- Prefira "showroom" ou "aurora" para lojas com nome sofisticado; "neo-marche" para nomes populares/informais; "editorial" quando o estilo pedir curadoria; "concourse" para performance/esportivo; "monolith" para arquitetonico/minimal.`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
        body: JSON.stringify({
          model: "google/gemini-3.5-flash",
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) {
        console.error("generateStoreDesign gateway error", res.status, await res.text());
        return fallback;
      }
      const json = await res.json();
      const raw = json?.choices?.[0]?.message?.content;
      if (!raw) return fallback;
      const parsed = AiOutput.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        console.error("generateStoreDesign schema mismatch", parsed.error.issues);
        return fallback;
      }
      return toDesign(parsed.data, fallback);
    } catch (err) {
      console.error("generateStoreDesign failed", err);
      return fallback;
    }
  });